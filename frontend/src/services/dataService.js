// LocalStorage-based Data Service for College Project
// This replaces the complex database setup with simple browser storage

class DataService {
  constructor() {
    this.initializeData();
  }

  // Initialize default data if not exists
  initializeData() {
    if (!localStorage.getItem('drugVerifyUsers')) {
      const defaultUsers = [
        {
          id: 1,
          username: 'admin',
          email: 'admin@drugverify.com',
          password: 'admin123',
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
      localStorage.setItem('drugVerifyUsers', JSON.stringify(defaultUsers));
    }

    if (!localStorage.getItem('drugVerifyDrugs')) {
      const defaultDrugs = [
        {
          id: 1,
          name: 'Paracetamol',
          drugCode: 'PARA500',
          batchNumber: 'BATCH001',
          manufacturer: 'Pharma Corp',
          expiryDate: '2025-12-31',
          qrCode: 'QR001PARA500BATCH001',
          barcode: '123456789012',
          isActive: true,
          supplyChain: [
            { entity: 'Pharma Corp', type: 'manufacturer', date: '2024-01-15' },
            { entity: 'MediDistrib', type: 'distributor', date: '2024-01-20' },
            { entity: 'City Pharmacy', type: 'retailer', date: '2024-01-25' }
          ]
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
          isActive: true,
          supplyChain: [
            { entity: 'MediCare Inc', type: 'manufacturer', date: '2024-02-01' },
            { entity: 'HealthDistrib', type: 'distributor', date: '2024-02-05' },
            { entity: 'Metro Pharmacy', type: 'retailer', date: '2024-02-10' }
          ]
        },
        {
          id: 3,
          name: 'Lisinopril',
          drugCode: 'LISI10',
          batchNumber: 'BATCH003',
          manufacturer: 'GlobalMed Ltd',
          expiryDate: '2025-09-15',
          qrCode: 'QR003LISI10BATCH003',
          barcode: '345678901234',
          isActive: true,
          supplyChain: [
            { entity: 'GlobalMed Ltd', type: 'manufacturer', date: '2024-01-20' },
            { entity: 'MedSupply Co', type: 'distributor', date: '2024-01-25' },
            { entity: 'Family Pharmacy', type: 'retailer', date: '2024-01-30' }
          ]
        }
      ];
      localStorage.setItem('drugVerifyDrugs', JSON.stringify(defaultDrugs));
    }

    if (!localStorage.getItem('drugVerifyReports')) {
      localStorage.setItem('drugVerifyReports', JSON.stringify([]));
    }

    if (!localStorage.getItem('drugVerifyVerifications')) {
      localStorage.setItem('drugVerifyVerifications', JSON.stringify([]));
    }
  }

  // User Authentication
  async login(username, password) {
    const users = JSON.parse(localStorage.getItem('drugVerifyUsers') || '[]');
    const user = users.find(u =>
      (u.username === username || u.email === username) && u.password === password
    );

    if (user && user.isActive) {
      const userWithoutPassword = { ...user };
      delete userWithoutPassword.password;

      // Store current user
      localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
      localStorage.setItem('accessToken', 'demo-token-' + user.id);

      return {
        success: true,
        user: userWithoutPassword,
        token: 'demo-token-' + user.id
      };
    }

    return {
      success: false,
      message: 'Invalid username or password'
    };
  }

  async register(userData) {
    const users = JSON.parse(localStorage.getItem('drugVerifyUsers') || '[]');

    // Check if user already exists
    const existingUser = users.find(u =>
      u.username === userData.username || u.email === userData.email
    );

    if (existingUser) {
      return {
        success: false,
        message: 'Username or email already exists'
      };
    }

    const newUser = {
      id: Date.now(),
      ...userData,
      isActive: true,
      isVerified: false,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem('drugVerifyUsers', JSON.stringify(users));

    const userWithoutPassword = { ...newUser };
    delete userWithoutPassword.password;

    localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
    localStorage.setItem('accessToken', 'demo-token-' + newUser.id);

    return {
      success: true,
      user: userWithoutPassword,
      token: 'demo-token-' + newUser.id
    };
  }

  getCurrentUser() {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
  }

  logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('accessToken');
  }

  // Drug Verification
  async verifyDrug(searchData) {
    const drugs = JSON.parse(localStorage.getItem('drugVerifyDrugs') || '[]');
    let drug = null;

    // Search by QR code, barcode, or batch number + drug code
    if (searchData.qrCode) {
      drug = drugs.find(d => d.qrCode === searchData.qrCode);
    } else if (searchData.barcode) {
      drug = drugs.find(d => d.barcode === searchData.barcode);
    } else if (searchData.batchNumber && searchData.drugCode) {
      drug = drugs.find(d =>
        d.batchNumber === searchData.batchNumber && d.drugCode === searchData.drugCode
      );
    }

    // Log verification attempt
    const verification = {
      id: Date.now(),
      ...searchData,
      result: drug ? 'authentic' : 'not_found',
      drug: drug || null,
      timestamp: new Date().toISOString(),
      userId: this.getCurrentUser()?.id || null
    };

    const verifications = JSON.parse(localStorage.getItem('drugVerifyVerifications') || '[]');
    verifications.push(verification);
    localStorage.setItem('drugVerifyVerifications', JSON.stringify(verifications));

    if (drug) {
      // Check expiry
      const isExpired = new Date(drug.expiryDate) < new Date();

      return {
        success: true,
        result: isExpired ? 'expired' : 'authentic',
        drug: drug,
        supplyChain: drug.supplyChain,
        authenticity_score: isExpired ? 60 : 95,
        risk_factors: isExpired ? ['Drug is expired'] : []
      };
    }

    return {
      success: true,
      result: 'not_found',
      message: 'Drug not found in database. This could indicate a counterfeit product.',
      authenticity_score: 10,
      risk_factors: ['Drug not found in official database']
    };
  }

  // Reports Management
  async createReport(reportData) {
    const reports = JSON.parse(localStorage.getItem('drugVerifyReports') || '[]');

    const newReport = {
      id: Date.now(),
      ...reportData,
      status: 'pending',
      reporterId: this.getCurrentUser()?.id || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    reports.push(newReport);
    localStorage.setItem('drugVerifyReports', JSON.stringify(reports));

    return {
      success: true,
      report: newReport
    };
  }

  async getReports(userId = null) {
    const reports = JSON.parse(localStorage.getItem('drugVerifyReports') || '[]');

    if (userId) {
      return reports.filter(r => r.reporterId === userId);
    }

    return reports;
  }

  async updateReport(reportId, updateData) {
    const reports = JSON.parse(localStorage.getItem('drugVerifyReports') || '[]');
    const reportIndex = reports.findIndex(r => r.id === reportId);

    if (reportIndex === -1) {
      return { success: false, message: 'Report not found' };
    }

    reports[reportIndex] = {
      ...reports[reportIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem('drugVerifyReports', JSON.stringify(reports));

    return {
      success: true,
      report: reports[reportIndex]
    };
  }

  // Statistics
  getStats() {
    const users = JSON.parse(localStorage.getItem('drugVerifyUsers') || '[]');
    const drugs = JSON.parse(localStorage.getItem('drugVerifyDrugs') || '[]');
    const reports = JSON.parse(localStorage.getItem('drugVerifyReports') || '[]');
    const verifications = JSON.parse(localStorage.getItem('drugVerifyVerifications') || '[]');

    return {
      totalUsers: users.length,
      totalDrugs: drugs.length,
      totalReports: reports.length,
      totalVerifications: verifications.length,
      pendingReports: reports.filter(r => r.status === 'pending').length,
      authenticDrugs: verifications.filter(v => v.result === 'authentic').length,
      suspiciousReports: reports.filter(r => r.status === 'investigating').length
    };
  }

  // Drug Management (Admin)
  async addDrug(drugData) {
    const drugs = JSON.parse(localStorage.getItem('drugVerifyDrugs') || '[]');

    const newDrug = {
      id: Date.now(),
      ...drugData,
      isActive: true,
      createdAt: new Date().toISOString(),
      supplyChain: [
        {
          entity: drugData.manufacturer,
          type: 'manufacturer',
          date: new Date().toISOString().split('T')[0]
        }
      ]
    };

    drugs.push(newDrug);
    localStorage.setItem('drugVerifyDrugs', JSON.stringify(drugs));

    return {
      success: true,
      drug: newDrug
    };
  }

  async getAllDrugs() {
    return JSON.parse(localStorage.getItem('drugVerifyDrugs') || '[]');
  }

  async getAllUsers() {
    const users = JSON.parse(localStorage.getItem('drugVerifyUsers') || '[]');
    return users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  // Search functionality
  searchDrugs(query) {
    const drugs = JSON.parse(localStorage.getItem('drugVerifyDrugs') || '[]');
    return drugs.filter(drug =>
      drug.name.toLowerCase().includes(query.toLowerCase()) ||
      drug.drugCode.toLowerCase().includes(query.toLowerCase()) ||
      drug.manufacturer.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Clear all data (for testing)
  clearAllData() {
    localStorage.removeItem('drugVerifyUsers');
    localStorage.removeItem('drugVerifyDrugs');
    localStorage.removeItem('drugVerifyReports');
    localStorage.removeItem('drugVerifyVerifications');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('accessToken');
    this.initializeData();
  }
}

export default new DataService();
