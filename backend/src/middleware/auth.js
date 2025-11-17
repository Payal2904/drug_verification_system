const jwt = require('jsonwebtoken');
const dbManager = require('../config/database');

/**
 * Authentication middleware
 */
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token required'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

        // Get user from database
        const user = await dbManager.queryOne(
            'SELECT id, username, email, role, is_active, is_verified FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token - user not found'
            });
        }

        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated'
            });
        }

        // Update last login
        await dbManager.run(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
            [user.id]
        );

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token',
                code: 'INVALID_TOKEN'
            });
        } else {
            console.error('Authentication error:', error);
            return res.status(500).json({
                success: false,
                message: 'Authentication error'
            });
        }
    }
};

/**
 * Authorization middleware - check user roles
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions',
                required_roles: roles,
                user_role: req.user.role
            });
        }

        next();
    };
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        const user = await dbManager.queryOne(
            'SELECT id, username, email, role, is_active FROM users WHERE id = ?',
            [decoded.userId]
        );

        req.user = user && user.is_active ? user : null;
    } catch (error) {
        req.user = null;
    }

    next();
};

/**
 * Generate JWT token
 */
const generateToken = (user) => {
    const payload = {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role
    };

    return jwt.sign(
        payload,
        process.env.JWT_SECRET || 'fallback_secret',
        {
            expiresIn: process.env.JWT_EXPIRES_IN || '24h',
            issuer: 'drug-verification-system'
        }
    );
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (user) => {
    const payload = {
        userId: user.id,
        type: 'refresh'
    };

    return jwt.sign(
        payload,
        process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret',
        {
            expiresIn: '7d',
            issuer: 'drug-verification-system'
        }
    );
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = async (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret');

        if (decoded.type !== 'refresh') {
            throw new Error('Invalid token type');
        }

        const user = await dbManager.queryOne(
            'SELECT id, username, email, role, is_active FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (!user || !user.is_active) {
            throw new Error('User not found or inactive');
        }

        return user;
    } catch (error) {
        throw error;
    }
};

/**
 * API key authentication (for external integrations)
 */
const authenticateApiKey = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({
            success: false,
            message: 'API key required'
        });
    }

    try {
        // In a real implementation, you would store API keys in database
        // For this demo, we'll use environment variables
        const validApiKeys = (process.env.VALID_API_KEYS || '').split(',');

        if (!validApiKeys.includes(apiKey)) {
            return res.status(401).json({
                success: false,
                message: 'Invalid API key'
            });
        }

        // Set a system user for API key requests
        req.user = {
            id: 0,
            username: 'api_user',
            role: 'api',
            is_api: true
        };

        next();
    } catch (error) {
        console.error('API key authentication error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
};

/**
 * Rate limiting middleware
 */
const rateLimitByUser = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
    const requests = new Map();

    return (req, res, next) => {
        const userId = req.user ? req.user.id : req.ip;
        const now = Date.now();
        const windowStart = now - windowMs;

        // Get user's request history
        if (!requests.has(userId)) {
            requests.set(userId, []);
        }

        const userRequests = requests.get(userId);

        // Remove old requests outside the window
        const recentRequests = userRequests.filter(timestamp => timestamp > windowStart);
        requests.set(userId, recentRequests);

        // Check if limit exceeded
        if (recentRequests.length >= maxRequests) {
            return res.status(429).json({
                success: false,
                message: 'Too many requests',
                retry_after: Math.ceil((recentRequests[0] + windowMs - now) / 1000)
            });
        }

        // Add current request
        recentRequests.push(now);

        // Add rate limit headers
        res.set({
            'X-RateLimit-Limit': maxRequests,
            'X-RateLimit-Remaining': maxRequests - recentRequests.length,
            'X-RateLimit-Reset': new Date(now + windowMs).toISOString()
        });

        next();
    };
};

/**
 * Audit logging middleware
 */
const auditLog = (action) => {
    return async (req, res, next) => {
        const originalSend = res.json;

        res.json = function(body) {
            // Log the request/response
            const auditData = {
                user_id: req.user ? req.user.id : null,
                action: action,
                method: req.method,
                url: req.originalUrl,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                request_body: req.method !== 'GET' ? JSON.stringify(req.body) : null,
                response_status: res.statusCode,
                timestamp: new Date().toISOString()
            };

            // Don't wait for audit log to complete
            dbManager.run(`
                INSERT INTO api_logs
                (user_id, endpoint, method, status_code, request_body, ip_address, user_agent, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                auditData.user_id,
                auditData.url,
                auditData.method,
                auditData.response_status,
                auditData.request_body,
                auditData.ip_address,
                auditData.user_agent,
                auditData.timestamp
            ]).catch(err => console.error('Audit log error:', err));

            return originalSend.call(this, body);
        };

        next();
    };
};

/**
 * Validate user verification status
 */
const requireVerification = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    if (!req.user.is_verified && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Account verification required',
            code: 'VERIFICATION_REQUIRED'
        });
    }

    next();
};

module.exports = {
    authenticateToken,
    authorize,
    optionalAuth,
    generateToken,
    generateRefreshToken,
    verifyRefreshToken,
    authenticateApiKey,
    rateLimitByUser,
    auditLog,
    requireVerification
};
