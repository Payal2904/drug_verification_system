import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, X, RotateCcw, Flashlight, FlashlightOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import jsQR from 'jsqr';

const CameraScanner = ({
  onScanSuccess,
  onError,
  isOpen,
  onClose,
  scanType = 'all'
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);

  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState(null);
  const [torch, setTorch] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);

  // QR Code detection (RELIABLE)
  const detectQR = useCallback((imageData) => {
    try {
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
      });

      if (code && code.data) {
        console.log('✅ QR Code detected:', code.data);
        return {
          type: 'qr',
          data: code.data
        };
      }
    } catch (error) {
      console.error('QR detection error:', error);
    }
    return null;
  }, []);

  // Scan loop - ONLY for QR codes (reliable)
  const scanFrame = useCallback(() => {
    if (!scanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Only scan QR codes (barcodes use upload)
    if (scanType === 'qr' || scanType === 'all') {
      const result = detectQR(imageData);
      
      if (result) {
        console.log('✅ QR Code found!');
        setScanResult(result);
        setScanning(false);
        
        setTimeout(() => {
          onScanSuccess(result);
          stopCamera();
          onClose();
        }, 500);
        return;
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  }, [scanning, scanType, detectQR, onScanSuccess, onClose]);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      console.log('🎥 Starting camera...');
      setError(null);
      setScanResult(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera not supported');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        console.log('✅ Camera started');
        setHasPermission(true);
        setScanning(true);
      }

    } catch (err) {
      console.error('❌ Camera error:', err);
      let errorMessage = 'Camera access failed. ';
      
      if (err.name === 'NotAllowedError') {
        errorMessage += 'Please allow camera permissions.';
      } else if (err.name === 'NotFoundError') {
        errorMessage += 'No camera found.';
      } else {
        errorMessage += 'Please use image upload instead.';
      }
      
      setError(errorMessage);
      setHasPermission(false);
      onError?.(err);
    }
  }, [facingMode, onError]);

  // Stop camera
  const stopCamera = useCallback(() => {
    console.log('🛑 Stopping camera...');
    setScanning(false);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setHasPermission(false);
    setTorch(false);
    setScanResult(null);
  }, []);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    stopCamera();
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    setTimeout(() => startCamera(), 100);
  }, [stopCamera, startCamera]);

  // Toggle torch
  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return;

    try {
      const track = streamRef.current.getVideoTracks()[0];
      const capabilities = track.getCapabilities();

      if (capabilities.torch) {
        await track.applyConstraints({
          advanced: [{ torch: !torch }]
        });
        setTorch(!torch);
      }
    } catch (err) {
      console.error('Torch error:', err);
    }
  }, [torch]);

  // Start scanning when camera ready
  useEffect(() => {
    if (scanning) {
      scanFrame();
    }
  }, [scanning, scanFrame]);

  // Handle modal open/close
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
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
            {scanType === 'qr' ? 'Scan QR Code' : scanType === 'barcode' ? 'Scan Code' : 'Scan Code'}
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
            autoPlay
          />

          <canvas ref={canvasRef} className="hidden" />

          {/* Scanning Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative">
              {/* Scanning Frame */}
              <motion.div
                className="w-64 h-64 border-2 border-white rounded-lg relative"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
              >
                {/* Corners */}
                <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-blue-500 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-blue-500 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-blue-500 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-blue-500 rounded-br-lg"></div>

                {/* Scanning line */}
                {scanning && (
                  <motion.div
                    className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
                    animate={{ y: [0, 248, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />
                )}
              </motion.div>

              {/* Instructions */}
              <div className="mt-4 text-center pointer-events-none">
                <p className="text-white text-sm mb-2">
                  Position code within the frame
                </p>
                
                {scanType === 'barcode' && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-yellow-600/90 text-white px-4 py-3 rounded-lg text-xs max-w-xs mx-auto"
                  >
                    <strong>📊 For Barcodes:</strong><br />
                    Camera scanning may not work from screens.<br />
                    <strong>Use "Upload Image" instead!</strong>
                  </motion.div>
                )}
                
                {(scanType === 'qr' || scanType === 'all') && (
                  <p className="text-white/80 text-xs">
                    QR codes auto-detect
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Success Overlay */}
          {scanResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center bg-black/50"
            >
              <div className="bg-white rounded-lg p-6 mx-4 text-center max-w-sm">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Code Detected!</h3>
                <p className="text-gray-600 text-sm mb-4">
                  {scanResult.type.toUpperCase()}: {scanResult.data.substring(0, 30)}...
                </p>
                <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 bg-black/50 flex items-center justify-center gap-6">
          <button
            onClick={toggleTorch}
            className={`p-3 rounded-full transition-colors ${
              torch ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title="Toggle Flashlight"
          >
            {torch ? <Flashlight className="h-6 w-6" /> : <FlashlightOff className="h-6 w-6" />}
          </button>

          <button
            onClick={toggleCamera}
            className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            title="Flip Camera"
          >
            <RotateCcw className="h-6 w-6" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="absolute bottom-20 left-4 right-4"
          >
            <div className="bg-red-600 text-white p-4 rounded-lg">
              <p className="text-center text-sm mb-2">{error}</p>
              <button
                onClick={startCamera}
                className="w-full bg-white/20 text-white py-2 rounded hover:bg-white/30 transition-colors text-sm"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="w-full mt-2 bg-white/10 text-white py-2 rounded hover:bg-white/20 transition-colors text-sm"
              >
                Use Upload Instead
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default CameraScanner;
