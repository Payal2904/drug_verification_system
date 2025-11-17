const express = require('express');
const multer = require('multer');
const { body, param, query } = require('express-validator');
const reportsController = require('../controllers/reportsController');
const { authenticateToken, optionalAuth, authorize, auditLog, rateLimitByUser } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads (evidence and packaging photos)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
        files: 10 // Maximum 10 files per request
    },
    fileFilter: (req, file, cb) => {
        // Accept only image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

/**
 * Validation rules for creating counterfeit reports
 */
const createReportValidation = [
    body('drugName')
        .isLength({ min: 1, max: 255 })
        .withMessage('Drug name is required and must be less than 255 characters')
        .trim(),

    body('suspectedBatchNumber')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Suspected batch number must be less than 100 characters')
        .trim(),

    body('manufacturerClaimed')
        .optional()
        .isLength({ max: 255 })
        .withMessage('Manufacturer name must be less than 255 characters')
        .trim(),

    body('reportType')
        .isIn(['counterfeit', 'tampered', 'expired_sold', 'mislabeled', 'other'])
        .withMessage('Invalid report type'),

    body('description')
        .isLength({ min: 10, max: 2000 })
        .withMessage('Description must be between 10 and 2000 characters')
        .trim(),

    body('locationFound')
        .optional()
        .isLength({ max: 255 })
        .withMessage('Location found must be less than 255 characters')
        .trim(),

    body('purchaseLocation')
        .optional()
        .isLength({ max: 255 })
        .withMessage('Purchase location must be less than 255 characters')
        .trim(),

    body('purchaseDate')
        .optional()
        .isISO8601()
        .withMessage('Purchase date must be a valid date'),

    body('purchasePrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Purchase price must be a positive number'),

    body('reporterContactInfo')
        .optional()
        .isObject()
        .withMessage('Reporter contact info must be an object'),

    body('severityLevel')
        .optional()
        .isIn(['low', 'medium', 'high', 'critical'])
        .withMessage('Invalid severity level')
];

/**
 * Validation rules for updating reports
 */
const updateReportValidation = [
    param('reportId')
        .isInt({ min: 1 })
        .withMessage('Valid report ID is required'),

    body('status')
        .optional()
        .isIn(['pending', 'investigating', 'verified', 'false_alarm', 'resolved'])
        .withMessage('Invalid status'),

    body('assignedInvestigatorId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Assigned investigator ID must be a positive integer'),

    body('investigationNotes')
        .optional()
        .isLength({ max: 2000 })
        .withMessage('Investigation notes must be less than 2000 characters')
        .trim(),

    body('resolutionNotes')
        .optional()
        .isLength({ max: 2000 })
        .withMessage('Resolution notes must be less than 2000 characters')
        .trim(),

    body('publicAlertIssued')
        .optional()
        .isBoolean()
        .withMessage('Public alert issued must be a boolean'),

    body('alertMessage')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Alert message must be less than 500 characters')
        .trim()
];

/**
 * Validation for report queries
 */
const reportQueryValidation = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),

    query('status')
        .optional()
        .isIn(['pending', 'investigating', 'verified', 'false_alarm', 'resolved'])
        .withMessage('Invalid status filter'),

    query('reportType')
        .optional()
        .isIn(['counterfeit', 'tampered', 'expired_sold', 'mislabeled', 'other'])
        .withMessage('Invalid report type filter'),

    query('severityLevel')
        .optional()
        .isIn(['low', 'medium', 'high', 'critical'])
        .withMessage('Invalid severity level filter'),

    query('drugName')
        .optional()
        .isLength({ min: 1, max: 255 })
        .withMessage('Drug name filter must be less than 255 characters')
        .trim(),

    query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid date'),

    query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid date')
];

/**
 * Validation for statistics query
 */
const statsValidation = [
    query('timeframe')
        .optional()
        .isIn(['24h', '7d', '30d', '1y'])
        .withMessage('Invalid timeframe. Use: 24h, 7d, 30d, or 1y')
];

// Public routes (with optional authentication for enhanced features)

/**
 * @route   POST /api/reports/create
 * @desc    Create a new counterfeit drug report
 * @access  Public (enhanced features with authentication)
 */
router.post('/create',
    optionalAuth,
    rateLimitByUser(10, 60 * 60 * 1000), // 10 reports per hour
    upload.fields([
        { name: 'evidence', maxCount: 5 },
        { name: 'packaging', maxCount: 5 }
    ]),
    createReportValidation,
    auditLog('COUNTERFEIT_REPORT_CREATE'),
    (req, res, next) => {
        // Handle multer errors
        if (req.files) {
            const totalFiles = (req.files.evidence || []).length + (req.files.packaging || []).length;
            if (totalFiles > 10) {
                return res.status(400).json({
                    success: false,
                    message: 'Maximum 10 files allowed per report'
                });
            }
        }
        next();
    },
    reportsController.createReport
);

// Protected routes (authentication required)

/**
 * @route   GET /api/reports
 * @desc    Get list of counterfeit reports with filtering and pagination
 * @access  Private
 */
router.get('/',
    authenticateToken,
    reportQueryValidation,
    auditLog('REPORTS_LIST_VIEW'),
    reportsController.getReports
);

/**
 * @route   GET /api/reports/:reportId
 * @desc    Get detailed report by ID
 * @access  Private
 */
router.get('/:reportId',
    authenticateToken,
    param('reportId').isInt({ min: 1 }).withMessage('Valid report ID is required'),
    auditLog('REPORT_DETAIL_VIEW'),
    reportsController.getReportById
);

/**
 * @route   PUT /api/reports/:reportId
 * @desc    Update report status and investigation notes (admin/investigator only)
 * @access  Private (Admin, Pharmacist)
 */
router.put('/:reportId',
    authenticateToken,
    authorize('admin', 'pharmacist'),
    updateReportValidation,
    auditLog('REPORT_UPDATE'),
    reportsController.updateReport
);

/**
 * @route   DELETE /api/reports/:reportId
 * @desc    Delete report (admin only)
 * @access  Private (Admin only)
 */
router.delete('/:reportId',
    authenticateToken,
    authorize('admin'),
    param('reportId').isInt({ min: 1 }).withMessage('Valid report ID is required'),
    auditLog('REPORT_DELETE'),
    reportsController.deleteReport
);

/**
 * @route   GET /api/reports/stats/overview
 * @desc    Get report statistics and analytics
 * @access  Private (Admin, Pharmacist)
 */
router.get('/stats/overview',
    authenticateToken,
    authorize('admin', 'pharmacist'),
    statsValidation,
    auditLog('REPORT_STATS_VIEW'),
    reportsController.getReportStats
);

/**
 * @route   POST /api/reports/:reportId/assign
 * @desc    Assign report to an investigator (admin only)
 * @access  Private (Admin only)
 */
router.post('/:reportId/assign',
    authenticateToken,
    authorize('admin'),
    param('reportId').isInt({ min: 1 }).withMessage('Valid report ID is required'),
    body('investigatorId').isInt({ min: 1 }).withMessage('Valid investigator ID is required'),
    auditLog('REPORT_ASSIGN'),
    async (req, res) => {
        try {
            const { reportId } = req.params;
            const { investigatorId } = req.body;
            const dbManager = require('../config/database');

            // Check if investigator exists and has appropriate role
            const investigator = await dbManager.queryOne(
                'SELECT id, username, role FROM users WHERE id = ? AND role IN (?, ?)',
                [investigatorId, 'admin', 'pharmacist']
            );

            if (!investigator) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid investigator or insufficient permissions'
                });
            }

            // Update report assignment
            const result = await dbManager.run(
                'UPDATE counterfeit_reports SET assigned_investigator_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [investigatorId, 'investigating', reportId]
            );

            if (result.changes === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Report not found'
                });
            }

            // Log the assignment
            await dbManager.run(`
                INSERT INTO audit_trail (user_id, action, table_name, record_id, new_values, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                req.user.id,
                'REPORT_ASSIGNED',
                'counterfeit_reports',
                reportId,
                JSON.stringify({
                    assigned_to: investigator.username,
                    assigned_by: req.user.username
                }),
                req.ip,
                req.get('User-Agent')
            ]);

            res.json({
                success: true,
                message: 'Report assigned successfully',
                assigned_to: {
                    id: investigator.id,
                    username: investigator.username,
                    role: investigator.role
                }
            });

        } catch (error) {
            console.error('Report assignment error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to assign report',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

/**
 * @route   POST /api/reports/:reportId/resolve
 * @desc    Mark report as resolved (investigator/admin only)
 * @access  Private (Admin, Pharmacist)
 */
router.post('/:reportId/resolve',
    authenticateToken,
    authorize('admin', 'pharmacist'),
    param('reportId').isInt({ min: 1 }).withMessage('Valid report ID is required'),
    body('resolutionNotes').isLength({ min: 10, max: 2000 }).withMessage('Resolution notes must be between 10 and 2000 characters'),
    body('outcome').isIn(['confirmed_counterfeit', 'false_alarm', 'insufficient_evidence']).withMessage('Invalid outcome'),
    auditLog('REPORT_RESOLVE'),
    async (req, res) => {
        try {
            const { reportId } = req.params;
            const { resolutionNotes, outcome } = req.body;
            const dbManager = require('../config/database');

            // Check if user is assigned investigator or admin
            const report = await dbManager.queryOne(
                'SELECT assigned_investigator_id FROM counterfeit_reports WHERE id = ?',
                [reportId]
            );

            if (!report) {
                return res.status(404).json({
                    success: false,
                    message: 'Report not found'
                });
            }

            if (req.user.role !== 'admin' && report.assigned_investigator_id !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'You can only resolve reports assigned to you'
                });
            }

            // Update report
            await dbManager.run(`
                UPDATE counterfeit_reports
                SET status = 'resolved',
                    resolution_notes = ?,
                    resolved_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [resolutionNotes, reportId]);

            // Log the resolution
            await dbManager.run(`
                INSERT INTO audit_trail (user_id, action, table_name, record_id, new_values, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                req.user.id,
                'REPORT_RESOLVED',
                'counterfeit_reports',
                reportId,
                JSON.stringify({
                    outcome: outcome,
                    resolved_by: req.user.username,
                    resolution_notes: resolutionNotes
                }),
                req.ip,
                req.get('User-Agent')
            ]);

            res.json({
                success: true,
                message: 'Report resolved successfully',
                outcome: outcome,
                resolved_by: req.user.username,
                resolved_at: new Date().toISOString()
            });

        } catch (error) {
            console.error('Report resolution error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to resolve report',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

/**
 * @route   GET /api/reports/my/reports
 * @desc    Get current user's reports
 * @access  Private
 */
router.get('/my/reports',
    authenticateToken,
    reportQueryValidation,
    auditLog('MY_REPORTS_VIEW'),
    async (req, res) => {
        // Modify the request to filter by current user
        req.query.reporterId = req.user.id;
        return reportsController.getReports(req, res);
    }
);

// Health check endpoint
/**
 * @route   GET /api/reports/health
 * @desc    Check reports service health
 * @access  Public
 */
router.get('/health', async (req, res) => {
    try {
        const dbManager = require('../config/database');

        // Test database connectivity
        const reportCount = await dbManager.queryOne(
            'SELECT COUNT(*) as count FROM counterfeit_reports'
        );

        res.json({
            success: true,
            service: 'Reports Service',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            metrics: {
                total_reports: reportCount.count
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            service: 'Reports Service',
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// Error handling middleware for this router
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File size too large. Maximum size is 5MB per file.'
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Too many files. Maximum 10 files allowed.'
            });
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                message: 'Unexpected file field. Use "evidence" or "packaging" field names.'
            });
        }
    }

    if (error.message === 'Only image files are allowed') {
        return res.status(400).json({
            success: false,
            message: 'Only image files are allowed for evidence uploads.'
        });
    }

    console.error('Reports route error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

module.exports = router;
