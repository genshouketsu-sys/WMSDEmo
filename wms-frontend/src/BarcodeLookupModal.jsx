import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

function BarcodeLookupModal({ isOpen, onClose, onBarcodeFound }) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [lastScanned, setLastScanned] = useState(null);
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setTimeout(() => inputRef.current?.focus(), 100);
    return () => stopCamera();
  }, [isOpen]);

  const stopCamera = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = () => {
    setError(null);
    setIsCameraActive(true);
    setTimeout(() => {
      const scanner = new Html5Qrcode('barcodeReader');
      scannerRef.current = scanner;
      
      const config = {
        fps: 25,
        // Small center box for precision scanning
        qrbox: { width: 220, height: 220 },
        aspectRatio: 1.0,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      };

      scanner.start(
        { facingMode: 'environment' },
        config,
        (text) => {
          if (navigator.vibrate) navigator.vibrate(100);
          setLastScanned(text);
          onBarcodeFound(text);
          scanner.pause();
          setTimeout(() => {
             if (scannerRef.current) scanner.resume();
          }, 800);
        },
        () => {}
      ).catch((err) => {
        setError('Camera Access Error: ' + err);
        setIsCameraActive(false);
      });
    }, 150);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="bg-[#121414] border border-white/10 rounded-2xl w-full max-w-md p-8 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300 font-['Space_Grotesk']">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#bcf540]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#bcf540] text-[20px]">center_focus_strong</span>
            </div>
            <h2 className="text-white font-bold text-lg tracking-tight">Precision Lookup</h2>
          </div>
          <button onClick={() => { stopCamera(); onClose(); }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 text-zinc-500 hover:text-white transition-all">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
        
        {isCameraActive ? (
          <div className="relative mb-8 rounded-2xl overflow-hidden border border-white/5 shadow-inner">
            <div id="barcodeReader" className="w-full aspect-square bg-black" />
            {/* Center Focus Guide */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[220px] h-[220px] border-2 border-[#bcf540] rounded-2xl shadow-[0_0_0_999px_rgba(0,0,0,0.6)]">
                    <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-[#bcf540] shadow-[0_0_15px_#bcf540]"></div>
                </div>
            </div>
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-black font-black uppercase tracking-[0.2em] bg-[#bcf540] px-4 py-1.5 rounded-full shadow-lg">Scan zone active</p>
          </div>
        ) : (
          <button 
            onClick={startCamera} 
            className="w-full py-16 border-2 border-dashed border-white/5 rounded-2xl text-zinc-500 hover:text-[#bcf540] hover:border-[#bcf540]/40 hover:bg-[#bcf540]/5 transition-all flex flex-col items-center gap-3 mb-8 group"
          >
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl">filter_center_focus</span>
            </div>
            <span className="font-bold text-xs uppercase tracking-widest">Activate Precision Sensor</span>
          </button>
        )}

        {error && <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest mb-6 bg-red-500/10 p-3 rounded-xl border border-red-500/20">{error}</p>}

        <form onSubmit={(e) => { e.preventDefault(); if(manualInput) onBarcodeFound(manualInput); }} className="flex gap-2">
          <input 
            ref={inputRef}
            className="flex-1 h-[44px] bg-zinc-950/50 border border-white/10 rounded-xl px-4 text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#bcf540]/50 focus:border-[#bcf540] transition-all text-sm font-medium" 
            placeholder="Manual entry..."
            value={manualInput}
            onChange={e => setManualInput(e.target.value)}
          />
          <button type="submit" className="h-[44px] bg-[#bcf540] text-black px-6 rounded-xl font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-[#bcf540]/10 active:scale-[0.98]">
            Find
          </button>
        </form>
      </div>
    </div>
  );
}

export default BarcodeLookupModal;
