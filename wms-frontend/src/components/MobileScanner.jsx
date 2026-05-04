import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import axios from 'axios';
import { useTranslation } from '../i18n/LanguageContext';

/**
 * MobileScanner - Optimized for Millisecond-level JAN/QR Recognition
 */
function MobileScanner({ onClose }) {
  const { t } = useTranslation();
  const queryParams = new URLSearchParams(window.location.search);
  const userId = queryParams.get('userId') || localStorage.getItem('wms_username') || '1';
  
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [undoStatus, setUndoStatus] = useState(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const handleUndo = async () => {
    try {
      const response = await axios.post(`/api/scan/undo`, { userId: userId });
      if (response.data.success) {
        setUndoStatus('SUCCESS');
        if (navigator.vibrate) navigator.vibrate([50, 50]);
        setTimeout(() => setUndoStatus(null), 2000);
      } else {
        setUndoStatus('ERROR');
        setTimeout(() => setUndoStatus(null), 2000);
      }
    } catch (error) {
      setUndoStatus('ERROR');
      setTimeout(() => setUndoStatus(null), 2000);
    }
  };

  const togglePause = () => {
    if (!scannerRef.current) return;
    if (isPaused) {
      scannerRef.current.resume();
      setIsPaused(false);
      setIsScanning(true);
    } else {
      scannerRef.current.pause();
      setIsPaused(true);
      setIsScanning(false);
    }
  };

  const startScanner = () => {
    setIsCameraActive(true);
    setIsScanning(true);

    setTimeout(() => {
      scannerRef.current = new Html5Qrcode("reader");
      
      const config = {
        fps: 25, // High speed sampling
        qrbox: { width: 300, height: 150 }, // Balanced for JAN and QR
        aspectRatio: 1.0,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true // Native acceleration
        },
        formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128
        ]
      };

      scannerRef.current.start(
        { facingMode: "environment" },
        config,
        async (decodedText) => {
          if (isPaused) return;
          if (navigator.vibrate) navigator.vibrate(80);
          
          setIsScanning(false);
          scannerRef.current.pause();
          setScanResult(decodedText);

          try {
            await axios.post(`/api/scan/push`, { barcode: decodedText, userId: userId });
            setTimeout(() => {
              if (scannerRef.current && !isPaused) {
                scannerRef.current.resume();
                setIsScanning(true);
                setScanResult(null);
              }
            }, 600); // Fast resume
          } catch (error) {
            resumeScanner();
          }
        },
        () => {}
      ).catch(err => {
        alert("Camera Error: " + err);
        setIsCameraActive(false);
      });
    }, 150);
  };

  const resumeScanner = () => {
    setShowDuplicateModal(false);
    setScanResult(null);
    if (scannerRef.current) {
      scannerRef.current.resume();
      setIsScanning(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0a] text-white flex flex-col font-['Space_Grotesk']">
      <header className="flex items-center justify-between px-6 py-5 bg-[#161818] border-b border-[#bcf540]/20">
        <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#bcf540]">bolt</span>
            <h1 className="text-xl font-bold tracking-tight uppercase">Speed Scan</h1>
        </div>
        <button onClick={onClose} className="p-2 bg-white/5 rounded-full"><span className="material-symbols-outlined">close</span></button>
      </header>

      <main className="flex-1 relative flex flex-col items-center justify-center">
        {!isCameraActive ? (
          <button onClick={startScanner} className="w-64 h-64 rounded-full border-4 border-[#bcf540]/20 bg-[#161818] flex flex-col items-center justify-center gap-4 group">
            <span className="material-symbols-outlined text-6xl text-[#bcf540] group-hover:scale-110 transition-transform">rocket_launch</span>
            <span className="font-black tracking-widest text-[#bcf540]">BOOST START</span>
          </button>
        ) : (
          <div className="w-full h-full relative">
            {/* Native contrast filter applied to reader container */}
            <div id="reader" className="w-full h-full contrast-[1.4] brightness-[1.1]"></div>
            
            {/* Optimized HUD Overlay */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div className={`w-[300px] h-[150px] rounded-3xl border-4 ${isPaused ? 'border-zinc-700' : 'border-[#bcf540]'} shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] relative z-10`}>
                    <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-2xl"></div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-2xl"></div>
                    {!isPaused && (
                        <div className="absolute left-0 right-0 h-1 bg-[#bcf540] shadow-[0_0_20px_#bcf540] animate-[scan_1.5s_linear_infinite]"></div>
                    )}
                </div>
                <p className="mt-8 text-[#bcf540] font-black text-xs tracking-[0.3em] uppercase opacity-80">
                    {isPaused ? 'Scanner Paused' : 'Hardware Accelerated Mode'}
                </p>
            </div>

            {/* Control Panel */}
            <div className="absolute bottom-10 left-0 right-0 flex justify-center px-8 gap-4">
                <button onClick={handleUndo} className={`flex-1 py-5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all active:scale-95 border border-white/10 ${undoStatus === 'SUCCESS' ? 'bg-green-600' : 'bg-white/5 backdrop-blur-md'}`}>
                    {undoStatus === 'SUCCESS' ? 'Undone' : 'Undo'}
                </button>
                <button onClick={togglePause} className={`flex-1 py-5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all active:scale-95 border border-white/10 ${isPaused ? 'bg-[#bcf540] text-black' : 'bg-white/5 backdrop-blur-md text-[#bcf540]'}`}>
                    {isPaused ? 'Resume' : 'Pause'}
                </button>
            </div>

            {scanResult && !isPaused && (
              <div className="absolute inset-0 bg-[#bcf540] text-black flex flex-col items-center justify-center z-50 animate-in fade-in duration-150">
                <span className="material-symbols-outlined text-9xl animate-bounce">done_all</span>
                <p className="text-4xl font-mono font-black mt-4">{scanResult}</p>
              </div>
            )}
          </div>
        )}
      </main>
      <style>{`
        #reader video { width: 100% !important; height: 100% !important; object-fit: cover !important; }
        @keyframes scan { 0% { top: 10%; } 100% { top: 90%; } }
      `}</style>
    </div>
  );
}

export default MobileScanner;