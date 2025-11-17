const express = require('express');
const { body, param } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticateToken, authorize, auditLog } = require('../middleware/auth');

const router = express.Router();

/**
 * Validation rules for user registration
 */
const registerValidation = [
    body('username')
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),

    body('email')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),

    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

    body('firstName')
        .isLength({ min: 1, max: 100 })
        .withMessage('First name is required and must be less than 100 characters')
        .trim(),

    body('lastName')
        .isLength({ min: 1, max: 100 })
        .withMessage('Last name is required and must be less than 100 characters')
        .trim(),

    body('role')
        .optional()
        .isIn(['user', 'pharmacist', 'admin', 'manufacturer', 'distributor', 'retailer'])
        .withMessage('Invalid role specified'),

    body('organization')
        .optional()
        .isLength({ max: 255 })
        .withMessage('Organization name must be less than 255 characters')
        .trim(),

    body('licenseNumber')
        .optional()
        .isLength({ max: 100 })
        .withMessage('License number must be less than 100 characters')
        .trim(),

    body('phone')
        .optional()
        .isMobilePhone()
        .withMessage('Please provide a valid phone number'),

    body('address')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Address must be less than 500 characters')
        .trim()
];

/**
 * Validation rules for user login
 */
const loginValidation = [
    body('username')
        .notEmpty()
        .withMessage('Username or email is required')
        .trim(),

    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

/**
 * Validation rules for profile update
 */
const profileUpdateValidation = [
    body('firstName')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('First name must be between 1 and 100 characters')
        .trim(),

    body('lastName')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('Last name must be between 1 and 100 characters')
        .trim(),

    body('organization')
        .optional()
        .isLength({ max: 255 })
        .withMessage('Organization name must be less than 255 characters')
        .trim(),

    body('licenseNumber')
        .optional()
        .isLength({ max: 100 })
        .withMessage('License number must be less than 100 characters')
        .trim(),

    body('phone')
        .optional()
        .isMobilePhone()
        .withMessage('Please provide a valid phone number'),

    body('address')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Address must be less than 500 characters')
        .trim()
];

/**
 * Validation rules for password change
 */
const passwordChangeValidation = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),

    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('New password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Password confirmation does not match');
            }
            return true;
        })
];

/**
 * Validation for refresh token
 */
const refreshTokenValidation = [
    body('refresh_token')
        .notEmpty()
        .withMessage('Refresh token is required')
];

// Public routes (no authentication required)

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register',
    registerValidation,
    auditLog('USER_REGISTRATION'),
    authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get token
 * @access  Public
 */
router.post('/login',
    loginValidation,
    auditLog('USER_LOGIN'),
    authController.login
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh',
    refreshTokenValidation,
    auditLog('TOKEN_REFRESH'),
    authController.refreshToken
);

// Protected routes (authentication required)

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile',
    authenticateToken,
    auditLog('PROFILE_VIEW'),
    authController.getProfile
);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile',
    authenticateToken,
    profileUpdateValidation,
    auditLog('PROFILE_UPDATE'),
    authController.updateProfile
);

/**
 * @route   PUT /api/auth/password
 * @desc    Change user password
 * @access  Private
 */
router.put('/password',
    authenticateToken,
    passwordChangeValidation,
    auditLog('PASSWORD_CHANGE'),
    authController.changePassword
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token invalidation)
 * @access  Private
 */
router.post('/logout',
    authenticateToken,
    auditLog('USER_LOGOUT'),
    authController.logout
);

/**
 * @route   PUT /api/auth/verify/:userId/:verificationCode
 * @desc    Verify user account (admin only)
 * @access  Private (Admin only)
 */
router.put('/verify/:userId/:verificationCode',
    param('userId').isInt().withMessage('Valid user ID required'),
    param('verificationCode').isLength({ min: 1 }).withMessage('Verification code required'),
    authenticateToken,
    authorize('admin'),
    auditLog('ACCOUNT_VERIFICATION'),
    authController.verifyAccount
);

/**
 * @route   GET /api/auth/stats
 * @desc    Get user statistics (admin only)
 * @access  Private (Admin only)
 */
router.get('/stats',
    authenticateToken,
    authorize('admin'),
    auditLog('USER_STATS_VIEW'),
    authController.getUserStats
);

// Health check endpoint
/**
 * @route   GET /api/auth/health
 * @desc    Check authentication service health
 * @access  Public
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        service: 'Authentication Service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

module.exports = router;
