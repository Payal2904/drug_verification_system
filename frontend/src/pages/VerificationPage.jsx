import React, { useState } from 'react';
import { Shield, Search, CheckCircle, XCircle, AlertTriangle, Clock, Package, Truck } from 'lucide-react';
import { motion } from 'framer-motion';
import dataService from '../services/dataService';
import LoadingSpinner from '../components/common/LoadingSpinner';

const VerificationPage = () => {
  const [formData, setFormData] = useState({
    drugName: '',
    batchNumber: '',
    drugCode: '',
    qrCode: '',
    barcode: ''
  });
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('manual');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setVerificationResult(null);

    try {
      const searchData = {};

      if (activeTab === 'manual') {
        if (formData.batchNumber && formData.drugCode) {
          searchData.batchNumber = formData.batchNumber;
          searchData.drugCode = formData.drugCode;
        }
      } else if (activeTab === 'qr') {
        searchData.qrCode = formData.qrCode;
      } else if (activeTab === 'barcode') {
        searchData.barcode = formData.barcode;
      }

      const result = await dataService.verifyDrug(searchData);
      setVerificationResult(result);
    } catch (error) {
      setVerificationResult({
        success: false,
        result: 'error',
        message: 'Verification failed. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setFormData({
      drugName: '',
      batchNumber: '',
      drugCode: '',
      qrCode: '',
      barcode: ''
    });
    setVerificationResult(null);
  };

  const getResultIcon = (result) => {
    switch (result) {
      case 'authentic':
        return <CheckCircle className="h-12 w-12 text-green-500" />;
      case 'expired':
        return <Clock className="h-12 w-12 text-orange-500" />;
      case 'not_found':
      case 'counterfeit':
        return <XCircle className="h-12 w-12 text-red-500" />;
      default:
        return <AlertTriangle className="h-12 w-12 text-yellow-500" />;
    }
  };

  const getResultColor = (result) => {
    switch (result) {
      case 'authentic':
        return 'green';
      case 'expired':
        return 'orange';
      case 'not_found':
      case 'counterfeit':
        return 'red';
      default:
        return 'yellow';
    }
  };

  const getResultTitle = (result) => {
    switch (result) {
      case 'authentic':
        return 'Drug is Authentic';
      case 'expired':
        return 'Drug is Expired';
      case 'not_found':
        return 'Drug Not Found';
      case 'counterfeit':
        return 'Potential Counterfeit';
      default:
        return 'Verification Complete';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 pt-4">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-primary-600" />
            </div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-4">
              Drug Verification
            </h1>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Verify the authenticity of pharmaceutical products using our secure database
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Verification Form */}
            <div className="bg-white rounded-lg shadow-soft p-6">
              <h2 className="text-xl font-semibold text-neutral-900 mb-6">
                Verify Your Medication
              </h2>

              {/* Tabs */}
              <div className="mb-6">
                <nav className="flex space-x-1 bg-neutral-100 rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab('manual')}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === 'manual'
                        ? 'bg-white text-primary-700 shadow-sm'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    Manual Entry
                  </button>
                  <button
                    onClick={() => setActiveTab('qr')}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === 'qr'
                        ? 'bg-white text-primary-700 shadow-sm'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    QR Code
                  </button>
                  <button
                    onClick={() => setActiveTab('barcode')}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === 'barcode'
                        ? 'bg-white text-primary-700 shadow-sm'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    Barcode
                  </button>
                </nav>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {activeTab === 'manual' && (
                  <>
                    <div>
                      <label className="form-label">Batch Number *</label>
                      <input
                        type="text"
                        name="batchNumber"
                        value={formData.batchNumber}
                        onChange={handleChange}
                        className="input"
                        placeholder="Enter batch number (e.g., BATCH001)"
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label">Drug Code *</label>
                      <input
                        type="text"
                        name="drugCode"
                        value={formData.drugCode}
                        onChange={handleChange}
                        className="input"
                        placeholder="Enter drug code (e.g., PARA500)"
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label">Drug Name (Optional)</label>
                      <input
                        type="text"
                        name="drugName"
                        value={formData.drugName}
                        onChange={handleChange}
                        className="input"
                        placeholder="Enter drug name for reference"
                      />
                    </div>
                  </>
                )}

                {activeTab === 'qr' && (
                  <div>
                    <label className="form-label">QR Code Data *</label>
                    <input
                      type="text"
                      name="qrCode"
                      value={formData.qrCode}
                      onChange={handleChange}
                      className="input"
                      placeholder="Enter QR code data (e.g., QR001PARA500BATCH001)"
                      required
                    />
                    <p className="text-sm text-neutral-500 mt-1">
                      Try: QR001PARA500BATCH001 or QR002AMOX250BATCH002
                    </p>
                  </div>
                )}

                {activeTab === 'barcode' && (
                  <div>
                    <label className="form-label">Barcode *</label>
                    <input
                      type="text"
                      name="barcode"
                      value={formData.barcode}
                      onChange={handleChange}
                      className="input"
                      placeholder="Enter barcode (e.g., 123456789012)"
                      required
                    />
                    <p className="text-sm text-neutral-500 mt-1">
                      Try: 123456789012 or 234567890123
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary flex-1"
                  >
                    {loading ? (
                      <>
                        <LoadingSpinner size="xs" color="white" />
                        <span className="ml-2">Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Verify Drug
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={clearForm}
                    className="btn btn-outline"
                  >
                    Clear
                  </button>
                </div>
              </form>

              {/* Sample Data Info */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">
                  Sample Data for Testing:
                </h4>
                <div className="text-xs text-blue-800 space-y-1">
                  <p><strong>Batch:</strong> BATCH001, Code: PARA500</p>
                  <p><strong>Batch:</strong> BATCH002, Code: AMOX250</p>
                  <p><strong>QR:</strong> QR001PARA500BATCH001</p>
                  <p><strong>Barcode:</strong> 123456789012</p>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="bg-white rounded-lg shadow-soft p-6">
              <h2 className="text-xl font-semibold text-neutral-900 mb-6">
                Verification Results
              </h2>

              {!verificationResult ? (
                <div className="text-center py-12">
                  <Shield className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
                  <p className="text-neutral-500">
                    Enter drug information to verify authenticity
                  </p>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Result Status */}
                  <div className="text-center pb-6 border-b border-neutral-200">
                    {getResultIcon(verificationResult.result)}
                    <h3 className={`text-2xl font-bold mt-4 text-${getResultColor(verificationResult.result)}-600`}>
                      {getResultTitle(verificationResult.result)}
                    </h3>
                    <div className="mt-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-${getResultColor(verificationResult.result)}-100 text-${getResultColor(verificationResult.result)}-800`}>
                        Authenticity Score: {verificationResult.authenticity_score || 0}%
                      </span>
                    </div>
                  </div>

                  {/* Drug Information */}
                  {verificationResult.drug && (
                    <div>
                      <h4 className="font-semibold text-neutral-900 mb-3">Drug Information</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Name:</span>
                          <span className="font-medium">{verificationResult.drug.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Batch Number:</span>
                          <span className="font-medium">{verificationResult.drug.batchNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Manufacturer:</span>
                          <span className="font-medium">{verificationResult.drug.manufacturer}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Expiry Date:</span>
                          <span className={`font-medium ${new Date(verificationResult.drug.expiryDate) < new Date() ? 'text-red-600' : 'text-green-600'}`}>
                            {new Date(verificationResult.drug.expiryDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Risk Factors */}
                  {verificationResult.risk_factors && verificationResult.risk_factors.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-neutral-900 mb-3">Risk Factors</h4>
                      <ul className="space-y-2">
                        {verificationResult.risk_factors.map((factor, index) => (
                          <li key={index} className="flex items-center text-red-600">
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            <span className="text-sm">{factor}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Supply Chain */}
                  {verificationResult.supplyChain && verificationResult.supplyChain.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-neutral-900 mb-3">Supply Chain History</h4>
                      <div className="space-y-3">
                        {verificationResult.supplyChain.map((entry, index) => (
                          <div key={index} className="flex items-center space-x-3 p-3 bg-neutral-50 rounded-lg">
                            <div className={`p-2 rounded-full ${
                              entry.type === 'manufacturer' ? 'bg-blue-100 text-blue-600' :
                              entry.type === 'distributor' ? 'bg-purple-100 text-purple-600' :
                              'bg-green-100 text-green-600'
                            }`}>
                              {entry.type === 'manufacturer' ? <Package className="h-4 w-4" /> :
                               entry.type === 'distributor' ? <Truck className="h-4 w-4" /> :
                               <Shield className="h-4 w-4" />}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-neutral-900">{entry.entity}</p>
                              <p className="text-sm text-neutral-500 capitalize">{entry.type}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-neutral-900">{new Date(entry.date).toLocaleDateString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Message */}
                  {verificationResult.message && (
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-yellow-800">{verificationResult.message}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-8 bg-white rounded-lg shadow-soft p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">
              How Drug Verification Works
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Search className="h-6 w-6" />
                </div>
                <h4 className="font-medium text-neutral-900 mb-2">Enter Information</h4>
                <p className="text-sm text-neutral-600">
                  Provide drug details via manual entry, QR code, or barcode
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Shield className="h-6 w-6" />
                </div>
                <h4 className="font-medium text-neutral-900 mb-2">Database Check</h4>
                <p className="text-sm text-neutral-600">
                  Cross-reference with our secure pharmaceutical database
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <h4 className="font-medium text-neutral-900 mb-2">Get Results</h4>
                <p className="text-sm text-neutral-600">
                  Receive authenticity score and supply chain information
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationPage;
