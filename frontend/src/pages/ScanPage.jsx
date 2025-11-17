import React, { useState, useCallback } from 'react';
import { Camera, Upload, FileImage, CheckCircle, AlertTriangle, Shield, Scan } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import CameraScanner from '../components/scanning/CameraScanner';

const ScanPage = () => {
  const [scanMode, setScanMode] = useState('camera'); // 'camera', 'upload'
  const [scanType, setScanType] = useState('all'); // 'qr', 'barcode', 'all'
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);

  // Mock verification data
  const mockVerificationData = {
    'QR001PARA500BATCH001': {
      isAuthentic: true,
      drug: {
        name: 'Paracetamol',
        strength: '500mg',
        manufacturer: 'PharmaCorp Ltd',
        batchNumber: 'BATCH001',
        expiryDate: '2025-12-31',
        manufacturingDate: '2023-01-15'
      },
      supplyChain: [
        { stage: 'Manufacturing', location: 'Mumbai, India', date: '2023-01-15', verified: true },
        { stage: 'Distribution', location: 'Delhi, India', date: '2023-01-20', verified: true },
        { stage: 'Retail', location: 'Local Pharmacy', date: '2023-01-25', verified: true }
      ]
    },
    'QR002AMOX250BATCH002': {
      isAuthentic: true,
      drug: {
        name: 'Amoxicillin',
        strength: '250mg',
        manufacturer: 'MediCore Industries',
        batchNumber: 'BATCH002',
        expiryDate: '2025-06-30',
        manufacturingDate: '2023-02-10'
      },
      supplyChain: [
        { stage: 'Manufacturing', location: 'Chennai, India', date: '2023-02-10', verified: true },
        { stage: 'Distribution', location: 'Bangalore, India', date: '2023-02-15', verified: true },
        { stage: 'Retail', location: 'Local Pharmacy', date: '2023-02-20', verified: true }
      ]
    },
    '123456789012': {
      isAuthentic: true,
      drug: {
        name: 'Ibuprofen',
        strength: '400mg',
        manufacturer: 'HealthFirst Pharma',
        batchNumber: 'BATCH003',
        expiryDate: '2025-08-15',
        manufacturingDate: '2023-03-05'
      },
      supplyChain: [
        { stage: 'Manufacturing', location: 'Pune, India', date: '2023-03-05', verified: true },
        { stage: 'Distribution', location: 'Mumbai, India', date: '2023-03-10', verified: true },
        { stage: 'Retail', location: 'Local Pharmacy', date: '2023-03-15', verified: true }
      ]
    },
    '987654321098': {
      isAuthentic: true,
      drug: {
        name: 'Aspirin',
        strength: '75mg',
        manufacturer: 'CardioCare Ltd',
        batchNumber: 'BATCH004',
        expiryDate: '2025-11-20',
        manufacturingDate: '2023-04-01'
      },
      supplyChain: [
        { stage: 'Manufacturing', location: 'Hyderabad, India', date: '2023-04-01', verified: true },
        { stage: 'Distribution', location: 'Kolkata, India', date: '2023-04-06', verified: true },
        { stage: 'Retail', location: 'Local Pharmacy', date: '2023-04-11', verified: true }
      ]
    }
  };

  // Handle successful scan
  const handleScanSuccess = useCallback(async (result) => {
    setScanResult(result);
    setIsVerifying(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      const verification = mockVerificationData[result.data] || {
        isAuthentic: false,
        drug: {
          name: 'Unknown Drug',
          manufacturer: 'Unknown',
          batchNumber: 'Unknown'
        },
        error: 'Drug not found in database or potentially counterfeit'
      };

      setVerificationResult(verification);

      if (verification.isAuthentic) {
        toast.success('Drug verified successfully!');
      } else {
        toast.error('Warning: Potentially counterfeit drug detected!');
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  }, []);

  // Handle scan error
  const handleScanError = useCallback((error) => {
    console.error('Scan error:', error);
    toast.error('Scanning failed. Please check camera permissions.');
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setUploadedImage(e.target.result);

          // Simulate scanning from uploaded image
          setTimeout(() => {
            // Mock QR detection from image
            const mockResult = {
              type: 'qr',
              data: 'QR001PARA500BATCH001'
            };
            handleScanSuccess(mockResult);
          }, 1000);
        };
        reader.readAsDataURL(file);
      } else {
        toast.error('Please select a valid image file.');
      }
    }
  }, [handleScanSuccess]);

  // Reset scan
  const resetScan = useCallback(() => {
    setScanResult(null);
    setVerificationResult(null);
    setUploadedImage(null);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4"
            >
              <Scan className="h-8 w-8 text-blue-600" />
            </motion.div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Drug Scanner
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Scan QR codes or barcodes to instantly verify drug authenticity and view complete supply chain information.
            </p>
          </div>

          {/* Scan Mode Selection */}
          {!scanResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-soft p-6 mb-6"
            >
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <button
                  onClick={() => setScanMode('camera')}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    scanMode === 'camera'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Camera className="h-6 w-6 mx-auto mb-2" />
                  <div className="text-sm font-medium">Camera Scan</div>
                  <div className="text-xs text-gray-500">Use device camera</div>
                </button>

                <button
                  onClick={() => setScanMode('upload')}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    scanMode === 'upload'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Upload className="h-6 w-6 mx-auto mb-2" />
                  <div className="text-sm font-medium">Upload Image</div>
                  <div className="text-xs text-gray-500">Select from gallery</div>
                </button>
              </div>

              {/* Scan Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What would you like to scan?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setScanType('all')}
                    className={`p-3 rounded-lg text-xs font-medium transition-all ${
                      scanType === 'all'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Any Code
                  </button>
                  <button
                    onClick={() => setScanType('qr')}
                    className={`p-3 rounded-lg text-xs font-medium transition-all ${
                      scanType === 'qr'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    QR Code Only
                  </button>
                  <button
                    onClick={() => setScanType('barcode')}
                    className={`p-3 rounded-lg text-xs font-medium transition-all ${
                      scanType === 'barcode'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Barcode Only
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              {scanMode === 'camera' ? (
                <button
                  onClick={() => setIsScanning(true)}
                  className="w-full btn btn-primary btn-lg"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Start Camera Scan
                </button>
              ) : (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="w-full btn btn-primary btn-lg cursor-pointer inline-flex items-center justify-center"
                  >
                    <FileImage className="h-5 w-5 mr-2" />
                    Select Image
                  </label>
                </div>
              )}
            </motion.div>
          )}

          {/* Uploaded Image Preview */}
          {uploadedImage && !verificationResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-soft p-6 mb-6"
            >
              <h3 className="text-lg font-semibold mb-4">Uploaded Image</h3>
              <div className="flex justify-center mb-4">
                <img
                  src={uploadedImage}
                  alt="Uploaded scan"
                  className="max-w-full max-h-64 rounded-lg"
                />
              </div>
              {isVerifying && (
                <div className="text-center">
                  <div className="inline-flex items-center">
                    <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
                    <span className="text-gray-600">Analyzing image...</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Verification Result */}
          <AnimatePresence>
            {verificationResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-soft overflow-hidden"
              >
                {/* Result Header */}
                <div className={`p-6 ${
                  verificationResult.isAuthentic
                    ? 'bg-gradient-to-r from-green-500 to-green-600'
                    : 'bg-gradient-to-r from-red-500 to-red-600'
                } text-white`}>
                  <div className="flex items-center">
                    {verificationResult.isAuthentic ? (
                      <CheckCircle className="h-8 w-8 mr-3" />
                    ) : (
                      <AlertTriangle className="h-8 w-8 mr-3" />
                    )}
                    <div>
                      <h2 className="text-xl font-bold">
                        {verificationResult.isAuthentic ? 'Authentic Drug' : 'Warning: Suspicious Drug'}
                      </h2>
                      <p className="text-sm opacity-90">
                        {verificationResult.isAuthentic
                          ? 'This drug has been verified as authentic'
                          : 'This drug could not be verified or may be counterfeit'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Drug Information */}
                <div className="p-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Drug Information</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Name:</span>
                          <span className="font-medium">{verificationResult.drug.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Strength:</span>
                          <span className="font-medium">{verificationResult.drug.strength || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Manufacturer:</span>
                          <span className="font-medium">{verificationResult.drug.manufacturer}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Batch Number:</span>
                          <span className="font-medium">{verificationResult.drug.batchNumber}</span>
                        </div>
                        {verificationResult.drug.expiryDate && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Expiry Date:</span>
                            <span className="font-medium">{verificationResult.drug.expiryDate}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Supply Chain */}
                    {verificationResult.supplyChain && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <Shield className="h-5 w-5 mr-2 text-blue-600" />
                          Supply Chain
                        </h3>
                        <div className="space-y-3">
                          {verificationResult.supplyChain.map((stage, index) => (
                            <div key={index} className="flex items-center">
                              <div className={`w-3 h-3 rounded-full mr-3 ${
                                stage.verified ? 'bg-green-500' : 'bg-gray-400'
                              }`}></div>
                              <div className="flex-1">
                                <div className="font-medium text-sm">{stage.stage}</div>
                                <div className="text-xs text-gray-500">
                                  {stage.location} - {stage.date}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Error Message */}
                  {verificationResult.error && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-700 text-sm">{verificationResult.error}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-6 flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={resetScan}
                      className="btn btn-outline flex-1"
                    >
                      Scan Another Drug
                    </button>
                    {!verificationResult.isAuthentic && (
                      <button className="btn btn-error flex-1">
                        Report Counterfeit
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Tips */}
          {!scanResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-8 bg-blue-50 rounded-xl p-6"
            >
              <h3 className="text-lg font-semibold text-blue-900 mb-4">Scanning Tips</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-blue-800 mb-2">For best results:</h4>
                  <ul className="text-blue-700 space-y-1">
                    <li>• Ensure good lighting</li>
                    <li>• Hold device steady</li>
                    <li>• Keep code within the frame</li>
                    <li>• Clean the camera lens</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-blue-800 mb-2">Supported formats:</h4>
                  <ul className="text-blue-700 space-y-1">
                    <li>• QR Codes</li>
                    <li>• EAN-13 Barcodes</li>
                    <li>• Code 128 Barcodes</li>
                    <li>• Data Matrix Codes</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Camera Scanner Modal */}
      <CameraScanner
        isOpen={isScanning}
        onClose={() => setIsScanning(false)}
        onScanSuccess={handleScanSuccess}
        onError={handleScanError}
        scanType={scanType}
      />
    </div>
  );
};

export default ScanPage;
