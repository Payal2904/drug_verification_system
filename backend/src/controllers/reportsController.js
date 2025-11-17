const dbManager = require('../config/database');
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');

/**
 * Reports Controller
 * Handles counterfeit drug reporting, investigation, and management
 */
class ReportsController {

    /**
     * Create a new counterfeit drug report
     */
    async createReport(req, res) {
        try {
            // Check for validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation errors',
                    errors: errors.array()
                });
            }

            const {
                drugName,
                suspectedBatchNumber,
                manufacturerClaimed,
                reportType,
                description,
                locationFound,
                purchaseLocation,
                purchaseDate,
                purchasePrice,
                reporterContactInfo = {},
                severityLevel = 'medium'
            } = req.body;

            const reporterId = req.user ? req.user.id : null;

            // Handle uploaded evidence photos
            const evidencePhotos = [];
            const packagingPhotos = [];

            if (req.files) {
                if (req.files.evidence) {
                    for (const file of req.files.evidence) {
                        const filename = await this.saveUploadedFile(file, 'evidence', reporterId);
                        evidencePhotos.push(filename);
                    }
                }

                if (req.files.packaging) {
                    for (const file of req.files.packaging) {
                        const filename = await this.saveUploadedFile(file, 'packaging', reporterId);
                        packagingPhotos.push(filename);
                    }
                }
            }

            // Insert report into database
            const result = await dbManager.run(`
                INSERT INTO counterfeit_reports
                (reporter_user_id, drug_name, suspected_batch_number, manufacturer_claimed,
                 report_type, description, location_found, purchase_location, purchase_date,
                 purchase_price, evidence_photos, packaging_photos, reporter_contact_info,
                 severity_level, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                reporterId,
                drugName,
                suspectedBatchNumber,
                manufacturerClaimed,
                reportType,
                description,
                locationFound,
                purchaseLocation,
                purchaseDate,
                purchasePrice,
                JSON.stringify(evidencePhotos),
                JSON.stringify(packagingPhotos),
                JSON.stringify(reporterContactInfo),
                severityLevel,
                'pending'
            ]);

            // Get the created report
            const report = await dbManager.queryOne(`
                SELECT * FROM counterfeit_reports WHERE id = ?
            `, [result.id]);

            // Create alert if high severity
            if (severityLevel === 'high' || severityLevel === 'critical') {
                await this.createReportAlert(report);
            }

            // Log the report creation
            await dbManager.run(`
                INSERT INTO audit_trail (user_id, action, table_name, record_id, new_values, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                reporterId,
                'COUNTERFEIT_REPORT_CREATED',
                'counterfeit_reports',
                result.id,
                JSON.stringify({
                    drug_name: drugName,
                    report_type: reportType,
                    severity_level: severityLevel
                }),
                req.ip,
                req.get('User-Agent')
            ]);

            res.status(201).json({
                success: true,
                message: 'Report created successfully',
                report: {
                    id: report.id,
                    drug_name: report.drug_name,
                    report_type: report.report_type,
                    severity_level: report.severity_level,
                    status: report.status,
                    created_at: report.created_at,
                    evidence_photos_count: evidencePhotos.length,
                    packaging_photos_count: packagingPhotos.length
                }
            });

        } catch (error) {
            console.error('Report creation error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create report',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Get list of reports with filtering and pagination
     */
    async getReports(req, res) {
        try {
            const {
                page = 1,
                limit = 20,
                status,
                reportType,
                severityLevel,
                drugName,
                startDate,
                endDate
            } = req.query;

            const offset = (page - 1) * limit;
            let whereClause = '1=1';
            const params = [];

            // Build where clause based on filters
            if (status) {
                whereClause += ' AND cr.status = ?';
                params.push(status);
            }

            if (reportType) {
                whereClause += ' AND cr.report_type = ?';
                params.push(reportType);
            }

            if (severityLevel) {
                whereClause += ' AND cr.severity_level = ?';
                params.push(severityLevel);
            }

            if (drugName) {
                whereClause += ' AND cr.drug_name LIKE ?';
                params.push(`%${drugName}%`);
            }

            if (startDate) {
                whereClause += ' AND cr.created_at >= ?';
                params.push(startDate);
            }

            if (endDate) {
                whereClause += ' AND cr.created_at <= ?';
                params.push(endDate);
            }

            // Restrict access based on user role
            if (req.user.role === 'user') {
                whereClause += ' AND cr.reporter_user_id = ?';
                params.push(req.user.id);
            }

            // Get reports
            const reports = await dbManager.query(`
                SELECT
                    cr.*,
                    reporter.username as reporter_username,
                    reporter.email as reporter_email,
                    investigator.username as investigator_username
                FROM counterfeit_reports cr
                LEFT JOIN users reporter ON cr.reporter_user_id = reporter.id
                LEFT JOIN users investigator ON cr.assigned_investigator_id = investigator.id
                WHERE ${whereClause}
                ORDER BY
                    CASE cr.severity_level
                        WHEN 'critical' THEN 1
                        WHEN 'high' THEN 2
                        WHEN 'medium' THEN 3
                        WHEN 'low' THEN 4
                    END,
                    cr.created_at DESC
                LIMIT ? OFFSET ?
            `, [...params, limit, offset]);

            // Get total count
            const totalCount = await dbManager.queryOne(`
                SELECT COUNT(*) as count
                FROM counterfeit_reports cr
                WHERE ${whereClause}
            `, params);

            // Parse JSON fields
            reports.forEach(report => {
                try {
                    report.evidence_photos = report.evidence_photos ? JSON.parse(report.evidence_photos) : [];
                    report.packaging_photos = report.packaging_photos ? JSON.parse(report.packaging_photos) : [];
                    report.reporter_contact_info = report.reporter_contact_info ? JSON.parse(report.reporter_contact_info) : {};
                } catch (e) {
                    report.evidence_photos = [];
                    report.packaging_photos = [];
                    report.reporter_contact_info = {};
                }
            });

            res.json({
                success: true,
                reports,
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total_count: totalCount.count,
                    total_pages: Math.ceil(totalCount.count / limit)
                }
            });

        } catch (error) {
            console.error('Reports retrieval error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve reports',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Get detailed report by ID
     */
    async getReportById(req, res) {
        try {
            const { reportId } = req.params;

            const report = await dbManager.queryOne(`
                SELECT
                    cr.*,
                    reporter.username as reporter_username,
                    reporter.email as reporter_email,
                    reporter.first_name as reporter_first_name,
                    reporter.last_name as reporter_last_name,
                    investigator.username as investigator_username,
                    investigator.first_name as investigator_first_name,
                    investigator.last_name as investigator_last_name
                FROM counterfeit_reports cr
                LEFT JOIN users reporter ON cr.reporter_user_id = reporter.id
                LEFT JOIN users investigator ON cr.assigned_investigator_id = investigator.id
                WHERE cr.id = ?
            `, [reportId]);

            if (!report) {
                return res.status(404).json({
                    success: false,
                    message: 'Report not found'
                });
            }

            // Check access permissions
            if (req.user.role === 'user' && report.reporter_user_id !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied to this report'
                });
            }

            // Parse JSON fields
            try {
                report.evidence_photos = report.evidence_photos ? JSON.parse(report.evidence_photos) : [];
                report.packaging_photos = report.packaging_photos ? JSON.parse(report.packaging_photos) : [];
                report.reporter_contact_info = report.reporter_contact_info ? JSON.parse(report.reporter_contact_info) : {};
            } catch (e) {
                report.evidence_photos = [];
                report.packaging_photos = [];
                report.reporter_contact_info = {};
            }

            // Get investigation history
            const investigationHistory = await dbManager.query(`
                SELECT action, old_values, new_values, created_at, user_id,
                       u.username, u.first_name, u.last_name
                FROM audit_trail at
                LEFT JOIN users u ON at.user_id = u.id
                WHERE at.table_name = 'counterfeit_reports' AND at.record_id = ?
                ORDER BY at.created_at DESC
            `, [reportId]);

            res.json({
                success: true,
                report,
                investigation_history: investigationHistory
            });

        } catch (error) {
            console.error('Report retrieval error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve report',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Update report status and investigation notes (admin/investigator only)
     */
    async updateReport(req, res) {
        try {
            // Check for validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation errors',
                    errors: errors.array()
                });
            }

            const { reportId } = req.params;
            const {
                status,
                assignedInvestigatorId,
                investigationNotes,
                resolutionNotes,
                publicAlertIssued = false,
                alertMessage
            } = req.body;

            // Get current report for audit log
            const currentReport = await dbManager.queryOne(
                'SELECT * FROM counterfeit_reports WHERE id = ?',
                [reportId]
            );

            if (!currentReport) {
                return res.status(404).json({
                    success: false,
                    message: 'Report not found'
                });
            }

            // Update report
            const updateFields = [];
            const updateParams = [];

            if (status !== undefined) {
                updateFields.push('status = ?');
                updateParams.push(status);
            }

            if (assignedInvestigatorId !== undefined) {
                updateFields.push('assigned_investigator_id = ?');
                updateParams.push(assignedInvestigatorId);
            }

            if (investigationNotes !== undefined) {
                updateFields.push('investigation_notes = ?');
                updateParams.push(investigationNotes);
            }

            if (resolutionNotes !== undefined) {
                updateFields.push('resolution_notes = ?');
                updateParams.push(resolutionNotes);
            }

            if (publicAlertIssued !== undefined) {
                updateFields.push('public_alert_issued = ?');
                updateParams.push(publicAlertIssued ? 1 : 0);
            }

            if (alertMessage !== undefined) {
                updateFields.push('alert_message = ?');
                updateParams.push(alertMessage);
            }

            if (status === 'resolved') {
                updateFields.push('resolved_at = CURRENT_TIMESTAMP');
            }

            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            updateParams.push(reportId);

            if (updateFields.length === 1) { // Only updated_at field
                return res.status(400).json({
                    success: false,
                    message: 'No fields to update'
                });
            }

            await dbManager.run(`
                UPDATE counterfeit_reports
                SET ${updateFields.join(', ')}
                WHERE id = ?
            `, updateParams);

            // Get updated report
            const updatedReport = await dbManager.queryOne(
                'SELECT * FROM counterfeit_reports WHERE id = ?',
                [reportId]
            );

            // Create public alert if specified
            if (publicAlertIssued && alertMessage) {
                await dbManager.run(`
                    INSERT INTO alerts
                    (alert_type, title, message, severity, related_report_id, is_public, created_by_user_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    'counterfeit_detected',
                    `Counterfeit Alert: ${currentReport.drug_name}`,
                    alertMessage,
                    currentReport.severity_level === 'critical' ? 'critical' : 'warning',
                    reportId,
                    1,
                    req.user.id
                ]);
            }

            // Log the update
            await dbManager.run(`
                INSERT INTO audit_trail (user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                req.user.id,
                'REPORT_UPDATED',
                'counterfeit_reports',
                reportId,
                JSON.stringify({
                    status: currentReport.status,
                    assigned_investigator_id: currentReport.assigned_investigator_id,
                    investigation_notes: currentReport.investigation_notes,
                    resolution_notes: currentReport.resolution_notes
                }),
                JSON.stringify({
                    status,
                    assignedInvestigatorId,
                    investigationNotes,
                    resolutionNotes,
                    publicAlertIssued,
                    alertMessage
                }),
                req.ip,
                req.get('User-Agent')
            ]);

            res.json({
                success: true,
                message: 'Report updated successfully',
                report: updatedReport
            });

        } catch (error) {
            console.error('Report update error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update report',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Delete report (admin only)
     */
    async deleteReport(req, res) {
        try {
            const { reportId } = req.params;

            // Get report for audit log
            const report = await dbManager.queryOne(
                'SELECT * FROM counterfeit_reports WHERE id = ?',
                [reportId]
            );

            if (!report) {
                return res.status(404).json({
                    success: false,
                    message: 'Report not found'
                });
            }

            // Delete associated files
            try {
                const evidencePhotos = report.evidence_photos ? JSON.parse(report.evidence_photos) : [];
                const packagingPhotos = report.packaging_photos ? JSON.parse(report.packaging_photos) : [];

                for (const photo of [...evidencePhotos, ...packagingPhotos]) {
                    await this.deleteUploadedFile(photo);
                }
            } catch (e) {
                console.error('Error deleting associated files:', e);
            }

            // Delete report
            await dbManager.run('DELETE FROM counterfeit_reports WHERE id = ?', [reportId]);

            // Log deletion
            await dbManager.run(`
                INSERT INTO audit_trail (user_id, action, table_name, record_id, old_values, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                req.user.id,
                'REPORT_DELETED',
                'counterfeit_reports',
                reportId,
                JSON.stringify({
                    drug_name: report.drug_name,
                    report_type: report.report_type,
                    status: report.status
                }),
                req.ip,
                req.get('User-Agent')
            ]);

            res.json({
                success: true,
                message: 'Report deleted successfully'
            });

        } catch (error) {
            console.error('Report deletion error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete report',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Get report statistics
     */
    async getReportStats(req, res) {
        try {
            const { timeframe = '30d' } = req.query;

            let dateFilter = '';
            switch (timeframe) {
                case '24h':
                    dateFilter = "AND created_at > datetime('now', '-1 day')";
                    break;
                case '7d':
                    dateFilter = "AND created_at > datetime('now', '-7 days')";
                    break;
                case '30d':
                    dateFilter = "AND created_at > datetime('now', '-30 days')";
                    break;
                case '1y':
                    dateFilter = "AND created_at > datetime('now', '-1 year')";
                    break;
            }

            const stats = await dbManager.query(`
                SELECT
                    status,
                    COUNT(*) as count,
                    AVG(CASE WHEN resolved_at IS NOT NULL THEN
                        (julianday(resolved_at) - julianday(created_at)) * 24 * 60 * 60
                        ELSE NULL END) as avg_resolution_time_seconds
                FROM counterfeit_reports
                WHERE 1=1 ${dateFilter}
                GROUP BY status
                ORDER BY count DESC
            `);

            const severityStats = await dbManager.query(`
                SELECT
                    severity_level,
                    COUNT(*) as count
                FROM counterfeit_reports
                WHERE 1=1 ${dateFilter}
                GROUP BY severity_level
                ORDER BY count DESC
            `);

            const reportTypeStats = await dbManager.query(`
                SELECT
                    report_type,
                    COUNT(*) as count
                FROM counterfeit_reports
                WHERE 1=1 ${dateFilter}
                GROUP BY report_type
                ORDER BY count DESC
            `);

            const totalReports = await dbManager.queryOne(`
                SELECT COUNT(*) as total FROM counterfeit_reports WHERE 1=1 ${dateFilter}
            `);

            const monthlyTrend = await dbManager.query(`
                SELECT
                    strftime('%Y-%m', created_at) as month,
                    COUNT(*) as count
                FROM counterfeit_reports
                WHERE created_at > datetime('now', '-12 months')
                GROUP BY strftime('%Y-%m', created_at)
                ORDER BY month
            `);

            res.json({
                success: true,
                timeframe,
                stats: {
                    total_reports: totalReports.total,
                    by_status: stats,
                    by_severity: severityStats,
                    by_type: reportTypeStats,
                    monthly_trend: monthlyTrend
                }
            });

        } catch (error) {
            console.error('Report stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve report statistics',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Save uploaded file
     */
    async saveUploadedFile(file, category, userId) {
        const uploadDir = path.join(process.env.UPLOAD_PATH || './uploads', category);

        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const extension = path.extname(file.originalname);
        const filename = `${timestamp}-${randomString}${extension}`;
        const filepath = path.join(uploadDir, filename);

        // Save file
        fs.writeFileSync(filepath, file.buffer);

        // Record in database
        await dbManager.run(`
            INSERT INTO file_uploads
            (original_filename, stored_filename, file_path, file_size, mime_type, uploaded_by_user_id, related_table)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            file.originalname,
            filename,
            filepath,
            file.size,
            file.mimetype,
            userId,
            'counterfeit_reports'
        ]);

        return filename;
    }

    /**
     * Delete uploaded file
     */
    async deleteUploadedFile(filename) {
        try {
            const fileRecord = await dbManager.queryOne(
                'SELECT file_path FROM file_uploads WHERE stored_filename = ?',
                [filename]
            );

            if (fileRecord && fs.existsSync(fileRecord.file_path)) {
                fs.unlinkSync(fileRecord.file_path);
            }

            await dbManager.run(
                'DELETE FROM file_uploads WHERE stored_filename = ?',
                [filename]
            );
        } catch (error) {
            console.error('Error deleting file:', error);
        }
    }

    /**
     * Create alert for high severity reports
     */
    async createReportAlert(report) {
        try {
            const alertTitle = `High Priority Counterfeit Report: ${report.drug_name}`;
            const alertMessage = `A ${report.severity_level} severity counterfeit report has been filed for ${report.drug_name}.
                Suspected batch: ${report.suspected_batch_number || 'Not specified'}.
                Location: ${report.location_found || 'Not specified'}.
                Immediate investigation required.`;

            await dbManager.run(`
                INSERT INTO alerts
                (alert_type, title, message, severity, related_report_id, target_audience, is_public, created_by_user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                'counterfeit_detected',
                alertTitle,
                alertMessage,
                report.severity_level === 'critical' ? 'critical' : 'error',
                report.id,
                JSON.stringify(['admin', 'pharmacist']),
                0,
                report.reporter_user_id
            ]);
        } catch (error) {
            console.error('Error creating report alert:', error);
        }
    }
}

module.exports = new ReportsController();
