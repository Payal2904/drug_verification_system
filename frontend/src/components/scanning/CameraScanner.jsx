import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, X, RotateCcw, Flashlight, FlashlightOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CameraScanner = ({
  onScanSuccess,
  onError,
  isOpen,
  onClose,
  scanType = 'all' // 'qr', 'barcode', or 'all'
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);

  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState(null);
  const [torch, setTorch] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'user' or 'environment'
  const [scanResult, setScanResult] = useState(null);

  // Simplified QR Code detection (basic pattern matching for demo)
  const detectQRCode = useCallback((imageData) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Convert to grayscale for better detection
    const data = imageData.data;
    const grayData = new Uint8ClampedArray(data.length / 4);

    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      grayData[i / 4] = gray;
    }

    // Simple QR pattern detection (finder patterns)
    // This is a simplified version - in production you'd use a proper library
    const width = imageData.width;
    const height = imageData.height;

    // Look for QR code-like patterns (simplified)
    for (let y = 0; y < height - 50; y += 10) {
      for (let x = 0; x < width - 50; x += 10) {
        if (hasQRPattern(grayData, x, y, width)) {
          // Generate a mock QR code based on position (for demo)
          const mockQR = generateMockQRData(x, y);
          return mockQR;
        }
      }
    }

    return null;
  }, []);

  // Simplified barcode detection
  const detectBarcode = useCallback((imageData) => {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Look for barcode-like vertical patterns
    for (let y = Math.floor(height * 0.4); y < Math.floor(height * 0.6); y += 5) {
      const lineIntensity = [];

      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const intensity = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        lineIntensity.push(intensity);
      }

      if (hasBarcodePattern(lineIntensity)) {
        // Generate a mock barcode based on pattern (for demo)
        const mockBarcode = generateMockBarcodeData(lineIntensity);
        return mockBarcode;
      }
    }

    return null;
  }, []);

  // Helper function to detect QR-like patterns (simplified)
  const hasQRPattern = (grayData, startX, startY, width) => {
    // Very simplified QR finder pattern detection
    const patternSize = 7;
    const threshold = 50;

    let darkCount = 0;
    let lightCount = 0;

    for (let y = 0; y < patternSize; y++) {
      for (let x = 0; x < patternSize; x++) {
        const idx = (startY + y) * width + (startX + x);
        if (idx < grayData.length) {
          if (grayData[idx] < 128) {
            darkCount++;
          } else {
            lightCount++;
          }
        }
      }
    }

    // QR finder patterns have specific dark/light ratios
    const ratio = darkCount / (darkCount + lightCount);
    return ratio > 0.3 && ratio < 0.7;
  };

  // Helper function to detect barcode patterns
  const hasBarcodePattern = (lineIntensity) => {
    let transitions = 0;
    const threshold = 50;

    for (let i = 1; i < lineIntensity.length; i++) {
      if (Math.abs(lineIntensity[i] - lineIntensity[i - 1]) > threshold) {
        transitions++;
      }
    }

    // Barcodes have many transitions between dark and light
    return transitions > lineIntensity.length * 0.1;
  };

  // Generate mock QR data for demo
  const generateMockQRData = (x, y) => {
    const mockQRCodes = [
      'QR001PARA500BATCH001',
      'QR002AMOX250BATCH002',
      'QR003IBUPR400BATCH003',
      'QR999FAKE123INVALID'
    ];

    // Use position to determine which mock QR to return
    const index = Math.floor((x + y) / 100) % mockQRCodes.length;
    return {
      type: 'qr',
      data: mockQRCodes[index],
      position: { x, y }
    };
  };

  // Generate mock barcode data for demo
  const generateMockBarcodeData = (lineIntensity) => {
    const mockBarcodes = [
      '123456789012',
      '987654321098',
      '456789123456',
      '000000000000'
    ];

    // Use line intensity pattern to determine which mock barcode to return
    const sum = lineIntensity.reduce((a, b) => a + b, 0);
    const index = Math.floor(sum / 10000) % mockBarcodes.length;

    return {
      type: 'barcode',
      data: mockBarcodes[index],
      format: 'EAN-13'
    };
  };

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setError(null);

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setHasPermission(true);
        setIsScanning(true);
      }

      // Setup torch if available
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack.getCapabilities && videoTrack.getCapabilities().torch) {
        // Torch available
      }

    } catch (err) {
      console.error('Camera error:', err);
      setError('Unable to access camera. Please check permissions.');
      setHasPermission(false);
      onError && onError(err);
    }
  }, [facingMode, onError]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    setIsScanning(false);
    setTorch(false);
  }, []);

  // Scan frame
  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isScanning) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get image data for processing
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      let result = null;

      // Detect based on scan type
      if (scanType === 'qr' || scanType === 'all') {
        result = detectQRCode(imageData);
      }

      if (!result && (scanType === 'barcode' || scanType === 'all')) {
        result = detectBarcode(imageData);
      }

      if (result) {
        setScanResult(result);

        // Simulate processing delay
        setTimeout(() => {
          onScanSuccess(result);
          stopCamera();
          onClose();
        }, 500);

        return;
      }
    }

    // Continue scanning
    animationRef.current = requestAnimationFrame(scanFrame);
  }, [isScanning, scanType, detectQRCode, detectBarcode, onScanSuccess, stopCamera, onClose]);

  // Toggle camera facing mode
  const toggleFacingMode = useCallback(() => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  }, []);

  // Toggle torch
  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return;

    try {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities();

      if (capabilities.torch) {
        await videoTrack.applyConstraints({
          advanced: [{ torch: !torch }]
        });
        setTorch(!torch);
      }
    } catch (err) {
      console.error('Torch error:', err);
    }
  }, [torch]);

  // Effects
  useEffect(() => {
    if (isOpen && hasPermission) {
      startCamera();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isOpen, facingMode, hasPermission, startCamera]);

  useEffect(() => {
    if (isScanning) {
      scanFrame();
    }
  }, [isScanning, scanFrame]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black z-50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-black/50 text-white">
          <h2 className="text-lg font-semibold">
            Scan {scanType === 'qr' ? 'QR Code' : scanType === 'barcode' ? 'Barcode' : 'Code'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Camera View */}
        <div className="flex-1 relative">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />

          {/* Hidden canvas for processing */}
          <canvas
            ref={canvasRef}
            className="hidden"
          />

          {/* Scanning Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {/* Scanning Frame */}
              <motion.div
                className="w-64 h-64 border-2 border-white rounded-lg relative"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                {/* Corner indicators */}
                <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-blue-500 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-blue-500 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-blue-500 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-blue-500 rounded-br-lg"></div>

                {/* Scanning line animation */}
                {isScanning && (
                  <motion.div
                    className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
                    animate={{ y: [0, 248, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />
                )}
              </motion.div>

              {/* Instruction text */}
              <p className="text-white text-center mt-4 text-sm">
                {scanType === 'qr' ? 'Position QR code within the frame' :
                 scanType === 'barcode' ? 'Position barcode within the frame' :
                 'Position QR code or barcode within the frame'}
              </p>
            </div>
          </div>

          {/* Scan result overlay */}
          {scanResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex items-center justify-center bg-black/50"
            >
              <div className="bg-white rounded-lg p-6 mx-4 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Code Detected!</h3>
                <p className="text-gray-600 mb-4">
                  {scanResult.type.toUpperCase()}: {scanResult.data}
                </p>
                <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 bg-black/50 flex items-center justify-center space-x-6">
          {/* Torch Toggle */}
          <button
            onClick={toggleTorch}
            className={`p-3 rounded-full transition-colors ${
              torch ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {torch ? <Flashlight className="h-6 w-6" /> : <FlashlightOff className="h-6 w-6" />}
          </button>

          {/* Flip Camera */}
          <button
            onClick={toggleFacingMode}
            className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <RotateCcw className="h-6 w-6" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="absolute bottom-20 left-4 right-4 bg-red-600 text-white p-4 rounded-lg"
          >
            <p className="text-center">{error}</p>
            <button
              onClick={startCamera}
              className="mt-2 w-full bg-white/20 text-white py-2 rounded hover:bg-white/30 transition-colors"
            >
              Try Again
            </button>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default CameraScanner;
