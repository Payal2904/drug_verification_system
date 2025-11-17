const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const dbManager = require('../config/database');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../middleware/auth');

/**
 * Authentication Controller
 * Handles user registration, login, password management, and account verification
 */
class AuthController {

    /**
     * User registration
     */
    async register(req, res) {
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
                username,
                email,
                password,
                firstName,
                lastName,
                role = 'user',
                organization = null,
                licenseNumber = null,
                phone = null,
                address = null
            } = req.body;

            // Check if user already exists
            const existingUser = await dbManager.queryOne(
                'SELECT id FROM users WHERE username = ? OR email = ?',
                [username, email]
            );

            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: 'Username or email already exists'
                });
            }

            // Hash password
            const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            // Insert new user
            const result = await dbManager.run(`
                INSERT INTO users
                (username, email, password_hash, first_name, last_name, role, organization,
                 license_number, phone, address, is_active, is_verified)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                username,
                email,
                passwordHash,
                firstName,
                lastName,
                role,
                organization,
                licenseNumber,
                phone,
                address,
                1, // is_active
                role === 'admin' ? 1 : 0 // auto-verify admins
            ]);

            // Get the created user (without password)
            const newUser = await dbManager.queryOne(`
                SELECT id, username, email, first_name, last_name, role, organization,
                       license_number, phone, is_active, is_verified, created_at
                FROM users WHERE id = ?
            `, [result.id]);

            // Generate tokens
            const accessToken = generateToken(newUser);
            const refreshToken = generateRefreshToken(newUser);

            // Log registration
            await dbManager.run(`
                INSERT INTO audit_trail (user_id, action, table_name, record_id, new_values, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                newUser.id,
                'USER_REGISTERED',
                'users',
                newUser.id,
                JSON.stringify({ username, email, role }),
                req.ip,
                req.get('User-Agent')
            ]);

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                user: newUser,
                tokens: {
                    access_token: accessToken,
                    refresh_token: refreshToken,
                    token_type: 'Bearer',
                    expires_in: process.env.JWT_EXPIRES_IN || '24h'
                }
            });

        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({
                success: false,
                message: 'Registration failed',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * User login
     */
    async login(req, res) {
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

            const { username, password } = req.body;

            // Find user by username or email
            const user = await dbManager.queryOne(`
                SELECT id, username, email, password_hash, first_name, last_name, role,
                       organization, license_number, is_active, is_verified, last_login
                FROM users
                WHERE username = ? OR email = ?
            `, [username, username]);

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid username or password'
                });
            }

            // Check if account is active
            if (!user.is_active) {
                return res.status(401).json({
                    success: false,
                    message: 'Account is deactivated'
                });
            }

            // Verify password
            const passwordValid = await bcrypt.compare(password, user.password_hash);
            if (!passwordValid) {
                // Log failed login attempt
                await dbManager.run(`
                    INSERT INTO audit_trail (user_id, action, table_name, record_id, old_values, ip_address, user_agent)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    user.id,
                    'LOGIN_FAILED',
                    'users',
                    user.id,
                    JSON.stringify({ reason: 'invalid_password', username }),
                    req.ip,
                    req.get('User-Agent')
                ]);

                return res.status(401).json({
                    success: false,
                    message: 'Invalid username or password'
                });
            }

            // Update last login
            await dbManager.run(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                [user.id]
            );

            // Remove password from user object
            delete user.password_hash;

            // Generate tokens
            const accessToken = generateToken(user);
            const refreshToken = generateRefreshToken(user);

            // Log successful login
            await dbManager.run(`
                INSERT INTO audit_trail (user_id, action, table_name, record_id, new_values, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                user.id,
                'LOGIN_SUCCESS',
                'users',
                user.id,
                JSON.stringify({ username: user.username, role: user.role }),
                req.ip,
                req.get('User-Agent')
            ]);

            res.json({
                success: true,
                message: 'Login successful',
                user: user,
                tokens: {
                    access_token: accessToken,
                    refresh_token: refreshToken,
                    token_type: 'Bearer',
                    expires_in: process.env.JWT_EXPIRES_IN || '24h'
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Login failed',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Refresh access token
     */
    async refreshToken(req, res) {
        try {
            const { refresh_token } = req.body;

            if (!refresh_token) {
                return res.status(400).json({
                    success: false,
                    message: 'Refresh token required'
                });
            }

            // Verify refresh token
            const user = await verifyRefreshToken(refresh_token);

            // Generate new access token
            const accessToken = generateToken(user);

            res.json({
                success: true,
                tokens: {
                    access_token: accessToken,
                    token_type: 'Bearer',
                    expires_in: process.env.JWT_EXPIRES_IN || '24h'
                }
            });

        } catch (error) {
            console.error('Token refresh error:', error);
            res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }
    }

    /**
     * Get current user profile
     */
    async getProfile(req, res) {
        try {
            const user = await dbManager.queryOne(`
                SELECT id, username, email, first_name, last_name, role, organization,
                       license_number, phone, address, is_active, is_verified, last_login, created_at
                FROM users WHERE id = ?
            `, [req.user.id]);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            res.json({
                success: true,
                user: user
            });

        } catch (error) {
            console.error('Profile retrieval error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve profile'
            });
        }
    }

    /**
     * Update user profile
     */
    async updateProfile(req, res) {
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
                firstName,
                lastName,
                organization,
                licenseNumber,
                phone,
                address
            } = req.body;

            // Get current user data for audit log
            const currentUser = await dbManager.queryOne(
                'SELECT * FROM users WHERE id = ?',
                [req.user.id]
            );

            // Update user profile
            const result = await dbManager.run(`
                UPDATE users SET
                    first_name = ?,
                    last_name = ?,
                    organization = ?,
                    license_number = ?,
                    phone = ?,
                    address = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [
                firstName,
                lastName,
                organization,
                licenseNumber,
                phone,
                address,
                req.user.id
            ]);

            if (result.changes === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Get updated user data
            const updatedUser = await dbManager.queryOne(`
                SELECT id, username, email, first_name, last_name, role, organization,
                       license_number, phone, address, is_active, is_verified, updated_at
                FROM users WHERE id = ?
            `, [req.user.id]);

            // Log profile update
            await dbManager.run(`
                INSERT INTO audit_trail (user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                req.user.id,
                'PROFILE_UPDATED',
                'users',
                req.user.id,
                JSON.stringify({
                    first_name: currentUser.first_name,
                    last_name: currentUser.last_name,
                    organization: currentUser.organization,
                    license_number: currentUser.license_number,
                    phone: currentUser.phone,
                    address: currentUser.address
                }),
                JSON.stringify({
                    firstName,
                    lastName,
                    organization,
                    licenseNumber,
                    phone,
                    address
                }),
                req.ip,
                req.get('User-Agent')
            ]);

            res.json({
                success: true,
                message: 'Profile updated successfully',
                user: updatedUser
            });

        } catch (error) {
            console.error('Profile update error:', error);
            res.status(500).json({
                success: false,
                message: 'Profile update failed',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Change password
     */
    async changePassword(req, res) {
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

            const { currentPassword, newPassword } = req.body;

            // Get current user with password
            const user = await dbManager.queryOne(
                'SELECT password_hash FROM users WHERE id = ?',
                [req.user.id]
            );

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Verify current password
            const passwordValid = await bcrypt.compare(currentPassword, user.password_hash);
            if (!passwordValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }

            // Hash new password
            const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
            const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

            // Update password
            await dbManager.run(
                'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [newPasswordHash, req.user.id]
            );

            // Log password change
            await dbManager.run(`
                INSERT INTO audit_trail (user_id, action, table_name, record_id, new_values, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                req.user.id,
                'PASSWORD_CHANGED',
                'users',
                req.user.id,
                JSON.stringify({ username: req.user.username }),
                req.ip,
                req.get('User-Agent')
            ]);

            res.json({
                success: true,
                message: 'Password changed successfully'
            });

        } catch (error) {
            console.error('Password change error:', error);
            res.status(500).json({
                success: false,
                message: 'Password change failed',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Logout user (client-side token invalidation)
     */
    async logout(req, res) {
        try {
            // Log logout
            await dbManager.run(`
                INSERT INTO audit_trail (user_id, action, table_name, record_id, new_values, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                req.user.id,
                'LOGOUT',
                'users',
                req.user.id,
                JSON.stringify({ username: req.user.username }),
                req.ip,
                req.get('User-Agent')
            ]);

            res.json({
                success: true,
                message: 'Logged out successfully'
            });

        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                success: false,
                message: 'Logout failed'
            });
        }
    }

    /**
     * Verify user account (for email verification)
     */
    async verifyAccount(req, res) {
        try {
            const { userId, verificationCode } = req.params;

            // In a real implementation, you would store verification codes
            // For this demo, we'll use a simple admin verification
            if (!req.user || req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Only admins can verify accounts'
                });
            }

            // Update user verification status
            const result = await dbManager.run(
                'UPDATE users SET is_verified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [userId]
            );

            if (result.changes === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Log verification
            await dbManager.run(`
                INSERT INTO audit_trail (user_id, action, table_name, record_id, new_values, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                req.user.id,
                'ACCOUNT_VERIFIED',
                'users',
                userId,
                JSON.stringify({ verified_by: req.user.username }),
                req.ip,
                req.get('User-Agent')
            ]);

            res.json({
                success: true,
                message: 'Account verified successfully'
            });

        } catch (error) {
            console.error('Account verification error:', error);
            res.status(500).json({
                success: false,
                message: 'Account verification failed',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Get user statistics
     */
    async getUserStats(req, res) {
        try {
            const stats = await dbManager.queryOne(`
                SELECT
                    COUNT(*) as total_users,
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
                    SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) as verified_users,
                    SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_users,
                    SUM(CASE WHEN role = 'pharmacist' THEN 1 ELSE 0 END) as pharmacist_users,
                    SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as regular_users
                FROM users
            `);

            const recentRegistrations = await dbManager.query(`
                SELECT DATE(created_at) as date, COUNT(*) as count
                FROM users
                WHERE created_at > datetime('now', '-30 days')
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            `);

            res.json({
                success: true,
                stats: {
                    ...stats,
                    recent_registrations: recentRegistrations
                }
            });

        } catch (error) {
            console.error('User stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve user statistics'
            });
        }
    }
}

module.exports = new AuthController();
