import { useEffect, useState } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from '../i18n/useTranslation';

function ScanQrModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  const [lanUrl,setLanUrl]=useState('');
  const [error,setError]=useState('');
  useEffect(() => {
    if (!isOpen) return;
    let cancelled=false;
    axios.get('/api/scan/pairing').then(response => {
      const url=new URL('/scanner',window.location.href);
      if (import.meta.env.DEV && (url.hostname==='localhost' || url.hostname==='127.0.0.1')) url.hostname=__LOCAL_IP__;
      url.searchParams.set('pairing',response.data.token);
      if (!cancelled) { setLanUrl(url.toString());setError(''); }
    }).catch(() => { if (!cancelled) setError('无法生成扫码连接，请检查登录状态。'); });
    return () => { cancelled=true; };
  },[isOpen]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-[#1e2020] border border-white/10 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl relative overflow-hidden font-['Space_Grotesk']"
        onClick={e => e.stopPropagation()}
      >
        {/* Decorative glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#bcf540]/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#bcf540] flex items-center justify-center">
              <span className="material-symbols-outlined text-black" style={{ fontVariationSettings: "'FILL' 1" }}>qr_code_scanner</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{t('mobileScanner')}</h2>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">{t('scanToConnect')}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* QR Code */}
        <div className="bg-white rounded-xl p-4 mx-auto w-fit mb-6">
          {lanUrl ? <QRCodeSVG
            value={lanUrl}
            size={200}
            bgColor="#ffffff"
            fgColor="#121414"
            level="M"
            includeMargin={false}
          /> : <p className="text-black p-12">{error || "连接中…"}</p>}
        </div>

        {/* URL Display */}
        <div className="bg-[#0c0f0f] border border-white/10 rounded-lg p-3 mb-4">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1 font-medium">{t('connectionUrl')}</p>
          <p className="text-[#bcf540] font-mono text-xs break-all select-all">{lanUrl ? new URL(lanUrl).origin + "/scanner" : error}</p>
        </div>

        {/* Instructions */}
        <div className="space-y-2 text-xs text-zinc-400">
          <div className="flex items-start gap-2">
            <span className="text-[#bcf540] font-bold mt-px">1</span>
            <p>{t('qrStep1')} <span className="text-white font-medium">{t('qrStep1Highlight')}</span></p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[#bcf540] font-bold mt-px">2</span>
            <p>{t('qrStep2')} <span className="text-white font-medium">{t('qrStep2Highlight')}</span> {t('qrStep2End')}</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[#bcf540] font-bold mt-px">3</span>
            <p>{t('qrStep3')} <span className="text-white font-medium">{t('qrStep3Highlight')}</span>{t('qrStep3End')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScanQrModal;
