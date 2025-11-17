const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import database and blockchain
const dbManager = require('./src/config/database');
const blockchain = require('./src/utils/blockchain');

// Import routes
const authRoutes = require('./src/routes/auth');
const verificationRoutes = require('./src/routes/verification');
const reportsRoutes = require('./src/routes/reports');
const adminRoutes = require('./src/routes/admin');
const supplyChainRoutes = require('./src/routes/supply-chain');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy (important for rate limiting and IP detection)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

        // Allow requests with no origin (mobile apps, postman, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
};

app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        retry_after: 900 // 15 minutes
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req, res) => {
        // Skip rate limiting for health checks
        return req.path === '/api/health' || req.path === '/health';
    }
});

app.use('/api/', limiter);

// Static files middleware (for uploaded files)
const uploadsDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/supply-chain', supplyChainRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const dbHealth = await dbManager.healthCheck();
        const blockchainStats = await blockchain.getBlockchainStats();

        const healthStatus = {
            success: true,
            service: 'Drug Authenticity Verification System API',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            components: {
                database: {
                    status: dbHealth.status,
                    connected: dbHealth.connected,
                    stats: dbHealth.stats
                },
                blockchain: {
                    status: 'healthy',
                    total_blocks: blockchainStats.total_blocks,
                    unique_batches: blockchainStats.unique_batches
                },
                uploads: {
                    status: fs.existsSync(uploadsDir) ? 'healthy' : 'error',
                    path: uploadsDir
                }
            },
            uptime: process.uptime(),
            memory_usage: process.memoryUsage()
        };

        res.json(healthStatus);
    } catch (error) {
        res.status(500).json({
            success: false,
            service: 'Drug Authenticity Verification System API',
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Drug Authenticity Verification System API',
        version: '1.0.0',
        documentation: '/api/docs',
        health_check: '/api/health',
        endpoints: {
            authentication: '/api/auth',
            verification: '/api/verification',
            reports: '/api/reports',
            admin: '/api/admin',
            supply_chain: '/api/supply-chain'
        }
    });
});

// API documentation endpoint (basic)
app.get('/api/docs', (req, res) => {
    const apiDocs = {
        title: 'Drug Authenticity Verification System API',
        version: '1.0.0',
        description: 'API for verifying drug authenticity and managing supply chain',
        endpoints: {
            authentication: {
                'POST /api/auth/register': 'Register new user',
                'POST /api/auth/login': 'User login',
                'POST /api/auth/refresh': 'Refresh access token',
                'GET /api/auth/profile': 'Get user profile',
                'PUT /api/auth/profile': 'Update user profile',
                'PUT /api/auth/password': 'Change password',
                'POST /api/auth/logout': 'User logout'
            },
            verification: {
                'POST /api/verification/verify': 'Verify drug authenticity',
                'POST /api/verification/scan-image': 'Scan QR/barcode from image',
                'GET /api/verification/stats': 'Get verification statistics',
                'GET /api/verification/history': 'Get verification history',
                'GET /api/verification/alerts': 'Get active alerts'
            },
            reports: {
                'POST /api/reports/create': 'Create counterfeit report',
                'GET /api/reports': 'Get reports list',
                'GET /api/reports/:id': 'Get report details',
                'PUT /api/reports/:id': 'Update report',
                'DELETE /api/reports/:id': 'Delete report',
                'GET /api/reports/stats': 'Get report statistics'
            },
            admin: {
                'GET /api/admin/dashboard': 'Get admin dashboard data',
                'GET /api/admin/users': 'Manage users',
                'GET /api/admin/drugs': 'Manage drugs',
                'GET /api/admin/batches': 'Manage batches',
                'GET /api/admin/system': 'System configuration'
            },
            supply_chain: {
                'POST /api/supply-chain/transaction': 'Create supply chain transaction',
                'GET /api/supply-chain/track/:batchId': 'Track batch supply chain',
                'GET /api/supply-chain/verify': 'Verify blockchain integrity',
                'GET /api/supply-chain/stats': 'Get blockchain statistics'
            }
        }
    };

    res.json(apiDocs);
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        path: req.path,
        method: req.method,
        available_endpoints: '/api/docs'
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);

    // Handle specific error types
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.errors
        });
    }

    if (error.name === 'UnauthorizedError') {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: 'File size too large'
        });
    }

    if (error.message === 'Not allowed by CORS') {
        return res.status(403).json({
            success: false,
            message: 'CORS policy violation'
        });
    }

    // Database errors
    if (error.code === 'SQLITE_CONSTRAINT') {
        return res.status(409).json({
            success: false,
            message: 'Database constraint violation',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }

    // Default error response
    res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
});

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
    console.log(`Received ${signal}. Starting graceful shutdown...`);

    try {
        // Close database connection
        await dbManager.close();

        // Close server
        server.close(() => {
            console.log('Server closed successfully');
            process.exit(0);
        });

        // Force close after timeout
        setTimeout(() => {
            console.log('Force closing server...');
            process.exit(1);
        }, 10000);

    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
};

// Initialize database and start server
const startServer = async () => {
    try {
        console.log('Starting Drug Authenticity Verification System API...');

        // Connect to database
        await dbManager.connect();
        console.log('Database connected successfully');

        // Initialize database schema
        await dbManager.initializeSchema();
        console.log('Database schema initialized');

        // Seed database in development mode
        if (process.env.NODE_ENV === 'development') {
            try {
                await dbManager.seedDatabase();
                console.log('Database seeded with sample data');
            } catch (seedError) {
                console.log('Database already seeded or seed failed:', seedError.message);
            }
        }

        // Start server
        const server = app.listen(PORT, () => {
            console.log(`
🚀 Drug Authenticity Verification System API is running!
📍 Environment: ${process.env.NODE_ENV || 'development'}
🌐 Server URL: http://localhost:${PORT}
📊 Health Check: http://localhost:${PORT}/api/health
📚 API Documentation: http://localhost:${PORT}/api/docs
🔐 Admin Panel: http://localhost:${PORT}/admin (if enabled)
            `);
        });

        // Handle server errors
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`Port ${PORT} is already in use`);
            } else {
                console.error('Server error:', error);
            }
            process.exit(1);
        });

        // Graceful shutdown handlers
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('Uncaught Exception:', error);
            gracefulShutdown('UNCAUGHT_EXCEPTION');
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
            gracefulShutdown('UNHANDLED_REJECTION');
        });

        return server;

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Export for testing
module.exports = app;

// Start server if not in test mode
if (require.main === module) {
    startServer();
}
