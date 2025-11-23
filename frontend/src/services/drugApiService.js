// Drug API Service - Real API Integration
// Uses OpenFDA API and other public drug databases

class DrugApiService {
  constructor() {
    this.openFdaBaseUrl = 'https://api.fda.gov/drug';
    this.backupData = this.getBackupData();
  }

  // Backup data for when API fails or for testing
  getBackupData() {
    return [
      {
        id: 1,
        name: 'Paracetamol',
        drugCode: 'PARA500',
        batchNumber: 'BATCH001',
        manufacturer: 'Pharma Corp',
        expiryDate: '2025-12-31',
        qrCode: 'QR001PARA500BATCH001',
        barcode: '123456789012',
        strength: '500mg',
        isActive: true,
        supplyChain: [
          { entity: 'Pharma Corp', type: 'manufacturer', date: '2024-01-15', location: 'Mumbai, India' },
          { entity: 'MediDistrib', type: 'distributor', date: '2024-01-20', location: 'Delhi, India' },
          { entity: 'City Pharmacy', type: 'retailer', date: '2024-01-25', location: 'Bangalore, India' }
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
        strength: '250mg',
        isActive: true,
        supplyChain: [
          { entity: 'MediCare Inc', type: 'manufacturer', date: '2024-02-01', location: 'Hyderabad, India' },
          { entity: 'HealthDistrib', type: 'distributor', date: '2024-02-05', location: 'Chennai, India' },
          { entity: 'Metro Pharmacy', type: 'retailer', date: '2024-02-10', location: 'Pune, India' }
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
        strength: '10mg',
        isActive: true,
        supplyChain: [
          { entity: 'GlobalMed Ltd', type: 'manufacturer', date: '2024-01-20', location: 'Kolkata, India' },
          { entity: 'MedSupply Co', type: 'distributor', date: '2024-01-25', location: 'Ahmedabad, India' },
          { entity: 'Family Pharmacy', type: 'retailer', date: '2024-01-30', location: 'Jaipur, India' }
        ]
      }
    ];
  }

  // Verify drug using multiple methods
  async verifyDrug(searchData) {
    console.log('🔍 DrugApiService: Verifying drug with:', searchData);

    try {
      // First, try to find in backup/local data (for demo purposes)
      const localResult = this.findInLocalData(searchData);
      
      if (localResult) {
        console.log('✅ Found in local database:', localResult.name);
        return this.formatVerificationResult(localResult, 'authentic');
      }

      // If not found locally and we have enough info, try OpenFDA API
      if (searchData.drugName || searchData.drugCode) {
        console.log('🌐 Trying OpenFDA API...');
        const apiResult = await this.searchOpenFDA(searchData);
        
        if (apiResult) {
          console.log('✅ Found via OpenFDA API');
          return this.formatVerificationResult(apiResult, 'authentic');
        }
      }

      // Not found anywhere
      console.log('❌ Drug not found in any database');
      return {
        success: true,
        result: 'not_found',
        message: `Drug not found in database. Code: ${searchData.qrCode || searchData.barcode || 'Unknown'}`,
        authenticity_score: 10,
        risk_factors: ['Drug not found in official database', 'May be counterfeit or unregistered']
      };

    } catch (error) {
      console.error('❌ Verification error:', error);
      return {
        success: false,
        result: 'error',
        message: 'Verification system error. Please try again.',
        authenticity_score: 0,
        risk_factors: ['System error during verification']
      };
    }
  }

  // Find drug in local/backup data
  findInLocalData(searchData) {
    const drugs = this.backupData;
    let drug = null;

    if (searchData.qrCode) {
      drug = drugs.find(d => d.qrCode === searchData.qrCode);
      console.log('🔍 Searching by QR code:', searchData.qrCode, '→', drug ? 'Found' : 'Not found');
    } else if (searchData.barcode) {
      drug = drugs.find(d => d.barcode === searchData.barcode);
      console.log('🔍 Searching by barcode:', searchData.barcode, '→', drug ? 'Found' : 'Not found');
    } else if (searchData.batchNumber && searchData.drugCode) {
      drug = drugs.find(d =>
        d.batchNumber === searchData.batchNumber && d.drugCode === searchData.drugCode
      );
      console.log('🔍 Searching by batch + code:', searchData.batchNumber, searchData.drugCode, '→', drug ? 'Found' : 'Not found');
    }

    return drug;
  }

  // Search OpenFDA API
  async searchOpenFDA(searchData) {
    try {
      // OpenFDA doesn't directly support barcode/QR lookup
      // We'll search by drug name or code if available
      let searchTerm = searchData.drugName || searchData.drugCode || '';
      
      if (!searchTerm) {
        return null;
      }

      const url = `${this.openFdaBaseUrl}/label.json?search=openfda.brand_name:"${searchTerm}"&limit=1`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.log('⚠️ OpenFDA API returned:', response.status);
        return null;
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const fdaResult = data.results[0];
        
        // Convert FDA data to our format
        return {
          name: fdaResult.openfda.brand_name?.[0] || searchTerm,
          manufacturer: fdaResult.openfda.manufacturer_name?.[0] || 'Unknown',
          drugCode: searchData.drugCode || 'N/A',
          batchNumber: searchData.batchNumber || 'N/A',
          barcode: searchData.barcode || 'N/A',
          qrCode: searchData.qrCode || 'N/A',
          expiryDate: 'N/A',
          strength: fdaResult.openfda.substance_name?.[0] || 'N/A',
          isActive: true,
          supplyChain: [
            { entity: fdaResult.openfda.manufacturer_name?.[0] || 'FDA Registered', type: 'manufacturer', date: new Date().toISOString().split('T')[0], location: 'USA' }
          ],
          source: 'OpenFDA'
        };
      }

      return null;
    } catch (error) {
      console.error('⚠️ OpenFDA API error:', error);
      return null;
    }
  }

  // Format verification result
  formatVerificationResult(drug, status = 'authentic') {
    // Check expiry if available
    let isExpired = false;
    if (drug.expiryDate && drug.expiryDate !== 'N/A') {
      const expiryDate = new Date(drug.expiryDate);
      const currentDate = new Date();
      isExpired = expiryDate < currentDate;
    }

    const result = isExpired ? 'expired' : status;
    const score = isExpired ? 60 : (status === 'authentic' ? 95 : 10);
    const riskFactors = [];

    if (isExpired) {
      riskFactors.push('Drug is expired');
    }
    if (drug.source === 'OpenFDA') {
      riskFactors.push('Verified via FDA database');
    }

    return {
      success: true,
      result: result,
      drug: drug,
      supplyChain: drug.supplyChain || [],
      authenticity_score: score,
      risk_factors: riskFactors
    };
  }

  // Get all drugs (for admin panel)
  async getAllDrugs() {
    return this.backupData;
  }
}

export default new DrugApiService();

