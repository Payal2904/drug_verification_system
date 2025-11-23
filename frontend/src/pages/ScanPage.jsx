import React, { useState, useCallback, useEffect } from 'react';
import { Camera, Upload, FileImage, CheckCircle, AlertTriangle, Shield, Scan } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import jsQR from 'jsqr';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import CameraScanner from '../components/scanning/CameraScanner';
import drugApiService from '../services/drugApiService';

const ScanPage = () => {
  const navigate = useNavigate();
  const [scanMode, setScanMode] = useState('camera'); // 'camera', 'upload'
  const [scanType, setScanType] = useState('all'); // 'qr', 'barcode', 'all'
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);

  // Handle successful scan - uses YOUR actual QR code data
  const handleScanSuccess = useCallback(async (result) => {
    setScanResult(result);
    setIsVerifying(true);

    try {
      console.log('🔍 Reading YOUR QR code data:', result.data);
      
      // Verify against real database using YOUR QR code data
      const searchData = {};
      if (result.type === 'qr') {
        searchData.qrCode = result.data; // YOUR actual QR code content
      } else if (result.type === 'barcode') {
        searchData.barcode = result.data;
      }

      // Check database for YOUR scanned code (now using real API)
      const dbResult = await drugApiService.verifyDrug(searchData);
      
      console.log('📦 Database result:', dbResult);
      console.log('🔍 Result status:', dbResult.result);
      console.log('💊 Drug found:', dbResult.drug);
      console.log('✅ Success flag:', dbResult.success);
      
      // Convert database result to display format
      const verification = {
        isAuthentic: dbResult.result === 'authentic',
        isExpired: dbResult.result === 'expired',
        isFound: dbResult.drug !== null && dbResult.drug !== undefined,
        drug: dbResult.drug || {
          name: 'Unknown Drug',
          manufacturer: 'Unknown',
          batchNumber: result.data || 'Unknown'
        },
        supplyChain: dbResult.supplyChain || [],
        authenticity_score: dbResult.authenticity_score || 0,
        risk_factors: dbResult.risk_factors || [],
        error: dbResult.result === 'not_found' ? `Drug with code "${result.data}" not found in database. This may be counterfeit.` : null
      };

      console.log('🎯 Verification result:', verification);
      console.log('  isAuthentic:', verification.isAuthentic);
      console.log('  isExpired:', verification.isExpired);
      console.log('  isFound:', verification.isFound);

      setVerificationResult(verification);

      if (verification.isAuthentic) {
        toast.success(`✅ Drug verified! Found: ${verification.drug.name}`);
      } else if (verification.isExpired) {
        toast.error(`⚠️ Warning: Drug found but EXPIRED! ${verification.drug.name}`);
      } else {
        toast.error(`❌ Warning: Code "${result.data}" not found in database!`);
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Verification failed. Please try again.');
      setVerificationResult({
        isAuthentic: false,
        drug: { name: 'Error', manufacturer: 'Error', batchNumber: 'Error' },
        error: 'Verification system error'
      });
    } finally {
      setIsVerifying(false);
    }
  }, []);

  // Handle scan error
  const handleScanError = useCallback((error) => {
    console.error('Scan error:', error);
    toast.error('Scanning failed. Please check camera permissions.');
  }, []);

  // Simple barcode pattern detection (checks for vertical line patterns typical of barcodes)
  const detectBarcodePattern = useCallback((imageData) => {
    const { data, width, height } = imageData;
    
    // Check middle horizontal line for barcode-like patterns
    const middleY = Math.floor(height / 2);
    const lineStart = middleY * width * 4;
    
    let transitions = 0;
    let lastIntensity = 0;
    const threshold = 50;
    
    // Count black-to-white and white-to-black transitions
    for (let x = 0; x < width; x++) {
      const idx = lineStart + (x * 4);
      const intensity = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      
      if (Math.abs(intensity - lastIntensity) > threshold) {
        transitions++;
      }
      lastIntensity = intensity;
    }
    
    // Barcodes typically have many transitions (stripes)
    const transitionRatio = transitions / width;
    const hasEnoughTransitions = transitionRatio > 0.1 && transitionRatio < 0.8;
    
    console.log(`🔍 Barcode pattern analysis:`);
    console.log(`  - Transitions: ${transitions}`);
    console.log(`  - Transition ratio: ${transitionRatio.toFixed(3)}`);
    console.log(`  - Likely barcode: ${hasEnoughTransitions}`);
    
    return hasEnoughTransitions;
  }, []);

  // Handle file upload and decode QR code OR Barcode
  const handleFileUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          setUploadedImage(e.target.result);
          setIsVerifying(true);
          toast.success('Image uploaded! Detecting code...');
          console.log('📸 Image uploaded, starting code detection...');

          // Create an image element
          const img = new Image();
          img.onload = async () => {
            console.log(`📐 Image dimensions: ${img.width}x${img.height}`);
            
            // Create a canvas to extract image data
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0, img.width, img.height);
            console.log('🎨 Image drawn on canvas');
            
            // Get image data for jsQR (QR code detection)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            console.log(`🔍 Image data extracted: ${imageData.width}x${imageData.height}`);
            
            let detected = false;
            
            // STEP 1: Try QR code detection with jsQR
            if (scanType === 'qr' || scanType === 'all') {
              console.log('🔎 Attempting QR code detection with jsQR...');
              let qrCode = null;
              
              // Try multiple inversion attempts
              qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "attemptBoth",
              });
              
              if (qrCode && qrCode.data) {
                console.log('✅ QR CODE FOUND!');
                console.log('📱 QR Data:', qrCode.data);
                
                toast.success(`QR code detected: ${qrCode.data.substring(0, 30)}...`);
                const result = {
                  type: 'qr',
                  data: qrCode.data
                };
                handleScanSuccess(result);
                detected = true;
              }
            }
            
            // STEP 2: Try Barcode detection with ZXing (if QR not found)
            if (!detected && (scanType === 'barcode' || scanType === 'all')) {
              console.log('📊 Attempting BARCODE detection with ZXing...');
              
              try {
                const codeReader = new BrowserMultiFormatReader();
                
                // Decode from canvas or image element
                const result = await codeReader.decodeFromImageElement(img);
                
                if (result && result.text) {
                  console.log('✅ BARCODE FOUND!');
                  console.log('📊 Barcode Data:', result.text);
                  console.log('📊 Barcode Format:', result.format);
                  
                  toast.success(`Barcode detected: ${result.text}`);
                  const barcodeResult = {
                    type: 'barcode',
                    data: result.text
                  };
                  handleScanSuccess(barcodeResult);
                  detected = true;
                }
              } catch (error) {
                if (error instanceof NotFoundException) {
                  console.log('⚠️ ZXing could not find a barcode');
                } else {
                  console.error('⚠️ ZXing barcode detection error:', error);
                }
              }
            }
            
            // STEP 3: If nothing detected, show error
            if (!detected) {
              console.error('❌ No QR code or barcode detected in image');
              console.log('💡 Tips:');
              console.log('  - Ensure entire code is visible and clear');
              console.log('  - Try a higher resolution image');
              console.log('  - Check lighting and focus');
              console.log('  - For manual entry, use the Verify page');
              
              toast.error('Could not read any code from image. Please try:\n• A clearer, better-lit image\n• Manual entry on Verify page\n• Test codes: QR001PARA500BATCH001 or barcode: 123456789012');
              setUploadedImage(null);
              setIsVerifying(false);
            }
          };
          
          img.onerror = (error) => {
            console.error('❌ Failed to load image:', error);
            toast.error('Failed to load image. Please try another image.');
            setUploadedImage(null);
            setIsVerifying(false);
          };
          
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      } else {
        toast.error('Please select a valid image file (PNG, JPG, etc.)');
      }
    }
  }, [handleScanSuccess, scanType]);

  // Reset scan
  const resetScan = useCallback(() => {
    setScanResult(null);
    setVerificationResult(null);
    setUploadedImage(null);
  }, []);

  // Handle report counterfeit
  const handleReportCounterfeit = useCallback(() => {
    // Navigate to create report page with pre-filled data
    navigate('/reports/create', {
      state: {
        drugName: verificationResult?.drug?.name || 'Unknown Drug',
        batchNumber: verificationResult?.drug?.batchNumber || scanResult?.data || 'Unknown',
        drugCode: scanResult?.data || '',
        reportType: 'counterfeit',
        description: `Suspicious drug detected via scanning. Drug: ${verificationResult?.drug?.name || 'Unknown'}, Batch: ${verificationResult?.drug?.batchNumber || 'Unknown'}`
      }
    });
  }, [navigate, verificationResult, scanResult]);

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
                    : verificationResult.isExpired
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600'
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
                        {verificationResult.isAuthentic 
                          ? 'Authentic Drug' 
                          : verificationResult.isExpired 
                          ? 'Warning: Drug is Expired'
                          : 'Warning: Suspicious Drug'}
                      </h2>
                      <p className="text-sm opacity-90">
                        {verificationResult.isAuthentic
                          ? 'This drug has been verified as authentic'
                          : verificationResult.isExpired
                          ? 'This drug was found in the database but has expired'
                          : 'This drug could not be verified or may be counterfeit'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Drug Information */}
                <div className="p-6">
                  {/* Show scanned QR/Barcode data */}
                  {scanResult && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="text-sm font-semibold text-blue-900 mb-2">
                        📱 Scanned {scanResult.type === 'qr' ? 'QR Code' : 'Barcode'} Data:
                      </h4>
                      <p className="text-blue-800 font-mono text-sm break-all">
                        {scanResult.data}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        ↑ This is YOUR actual uploaded code data
                      </p>
                    </div>
                  )}

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
                      <button 
                        onClick={handleReportCounterfeit}
                        className="btn btn-error flex-1"
                      >
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
