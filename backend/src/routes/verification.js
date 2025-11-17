const express = require('express');
const multer = require('multer');
const { body, param, query } = require('express-validator');
const verificationController = require('../controllers/verificationController');
const { authenticateToken, optionalAuth, authorize, auditLog, rateLimitByUser } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
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
 * Validation rules for drug verification
 */
const verificationValidation = [
    body('qrCode')
        .optional()
        .isString()
        .withMessage('QR code must be a string'),

    body('barcode')
        .optional()
        .isString()
        .withMessage('Barcode must be a string'),

    body('batchNumber')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('Batch number must be between 1 and 100 characters')
        .trim(),

    body('drugCode')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('Drug code must be between 1 and 100 characters')
        .trim(),

    body('verificationMethod')
        .optional()
        .isIn(['qr_scan', 'barcode_scan', 'manual_entry'])
        .withMessage('Invalid verification method'),

    body('locationData')
        .optional()
        .isObject()
        .withMessage('Location data must be an object'),

    body('deviceInfo')
        .optional()
        .isObject()
        .withMessage('Device info must be an object'),

    // Custom validation to ensure at least one verification method is provided
    body().custom((value, { req }) => {
        const { qrCode, barcode, batchNumber, drugCode } = req.body;

        if (!qrCode && !barcode && !(batchNumber && drugCode)) {
            throw new Error('Either QR code, barcode, or batch number with drug code must be provided');
        }

        return true;
    })
];

/**
 * Validation for QR code generation
 */
const qrGenerationValidation = [
    param('batchId')
        .isInt({ min: 1 })
        .withMessage('Valid batch ID is required')
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

/**
 * Validation for history query
 */
const historyValidation = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
];

// Public routes (with optional authentication)

/**
 * @route   POST /api/verification/verify
 * @desc    Verify drug authenticity by QR code, barcode, or manual entry
 * @access  Public (enhanced features with authentication)
 */
router.post('/verify',
    optionalAuth,
    rateLimitByUser(50, 15 * 60 * 1000), // 50 requests per 15 minutes
    verificationValidation,
    auditLog('DRUG_VERIFICATION'),
    verificationController.verifyDrug
);

/**
 * @route   POST /api/verification/scan-image
 * @desc    Upload and scan image for QR code or barcode
 * @access  Public (enhanced features with authentication)
 */
router.post('/scan-image',
    optionalAuth,
    rateLimitByUser(20, 15 * 60 * 1000), // 20 uploads per 15 minutes
    upload.single('image'),
    auditLog('IMAGE_SCAN'),
    (req, res, next) => {
        // Handle multer errors
        if (req.file && req.file.size > (parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024)) {
            return res.status(400).json({
                success: false,
                message: 'File size too large. Maximum size is 5MB.'
            });
        }
        next();
    },
    verificationController.scanImage
);

// Protected routes (authentication required)

/**
 * @route   POST /api/verification/generate-qr/:batchId
 * @desc    Generate QR code for a batch (manufacturers and admins only)
 * @access  Private (Manufacturer, Admin)
 */
router.post('/generate-qr/:batchId',
    authenticateToken,
    authorize('admin', 'manufacturer'),
    qrGenerationValidation,
    auditLog('QR_CODE_GENERATION'),
    verificationController.generateQRCode
);

/**
 * @route   GET /api/verification/stats
 * @desc    Get verification statistics
 * @access  Private (Admin, Pharmacist)
 */
router.get('/stats',
    authenticateToken,
    authorize('admin', 'pharmacist'),
    statsValidation,
    auditLog('VERIFICATION_STATS_VIEW'),
    verificationController.getVerificationStats
);

/**
 * @route   GET /api/verification/history
 * @desc    Get verification history for current user (or all for admins)
 * @access  Private
 */
router.get('/history',
    authenticateToken,
    historyValidation,
    auditLog('VERIFICATION_HISTORY_VIEW'),
    verificationController.getVerificationHistory
);

/**
 * @route   GET /api/verification/batch/:batchId
 * @desc    Get detailed verification info for a specific batch
 * @access  Private (Admin, Pharmacist, Manufacturer)
 */
router.get('/batch/:batchId',
    authenticateToken,
    authorize('admin', 'pharmacist', 'manufacturer'),
    param('batchId').isInt({ min: 1 }).withMessage('Valid batch ID is required'),
    auditLog('BATCH_DETAIL_VIEW'),
    async (req, res) => {
        try {
            const { batchId } = req.params;
            const dbManager = require('../config/database');
            const blockchain = require('../utils/blockchain');

            // Get batch details
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
                WHERE db.id = ?
            `, [batchId]);

            if (!batch) {
                return res.status(404).json({
                    success: false,
                    message: 'Batch not found'
                });
            }

            // Get supply chain history
            const supplyChain = await blockchain.getSupplyChainHistory(batchId);

            // Get verification logs for this batch
            const verificationLogs = await dbManager.query(`
                SELECT
                    vl.*,
                    u.username,
                    u.role
                FROM verification_logs vl
                LEFT JOIN users u ON vl.user_id = u.id
                WHERE vl.batch_id = ?
                ORDER BY vl.verification_time DESC
                LIMIT 50
            `, [batchId]);

            // Parse JSON fields in verification logs
            verificationLogs.forEach(log => {
                try {
                    log.risk_factors = log.risk_factors ? JSON.parse(log.risk_factors) : [];
                    log.location_data = log.location_data ? JSON.parse(log.location_data) : null;
                    log.device_info = log.device_info ? JSON.parse(log.device_info) : null;
                } catch (e) {
                    // Keep original values if parsing fails
                }
            });

            res.json({
                success: true,
                batch: batch,
                supply_chain: supplyChain,
                verification_logs: verificationLogs,
                total_verifications: verificationLogs.length
            });

        } catch (error) {
            console.error('Batch detail retrieval error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve batch details',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

/**
 * @route   GET /api/verification/alerts
 * @desc    Get active verification alerts
 * @access  Private
 */
router.get('/alerts',
    authenticateToken,
    auditLog('ALERTS_VIEW'),
    async (req, res) => {
        try {
            const dbManager = require('../config/database');
            const { page = 1, limit = 20 } = req.query;
            const offset = (page - 1) * limit;

            let whereClause = `
                WHERE a.is_active = 1
                AND (a.expires_at IS NULL OR a.expires_at > CURRENT_TIMESTAMP)
            `;
            const params = [];

            // Filter alerts based on user role
            if (req.user.role !== 'admin') {
                whereClause += ` AND (a.is_public = 1 OR a.target_audience LIKE ?)`;
                params.push(`%"${req.user.role}"%`);
            }

            const alerts = await dbManager.query(`
                SELECT
                    a.*,
                    db.batch_number,
                    d.name as drug_name,
                    cr.description as report_description
                FROM alerts a
                LEFT JOIN drug_batches db ON a.related_batch_id = db.id
                LEFT JOIN drugs d ON a.related_drug_id = d.id
                LEFT JOIN counterfeit_reports cr ON a.related_report_id = cr.id
                ${whereClause}
                ORDER BY
                    CASE a.severity
                        WHEN 'critical' THEN 1
                        WHEN 'error' THEN 2
                        WHEN 'warning' THEN 3
                        WHEN 'info' THEN 4
                    END,
                    a.created_at DESC
                LIMIT ? OFFSET ?
            `, [...params, limit, offset]);

            const totalCount = await dbManager.queryOne(`
                SELECT COUNT(*) as count FROM alerts a ${whereClause}
            `, params);

            res.json({
                success: true,
                alerts,
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total_count: totalCount.count,
                    total_pages: Math.ceil(totalCount.count / limit)
                }
            });

        } catch (error) {
            console.error('Alerts retrieval error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve alerts',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

/**
 * @route   PUT /api/verification/alerts/:alertId/dismiss
 * @desc    Dismiss an alert for the current user
 * @access  Private
 */
router.put('/alerts/:alertId/dismiss',
    authenticateToken,
    param('alertId').isInt({ min: 1 }).withMessage('Valid alert ID is required'),
    auditLog('ALERT_DISMISS'),
    async (req, res) => {
        try {
            const dbManager = require('../config/database');
            const { alertId } = req.params;

            // Check if alert exists
            const alert = await dbManager.queryOne(
                'SELECT id FROM alerts WHERE id = ? AND is_active = 1',
                [alertId]
            );

            if (!alert) {
                return res.status(404).json({
                    success: false,
                    message: 'Alert not found or already inactive'
                });
            }

            // Create or update user alert subscription
            await dbManager.run(`
                INSERT OR REPLACE INTO user_alert_subscriptions
                (user_id, alert_id, is_dismissed, dismissed_at)
                VALUES (?, ?, 1, CURRENT_TIMESTAMP)
            `, [req.user.id, alertId]);

            res.json({
                success: true,
                message: 'Alert dismissed successfully'
            });

        } catch (error) {
            console.error('Alert dismissal error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to dismiss alert',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

// Health check endpoint
/**
 * @route   GET /api/verification/health
 * @desc    Check verification service health
 * @access  Public
 */
router.get('/health', async (req, res) => {
    try {
        const dbManager = require('../config/database');
        const blockchain = require('../utils/blockchain');

        // Test database connectivity
        const dbHealth = await dbManager.healthCheck();

        // Test blockchain functionality
        const blockchainStats = await blockchain.getBlockchainStats();

        res.json({
            success: true,
            service: 'Drug Verification Service',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            components: {
                database: {
                    status: dbHealth.status,
                    connected: dbHealth.connected
                },
                blockchain: {
                    status: 'healthy',
                    total_blocks: blockchainStats.total_blocks
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            service: 'Drug Verification Service',
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
                message: 'File size too large. Maximum size is 5MB.'
            });
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                message: 'Unexpected file field. Use "image" field name.'
            });
        }
    }

    if (error.message === 'Only image files are allowed') {
        return res.status(400).json({
            success: false,
            message: 'Only image files are allowed for scanning.'
        });
    }

    console.error('Verification route error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

module.exports = router;
