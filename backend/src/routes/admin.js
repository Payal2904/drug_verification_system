const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticateToken, authorize, auditLog } = require('../middleware/auth');
const dbManager = require('../config/database');
const blockchain = require('../utils/blockchain');

const router = express.Router();

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard overview data
 * @access  Private (Admin only)
 */
router.get('/dashboard',
    authenticateToken,
    authorize('admin'),
    auditLog('ADMIN_DASHBOARD_VIEW'),
    async (req, res) => {
        try {
            // Get system statistics
            const stats = await dbManager.getStats();

            // Get recent activity
            const recentVerifications = await dbManager.query(`
                SELECT COUNT(*) as count, DATE(verification_time) as date
                FROM verification_logs
                WHERE verification_time > datetime('now', '-7 days')
                GROUP BY DATE(verification_time)
                ORDER BY date DESC
            `);

            const recentReports = await dbManager.query(`
                SELECT COUNT(*) as count, severity_level, status
                FROM counterfeit_reports
                WHERE created_at > datetime('now', '-7 days')
                GROUP BY severity_level, status
            `);

            // Get active alerts
            const activeAlerts = await dbManager.query(`
                SELECT alert_type, severity, COUNT(*) as count
                FROM alerts
                WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
                GROUP BY alert_type, severity
                ORDER BY
                    CASE severity
                        WHEN 'critical' THEN 1
                        WHEN 'error' THEN 2
                        WHEN 'warning' THEN 3
                        WHEN 'info' THEN 4
                    END
            `);

            // Get top verified drugs
            const topDrugs = await dbManager.query(`
                SELECT d.name, COUNT(vl.id) as verification_count
                FROM verification_logs vl
                JOIN drug_batches db ON vl.batch_id = db.id
                JOIN drugs d ON db.drug_id = d.id
                WHERE vl.verification_time > datetime('now', '-30 days')
                GROUP BY d.id, d.name
                ORDER BY verification_count DESC
                LIMIT 10
            `);

            // Get blockchain statistics
            const blockchainStats = await blockchain.getBlockchainStats();

            // System health metrics
            const systemHealth = {
                database: await dbManager.healthCheck(),
                blockchain: {
                    status: 'healthy',
                    total_blocks: blockchainStats.total_blocks,
                    integrity_verified: blockchainStats.chain_integrity.isValid
                },
                uptime: process.uptime(),
                memory_usage: process.memoryUsage()
            };

            res.json({
                success: true,
                dashboard: {
                    system_stats: stats,
                    recent_activity: {
                        verifications: recentVerifications,
                        reports: recentReports
                    },
                    active_alerts: activeAlerts,
                    top_drugs: topDrugs,
                    blockchain: blockchainStats,
                    system_health: systemHealth,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('Admin dashboard error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to load dashboard data',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

/**
 * @route   GET /api/admin/users
 * @desc    Get list of users with filtering and pagination
 * @access  Private (Admin only)
 */
router.get('/users',
    authenticateToken,
    authorize('admin'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('role').optional().isIn(['user', 'pharmacist', 'admin', 'manufacturer', 'distributor', 'retailer']).withMessage('Invalid role filter'),
    query('status').optional().isIn(['active', 'inactive', 'verified', 'unverified']).withMessage('Invalid status filter'),
    query('search').optional().isLength({ min: 1, max: 100 }).withMessage('Search query must be between 1 and 100 characters').trim(),
    auditLog('ADMIN_USERS_VIEW'),
    async (req, res) => {
        try {
            const { page = 1, limit = 20, role, status, search } = req.query;
            const offset = (page - 1) * limit;

            let whereClause = '1=1';
            const params = [];

            if (role) {
                whereClause += ' AND role = ?';
                params.push(role);
            }

            if (status) {
                if (status === 'active') {
                    whereClause += ' AND is_active = 1';
                } else if (status === 'inactive') {
                    whereClause += ' AND is_active = 0';
                } else if (status === 'verified') {
                    whereClause += ' AND is_verified = 1';
                } else if (status === 'unverified') {
                    whereClause += ' AND is_verified = 0';
                }
            }

            if (search) {
                whereClause += ' AND (username LIKE ? OR email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)';
                const searchParam = `%${search}%`;
                params.push(searchParam, searchParam, searchParam, searchParam);
            }

            const users = await dbManager.query(`
                SELECT id, username, email, first_name, last_name, role, organization,
                       license_number, is_active, is_verified, last_login, created_at
                FROM users
                WHERE ${whereClause}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            `, [...params, limit, offset]);

            const totalCount = await dbManager.queryOne(`
                SELECT COUNT(*) as count FROM users WHERE ${whereClause}
            `, params);

            res.json({
                success: true,
                users,
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total_count: totalCount.count,
                    total_pages: Math.ceil(totalCount.count / limit)
                }
            });

        } catch (error) {
            console.error('Admin users retrieval error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve users',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

/**
 * @route   PUT /api/admin/users/:userId
 * @desc    Update user details (admin only)
 * @access  Private (Admin only)
 */
router.put('/users/:userId',
    authenticateToken,
    authorize('admin'),
    param('userId').isInt({ min: 1 }).withMessage('Valid user ID is required'),
    body('role').optional().isIn(['user', 'pharmacist', 'admin', 'manufacturer', 'distributor', 'retailer']).withMessage('Invalid role'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    body('isVerified').optional().isBoolean().withMessage('isVerified must be a boolean'),
    auditLog('ADMIN_USER_UPDATE'),
    async (req, res) => {
        try {
            const { userId } = req.params;
            const { role, isActive, isVerified } = req.body;

            // Get current user for audit log
            const currentUser = await dbManager.queryOne(
                'SELECT * FROM users WHERE id = ?',
                [userId]
            );

            if (!currentUser) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Build update query
            const updateFields = [];
            const updateParams = [];

            if (role !== undefined) {
                updateFields.push('role = ?');
                updateParams.push(role);
            }
            if (isActive !== undefined) {
                updateFields.push('is_active = ?');
                updateParams.push(isActive ? 1 : 0);
            }
            if (isVerified !== undefined) {
                updateFields.push('is_verified = ?');
                updateParams.push(isVerified ? 1 : 0);
            }

            if (updateFields.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No fields to update'
                });
            }

            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            updateParams.push(userId);

            await dbManager.run(`
                UPDATE users SET ${updateFields.join(', ')} WHERE id = ?
            `, updateParams);

            // Log the update
            await dbManager.run(`
                INSERT INTO audit_trail (user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                req.user.id,
                'ADMIN_USER_UPDATE',
                'users',
                userId,
                JSON.stringify({
                    role: currentUser.role,
                    is_active: currentUser.is_active,
                    is_verified: currentUser.is_verified
                }),
                JSON.stringify({ role, isActive, isVerified }),
                req.ip,
                req.get('User-Agent')
            ]);

            const updatedUser = await dbManager.queryOne(`
                SELECT id, username, email, first_name, last_name, role, is_active, is_verified, updated_at
                FROM users WHERE id = ?
            `, [userId]);

            res.json({
                success: true,
                message: 'User updated successfully',
                user: updatedUser
            });

        } catch (error) {
            console.error('Admin user update error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update user',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

/**
 * @route   GET /api/admin/drugs
 * @desc    Get list of drugs with management capabilities
 * @access  Private (Admin only)
 */
router.get('/drugs',
    authenticateToken,
    authorize('admin'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('search').optional().isLength({ min: 1, max: 100 }).withMessage('Search query must be between 1 and 100 characters').trim(),
    query('manufacturerId').optional().isInt({ min: 1 }).withMessage('Manufacturer ID must be a positive integer'),
    auditLog('ADMIN_DRUGS_VIEW'),
    async (req, res) => {
        try {
            const { page = 1, limit = 20, search, manufacturerId } = req.query;
            const offset = (page - 1) * limit;

            let whereClause = '1=1';
            const params = [];

            if (search) {
                whereClause += ' AND (d.name LIKE ? OR d.generic_name LIKE ? OR d.drug_code LIKE ?)';
                const searchParam = `%${search}%`;
                params.push(searchParam, searchParam, searchParam);
            }

            if (manufacturerId) {
                whereClause += ' AND d.manufacturer_id = ?';
                params.push(manufacturerId);
            }

            const drugs = await dbManager.query(`
                SELECT
                    d.*,
                    m.name as manufacturer_name,
                    dc.name as category_name,
                    COUNT(db.id) as batch_count
                FROM drugs d
                LEFT JOIN manufacturers m ON d.manufacturer_id = m.id
                LEFT JOIN drug_categories dc ON d.category_id = dc.id
                LEFT JOIN drug_batches db ON d.id = db.drug_id
                WHERE ${whereClause}
                GROUP BY d.id
                ORDER BY d.created_at DESC
                LIMIT ? OFFSET ?
            `, [...params, limit, offset]);

            const totalCount = await dbManager.queryOne(`
                SELECT COUNT(*) as count FROM drugs d WHERE ${whereClause}
            `, params);

            // Parse JSON fields
            drugs.forEach(drug => {
                try {
                    drug.active_ingredients = drug.active_ingredients ? JSON.parse(drug.active_ingredients) : [];
                } catch (e) {
                    drug.active_ingredients = [];
                }
            });

            res.json({
                success: true,
                drugs,
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total_count: totalCount.count,
                    total_pages: Math.ceil(totalCount.count / limit)
                }
            });

        } catch (error) {
            console.error('Admin drugs retrieval error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve drugs',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

/**
 * @route   POST /api/admin/drugs
 * @desc    Create a new drug
 * @access  Private (Admin only)
 */
router.post('/drugs',
    authenticateToken,
    authorize('admin'),
    body('name').isLength({ min: 1, max: 255 }).withMessage('Drug name is required and must be less than 255 characters').trim(),
    body('drugCode').isLength({ min: 1, max: 100 }).withMessage('Drug code is required and must be less than 100 characters').trim(),
    body('manufacturerId').isInt({ min: 1 }).withMessage('Valid manufacturer ID is required'),
    body('dosageForm').optional().isLength({ max: 100 }).withMessage('Dosage form must be less than 100 characters').trim(),
    body('strength').optional().isLength({ max: 100 }).withMessage('Strength must be less than 100 characters').trim(),
    body('description').optional().isLength({ max: 2000 }).withMessage('Description must be less than 2000 characters').trim(),
    auditLog('ADMIN_DRUG_CREATE'),
    async (req, res) => {
        try {
            const {
                name,
                genericName,
                brandName,
                drugCode,
                ndcNumber,
                manufacturerId,
                categoryId,
                dosageForm,
                strength,
                activeIngredients = [],
                description,
                therapeuticClass,
                prescriptionRequired = true
            } = req.body;

            // Check if drug code already exists
            const existingDrug = await dbManager.queryOne(
                'SELECT id FROM drugs WHERE drug_code = ?',
                [drugCode]
            );

            if (existingDrug) {
                return res.status(409).json({
                    success: false,
                    message: 'Drug with this code already exists'
                });
            }

            // Verify manufacturer exists
            const manufacturer = await dbManager.queryOne(
                'SELECT id FROM manufacturers WHERE id = ?',
                [manufacturerId]
            );

            if (!manufacturer) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid manufacturer ID'
                });
            }

            const result = await dbManager.run(`
                INSERT INTO drugs
                (name, generic_name, brand_name, drug_code, ndc_number, manufacturer_id, category_id,
                 dosage_form, strength, active_ingredients, description, therapeutic_class, prescription_required)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                name, genericName, brandName, drugCode, ndcNumber, manufacturerId, categoryId,
                dosageForm, strength, JSON.stringify(activeIngredients), description, therapeuticClass, prescriptionRequired ? 1 : 0
            ]);

            const newDrug = await dbManager.queryOne(`
                SELECT d.*, m.name as manufacturer_name
                FROM drugs d
                LEFT JOIN manufacturers m ON d.manufacturer_id = m.id
                WHERE d.id = ?
            `, [result.id]);

            res.status(201).json({
                success: true,
                message: 'Drug created successfully',
                drug: newDrug
            });

        } catch (error) {
            console.error('Admin drug creation error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create drug',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

/**
 * @route   GET /api/admin/batches
 * @desc    Get list of drug batches
 * @access  Private (Admin only)
 */
router.get('/batches',
    authenticateToken,
    authorize('admin'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('drugId').optional().isInt({ min: 1 }).withMessage('Drug ID must be a positive integer'),
    query('status').optional().isIn(['active', 'recalled', 'expired', 'depleted']).withMessage('Invalid status filter'),
    auditLog('ADMIN_BATCHES_VIEW'),
    async (req, res) => {
        try {
            const { page = 1, limit = 20, drugId, status } = req.query;
            const offset = (page - 1) * limit;

            let whereClause = '1=1';
            const params = [];

            if (drugId) {
                whereClause += ' AND db.drug_id = ?';
                params.push(drugId);
            }

            if (status) {
                whereClause += ' AND db.status = ?';
                params.push(status);
            }

            const batches = await dbManager.query(`
                SELECT
                    db.*,
                    d.name as drug_name,
                    d.drug_code,
                    m.name as manufacturer_name,
                    COUNT(sct.id) as transaction_count
                FROM drug_batches db
                JOIN drugs d ON db.drug_id = d.id
                JOIN manufacturers m ON d.manufacturer_id = m.id
                LEFT JOIN supply_chain_transactions sct ON db.id = sct.batch_id
                WHERE ${whereClause}
                GROUP BY db.id
                ORDER BY db.created_at DESC
                LIMIT ? OFFSET ?
            `, [...params, limit, offset]);

            const totalCount = await dbManager.queryOne(`
                SELECT COUNT(*) as count FROM drug_batches db WHERE ${whereClause}
            `, params);

            res.json({
                success: true,
                batches,
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total_count: totalCount.count,
                    total_pages: Math.ceil(totalCount.count / limit)
                }
            });

        } catch (error) {
            console.error('Admin batches retrieval error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve batches',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

/**
 * @route   POST /api/admin/batches
 * @desc    Create a new drug batch
 * @access  Private (Admin only)
 */
router.post('/batches',
    authenticateToken,
    authorize('admin'),
    body('drugId').isInt({ min: 1 }).withMessage('Valid drug ID is required'),
    body('batchNumber').isLength({ min: 1, max: 100 }).withMessage('Batch number is required and must be less than 100 characters').trim(),
    body('manufacturingDate').isISO8601().withMessage('Valid manufacturing date is required'),
    body('expiryDate').isISO8601().withMessage('Valid expiry date is required'),
    body('quantityProduced').isInt({ min: 1 }).withMessage('Quantity produced must be a positive integer'),
    auditLog('ADMIN_BATCH_CREATE'),
    async (req, res) => {
        try {
            const {
                drugId,
                batchNumber,
                lotNumber,
                manufacturingDate,
                expiryDate,
                quantityProduced,
                packagingType,
                packageSize,
                price
            } = req.body;

            // Check if batch number already exists for this drug
            const existingBatch = await dbManager.queryOne(
                'SELECT id FROM drug_batches WHERE drug_id = ? AND batch_number = ?',
                [drugId, batchNumber]
            );

            if (existingBatch) {
                return res.status(409).json({
                    success: false,
                    message: 'Batch with this number already exists for this drug'
                });
            }

            // Verify drug exists
            const drug = await dbManager.queryOne(
                'SELECT id FROM drugs WHERE id = ?',
                [drugId]
            );

            if (!drug) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid drug ID'
                });
            }

            // Generate QR code and barcode
            const qrCode = dbManager.generateQRCode(drugId, null, batchNumber);
            const barcode = `BC${batchNumber}${Date.now().toString().slice(-6)}`;

            const result = await dbManager.run(`
                INSERT INTO drug_batches
                (drug_id, batch_number, lot_number, manufacturing_date, expiry_date,
                 quantity_produced, quantity_remaining, qr_code, barcode, packaging_type, package_size, price)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                drugId, batchNumber, lotNumber, manufacturingDate, expiryDate,
                quantityProduced, quantityProduced, qrCode, barcode, packagingType, packageSize, price
            ]);

            // Update QR code with actual batch ID
            const updatedQrCode = dbManager.generateQRCode(drugId, result.id, batchNumber);
            await dbManager.run(
                'UPDATE drug_batches SET qr_code = ? WHERE id = ?',
                [updatedQrCode, result.id]
            );

            const newBatch = await dbManager.queryOne(`
                SELECT db.*, d.name as drug_name, d.drug_code
                FROM drug_batches db
                JOIN drugs d ON db.drug_id = d.id
                WHERE db.id = ?
            `, [result.id]);

            res.status(201).json({
                success: true,
                message: 'Batch created successfully',
                batch: newBatch
            });

        } catch (error) {
            console.error('Admin batch creation error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create batch',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

/**
 * @route   GET /api/admin/system
 * @desc    Get system configuration and status
 * @access  Private (Admin only)
 */
router.get('/system',
    authenticateToken,
    authorize('admin'),
    auditLog('ADMIN_SYSTEM_VIEW'),
    async (req, res) => {
        try {
            // Get system configuration
            const config = await dbManager.query(
                'SELECT config_key, config_value, description FROM system_config ORDER BY config_key'
            );

            // Get system statistics
            const stats = await dbManager.getStats();

            // Get blockchain status
            const blockchainStats = await blockchain.getBlockchainStats();

            // Get recent activity
            const recentActivity = await dbManager.query(`
                SELECT action, table_name, created_at, COUNT(*) as count
                FROM audit_trail
                WHERE created_at > datetime('now', '-24 hours')
                GROUP BY action, table_name
                ORDER BY created_at DESC
                LIMIT 20
            `);

            res.json({
                success: true,
                system: {
                    configuration: config,
                    statistics: stats,
                    blockchain: blockchainStats,
                    recent_activity: recentActivity,
                    environment: process.env.NODE_ENV || 'development',
                    version: '1.0.0',
                    uptime: process.uptime(),
                    memory_usage: process.memoryUsage(),
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('Admin system view error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve system information',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

/**
 * @route   PUT /api/admin/system/config
 * @desc    Update system configuration
 * @access  Private (Admin only)
 */
router.put('/system/config',
    authenticateToken,
    authorize('admin'),
    body('configs').isArray().withMessage('Configs must be an array'),
    body('configs.*.key').isLength({ min: 1, max: 100 }).withMessage('Config key is required and must be less than 100 characters'),
    body('configs.*.value').isLength({ min: 0, max: 1000 }).withMessage('Config value must be less than 1000 characters'),
    auditLog('ADMIN_SYSTEM_CONFIG_UPDATE'),
    async (req, res) => {
        try {
            const { configs } = req.body;

            for (const config of configs) {
                await dbManager.run(`
                    UPDATE system_config
                    SET config_value = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE config_key = ?
                `, [config.value, config.key]);
            }

            res.json({
                success: true,
                message: 'System configuration updated successfully',
                updated_configs: configs.length
            });

        } catch (error) {
            console.error('Admin system config update error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update system configuration',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

/**
 * @route   GET /api/admin/audit-logs
 * @desc    Get audit logs with filtering
 * @access  Private (Admin only)
 */
router.get('/audit-logs',
    authenticateToken,
    authorize('admin'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('action').optional().isLength({ min: 1, max: 100 }).withMessage('Action filter must be between 1 and 100 characters'),
    query('userId').optional().isInt({ min: 1 }).withMessage('User ID must be a positive integer'),
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
    auditLog('ADMIN_AUDIT_LOGS_VIEW'),
    async (req, res) => {
        try {
            const { page = 1, limit = 20, action, userId, startDate, endDate } = req.query;
            const offset = (page - 1) * limit;

            let whereClause = '1=1';
            const params = [];

            if (action) {
                whereClause += ' AND at.action LIKE ?';
                params.push(`%${action}%`);
            }

            if (userId) {
                whereClause += ' AND at.user_id = ?';
                params.push(userId);
            }

            if (startDate) {
                whereClause += ' AND at.created_at >= ?';
                params.push(startDate);
            }

            if (endDate) {
                whereClause += ' AND at.created_at <= ?';
                params.push(endDate);
            }

            const auditLogs = await dbManager.query(`
                SELECT
                    at.*,
                    u.username,
                    u.role
                FROM audit_trail at
                LEFT JOIN users u ON at.user_id = u.id
                WHERE ${whereClause}
                ORDER BY at.created_at DESC
                LIMIT ? OFFSET ?
            `, [...params, limit, offset]);

            const totalCount = await dbManager.queryOne(`
                SELECT COUNT(*) as count FROM audit_trail at WHERE ${whereClause}
            `, params);

            // Parse JSON fields
            auditLogs.forEach(log => {
                try {
                    log.old_values = log.old_values ? JSON.parse(log.old_values) : null;
                    log.new_values = log.new_values ? JSON.parse(log.new_values) : null;
                } catch (e) {
                    // Keep original values if parsing fails
                }
            });

            res.json({
                success: true,
                audit_logs: auditLogs,
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total_count: totalCount.count,
                    total_pages: Math.ceil(totalCount.count / limit)
                }
            });

        } catch (error) {
            console.error('Admin audit logs retrieval error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve audit logs',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

// Health check endpoint
/**
 * @route   GET /api/admin/health
 * @desc    Check admin service health
 * @access  Public
 */
router.get('/health', async (req, res) => {
    try {
        const dbHealth = await dbManager.healthCheck();

        res.json({
            success: true,
            service: 'Admin Service',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            database: {
                status: dbHealth.status,
                connected: dbHealth.connected
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            service: 'Admin Service',
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

module.exports = router;
