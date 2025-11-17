const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple in-memory data store (replaces database)
let users = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@drugverify.com',
    password: 'admin123', // In production, this would be hashed
    firstName: 'System',
    lastName: 'Administrator',
    role: 'admin',
    isActive: true,
    isVerified: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    username: 'pharmacist1',
    email: 'pharmacist@example.com',
    password: 'pharm123',
    firstName: 'John',
    lastName: 'Pharmacist',
    role: 'pharmacist',
    isActive: true,
    isVerified: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 3,
    username: 'user1',
    email: 'user@example.com',
    password: 'user123',
    firstName: 'Regular',
    lastName: 'User',
    role: 'user',
    isActive: true,
    isVerified: true,
    createdAt: new Date().toISOString()
  }
];

let drugs = [
  {
    id: 1,
    name: 'Paracetamol',
    drugCode: 'PARA500',
    batchNumber: 'BATCH001',
    manufacturer: 'Pharma Corp',
    expiryDate: '2025-12-31',
    qrCode: 'QR001PARA500BATCH001',
    barcode: '123456789012',
    isActive: true
  },
  {
    id: 2,
    name: 'Amoxicillin',
    drugCode: 'AMOX250',
    batchNumber: 'BATCH002',
    manufacturer: 'MediCare Inc',
    expiryDate: '2025-06-30',
    qrCode: 'QR002AMOX250BATCH002',
    barcode: '234567890123',
    isActive: true
  }
];

let reports = [];
let currentUserId = null;

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Authentication routes
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  const user = users.find(u =>
    (u.username === username || u.email === username) && u.password === password
  );

  if (user && user.isActive) {
    const { password: _, ...userWithoutPassword } = user;
    currentUserId = user.id;

    res.json({
      success: true,
      message: 'Login successful',
      user: userWithoutPassword,
      tokens: {
        access_token: `demo-token-${user.id}`,
        refresh_token: `demo-refresh-${user.id}`,
        token_type: 'Bearer'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid username or password'
    });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { username, email, password, firstName, lastName, role = 'user' } = req.body;

  const existingUser = users.find(u => u.username === username || u.email === email);

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'Username or email already exists'
    });
  }

  const newUser = {
    id: users.length + 1,
    username,
    email,
    password, // In production, hash this
    firstName,
    lastName,
    role,
    isActive: true,
    isVerified: false,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  currentUserId = newUser.id;

  const { password: _, ...userWithoutPassword } = newUser;

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    user: userWithoutPassword,
    tokens: {
      access_token: `demo-token-${newUser.id}`,
      refresh_token: `demo-refresh-${newUser.id}`,
      token_type: 'Bearer'
    }
  });
});

app.get('/api/auth/profile', (req, res) => {
  // Simple auth check - in production, verify JWT token
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const user = users.find(u => u.id === currentUserId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const { password: _, ...userWithoutPassword } = user;
  res.json({
    success: true,
    user: userWithoutPassword
  });
});

app.post('/api/auth/logout', (req, res) => {
  currentUserId = null;
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Drug verification routes
app.post('/api/verification/verify', (req, res) => {
  const { qrCode, barcode, batchNumber, drugCode } = req.body;

  let drug = null;

  // Search for drug
  if (qrCode) {
    drug = drugs.find(d => d.qrCode === qrCode);
  } else if (barcode) {
    drug = drugs.find(d => d.barcode === barcode);
  } else if (batchNumber && drugCode) {
    drug = drugs.find(d => d.batchNumber === batchNumber && d.drugCode === drugCode);
  }

  if (drug) {
    const isExpired = new Date(drug.expiryDate) < new Date();

    res.json({
      success: true,
      verification: {
        result: isExpired ? 'expired' : 'authentic',
        authenticity_score: isExpired ? 60 : 95,
        risk_factors: isExpired ? ['Drug is expired'] : [],
        batch_info: drug,
        supply_chain: {
          transactions: [
            { entity: drug.manufacturer, type: 'manufacturer', date: '2024-01-15' },
            { entity: 'MediDistrib', type: 'distributor', date: '2024-01-20' },
            { entity: 'City Pharmacy', type: 'retailer', date: '2024-01-25' }
          ]
        }
      }
    });
  } else {
    res.json({
      success: true,
      verification: {
        result: 'not_found',
        authenticity_score: 10,
        risk_factors: ['Drug not found in database - potential counterfeit'],
        batch_info: null,
        supply_chain: null
      }
    });
  }
});

// Reports routes
app.post('/api/reports/create', (req, res) => {
  const newReport = {
    id: reports.length + 1,
    ...req.body,
    status: 'pending',
    reporterId: currentUserId,
    createdAt: new Date().toISOString()
  };

  reports.push(newReport);

  res.status(201).json({
    success: true,
    message: 'Report created successfully',
    report: newReport
  });
});

app.get('/api/reports', (req, res) => {
  res.json({
    success: true,
    reports: reports
  });
});

// Admin routes
app.get('/api/admin/dashboard', (req, res) => {
  res.json({
    success: true,
    dashboard: {
      system_stats: {
        users: users.length,
        drugs: drugs.length,
        reports: reports.length,
        verifications: 150
      },
      recent_activity: {
        verifications: [
          { count: 5, date: new Date().toISOString().split('T')[0] },
          { count: 8, date: new Date(Date.now() - 86400000).toISOString().split('T')[0] }
        ]
      }
    }
  });
});

app.get('/api/admin/users', (req, res) => {
  const usersWithoutPasswords = users.map(({ password, ...user }) => user);
  res.json({
    success: true,
    users: usersWithoutPasswords,
    pagination: {
      current_page: 1,
      per_page: 20,
      total_count: users.length,
      total_pages: 1
    }
  });
});

app.get('/api/admin/drugs', (req, res) => {
  res.json({
    success: true,
    drugs: drugs,
    pagination: {
      current_page: 1,
      per_page: 20,
      total_count: drugs.length,
      total_pages: 1
    }
  });
});

// Catch-all for 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Simple Drug Verification Server running on http://localhost:${PORT}`);
  console.log(`📋 Demo accounts available:`);
  console.log(`   Admin: admin@drugverify.com / admin123`);
  console.log(`   Pharmacist: pharmacist@example.com / pharm123`);
  console.log(`   User: user@example.com / user123`);
  console.log(`📊 API Health: http://localhost:${PORT}/api/health`);
});
