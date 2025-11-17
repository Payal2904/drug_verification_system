const crypto = require('crypto');
const dbManager = require('../config/database');

/**
 * Blockchain simulation for supply chain tracking
 * This module simulates a blockchain-like immutable ledger for drug supply chain transactions
 */
class BlockchainSimulator {
    constructor() {
        this.difficulty = parseInt(process.env.MINING_DIFFICULTY) || 4;
        this.miningReward = 0; // No mining reward in this simulation
        this.genesisHash = process.env.BLOCKCHAIN_GENESIS_HASH || '0'.repeat(64);
    }

    /**
     * Create a new transaction block
     */
    async createTransaction({
        batchId,
        fromEntityId = null,
        toEntityId,
        transactionType,
        quantity,
        unitPrice = 0,
        shippingDetails = {},
        temperatureLog = [],
        digitalSignature = null,
        notes = ''
    }) {
        try {
            // Get the previous transaction hash
            const previousHash = await this.getLastTransactionHash();
            const blockNumber = await this.getNextBlockNumber();

            // Create transaction data
            const transactionData = {
                batchId,
                fromEntityId,
                toEntityId,
                transactionType,
                quantity,
                unitPrice,
                totalAmount: quantity * unitPrice,
                transactionDate: new Date().toISOString(),
                blockNumber,
                previousHash,
                shippingDetails: JSON.stringify(shippingDetails),
                temperatureLog: JSON.stringify(temperatureLog),
                digitalSignature,
                notes
            };

            // Generate transaction hash
            const transactionHash = this.calculateHash(transactionData);

            // Mine the block (proof of work simulation)
            const minedHash = await this.mineBlock(transactionHash, previousHash);

            // Store transaction in database
            const result = await dbManager.run(`
                INSERT INTO supply_chain_transactions
                (transaction_hash, previous_hash, block_number, batch_id, from_entity_id, to_entity_id,
                 transaction_type, quantity, unit_price, total_amount, transaction_date,
                 shipping_details, temperature_log, digital_signature, notes, is_verified)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                minedHash,
                previousHash,
                blockNumber,
                batchId,
                fromEntityId,
                toEntityId,
                transactionType,
                quantity,
                unitPrice,
                transactionData.totalAmount,
                transactionData.transactionDate,
                transactionData.shippingDetails,
                transactionData.temperatureLog,
                digitalSignature,
                notes,
                1 // Auto-verify for simulation
            ]);

            // Log the transaction creation
            await this.logBlockchainEvent('TRANSACTION_CREATED', {
                transactionId: result.id,
                transactionHash: minedHash,
                blockNumber,
                batchId,
                transactionType
            });

            return {
                success: true,
                transactionId: result.id,
                transactionHash: minedHash,
                blockNumber,
                previousHash,
                timestamp: transactionData.transactionDate
            };

        } catch (error) {
            console.error('Error creating blockchain transaction:', error);
            throw new Error('Failed to create blockchain transaction: ' + error.message);
        }
    }

    /**
     * Calculate hash for transaction data
     */
    calculateHash(data) {
        const hashInput = JSON.stringify({
            batchId: data.batchId,
            fromEntityId: data.fromEntityId,
            toEntityId: data.toEntityId,
            transactionType: data.transactionType,
            quantity: data.quantity,
            unitPrice: data.unitPrice,
            transactionDate: data.transactionDate,
            blockNumber: data.blockNumber,
            previousHash: data.previousHash,
            nonce: data.nonce || 0
        });

        return crypto.createHash('sha256').update(hashInput).digest('hex');
    }

    /**
     * Simulate proof-of-work mining
     */
    async mineBlock(transactionHash, previousHash) {
        const target = '0'.repeat(this.difficulty);
        let nonce = 0;
        let hash = '';

        const startTime = Date.now();

        // Simple proof-of-work simulation
        while (!hash.startsWith(target)) {
            nonce++;
            const blockData = {
                transactionHash,
                previousHash,
                nonce,
                timestamp: Date.now()
            };
            hash = crypto.createHash('sha256').update(JSON.stringify(blockData)).digest('hex');

            // Prevent infinite loops in development
            if (nonce > 100000) {
                console.warn('Mining difficulty too high, using current hash');
                break;
            }
        }

        const miningTime = Date.now() - startTime;
        console.log(`Block mined: ${hash} (nonce: ${nonce}, time: ${miningTime}ms)`);

        return hash;
    }

    /**
     * Get the hash of the last transaction
     */
    async getLastTransactionHash() {
        try {
            const lastTransaction = await dbManager.queryOne(`
                SELECT transaction_hash
                FROM supply_chain_transactions
                ORDER BY block_number DESC, id DESC
                LIMIT 1
            `);

            return lastTransaction ? lastTransaction.transaction_hash : this.genesisHash;
        } catch (error) {
            console.error('Error getting last transaction hash:', error);
            return this.genesisHash;
        }
    }

    /**
     * Get the next block number
     */
    async getNextBlockNumber() {
        try {
            const result = await dbManager.queryOne(`
                SELECT MAX(block_number) as max_block
                FROM supply_chain_transactions
            `);

            return result && result.max_block ? result.max_block + 1 : 1;
        } catch (error) {
            console.error('Error getting next block number:', error);
            return 1;
        }
    }

    /**
     * Verify blockchain integrity
     */
    async verifyChain() {
        try {
            const transactions = await dbManager.query(`
                SELECT * FROM supply_chain_transactions
                ORDER BY block_number ASC, id ASC
            `);

            const results = {
                isValid: true,
                totalBlocks: transactions.length,
                invalidBlocks: [],
                brokenChains: []
            };

            for (let i = 0; i < transactions.length; i++) {
                const transaction = transactions[i];
                const expectedPreviousHash = i === 0 ? this.genesisHash : transactions[i - 1].transaction_hash;

                // Verify previous hash link
                if (transaction.previous_hash !== expectedPreviousHash) {
                    results.isValid = false;
                    results.brokenChains.push({
                        blockNumber: transaction.block_number,
                        transactionId: transaction.id,
                        expectedPreviousHash,
                        actualPreviousHash: transaction.previous_hash
                    });
                }

                // Verify transaction hash integrity
                const transactionData = {
                    batchId: transaction.batch_id,
                    fromEntityId: transaction.from_entity_id,
                    toEntityId: transaction.to_entity_id,
                    transactionType: transaction.transaction_type,
                    quantity: transaction.quantity,
                    unitPrice: transaction.unit_price,
                    transactionDate: transaction.transaction_date,
                    blockNumber: transaction.block_number,
                    previousHash: transaction.previous_hash
                };

                // Note: In a real blockchain, we would verify the hash against the original data
                // For this simulation, we trust the stored hash but check chain continuity
            }

            // Log verification result
            await this.logBlockchainEvent('CHAIN_VERIFICATION', {
                isValid: results.isValid,
                totalBlocks: results.totalBlocks,
                invalidBlocks: results.invalidBlocks.length,
                brokenChains: results.brokenChains.length
            });

            return results;

        } catch (error) {
            console.error('Error verifying blockchain:', error);
            throw new Error('Failed to verify blockchain: ' + error.message);
        }
    }

    /**
     * Get complete supply chain history for a batch
     */
    async getSupplyChainHistory(batchId) {
        try {
            const history = await dbManager.query(`
                SELECT
                    sct.*,
                    from_entity.name as from_entity_name,
                    from_entity.type as from_entity_type,
                    to_entity.name as to_entity_name,
                    to_entity.type as to_entity_type,
                    db.batch_number,
                    d.name as drug_name,
                    d.drug_code
                FROM supply_chain_transactions sct
                LEFT JOIN supply_chain_entities from_entity ON sct.from_entity_id = from_entity.id
                JOIN supply_chain_entities to_entity ON sct.to_entity_id = to_entity.id
                JOIN drug_batches db ON sct.batch_id = db.id
                JOIN drugs d ON db.drug_id = d.id
                WHERE sct.batch_id = ?
                ORDER BY sct.block_number ASC, sct.id ASC
            `, [batchId]);

            // Parse JSON fields
            history.forEach(transaction => {
                try {
                    transaction.shipping_details = transaction.shipping_details ?
                        JSON.parse(transaction.shipping_details) : {};
                    transaction.temperature_log = transaction.temperature_log ?
                        JSON.parse(transaction.temperature_log) : [];
                } catch (e) {
                    transaction.shipping_details = {};
                    transaction.temperature_log = [];
                }
            });

            return {
                batchId,
                totalTransactions: history.length,
                transactions: history,
                chainIntegrity: await this.verifyBatchChain(batchId)
            };

        } catch (error) {
            console.error('Error getting supply chain history:', error);
            throw new Error('Failed to get supply chain history: ' + error.message);
        }
    }

    /**
     * Verify chain integrity for a specific batch
     */
    async verifyBatchChain(batchId) {
        try {
            const transactions = await dbManager.query(`
                SELECT * FROM supply_chain_transactions
                WHERE batch_id = ?
                ORDER BY block_number ASC, id ASC
            `, [batchId]);

            if (transactions.length === 0) {
                return { isValid: true, message: 'No transactions found' };
            }

            // Check if chain starts with manufacture transaction
            const firstTransaction = transactions[0];
            if (firstTransaction.transaction_type !== 'manufacture') {
                return {
                    isValid: false,
                    message: 'Chain does not start with manufacture transaction'
                };
            }

            // Verify sequential integrity
            for (let i = 1; i < transactions.length; i++) {
                const current = transactions[i];
                const previous = transactions[i - 1];

                if (current.previous_hash !== previous.transaction_hash) {
                    return {
                        isValid: false,
                        message: `Broken chain at block ${current.block_number}`
                    };
                }
            }

            return {
                isValid: true,
                message: 'Chain integrity verified',
                transactionCount: transactions.length
            };

        } catch (error) {
            console.error('Error verifying batch chain:', error);
            return {
                isValid: false,
                message: 'Error during verification: ' + error.message
            };
        }
    }

    /**
     * Detect potential tampering or anomalies
     */
    async detectAnomalies(batchId) {
        try {
            const history = await this.getSupplyChainHistory(batchId);
            const anomalies = [];

            const transactions = history.transactions;

            // Check for quantity inconsistencies
            let currentQuantity = 0;
            for (const transaction of transactions) {
                if (transaction.transaction_type === 'manufacture') {
                    currentQuantity = transaction.quantity;
                } else if (['transfer', 'sale'].includes(transaction.transaction_type)) {
                    if (transaction.quantity > currentQuantity) {
                        anomalies.push({
                            type: 'quantity_overflow',
                            transactionId: transaction.id,
                            message: `Transfer quantity (${transaction.quantity}) exceeds available quantity (${currentQuantity})`,
                            severity: 'high'
                        });
                    }
                    currentQuantity -= transaction.quantity;
                }
            }

            // Check for timeline anomalies
            for (let i = 1; i < transactions.length; i++) {
                const current = new Date(transactions[i].transaction_date);
                const previous = new Date(transactions[i - 1].transaction_date);

                if (current < previous) {
                    anomalies.push({
                        type: 'timeline_anomaly',
                        transactionId: transactions[i].id,
                        message: 'Transaction date is earlier than previous transaction',
                        severity: 'medium'
                    });
                }
            }

            // Check for temperature violations
            for (const transaction of transactions) {
                if (transaction.temperature_log && transaction.temperature_log.length > 0) {
                    const tempViolations = transaction.temperature_log.filter(log =>
                        log.temperature < 2 || log.temperature > 8 // Assuming 2-8°C cold chain
                    );

                    if (tempViolations.length > 0) {
                        anomalies.push({
                            type: 'temperature_violation',
                            transactionId: transaction.id,
                            message: `Temperature violations detected: ${tempViolations.length} readings outside 2-8°C range`,
                            severity: 'high'
                        });
                    }
                }
            }

            return {
                batchId,
                anomaliesDetected: anomalies.length > 0,
                totalAnomalies: anomalies.length,
                anomalies: anomalies,
                riskLevel: this.calculateRiskLevel(anomalies)
            };

        } catch (error) {
            console.error('Error detecting anomalies:', error);
            throw new Error('Failed to detect anomalies: ' + error.message);
        }
    }

    /**
     * Calculate risk level based on anomalies
     */
    calculateRiskLevel(anomalies) {
        if (anomalies.length === 0) return 'low';

        const highSeverityCount = anomalies.filter(a => a.severity === 'high').length;
        const mediumSeverityCount = anomalies.filter(a => a.severity === 'medium').length;

        if (highSeverityCount > 0) return 'high';
        if (mediumSeverityCount > 2) return 'medium';
        return 'low';
    }

    /**
     * Log blockchain events for audit trail
     */
    async logBlockchainEvent(eventType, eventData) {
        try {
            await dbManager.run(`
                INSERT INTO audit_trail (action, table_name, record_id, new_values, created_at)
                VALUES (?, ?, ?, ?, ?)
            `, [
                eventType,
                'supply_chain_transactions',
                eventData.transactionId || 0,
                JSON.stringify(eventData),
                new Date().toISOString()
            ]);
        } catch (error) {
            console.error('Error logging blockchain event:', error);
        }
    }

    /**
     * Get blockchain statistics
     */
    async getBlockchainStats() {
        try {
            const stats = await dbManager.query(`
                SELECT
                    COUNT(*) as total_blocks,
                    COUNT(DISTINCT batch_id) as unique_batches,
                    COUNT(DISTINCT to_entity_id) as active_entities,
                    MIN(transaction_date) as first_transaction,
                    MAX(transaction_date) as latest_transaction,
                    SUM(quantity) as total_quantity_transferred
                FROM supply_chain_transactions
            `);

            const transactionTypes = await dbManager.query(`
                SELECT transaction_type, COUNT(*) as count
                FROM supply_chain_transactions
                GROUP BY transaction_type
                ORDER BY count DESC
            `);

            return {
                ...stats[0],
                transaction_types: transactionTypes,
                chain_integrity: await this.verifyChain()
            };

        } catch (error) {
            console.error('Error getting blockchain stats:', error);
            throw new Error('Failed to get blockchain stats: ' + error.message);
        }
    }
}

module.exports = new BlockchainSimulator();
