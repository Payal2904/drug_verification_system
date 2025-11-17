const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticateToken, authorize, auditLog } = require('../middleware/auth');
const blockchain = require('../utils/blockchain');
const dbManager = require('../config/database');

const router = express.Router();

/**
 * Validation rules for creating supply chain transactions
 */
const createTransactionValidation = [
    body('batchId')
        .isInt({ min: 1 })
        .withMessage('Valid batch ID is required'),

    body('fromEntityId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('From entity ID must be a positive integer'),

    body('toEntityId')
        .isInt({ min: 1 })
        .withMessage('To entity ID is required and must be a positive integer'),

    body('transactionType')
        .isIn(['manufacture', 'transfer', 'sale', 'return', 'recall'])
        .withMessage('Invalid transaction type'),

    body('quantity')
        .isInt({ min: 1 })
        .withMessage('Quantity must be a positive integer'),

    body('unitPrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Unit price must be a non-negative number'),

    body('shippingDetails')
        .optional()
        .isObject()
        .withMessage('Shipping details must be an object'),

    body('temperatureLog')
        .optional()
        .isArray()
        .withMessage('Temperature log must be an array'),

    body('notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Notes must be less than 500 characters')
        .trim()
];

/**
 * @route   POST /api/supply-chain/transaction
 * @desc    Create a new supply chain transaction
 * @access  Private (Manufacturer, Distributor, Admin)
 */
router.post('/transaction',
    authenticateToken,
    authorize('admin', 'manufacturer', 'distributor', 'retailer'),
    createTransactionValidation,
    auditLog('SUPPLY_CHAIN_TRANSACTION_CREATE'),
    async (req, res) => {
        try {
            const {
                batchId,
                fromEntityId,
                toEntityId,
                transactionType,
                quantity,
                unitPrice = 0,
                shippingDetails = {},
                temperatureLog = [],
                notes = ''
            } = req.body;

            // Verify batch exists
            const batch = await dbManager.queryOne(
                'SELECT id, drug_id, batch_number, quantity_remaining FROM drug_batches WHERE id = ?',
                [batchId]
            );

            if (!batch) {
                return res.status(404).json({
                    success: false,
                    message: 'Batch not found'
                });
            }

            // Verify entities exist
            if (fromEntityId) {
                const fromEntity = await dbManager.queryOne(
                    'SELECT id FROM supply_chain_entities WHERE id = ?',
                    [fromEntityId]
                );

                if (!fromEntity) {
                    return res.status(404).json({
                        success: false,
                        message: 'From entity not found'
                    });
                }
            }

            const toEntity = await dbManager.queryOne(
                'SELECT id FROM supply_chain_entities WHERE id = ?',
                [toEntityId]
            );

            if (!toEntity) {
                return res.status(404).json({
                    success: false,
                    message: 'To entity not found'
                });
            }

            // Validate quantity for non-manufacture transactions
            if (transactionType !== 'manufacture' && quantity > batch.quantity_remaining) {
                return res.status(400).json({
                    success: false,
                    message: 'Insufficient quantity available'
                });
            }

            // Create blockchain transaction
            const transaction = await blockchain.createTransaction({
                batchId,
                fromEntityId,
                toEntityId,
                transactionType,
                quantity,
                unitPrice,
                shippingDetails,
                temperatureLog,
                notes
            });

            if (!transaction.success) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to create blockchain transaction',
                    error: transaction.error
                });
            }

            // Update batch quantity for non-manufacture transactions
            if (transactionType !== 'manufacture') {
                await dbManager.run(
                    'UPDATE drug_batches SET quantity_remaining = quantity_remaining - ? WHERE id = ?',
                    [quantity, batchId]
                );
            }

            res.status(201).json({
                success: true,
                message: 'Supply chain transaction created successfully',
                transaction: {
                    id: transaction.transactionId,
                    hash: transaction.transactionHash,
                    block_number: transaction.blockNumber,
                    batch_id: batchId,
                    transaction_type: transactionType,
                    quantity: quantity,
                    timestamp: transaction.timestamp
                }
            });

        } catch (error) {
            console.error('Supply chain transaction error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create supply chain transaction',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

/**
 * @route   GET /api/supply-chain/track/:batchId
 * @desc    Track complete supply chain history for a batch
 * @access  Private
 */
router.get('/track/:batchId',
    authenticateToken,
    param('batchId').isInt({ min: 1 }).withMessage('Valid batch ID is required'),
    auditLog('SUPPLY_CHAIN_TRACK'),
    async (req, res) => {
        try {
            const { batchId } = req.params;

            // Get supply chain history
            const history = await blockchain.getSupplyChainHistory(batchId);

            if (!history || history.transactions.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No supply chain data found for this batch'
                });
            }

            // Detect anomalies
            const anomalies = await blockchain.detectAnomalies(batchId);

            res.json({
                success: true,
                batch_id: batchId,
                supply_chain: history,
                anomalies: anomalies,
                integrity_verified: history.chainIntegrity.isValid
            });

        } catch (error) {
            console.error('Supply chain tracking error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to track supply chain',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

/**
 * @route   GET /api/supply-chain/verify
 * @desc    Verify blockchain integrity
 * @access  Private (Admin)
 */
router.get('/verify',
    authenticateToken,
    authorize('admin'),
    auditLog('BLOCKCHAIN_VERIFY'),
    async (req, res) => {
        try {
            const verification = await blockchain.verifyChain();

            res.json({
                success: true,
                blockchain_verification: verification,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Blockchain verification error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to verify blockchain',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

/**
 * @route   GET /api/supply-chain/stats
 * @desc    Get blockchain and supply chain statistics
 * @access  Private (Admin, Pharmacist)
 */
router.get('/stats',
    authenticateToken,
    authorize('admin', 'pharmacist'),
    auditLog('SUPPLY_CHAIN_STATS'),
    async (req, res) => {
        try {
            const stats = await blockchain.getBlockchainStats();

            res.json({
                success: true,
                stats: stats,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Supply chain stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve supply chain statistics',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

/**
 * @route   GET /api/supply-chain/entities
 * @desc    Get list of supply chain entities
 * @access  Private
 */
router.get('/entities',
    authenticateToken,
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('type').optional().isIn(['manufacturer', 'distributor', 'wholesaler', 'retailer', 'pharmacy', 'hospital']).withMessage('Invalid entity type'),
    auditLog('SUPPLY_CHAIN_ENTITIES_VIEW'),
    async (req, res) => {
        try {
            const { page = 1, limit = 20, type } = req.query;
            const offset = (page - 1) * limit;

            let whereClause = '1=1';
            const params = [];

            if (type) {
                whereClause += ' AND type = ?';
                params.push(type);
            }

            const entities = await dbManager.query(`
                SELECT *
                FROM supply_chain_entities
                WHERE ${whereClause} AND is_active = 1
                ORDER BY name ASC
                LIMIT ? OFFSET ?
            `, [...params, limit, offset]);

            const totalCount = await dbManager.queryOne(`
                SELECT COUNT(*) as count
                FROM supply_chain_entities
                WHERE ${whereClause} AND is_active = 1
            `, params);

            res.json({
                success: true,
                entities,
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total_count: totalCount.count,
                    total_pages: Math.ceil(totalCount.count / limit)
                }
            });

        } catch (error) {
            console.error('Entities retrieval error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve supply chain entities',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

/**
 * @route   POST /api/supply-chain/entities
 * @desc    Create a new supply chain entity
 * @access  Private (Admin)
 */
router.post('/entities',
    authenticateToken,
    authorize('admin'),
    body('name').isLength({ min: 1, max: 255 }).withMessage('Entity name is required and must be less than 255 characters').trim(),
    body('type').isIn(['manufacturer', 'distributor', 'wholesaler', 'retailer', 'pharmacy', 'hospital']).withMessage('Invalid entity type'),
    body('licenseNumber').optional().isLength({ max: 100 }).withMessage('License number must be less than 100 characters').trim(),
    body('address').isLength({ min: 1, max: 500 }).withMessage('Address is required and must be less than 500 characters').trim(),
    body('phone').optional().isMobilePhone().withMessage('Please provide a valid phone number'),
    body('email').optional().isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
    body('contactPerson').optional().isLength({ max: 255 }).withMessage('Contact person name must be less than 255 characters').trim(),
    auditLog('SUPPLY_CHAIN_ENTITY_CREATE'),
    async (req, res) => {
        try {
            const {
                name,
                type,
                licenseNumber,
                address,
                phone,
                email,
                contactPerson
            } = req.body;

            // Check if entity with same license number already exists
            if (licenseNumber) {
                const existingEntity = await dbManager.queryOne(
                    'SELECT id FROM supply_chain_entities WHERE license_number = ?',
                    [licenseNumber]
                );

                if (existingEntity) {
                    return res.status(409).json({
                        success: false,
                        message: 'Entity with this license number already exists'
                    });
                }
            }

            const result = await dbManager.run(`
                INSERT INTO supply_chain_entities
                (name, type, license_number, address, phone, email, contact_person, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            `, [name, type, licenseNumber, address, phone, email, contactPerson]);

            const newEntity = await dbManager.queryOne(
                'SELECT * FROM supply_chain_entities WHERE id = ?',
                [result.id]
            );

            res.status(201).json({
                success: true,
                message: 'Supply chain entity created successfully',
                entity: newEntity
            });

        } catch (error) {
            console.error('Entity creation error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create supply chain entity',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

/**
 * @route   PUT /api/supply-chain/entities/:entityId
 * @desc    Update a supply chain entity
 * @access  Private (Admin)
 */
router.put('/entities/:entityId',
    authenticateToken,
    authorize('admin'),
    param('entityId').isInt({ min: 1 }).withMessage('Valid entity ID is required'),
    body('name').optional().isLength({ min: 1, max: 255 }).withMessage('Entity name must be between 1 and 255 characters').trim(),
    body('address').optional().isLength({ min: 1, max: 500 }).withMessage('Address must be between 1 and 500 characters').trim(),
    body('phone').optional().isMobilePhone().withMessage('Please provide a valid phone number'),
    body('email').optional().isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
    body('contactPerson').optional().isLength({ max: 255 }).withMessage('Contact person name must be less than 255 characters').trim(),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    auditLog('SUPPLY_CHAIN_ENTITY_UPDATE'),
    async (req, res) => {
        try {
            const { entityId } = req.params;
            const { name, address, phone, email, contactPerson, isActive } = req.body;

            // Get current entity for audit log
            const currentEntity = await dbManager.queryOne(
                'SELECT * FROM supply_chain_entities WHERE id = ?',
                [entityId]
            );

            if (!currentEntity) {
                return res.status(404).json({
                    success: false,
                    message: 'Supply chain entity not found'
                });
            }

            // Build update query dynamically
            const updateFields = [];
            const updateParams = [];

            if (name !== undefined) {
                updateFields.push('name = ?');
                updateParams.push(name);
            }
            if (address !== undefined) {
                updateFields.push('address = ?');
                updateParams.push(address);
            }
            if (phone !== undefined) {
                updateFields.push('phone = ?');
                updateParams.push(phone);
            }
            if (email !== undefined) {
                updateFields.push('email = ?');
                updateParams.push(email);
            }
            if (contactPerson !== undefined) {
                updateFields.push('contact_person = ?');
                updateParams.push(contactPerson);
            }
            if (isActive !== undefined) {
                updateFields.push('is_active = ?');
                updateParams.push(isActive ? 1 : 0);
            }

            if (updateFields.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No fields to update'
                });
            }

            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            updateParams.push(entityId);

            await dbManager.run(`
                UPDATE supply_chain_entities
                SET ${updateFields.join(', ')}
                WHERE id = ?
            `, updateParams);

            const updatedEntity = await dbManager.queryOne(
                'SELECT * FROM supply_chain_entities WHERE id = ?',
                [entityId]
            );

            res.json({
                success: true,
                message: 'Supply chain entity updated successfully',
                entity: updatedEntity
            });

        } catch (error) {
            console.error('Entity update error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update supply chain entity',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

/**
 * @route   GET /api/supply-chain/transactions
 * @desc    Get list of supply chain transactions
 * @access  Private
 */
router.get('/transactions',
    authenticateToken,
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('batchId').optional().isInt({ min: 1 }).withMessage('Batch ID must be a positive integer'),
    query('transactionType').optional().isIn(['manufacture', 'transfer', 'sale', 'return', 'recall']).withMessage('Invalid transaction type'),
    auditLog('SUPPLY_CHAIN_TRANSACTIONS_VIEW'),
    async (req, res) => {
        try {
            const { page = 1, limit = 20, batchId, transactionType } = req.query;
            const offset = (page - 1) * limit;

            let whereClause = '1=1';
            const params = [];

            if (batchId) {
                whereClause += ' AND sct.batch_id = ?';
                params.push(batchId);
            }

            if (transactionType) {
                whereClause += ' AND sct.transaction_type = ?';
                params.push(transactionType);
            }

            const transactions = await dbManager.query(`
                SELECT
                    sct.*,
                    db.batch_number,
                    d.name as drug_name,
                    from_entity.name as from_entity_name,
                    from_entity.type as from_entity_type,
                    to_entity.name as to_entity_name,
                    to_entity.type as to_entity_type
                FROM supply_chain_transactions sct
                JOIN drug_batches db ON sct.batch_id = db.id
                JOIN drugs d ON db.drug_id = d.id
                LEFT JOIN supply_chain_entities from_entity ON sct.from_entity_id = from_entity.id
                JOIN supply_chain_entities to_entity ON sct.to_entity_id = to_entity.id
                WHERE ${whereClause}
                ORDER BY sct.block_number DESC, sct.created_at DESC
                LIMIT ? OFFSET ?
            `, [...params, limit, offset]);

            const totalCount = await dbManager.queryOne(`
                SELECT COUNT(*) as count
                FROM supply_chain_transactions sct
                WHERE ${whereClause}
            `, params);

            // Parse JSON fields
            transactions.forEach(transaction => {
                try {
                    transaction.shipping_details = transaction.shipping_details ? JSON.parse(transaction.shipping_details) : {};
                    transaction.temperature_log = transaction.temperature_log ? JSON.parse(transaction.temperature_log) : [];
                } catch (e) {
                    transaction.shipping_details = {};
                    transaction.temperature_log = [];
                }
            });

            res.json({
                success: true,
                transactions,
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total_count: totalCount.count,
                    total_pages: Math.ceil(totalCount.count / limit)
                }
            });

        } catch (error) {
            console.error('Transactions retrieval error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve supply chain transactions',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

// Health check endpoint
/**
 * @route   GET /api/supply-chain/health
 * @desc    Check supply chain service health
 * @access  Public
 */
router.get('/health', async (req, res) => {
    try {
        const blockchainStats = await blockchain.getBlockchainStats();

        res.json({
            success: true,
            service: 'Supply Chain Service',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            metrics: {
                total_blocks: blockchainStats.total_blocks,
                unique_batches: blockchainStats.unique_batches,
                chain_integrity: blockchainStats.chain_integrity.isValid
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            service: 'Supply Chain Service',
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

module.exports = router;
