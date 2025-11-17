-- Drug Authenticity Verification System Database Schema
-- Created: 2024
-- Description: Comprehensive database schema for drug verification, supply chain tracking, and reporting

PRAGMA foreign_keys = ON;

-- Users table for authentication and authorization
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'pharmacist', 'admin', 'manufacturer', 'distributor', 'retailer')),
    organization VARCHAR(255),
    license_number VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    is_active BOOLEAN DEFAULT 1,
    is_verified BOOLEAN DEFAULT 0,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Manufacturers table
CREATE TABLE IF NOT EXISTS manufacturers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    license_number VARCHAR(100) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    country VARCHAR(100),
    certification TEXT, -- JSON array of certifications
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Drug categories table
CREATE TABLE IF NOT EXISTS drug_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_category_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_category_id) REFERENCES drug_categories(id)
);

-- Drugs master table
CREATE TABLE IF NOT EXISTS drugs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    brand_name VARCHAR(255),
    drug_code VARCHAR(100) UNIQUE NOT NULL,
    ndc_number VARCHAR(50), -- National Drug Code
    manufacturer_id INTEGER NOT NULL,
    category_id INTEGER,
    dosage_form VARCHAR(100), -- tablet, capsule, injection, etc.
    strength VARCHAR(100),
    active_ingredients TEXT, -- JSON array
    description TEXT,
    therapeutic_class VARCHAR(100),
    prescription_required BOOLEAN DEFAULT 1,
    controlled_substance_schedule INTEGER, -- DEA schedule (1-5)
    storage_conditions TEXT,
    warnings TEXT,
    contraindications TEXT,
    is_active BOOLEAN DEFAULT 1,
    approval_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id),
    FOREIGN KEY (category_id) REFERENCES drug_categories(id)
);

-- Drug batches table
CREATE TABLE IF NOT EXISTS drug_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    drug_id INTEGER NOT NULL,
    batch_number VARCHAR(100) NOT NULL,
    lot_number VARCHAR(100),
    manufacturing_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    quantity_produced INTEGER NOT NULL,
    quantity_remaining INTEGER NOT NULL,
    unit_type VARCHAR(50) DEFAULT 'pieces', -- pieces, bottles, vials, etc.
    qr_code TEXT UNIQUE, -- Generated QR code data
    barcode TEXT UNIQUE, -- Barcode data
    packaging_type VARCHAR(100),
    package_size VARCHAR(50),
    price DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'recalled', 'expired', 'depleted')),
    quality_check_status VARCHAR(50) DEFAULT 'passed' CHECK (quality_check_status IN ('passed', 'failed', 'pending')),
    quality_check_date DATETIME,
    quality_check_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (drug_id) REFERENCES drugs(id),
    UNIQUE(drug_id, batch_number)
);

-- Supply chain entities table
CREATE TABLE IF NOT EXISTS supply_chain_entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('manufacturer', 'distributor', 'wholesaler', 'retailer', 'pharmacy', 'hospital')),
    license_number VARCHAR(100) UNIQUE,
    address TEXT NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    contact_person VARCHAR(255),
    is_verified BOOLEAN DEFAULT 0,
    verification_date DATETIME,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Supply chain transactions (blockchain-like ledger)
CREATE TABLE IF NOT EXISTS supply_chain_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_hash VARCHAR(64) UNIQUE NOT NULL, -- SHA-256 hash
    previous_hash VARCHAR(64) NOT NULL,
    block_number INTEGER NOT NULL,
    batch_id INTEGER NOT NULL,
    from_entity_id INTEGER,
    to_entity_id INTEGER NOT NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('manufacture', 'transfer', 'sale', 'return', 'recall')),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2),
    total_amount DECIMAL(12, 2),
    transaction_date DATETIME NOT NULL,
    shipping_details TEXT, -- JSON object with shipping info
    received_date DATETIME,
    received_by VARCHAR(255),
    condition_on_receipt VARCHAR(100),
    temperature_log TEXT, -- JSON array for cold chain tracking
    digital_signature TEXT,
    notes TEXT,
    is_verified BOOLEAN DEFAULT 0,
    verification_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES drug_batches(id),
    FOREIGN KEY (from_entity_id) REFERENCES supply_chain_entities(id),
    FOREIGN KEY (to_entity_id) REFERENCES supply_chain_entities(id)
);

-- Drug verification logs
CREATE TABLE IF NOT EXISTS verification_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    batch_id INTEGER,
    verification_method VARCHAR(50) CHECK (verification_method IN ('qr_scan', 'barcode_scan', 'manual_entry')),
    scanned_data TEXT,
    verification_result VARCHAR(50) CHECK (verification_result IN ('authentic', 'counterfeit', 'suspicious', 'expired', 'recalled', 'unknown')),
    authenticity_score DECIMAL(5, 2), -- 0-100 score
    risk_factors TEXT, -- JSON array of risk factors
    location_data TEXT, -- JSON object with GPS coordinates
    device_info TEXT, -- JSON object with device information
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(255),
    verification_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    response_time_ms INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (batch_id) REFERENCES drug_batches(id)
);

-- Counterfeit reports
CREATE TABLE IF NOT EXISTS counterfeit_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter_user_id INTEGER,
    drug_name VARCHAR(255) NOT NULL,
    suspected_batch_number VARCHAR(100),
    manufacturer_claimed VARCHAR(255),
    report_type VARCHAR(50) CHECK (report_type IN ('counterfeit', 'tampered', 'expired_sold', 'mislabeled', 'other')),
    description TEXT NOT NULL,
    location_found VARCHAR(255),
    purchase_location VARCHAR(255),
    purchase_date DATE,
    purchase_price DECIMAL(10, 2),
    evidence_photos TEXT, -- JSON array of photo file paths
    packaging_photos TEXT, -- JSON array of packaging photo file paths
    reporter_contact_info TEXT, -- JSON object with contact details
    severity_level VARCHAR(50) DEFAULT 'medium' CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'verified', 'false_alarm', 'resolved')),
    assigned_investigator_id INTEGER,
    investigation_notes TEXT,
    resolution_notes TEXT,
    public_alert_issued BOOLEAN DEFAULT 0,
    alert_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    FOREIGN KEY (reporter_user_id) REFERENCES users(id),
    FOREIGN KEY (assigned_investigator_id) REFERENCES users(id)
);

-- Alerts and notifications
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('counterfeit_detected', 'batch_recalled', 'supply_chain_breach', 'expired_drug', 'suspicious_activity')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(50) DEFAULT 'medium' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    related_batch_id INTEGER,
    related_drug_id INTEGER,
    related_report_id INTEGER,
    target_audience TEXT, -- JSON array of user roles or specific user IDs
    is_public BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    auto_resolve BOOLEAN DEFAULT 0,
    expires_at DATETIME,
    created_by_user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    FOREIGN KEY (related_batch_id) REFERENCES drug_batches(id),
    FOREIGN KEY (related_drug_id) REFERENCES drugs(id),
    FOREIGN KEY (related_report_id) REFERENCES counterfeit_reports(id),
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

-- User alert subscriptions
CREATE TABLE IF NOT EXISTS user_alert_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    alert_id INTEGER NOT NULL,
    is_read BOOLEAN DEFAULT 0,
    read_at DATETIME,
    is_dismissed BOOLEAN DEFAULT 0,
    dismissed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (alert_id) REFERENCES alerts(id),
    UNIQUE(user_id, alert_id)
);

-- API usage logs
CREATE TABLE IF NOT EXISTS api_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    request_body TEXT,
    response_body TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    execution_time_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- System configuration
CREATE TABLE IF NOT EXISTS system_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Audit trail for sensitive operations
CREATE TABLE IF NOT EXISTS audit_trail (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id INTEGER NOT NULL,
    old_values TEXT, -- JSON object with old values
    new_values TEXT, -- JSON object with new values
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- File uploads table
CREATE TABLE IF NOT EXISTS file_uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) UNIQUE NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by_user_id INTEGER,
    related_table VARCHAR(50),
    related_record_id INTEGER,
    file_hash VARCHAR(64), -- SHA-256 hash for integrity
    is_public BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE INDEX IF NOT EXISTS idx_drugs_drug_code ON drugs(drug_code);
CREATE INDEX IF NOT EXISTS idx_drugs_manufacturer ON drugs(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_drugs_category ON drugs(category_id);

CREATE INDEX IF NOT EXISTS idx_batches_drug ON drug_batches(drug_id);
CREATE INDEX IF NOT EXISTS idx_batches_batch_number ON drug_batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_batches_expiry ON drug_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_batches_qr_code ON drug_batches(qr_code);
CREATE INDEX IF NOT EXISTS idx_batches_barcode ON drug_batches(barcode);

CREATE INDEX IF NOT EXISTS idx_supply_chain_batch ON supply_chain_transactions(batch_id);
CREATE INDEX IF NOT EXISTS idx_supply_chain_from_entity ON supply_chain_transactions(from_entity_id);
CREATE INDEX IF NOT EXISTS idx_supply_chain_to_entity ON supply_chain_transactions(to_entity_id);
CREATE INDEX IF NOT EXISTS idx_supply_chain_date ON supply_chain_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_supply_chain_hash ON supply_chain_transactions(transaction_hash);

CREATE INDEX IF NOT EXISTS idx_verification_user ON verification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_batch ON verification_logs(batch_id);
CREATE INDEX IF NOT EXISTS idx_verification_time ON verification_logs(verification_time);
CREATE INDEX IF NOT EXISTS idx_verification_result ON verification_logs(verification_result);

CREATE INDEX IF NOT EXISTS idx_reports_reporter ON counterfeit_reports(reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON counterfeit_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created ON counterfeit_reports(created_at);

CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);

-- Triggers for updated_at timestamps
CREATE TRIGGER IF NOT EXISTS update_users_updated_at
    AFTER UPDATE ON users
    BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_manufacturers_updated_at
    AFTER UPDATE ON manufacturers
    BEGIN
        UPDATE manufacturers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_drugs_updated_at
    AFTER UPDATE ON drugs
    BEGIN
        UPDATE drugs SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_batches_updated_at
    AFTER UPDATE ON drug_batches
    BEGIN
        UPDATE drug_batches SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_supply_chain_entities_updated_at
    AFTER UPDATE ON supply_chain_entities
    BEGIN
        UPDATE supply_chain_entities SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_reports_updated_at
    AFTER UPDATE ON counterfeit_reports
    BEGIN
        UPDATE counterfeit_reports SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Views for common queries
CREATE VIEW IF NOT EXISTS v_active_drugs AS
SELECT
    d.id,
    d.name,
    d.generic_name,
    d.brand_name,
    d.drug_code,
    d.ndc_number,
    m.name as manufacturer_name,
    m.code as manufacturer_code,
    dc.name as category_name,
    d.dosage_form,
    d.strength,
    d.is_active
FROM drugs d
LEFT JOIN manufacturers m ON d.manufacturer_id = m.id
LEFT JOIN drug_categories dc ON d.category_id = dc.id
WHERE d.is_active = 1 AND m.is_active = 1;

CREATE VIEW IF NOT EXISTS v_batch_details AS
SELECT
    db.id,
    db.batch_number,
    db.lot_number,
    db.manufacturing_date,
    db.expiry_date,
    db.quantity_produced,
    db.quantity_remaining,
    db.qr_code,
    db.barcode,
    db.status,
    d.name as drug_name,
    d.drug_code,
    m.name as manufacturer_name
FROM drug_batches db
JOIN drugs d ON db.drug_id = d.id
JOIN manufacturers m ON d.manufacturer_id = m.id;

CREATE VIEW IF NOT EXISTS v_supply_chain_tracking AS
SELECT
    sct.id,
    sct.transaction_hash,
    sct.block_number,
    sct.transaction_type,
    sct.quantity,
    sct.transaction_date,
    db.batch_number,
    d.name as drug_name,
    from_entity.name as from_entity,
    to_entity.name as to_entity,
    sct.is_verified
FROM supply_chain_transactions sct
JOIN drug_batches db ON sct.batch_id = db.id
JOIN drugs d ON db.drug_id = d.id
LEFT JOIN supply_chain_entities from_entity ON sct.from_entity_id = from_entity.id
JOIN supply_chain_entities to_entity ON sct.to_entity_id = to_entity.id
ORDER BY sct.block_number DESC;

-- Insert default system configuration
INSERT OR IGNORE INTO system_config (config_key, config_value, description, is_public) VALUES
('system_name', 'Drug Authenticity Verification System', 'System display name', 1),
('system_version', '1.0.0', 'Current system version', 1),
('blockchain_difficulty', '4', 'Mining difficulty for blockchain', 0),
('max_verification_attempts', '3', 'Maximum verification attempts per session', 0),
('alert_retention_days', '90', 'Days to keep resolved alerts', 0),
('log_retention_days', '365', 'Days to keep system logs', 0),
('enable_public_api', 'false', 'Enable public API access', 0),
('maintenance_mode', 'false', 'System maintenance mode', 1);

-- Insert default drug categories
INSERT OR IGNORE INTO drug_categories (name, description) VALUES
('Analgesics', 'Pain relief medications'),
('Antibiotics', 'Antimicrobial agents'),
('Antihistamines', 'Allergy medications'),
('Cardiovascular', 'Heart and blood vessel medications'),
('Dermatological', 'Skin medications'),
('Gastrointestinal', 'Digestive system medications'),
('Neurological', 'Nervous system medications'),
('Respiratory', 'Breathing and lung medications'),
('Vaccines', 'Immunization products'),
('Vitamins & Supplements', 'Nutritional supplements');
