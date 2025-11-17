const dbManager = require('../config/database');
const blockchain = require('../utils/blockchain');
const crypto = require('crypto');
const QrCode = require('qrcode');
const Jimp = require('jimp');
const jsQR = require('jsqr');

/**
 * Drug Verification Controller
 * Handles drug authenticity verification through QR codes, barcodes, and manual entry
 */
class VerificationController {

    /**
     * Verify drug authenticity by QR code or barcode
     */
    async verifyDrug(req, res) {
        try {
            const {
                qrCode,
                barcode,
                batchNumber,
                drugCode,
                verificationMethod = 'manual_entry',
                locationData = null,
                deviceInfo = null
            } = req.body;

            const userId = req.user ? req.user.id : null;
            const ipAddress = req.ip;
            const userAgent = req.get('User-Agent');
            const startTime = Date.now();

            let verificationResult = {
                success: false,
                result: 'unknown',
                authenticity_score: 0,
                risk_factors: [],
                batch_info: null,
                supply_chain: null,
                alerts: []
            };

            // Determine verification method and find batch
            let batch = null;
            let actualMethod = verificationMethod;

            if (qrCode) {
                actualMethod = 'qr_scan';
                batch = await this.verifyQRCode(qrCode);
            } else if (barcode) {
                actualMethod = 'barcode_scan';
                batch = await this.verifyBarcode(barcode);
            } else if (batchNumber && drugCode) {
                batch = await this.verifyManualEntry(batchNumber, drugCode);
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'QR code, barcode, or batch number with drug code required'
                });
            }

            if (!batch) {
                verificationResult.result = 'unknown';
                verificationResult.risk_factors.push('Batch not found in database');
            } else {
                // Perform comprehensive verification
                verificationResult = await this.performVerification(batch);
            }

            // Calculate response time
            const responseTime = Date.now() - startTime;

            // Log verification attempt
            await dbManager.run(`
                INSERT INTO verification_logs
                (user_id, batch_id, verification_method, scanned_data, verification_result,
                 authenticity_score, risk_factors, location_data, device_info, ip_address,
                 user_agent, response_time_ms)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                userId,
                batch ? batch.id : null,
                actualMethod,
                qrCode || barcode || `${batchNumber}:${drugCode}`,
                verificationResult.result,
                verificationResult.authenticity_score,
                JSON.stringify(verificationResult.risk_factors),
                JSON.stringify(locationData),
                JSON.stringify(deviceInfo),
                ipAddress,
                userAgent,
                responseTime
            ]);

            // Check for alerts and suspicious activity
            if (verificationResult.result === 'counterfeit' || verificationResult.result === 'suspicious') {
                await this.createSuspiciousActivityAlert(batch, verificationResult, req.user);
            }

            res.json({
                success: true,
                verification: verificationResult,
                response_time_ms: responseTime,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Drug verification error:', error);
            res.status(500).json({
                success: false,
                message: 'Verification failed',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Verify QR code data
     */
    async verifyQRCode(qrCodeData) {
        try {
            // Parse QR code data
            const parsedData = JSON.parse(qrCodeData);
            const { drug_id, batch_id, batch_number, hash } = parsedData;

            // Validate QR code integrity
            if (!dbManager.validateQRCode(qrCodeData)) {
                return null;
            }

            // Find batch by QR code or batch details
            const batch = await dbManager.queryOne(`
                SELECT
                    db.*,
                    d.name as drug_name,
                    d.drug_code,
                    d.generic_name,
                    d.brand_name,
                    m.name as manufacturer_name,
                    m.code as manufacturer_code
                FROM drug_batches db
                JOIN drugs d ON db.drug_id = d.id
                JOIN manufacturers m ON d.manufacturer_id = m.id
                WHERE db.qr_code = ? OR (db.id = ? AND d.id = ? AND db.batch_number = ?)
            `, [qrCodeData, batch_id, drug_id, batch_number]);

            return batch;
        } catch (error) {
            console.error('QR code verification error:', error);
            return null;
        }
    }

    /**
     * Verify barcode data
     */
    async verifyBarcode(barcodeData) {
        try {
            const batch = await dbManager.queryOne(`
                SELECT
                    db.*,
                    d.name as drug_name,
                    d.drug_code,
                    d.generic_name,
                    d.brand_name,
                    m.name as manufacturer_name,
                    m.code as manufacturer_code
                FROM drug_batches db
                JOIN drugs d ON db.drug_id = d.id
                JOIN manufacturers m ON d.manufacturer_id = m.id
                WHERE db.barcode = ?
            `, [barcodeData]);

            return batch;
        } catch (error) {
            console.error('Barcode verification error:', error);
            return null;
        }
    }

    /**
     * Verify manual entry
     */
    async verifyManualEntry(batchNumber, drugCode) {
        try {
            const batch = await dbManager.queryOne(`
                SELECT
                    db.*,
                    d.name as drug_name,
                    d.drug_code,
                    d.generic_name,
                    d.brand_name,
                    m.name as manufacturer_name,
                    m.code as manufacturer_code
                FROM drug_batches db
                JOIN drugs d ON db.drug_id = d.id
                JOIN manufacturers m ON d.manufacturer_id = m.id
                WHERE db.batch_number = ? AND d.drug_code = ?
            `, [batchNumber, drugCode]);

            return batch;
        } catch (error) {
            console.error('Manual entry verification error:', error);
            return null;
        }
    }

    /**
     * Perform comprehensive verification
     */
    async performVerification(batch) {
        const verificationResult = {
            success: true,
            result: 'authentic',
            authenticity_score: 100,
            risk_factors: [],
            batch_info: batch,
            supply_chain: null,
            alerts: []
        };

        // Check expiry date
        const currentDate = new Date();
        const expiryDate = new Date(batch.expiry_date);

        if (expiryDate < currentDate) {
            verificationResult.result = 'expired';
            verificationResult.authenticity_score -= 30;
            verificationResult.risk_factors.push('Product expired');
        }

        // Check batch status
        if (batch.status === 'recalled') {
            verificationResult.result = 'recalled';
            verificationResult.authenticity_score -= 50;
            verificationResult.risk_factors.push('Batch has been recalled');
        }

        if (batch.status === 'depleted') {
            verificationResult.authenticity_score -= 20;
            verificationResult.risk_factors.push('Batch depleted - may be counterfeit');
        }

        // Check quality control status
        if (batch.quality_check_status === 'failed') {
            verificationResult.result = 'suspicious';
            verificationResult.authenticity_score -= 40;
            verificationResult.risk_factors.push('Failed quality control check');
        }

        // Get supply chain history
        try {
            const supplyChainHistory = await blockchain.getSupplyChainHistory(batch.id);
            verificationResult.supply_chain = supplyChainHistory;

            // Detect supply chain anomalies
            const anomalies = await blockchain.detectAnomalies(batch.id);
            if (anomalies.anomaliesDetected) {
                verificationResult.authenticity_score -= (anomalies.totalAnomalies * 10);
                verificationResult.risk_factors.push(`Supply chain anomalies detected: ${anomalies.totalAnomalies}`);

                if (anomalies.riskLevel === 'high') {
                    verificationResult.result = 'suspicious';
                }
            }
        } catch (error) {
            console.error('Supply chain verification error:', error);
            verificationResult.risk_factors.push('Unable to verify supply chain');
            verificationResult.authenticity_score -= 15;
        }

        // Check for active alerts related to this batch
        const alerts = await this.getActiveAlerts(batch.id, batch.drug_id);
        if (alerts.length > 0) {
            verificationResult.alerts = alerts;
            verificationResult.authenticity_score -= (alerts.length * 10);

            const criticalAlerts = alerts.filter(a => a.severity === 'critical');
            if (criticalAlerts.length > 0) {
                verificationResult.result = 'counterfeit';
                verificationResult.authenticity_score = Math.min(verificationResult.authenticity_score, 20);
            }
        }

        // Final score calculation
        verificationResult.authenticity_score = Math.max(0, Math.min(100, verificationResult.authenticity_score));

        // Determine final result based on score
        if (verificationResult.result === 'authentic') {
            if (verificationResult.authenticity_score < 30) {
                verificationResult.result = 'counterfeit';
            } else if (verificationResult.authenticity_score < 70) {
                verificationResult.result = 'suspicious';
            }
        }

        return verificationResult;
    }

    /**
     * Get active alerts for batch or drug
     */
    async getActiveAlerts(batchId, drugId) {
        try {
            const alerts = await dbManager.query(`
                SELECT * FROM alerts
                WHERE (related_batch_id = ? OR related_drug_id = ?)
                AND is_active = 1
                AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
                ORDER BY severity DESC, created_at DESC
            `, [batchId, drugId]);

            return alerts.map(alert => ({
                id: alert.id,
                type: alert.alert_type,
                title: alert.title,
                message: alert.message,
                severity: alert.severity,
                created_at: alert.created_at
            }));
        } catch (error) {
            console.error('Error getting alerts:', error);
            return [];
        }
    }

    /**
     * Create suspicious activity alert
     */
    async createSuspiciousActivityAlert(batch, verificationResult, user) {
        try {
            const alertTitle = verificationResult.result === 'counterfeit'
                ? 'Counterfeit Drug Detected'
                : 'Suspicious Drug Activity';

            const alertMessage = `${alertTitle} - ${batch ? batch.drug_name : 'Unknown drug'}
                (Batch: ${batch ? batch.batch_number : 'Unknown'})
                verified with authenticity score: ${verificationResult.authenticity_score}%.
                Risk factors: ${verificationResult.risk_factors.join(', ')}`;

            await dbManager.run(`
                INSERT INTO alerts
                (alert_type, title, message, severity, related_batch_id, related_drug_id,
                 target_audience, is_public, created_by_user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                verificationResult.result === 'counterfeit' ? 'counterfeit_detected' : 'suspicious_activity',
                alertTitle,
                alertMessage,
                verificationResult.result === 'counterfeit' ? 'critical' : 'warning',
                batch ? batch.id : null,
                batch ? batch.drug_id : null,
                JSON.stringify(['admin', 'pharmacist']),
                verificationResult.result === 'counterfeit' ? 1 : 0,
                user ? user.id : null
            ]);
        } catch (error) {
            console.error('Error creating alert:', error);
        }
    }

    /**
     * Upload and scan image for QR/Barcode
     */
    async scanImage(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Image file required'
                });
            }

            const image = await Jimp.read(req.file.buffer);
            const { data, width, height } = image.bitmap;

            // Convert to format suitable for jsQR
            const code = jsQR(new Uint8ClampedArray(data), width, height);

            if (code) {
                // Found QR code, attempt verification
                const verificationData = {
                    qrCode: code.data,
                    verificationMethod: 'qr_scan'
                };

                // Reuse verification logic
                req.body = verificationData;
                return await this.verifyDrug(req, res);
            } else {
                // Try barcode scanning (would need additional library for various formats)
                return res.status(400).json({
                    success: false,
                    message: 'No QR code or barcode detected in image'
                });
            }

        } catch (error) {
            console.error('Image scanning error:', error);
            res.status(500).json({
                success: false,
                message: 'Image scanning failed',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Generate QR code for a batch
     */
    async generateQRCode(req, res) {
        try {
            const { batchId } = req.params;

            // Check if user has permission to generate QR codes
            if (!req.user || !['admin', 'manufacturer'].includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions to generate QR codes'
                });
            }

            const batch = await dbManager.queryOne(`
                SELECT db.*, d.id as drug_id, d.drug_code
                FROM drug_batches db
                JOIN drugs d ON db.drug_id = d.id
                WHERE db.id = ?
            `, [batchId]);

            if (!batch) {
                return res.status(404).json({
                    success: false,
                    message: 'Batch not found'
                });
            }

            // Generate QR code data
            const qrCodeData = dbManager.generateQRCode(batch.drug_id, batch.id, batch.batch_number);

            // Update batch with QR code
            await dbManager.run(
                'UPDATE drug_batches SET qr_code = ? WHERE id = ?',
                [qrCodeData, batch.id]
            );

            // Generate QR code image
            const qrCodeImage = await QrCode.toDataURL(qrCodeData, {
                errorCorrectionLevel: 'M',
                type: 'image/png',
                quality: 0.92,
                margin: 1,
                width: 256
            });

            res.json({
                success: true,
                qr_code_data: qrCodeData,
                qr_code_image: qrCodeImage,
                batch_id: batch.id,
                batch_number: batch.batch_number
            });

        } catch (error) {
            console.error('QR code generation error:', error);
            res.status(500).json({
                success: false,
                message: 'QR code generation failed',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Get verification statistics
     */
    async getVerificationStats(req, res) {
        try {
            const { timeframe = '30d' } = req.query;

            let dateFilter = '';
            switch (timeframe) {
                case '24h':
                    dateFilter = "AND verification_time > datetime('now', '-1 day')";
                    break;
                case '7d':
                    dateFilter = "AND verification_time > datetime('now', '-7 days')";
                    break;
                case '30d':
                    dateFilter = "AND verification_time > datetime('now', '-30 days')";
                    break;
                case '1y':
                    dateFilter = "AND verification_time > datetime('now', '-1 year')";
                    break;
            }

            const stats = await dbManager.query(`
                SELECT
                    verification_result,
                    COUNT(*) as count,
                    AVG(authenticity_score) as avg_score,
                    AVG(response_time_ms) as avg_response_time
                FROM verification_logs
                WHERE 1=1 ${dateFilter}
                GROUP BY verification_result
                ORDER BY count DESC
            `);

            const totalVerifications = await dbManager.queryOne(`
                SELECT COUNT(*) as total FROM verification_logs WHERE 1=1 ${dateFilter}
            `);

            const methodStats = await dbManager.query(`
                SELECT
                    verification_method,
                    COUNT(*) as count
                FROM verification_logs
                WHERE 1=1 ${dateFilter}
                GROUP BY verification_method
                ORDER BY count DESC
            `);

            const hourlyStats = await dbManager.query(`
                SELECT
                    strftime('%H', verification_time) as hour,
                    COUNT(*) as count
                FROM verification_logs
                WHERE verification_time > datetime('now', '-24 hours')
                GROUP BY hour
                ORDER BY hour
            `);

            res.json({
                success: true,
                timeframe,
                stats: {
                    total_verifications: totalVerifications.total,
                    by_result: stats,
                    by_method: methodStats,
                    hourly_distribution: hourlyStats
                }
            });

        } catch (error) {
            console.error('Stats retrieval error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve statistics',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Get verification history for a user
     */
    async getVerificationHistory(req, res) {
        try {
            const { page = 1, limit = 20 } = req.query;
            const offset = (page - 1) * limit;

            let whereClause = '1=1';
            const params = [];

            // Filter by user if not admin
            if (req.user.role !== 'admin') {
                whereClause += ' AND vl.user_id = ?';
                params.push(req.user.id);
            }

            const history = await dbManager.query(`
                SELECT
                    vl.*,
                    db.batch_number,
                    d.name as drug_name,
                    d.drug_code,
                    u.username
                FROM verification_logs vl
                LEFT JOIN drug_batches db ON vl.batch_id = db.id
                LEFT JOIN drugs d ON db.drug_id = d.id
                LEFT JOIN users u ON vl.user_id = u.id
                WHERE ${whereClause}
                ORDER BY vl.verification_time DESC
                LIMIT ? OFFSET ?
            `, [...params, limit, offset]);

            const totalCount = await dbManager.queryOne(`
                SELECT COUNT(*) as count
                FROM verification_logs vl
                WHERE ${whereClause}
            `, params);

            // Parse JSON fields
            history.forEach(record => {
                try {
                    record.risk_factors = record.risk_factors ? JSON.parse(record.risk_factors) : [];
                    record.location_data = record.location_data ? JSON.parse(record.location_data) : null;
                    record.device_info = record.device_info ? JSON.parse(record.device_info) : null;
                } catch (e) {
                    // Keep as strings if parsing fails
                }
            });

            res.json({
                success: true,
                history,
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total_count: totalCount.count,
                    total_pages: Math.ceil(totalCount.count / limit)
                }
            });

        } catch (error) {
            console.error('History retrieval error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve verification history',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

module.exports = new VerificationController();
