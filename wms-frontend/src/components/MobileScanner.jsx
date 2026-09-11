import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { useTranslation } from '../i18n/LanguageContext';

const BARCODE_FORMATS = [
  BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128, BarcodeFormat.QR_CODE
];
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * MobileScanner - drives the camera via getUserMedia and decodes frames with
 * ZXing's pure-JS decoder (@zxing/browser), so auto-detection works on every
 * modern browser regardless of whether it implements the native
 * BarcodeDetector API (notably absent on iOS Safari and many Android
 * WebViews). Manual barcode entry stays available as a convenience fallback.
 */
function MobileScanner({ onClose }) {
  const { t } = useTranslation();
  const queryParams = new URLSearchParams(window.location.search);
  const userId = queryParams.get('userId') || localStorage.getItem('wms_username') || '1';

  const [scanResult, setScanResult] = useState(null);
  const [scanName, setScanName] = useState(null);
  const [scanStatus, setScanStatus] = useState('success'); // 'success' | 'unknown' | 'error'
  const [scanCount, setScanCount] = useState(0);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [undoStatus, setUndoStatus] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [frameCount, setFrameCount] = useState(0);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const controlsRef = useRef(null); // ZXing's IScannerControls, stops the decode loop
  // Refs mirror the paused/busy flags for ZXing's continuous decode callback, which
  // closes over whichever render started it -- reading state there would go stale.
  const isPausedRef = useRef(false);
  const busyRef = useRef(false);
  const frameCountRef = useRef(0);

  const stopCamera = () => {
    if (controlsRef.current) {
      try { controlsRef.current.stop(); } catch { /* already stopped */ }
      controlsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => stopCamera, []);

  // Shared by the camera detect loop and manual entry, so both go through the exact
  // same push/feedback pipeline instead of maintaining it twice. Resolves once the
  // result banner's cooldown has elapsed, so callers know when it's safe to resume.
  const submitBarcode = async (code) => {
    setScanResult(code);
    setScanName(null);

    try {
      const response = await axios.post(`/api/scan/push`, { barcode: code, userId: userId });
      const found = !!response.data?.found;
      setScanName(response.data?.name || null);
      setScanStatus(found ? 'success' : 'unknown');
      setScanCount(c => c + 1);
      if (navigator.vibrate && !found) navigator.vibrate([60, 60, 60]); // distinct pattern for unrecognized items
      await delay(found ? 600 : 1100); // Give unresolved items longer to read before auto-resume
    } catch {
      setScanStatus('error');
      if (navigator.vibrate) navigator.vibrate([120, 80, 120]); // distinct error pattern
      await delay(1200);
    }
    setScanResult(null);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const code = manualBarcode.trim();
    if (!code) return;
    setManualBarcode('');
    if (navigator.vibrate) navigator.vibrate(80);
    submitBarcode(code);
  };

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
    } catch {
      setUndoStatus('ERROR');
      setTimeout(() => setUndoStatus(null), 2000);
    }
  };

  const togglePause = () => {
    isPausedRef.current = !isPausedRef.current;
    setIsPaused(isPausedRef.current);
  };

  const startScanner = async () => {
    setCameraError(null);

    // Fail fast with a precise reason instead of letting the browser throw something
    // generic: this is the #1 real-world cause of "camera does nothing" on mobile --
    // the page was opened over plain HTTP (not the HTTPS link from the QR code), so
    // the browser never exposes getUserMedia at all.
    if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(t('cameraApiUnavailable'));
      return;
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
    } catch (err) {
      // Surface the browser's own reason (permission denied / no camera / camera busy)
      // verbatim instead of a generic failure -- that's the difference between the
      // operator knowing what to do next and the feature just looking dead.
      setCameraError(`${err.name}: ${err.message}`);
      return;
    }

    streamRef.current = stream;
    frameCountRef.current = 0;
    busyRef.current = false;
    isPausedRef.current = false;
    setFrameCount(0);
    setIsPaused(false);
    setIsCameraActive(true);

    // Wait a tick for the <video> element to mount now that isCameraActive is true.
    setTimeout(async () => {
      const video = videoRef.current;
      if (!video) {
        setCameraError('Video element not mounted');
        stopCamera();
        setIsCameraActive(false);
        return;
      }

      try {
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, BARCODE_FORMATS);
        // NOTE: deliberately not setting TRY_HARDER -- it makes 1D readers also try
        // rotated orientations, and that code path throws ("Could not create a Canvas
        // element") in this exact @zxing/browser + @zxing/library version pairing.
        // Verified via a headless fake-camera run: harmless per-attempt exceptions
        // that ZXing swallows and retries past, but avoidable, so avoid it.
        // Default scan cadence is a sedate 500ms/attempt; tighten it so detection feels
        // instant rather than sluggish.
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 });
        // decodeFromStream attaches `stream` to `video` itself and keeps calling back
        // on every attempt; result is undefined when nothing decoded (the overwhelming
        // majority -- that's normal, not an error).
        controlsRef.current = await reader.decodeFromStream(stream, video, (result) => {
          frameCountRef.current += 1;
          if (frameCountRef.current % 3 === 0) setFrameCount(frameCountRef.current);
          if (result && !busyRef.current && !isPausedRef.current) {
            busyRef.current = true;
            if (navigator.vibrate) navigator.vibrate(80);
            submitBarcode(result.getText()).finally(() => { busyRef.current = false; });
          }
        });
      } catch (err) {
        setCameraError(String(err?.message || err));
        stopCamera();
        setIsCameraActive(false);
      }
    }, 50);
  };

  const closeCamera = () => {
    stopCamera();
    setIsCameraActive(false);
    setIsPaused(false);
    isPausedRef.current = false;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0a] text-white flex flex-col font-['Space_Grotesk']">
      <header className="flex items-center justify-between px-6 py-5 bg-[#161818] border-b border-[#bcf540]/20">
        <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#bcf540]">bolt</span>
            <h1 className="text-xl font-bold tracking-tight uppercase">{t('mobileScanner')}</h1>
        </div>
        <div className="flex items-center gap-3">
          {isCameraActive && (
            <div title={t('scannedThisSession')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#bcf540]/10 border border-[#bcf540]/20">
              <span className="material-symbols-outlined text-[#bcf540] text-base">inventory_2</span>
              <span className="text-xs font-black text-[#bcf540] font-mono">{scanCount}</span>
            </div>
          )}
          <button
            onClick={() => setShowManualEntry(v => !v)}
            title={t('manualEntryToggle')}
            className={`p-2 rounded-full transition-colors ${showManualEntry ? 'bg-[#bcf540] text-black' : 'bg-white/5 hover:bg-white/10'}`}
          >
            <span className="material-symbols-outlined">keyboard</span>
          </button>
          <button onClick={() => { closeCamera(); onClose(); }} className="p-2 bg-white/5 rounded-full"><span className="material-symbols-outlined">close</span></button>
        </div>
      </header>

      {showManualEntry && (
        <form onSubmit={handleManualSubmit} className="flex items-center gap-2 px-6 py-3 bg-[#161818] border-b border-[#bcf540]/20">
          <span className="material-symbols-outlined text-[#bcf540]">keyboard</span>
          <input
            autoFocus
            type="text"
            inputMode="numeric"
            value={manualBarcode}
            onChange={e => setManualBarcode(e.target.value)}
            placeholder={t('manualEntry')}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-[#bcf540]/50"
          />
          <button type="submit" className="px-5 py-2.5 rounded-xl bg-[#bcf540] text-black font-black text-xs uppercase tracking-widest">
            {t('find')}
          </button>
        </form>
      )}

      <main className="flex-1 relative flex flex-col items-center justify-center">
        {!isCameraActive ? (
          <div className="flex flex-col items-center gap-6 px-8">
            <button onClick={startScanner} className="w-64 h-64 rounded-full border-4 border-[#bcf540]/20 bg-[#161818] flex flex-col items-center justify-center gap-4 group">
              <span className="material-symbols-outlined text-6xl text-[#bcf540] group-hover:scale-110 transition-transform">rocket_launch</span>
              <span className="font-black tracking-widest text-[#bcf540]">{t('boostStart')}</span>
            </button>
            {cameraError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-center max-w-sm">
                <p className="text-red-400 text-xs font-bold uppercase tracking-wider mb-1">{t('scanError')}</p>
                <p className="text-red-300 text-xs font-mono break-all">{cameraError}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover contrast-[1.4] brightness-[1.1]"
            />

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
                    {isPaused ? t('scannerPaused') : t('hardwareAcceleratedMode')}
                </p>
                {/* Diagnostic: rising count = camera stream + decoder are running (a focus/format/lighting
                    issue); stuck at 0 = the loop never actually got frames. */}
                <p className="mt-1 text-zinc-500 font-mono text-[10px] tracking-widest">
                    {t('scanFramesProcessed')}: {frameCount}
                </p>
            </div>

            {/* Control Panel */}
            <div className="absolute bottom-10 left-0 right-0 flex justify-center px-8 gap-4">
                <button onClick={handleUndo} className={`flex-1 py-5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all active:scale-95 border border-white/10 ${undoStatus === 'SUCCESS' ? 'bg-green-600' : 'bg-white/5 backdrop-blur-md'}`}>
                    {undoStatus === 'SUCCESS' ? t('undone') : t('undo')}
                </button>
                <button onClick={togglePause} className={`flex-1 py-5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all active:scale-95 border border-white/10 ${isPaused ? 'bg-[#bcf540] text-black' : 'bg-white/5 backdrop-blur-md text-[#bcf540]'}`}>
                    {isPaused ? t('resume') : t('pause')}
                </button>
            </div>
          </div>
        )}

        {scanResult && !isPaused && (
          <div className={`absolute inset-0 text-black flex flex-col items-center justify-center z-50 animate-in fade-in duration-150 px-8 text-center ${
            scanStatus === 'error' ? 'bg-red-500' : scanStatus === 'unknown' ? 'bg-amber-400' : 'bg-[#bcf540]'
          }`}>
            <span className="material-symbols-outlined text-9xl animate-bounce">
              {scanStatus === 'error' ? 'wifi_off' : scanStatus === 'unknown' ? 'help' : 'done_all'}
            </span>
            <p className="text-3xl font-black mt-4 uppercase tracking-wide">
              {scanStatus === 'error' ? t('scanError') : scanStatus === 'unknown' ? t('productUnknown') : (scanName || t('scanSuccess'))}
            </p>
            <p className="text-lg font-mono font-bold mt-2 opacity-70">{scanResult}</p>
          </div>
        )}
      </main>
      <style>{`
        @keyframes scan { 0% { top: 10%; } 100% { top: 90%; } }
      `}</style>
    </div>
  );
}

export default MobileScanner;
