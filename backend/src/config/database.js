const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

class DatabaseManager {
    constructor() {
        this.db = null;
        this.isConnected = false;
        this.dbPath = process.env.DATABASE_PATH || './database/drug_verification.db';
    }

    /**
     * Initialize database connection
     */
    async connect() {
        return new Promise((resolve, reject) => {
            try {
                // Ensure database directory exists
                const dbDir = path.dirname(this.dbPath);
                if (!fs.existsSync(dbDir)) {
                    fs.mkdirSync(dbDir, { recursive: true });
                }

                // Create database connection
                this.db = new sqlite3.Database(this.dbPath, (err) => {
                    if (err) {
                        console.error('Error opening database:', err.message);
                        reject(err);
                    } else {
                        console.log(`Connected to SQLite database at ${this.dbPath}`);
                        this.isConnected = true;

                        // Enable foreign keys
                        this.db.run('PRAGMA foreign_keys = ON');

                        // Set performance optimizations
                        this.db.run('PRAGMA journal_mode = WAL');
                        this.db.run('PRAGMA synchronous = NORMAL');
                        this.db.run('PRAGMA cache_size = 1000');
                        this.db.run('PRAGMA temp_store = memory');

                        resolve(this.db);
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Initialize database schema
     */
    async initializeSchema() {
        const schemaPath = path.join(__dirname, '../../database/schema.sql');

        if (!fs.existsSync(schemaPath)) {
            throw new Error('Database schema file not found');
        }

        const schema = fs.readFileSync(schemaPath, 'utf8');
        const statements = schema.split(';').filter(stmt => stmt.trim());

        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                let completed = 0;
                const total = statements.length;

                statements.forEach((statement, index) => {
                    if (statement.trim()) {
                        this.db.run(statement, (err) => {
                            if (err) {
                                console.error(`Error executing statement ${index + 1}:`, err.message);
                                console.error('Statement:', statement);
                                reject(err);
                                return;
                            }

                            completed++;
                            if (completed === total) {
                                console.log('Database schema initialized successfully');
                                resolve();
                            }
                        });
                    } else {
                        completed++;
                        if (completed === total) {
                            resolve();
                        }
                    }
                });
            });
        });
    }

    /**
     * Execute a query with parameters
     */
    async query(sql, params = []) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected || !this.db) {
                reject(new Error('Database not connected'));
                return;
            }

            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error('Database query error:', err.message);
                    console.error('SQL:', sql);
                    console.error('Params:', params);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    /**
     * Execute a single row query
     */
    async queryOne(sql, params = []) {
        const results = await this.query(sql, params);
        return results.length > 0 ? results[0] : null;
    }

    /**
     * Execute an insert/update/delete statement
     */
    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected || !this.db) {
                reject(new Error('Database not connected'));
                return;
            }

            this.db.run(sql, params, function(err) {
                if (err) {
                    console.error('Database run error:', err.message);
                    console.error('SQL:', sql);
                    console.error('Params:', params);
                    reject(err);
                } else {
                    resolve({
                        id: this.lastID,
                        changes: this.changes
                    });
                }
            });
        });
    }

    /**
     * Begin a database transaction
     */
    async beginTransaction() {
        return this.run('BEGIN TRANSACTION');
    }

    /**
     * Commit a database transaction
     */
    async commitTransaction() {
        return this.run('COMMIT');
    }

    /**
     * Rollback a database transaction
     */
    async rollbackTransaction() {
        return this.run('ROLLBACK');
    }

    /**
     * Execute multiple statements in a transaction
     */
    async transaction(operations) {
        try {
            await this.beginTransaction();

            const results = [];
            for (const operation of operations) {
                const result = await this.run(operation.sql, operation.params);
                results.push(result);
            }

            await this.commitTransaction();
            return results;
        } catch (error) {
            await this.rollbackTransaction();
            throw error;
        }
    }

    /**
     * Generate a secure hash for blockchain-like operations
     */
    generateHash(data, previousHash = '') {
        const hashInput = JSON.stringify(data) + previousHash + Date.now();
        return crypto.createHash('sha256').update(hashInput).digest('hex');
    }

    /**
     * Generate a unique QR code data string
     */
    generateQRCode(drugId, batchId, batchNumber) {
        const timestamp = Date.now();
        const randomString = crypto.randomBytes(8).toString('hex');
        const qrData = {
            drug_id: drugId,
            batch_id: batchId,
            batch_number: batchNumber,
            timestamp: timestamp,
            verification_code: randomString,
            hash: crypto.createHash('sha256').update(`${drugId}:${batchId}:${batchNumber}:${timestamp}:${randomString}`).digest('hex').substring(0, 16)
        };
        return JSON.stringify(qrData);
    }

    /**
     * Validate QR code data
     */
    validateQRCode(qrCodeData) {
        try {
            const data = JSON.parse(qrCodeData);
            const { drug_id, batch_id, batch_number, timestamp, verification_code, hash } = data;

            // Verify hash
            const expectedHash = crypto.createHash('sha256')
                .update(`${drug_id}:${batch_id}:${batch_number}:${timestamp}:${verification_code}`)
                .digest('hex')
                .substring(0, 16);

            return hash === expectedHash;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get database statistics
     */
    async getStats() {
        const stats = {};

        const tables = [
            'users', 'drugs', 'drug_batches', 'manufacturers',
            'supply_chain_transactions', 'verification_logs',
            'counterfeit_reports', 'alerts'
        ];

        for (const table of tables) {
            try {
                const result = await this.queryOne(`SELECT COUNT(*) as count FROM ${table}`);
                stats[table] = result ? result.count : 0;
            } catch (error) {
                stats[table] = 0;
            }
        }

        return stats;
    }

    /**
     * Backup database
     */
    async backup(backupPath) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected || !this.db) {
                reject(new Error('Database not connected'));
                return;
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const finalBackupPath = backupPath || `./backups/backup-${timestamp}.db`;

            // Ensure backup directory exists
            const backupDir = path.dirname(finalBackupPath);
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            this.db.backup(finalBackupPath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(`Database backed up to ${finalBackupPath}`);
                    resolve(finalBackupPath);
                }
            });
        });
    }

    /**
     * Check database health
     */
    async healthCheck() {
        try {
            const result = await this.queryOne('SELECT 1 as health');
            const stats = await this.getStats();

            return {
                status: 'healthy',
                connected: this.isConnected,
                database_path: this.dbPath,
                stats: stats,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                connected: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Close database connection
     */
    async close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err.message);
                        reject(err);
                    } else {
                        console.log('Database connection closed');
                        this.isConnected = false;
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    /**
     * Seed database with sample data for development
     */
    async seedDatabase() {
        console.log('Seeding database with sample data...');

        try {
            // Create admin user
            const adminPassword = require('bcryptjs').hashSync(process.env.ADMIN_PASSWORD || 'admin123', 12);
            await this.run(`
                INSERT OR IGNORE INTO users (username, email, password_hash, first_name, last_name, role, is_active, is_verified)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, ['admin', process.env.ADMIN_EMAIL || 'admin@drugverification.com', adminPassword, 'System', 'Administrator', 'admin', 1, 1]);

            // Create sample manufacturers
            const manufacturers = [
                ['Pharma Corp', 'PCORP', 'PC2024001', '123 Pharma Street, New York, NY 10001', '+1-555-0123', 'contact@pharmacorp.com', 'USA'],
                ['MediCare Inc', 'MCARE', 'MC2024002', '456 Medical Ave, Los Angeles, CA 90210', '+1-555-0124', 'info@medicare-inc.com', 'USA'],
                ['GlobalMed Ltd', 'GMED', 'GM2024003', '789 Health Plaza, Chicago, IL 60601', '+1-555-0125', 'contact@globalmed.com', 'USA']
            ];

            for (const manufacturer of manufacturers) {
                await this.run(`
                    INSERT OR IGNORE INTO manufacturers (name, code, license_number, address, phone, email, country)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, manufacturer);
            }

            // Create sample drugs
            const drugs = [
                ['Paracetamol', 'Paracetamol', 'Tylenol', 'PARA500', 'NDC-12345-001', 1, 1, 'tablet', '500mg', '["Acetaminophen"]', 'Pain reliever and fever reducer'],
                ['Amoxicillin', 'Amoxicillin', 'Amoxil', 'AMOX250', 'NDC-12345-002', 2, 2, 'capsule', '250mg', '["Amoxicillin trihydrate"]', 'Antibiotic for bacterial infections'],
                ['Lisinopril', 'Lisinopril', 'Prinivil', 'LISI10', 'NDC-12345-003', 3, 4, 'tablet', '10mg', '["Lisinopril dihydrate"]', 'ACE inhibitor for high blood pressure']
            ];

            for (const drug of drugs) {
                await this.run(`
                    INSERT OR IGNORE INTO drugs (name, generic_name, brand_name, drug_code, ndc_number, manufacturer_id, category_id, dosage_form, strength, active_ingredients, description)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, drug);
            }

            // Create sample batches with QR codes
            const batches = [
                [1, 'BATCH001', 'LOT001', '2024-01-15', '2026-01-15', 10000, 8500, 'bottle', '100 tablets', 29.99],
                [2, 'BATCH002', 'LOT002', '2024-02-01', '2026-02-01', 5000, 4200, 'bottle', '30 capsules', 45.50],
                [3, 'BATCH003', 'LOT003', '2024-01-20', '2026-01-20', 15000, 12000, 'bottle', '90 tablets', 35.75]
            ];

            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                const qrCode = this.generateQRCode(batch[0], i + 1, batch[1]);
                const barcode = `BC${batch[1]}${Date.now().toString().slice(-6)}`;

                await this.run(`
                    INSERT OR IGNORE INTO drug_batches
                    (drug_id, batch_number, lot_number, manufacturing_date, expiry_date, quantity_produced, quantity_remaining, packaging_type, package_size, price, qr_code, barcode)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [...batch, qrCode, barcode]);
            }

            // Create sample supply chain entities
            const entities = [
                ['MediDistrib Corp', 'distributor', 'DIST001', '100 Distribution Way, Dallas, TX 75201', '+1-555-0200', 'orders@medidistrib.com', 'John Smith'],
                ['HealthMart Pharmacy', 'pharmacy', 'PHARM001', '200 Main Street, Phoenix, AZ 85001', '+1-555-0300', 'info@healthmart.com', 'Jane Doe'],
                ['City Hospital', 'hospital', 'HOSP001', '300 Hospital Blvd, Seattle, WA 98101', '+1-555-0400', 'purchasing@cityhospital.com', 'Dr. Mike Johnson']
            ];

            for (const entity of entities) {
                await this.run(`
                    INSERT OR IGNORE INTO supply_chain_entities (name, type, license_number, address, phone, email, contact_person, is_verified)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [...entity, 1]);
            }

            console.log('Database seeded successfully');
        } catch (error) {
            console.error('Error seeding database:', error);
            throw error;
        }
    }
}

// Create singleton instance
const dbManager = new DatabaseManager();

module.exports = dbManager;
