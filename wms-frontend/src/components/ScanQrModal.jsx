import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from '../i18n/LanguageContext';

function ScanQrModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  // __LOCAL_IP__ 由 vite.config.js 在构建时注入，值为本机局域网 IP
  const username = localStorage.getItem('wms_username') || '1';
  const lanUrl = `https://${__LOCAL_IP__}:5173/scanner?userId=${username}`;

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
          <QRCodeSVG
            value={lanUrl}
            size={200}
            bgColor="#ffffff"
            fgColor="#121414"
            level="M"
            includeMargin={false}
          />
        </div>

        {/* URL Display */}
        <div className="bg-[#0c0f0f] border border-white/10 rounded-lg p-3 mb-4">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1 font-medium">{t('connectionUrl')}</p>
          <p className="text-[#bcf540] font-mono text-sm break-all select-all">{lanUrl}</p>
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
