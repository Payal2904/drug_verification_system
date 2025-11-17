#!/usr/bin/env node

/**
 * Database initialization script for Drug Authenticity Verification System
 * This script sets up the database schema and creates the initial admin user
 */

require('dotenv').config();
const dbManager = require('../src/config/database');
const bcrypt = require('bcryptjs');

async function initializeDatabase() {
    try {
        console.log('🚀 Starting database initialization...');

        // Connect to database
        await dbManager.connect();
        console.log('✅ Database connection established');

        // Initialize schema
        await dbManager.initializeSchema();
        console.log('✅ Database schema initialized');

        // Create admin user if it doesn't exist
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@drugverification.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

        const existingAdmin = await dbManager.queryOne(
            'SELECT id FROM users WHERE email = ? OR role = ?',
            [adminEmail, 'admin']
        );

        if (!existingAdmin) {
            const passwordHash = await bcrypt.hash(adminPassword, 12);

            await dbManager.run(`
                INSERT INTO users (username, email, password_hash, first_name, last_name, role, is_active, is_verified)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                'admin',
                adminEmail,
                passwordHash,
                'System',
                'Administrator',
                'admin',
                1,
                1
            ]);

            console.log('✅ Admin user created');
            console.log(`   Email: ${adminEmail}`);
            console.log(`   Password: ${adminPassword}`);
            console.log('   🔐 Please change the default password after first login!');
        } else {
            console.log('ℹ️  Admin user already exists');
        }

        // Verify database integrity
        const healthCheck = await dbManager.healthCheck();
        if (healthCheck.status === 'healthy') {
            console.log('✅ Database health check passed');
            console.log(`   Total tables: ${Object.keys(healthCheck.stats).length}`);
            console.log(`   Total records: ${Object.values(healthCheck.stats).reduce((a, b) => a + b, 0)}`);
        } else {
            console.log('❌ Database health check failed');
        }

        console.log('\n🎉 Database initialization completed successfully!');
        console.log('\nNext steps:');
        console.log('1. Run seed script: npm run seed-db');
        console.log('2. Start the server: npm start');
        console.log('3. Access admin panel with the credentials above');

    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        if (process.env.NODE_ENV === 'development') {
            console.error('Stack trace:', error.stack);
        }
        process.exit(1);
    } finally {
        await dbManager.close();
    }
}

// Run initialization if called directly
if (require.main === module) {
    initializeDatabase();
}

module.exports = initializeDatabase;
