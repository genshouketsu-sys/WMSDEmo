import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import axios from 'axios';
import { useTranslation } from '../i18n/LanguageContext';

const LoginPage = () => {
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const { t, language, setLanguage } = useTranslation();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    
    // Initial dimensions
    let width = container.clientWidth;
    let height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x121414, 0.012);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 15, 30);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color("#bcf540") },
        uBgColor: { value: new THREE.Color("#121414") }
      },
      vertexShader: `
        uniform float uTime;
        varying float vElevation;

        float hash(float n) { return fract(sin(n) * 1e4); }
        float noise(vec3 x) {
          const vec3 step = vec3(110.0, 241.0, 171.0);
          vec3 i = floor(x);
          vec3 f = fract(x);
          float n = dot(i, step);
          vec3 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix( hash(n + dot(step, vec3(0.0, 0.0, 0.0))), hash(n + dot(step, vec3(1.0, 0.0, 0.0))), u.x),
                         mix( hash(n + dot(step, vec3(0.0, 1.0, 0.0))), hash(n + dot(step, vec3(1.0, 1.0, 0.0))), u.x), u.y),
                     mix(mix( hash(n + dot(step, vec3(0.0, 0.0, 1.0))), hash(n + dot(step, vec3(1.0, 0.0, 1.0))), u.x),
                         mix( hash(n + dot(step, vec3(0.0, 1.0, 1.0))), hash(n + dot(step, vec3(1.0, 1.0, 1.0))), u.x), u.y), u.z);
        }

        void main() {
          vec4 modelPosition = modelMatrix * vec4(position, 1.0);
          float elevation = noise(vec3(modelPosition.x * 0.08, modelPosition.z * 0.08, uTime * 0.15)) * 8.0;
          elevation += noise(vec3(modelPosition.x * 0.25, modelPosition.z * 0.25, uTime * 0.15)) * 2.0;
          modelPosition.y += elevation;
          vElevation = elevation;
          gl_Position = projectionMatrix * viewMatrix * modelPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform vec3 uBgColor;
        varying float vElevation;

        void main() {
          float contourInterval = 1.0; 
          float lineThickness = 0.04; 
          float modElevation = mod(vElevation, contourInterval);
          float line = smoothstep(contourInterval - lineThickness, contourInterval, modElevation) + 
                       smoothstep(lineThickness, 0.0, modElevation);
          float alpha = smoothstep(0.0, 10.0, vElevation) * 0.8 + 0.1;
          vec3 finalColor = mix(uBgColor, uColor, line);
          gl_FragColor = vec4(finalColor, line * alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });

    const geometry = new THREE.PlaneGeometry(140, 140, 300, 300);
    geometry.rotateX(-Math.PI * 0.5);
    const terrain = new THREE.Mesh(geometry, material);
    scene.add(terrain);

    const clock = new THREE.Clock();
    let animationFrameId;

    const animate = () => {
      material.uniforms.uTime.value = clock.getElapsedTime();
      controls.update();
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      if (!containerRef.current) return;
      width = containerRef.current.clientWidth;
      height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isRegisterMode) {
        await axios.post('/api/auth/register', formData);
        setSuccess(t('registrationSuccess'));
        setIsRegisterMode(false);
      } else {
        const response = await axios.post('/api/auth/login', formData);
        localStorage.setItem('wms_token', response.data.token);
        localStorage.setItem('wms_username', response.data.username);
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || t('requestFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetForm = () => {
    setFormData({ username: '', password: '' });
    setError('');
    setSuccess('');
  };

  const languages = [
    { code: 'zh', name: '中文', icon: '🇨🇳' },
    { code: 'en', name: 'English', icon: '🇺🇸' },
    { code: 'ja', name: '日本語', icon: '🇯🇵' }
  ];

  return (
    <div className="login-page w-full h-screen bg-[#121414] overflow-hidden flex flex-col md:flex-row font-sans">
      
      {/* Left Panel: Visual/Branding (Hidden on mobile) */}
      <div className="relative hidden md:flex md:w-[55%] lg:w-[65%] h-full bg-[#0a0b0b] border-r border-white/5 flex-col justify-between">
        
        {/* 3D Canvas Container */}
        <div ref={containerRef} className="absolute inset-0 z-0" />
        
        {/* Gradient Mask for Depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121414] via-transparent to-[#121414] z-10 pointer-events-none opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#121414] z-10 pointer-events-none opacity-90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-transparent to-black/60 z-10 pointer-events-none" />

        {/* Top Branding */}
        <div className="relative z-20 p-12">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 border-[2px] border-[#bcf540] flex items-center justify-center relative group cursor-pointer">
              <div className="w-3 h-3 bg-[#bcf540] group-hover:scale-150 transition-transform duration-300"></div>
            </div>
            <span className="text-2xl font-black tracking-[0.2em] text-white uppercase">SpeedWMS</span>
          </div>
        </div>

        {/* Bottom Hero Text */}
        <div className="relative z-20 p-12 mb-10">
          <h2 className="text-[5rem] lg:text-[7rem] font-black text-white/90 leading-[0.85] tracking-tighter uppercase mb-6 flex flex-col">
            <span>SpeedWMS</span>
            <span>Intelligent</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#bcf540] to-emerald-400">Logistics</span>
          </h2>
          <div className="flex items-center gap-6 mt-8">
            <span className="h-[1px] w-24 bg-white/20"></span>
            <span className="text-xs font-bold tracking-[0.4em] text-white/50 uppercase">
              倉庫運用 / v3.0.4
            </span>
          </div>
        </div>
      </div>

      {/* Right Panel: Auth Form */}
      <div className="relative w-full md:w-[45%] lg:w-[35%] h-full flex flex-col justify-between bg-[#121414] z-20 shadow-2xl">
        
        {/* Mobile Header (Only visible on small screens) */}
        <div className="md:hidden flex items-center gap-3 p-8">
          <div className="w-6 h-6 border-[2px] border-[#bcf540] flex items-center justify-center">
            <div className="w-2 h-2 bg-[#bcf540]"></div>
          </div>
          <span className="text-lg font-black tracking-widest text-white uppercase">SpeedWMS</span>
        </div>

        {/* Action Bar */}
        <header className="flex justify-end items-center px-10 py-8 md:py-12">
          <div className="flex items-center gap-6 relative">
            <button
              type="button"
              onClick={() => setNotice(t('helpText'))}
              aria-label={t('helpText')}
              className="text-white/40 hover:text-[#bcf540] transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
            >
              <span className="material-symbols-outlined text-[18px]">help_outline</span>
              <span className="hidden xl:inline">HELP</span>
            </button>
            <div className="w-[1px] h-4 bg-white/10"></div>
            <div className="relative">
              <button 
                className="text-white/40 hover:text-[#bcf540] transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
                onClick={() => setShowLangMenu(!showLangMenu)}
              >
                <span className="material-symbols-outlined text-[18px]">language</span>
                <span>{language.toUpperCase()}</span>
              </button>
              {showLangMenu && (
                <div className="absolute right-0 mt-4 w-40 bg-[#1a1c1c] border border-white/5 rounded-none shadow-2xl z-50">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        setShowLangMenu(false);
                      }}
                      className={`w-full text-left px-5 py-3 text-xs tracking-wider flex items-center gap-3 transition-all ${
                        language === lang.code ? 'text-[#141f00] bg-[#bcf540]' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="text-lg">{lang.icon}</span>
                      <span className="font-bold">{lang.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Auth Content */}
        <main className="w-full max-w-sm mx-auto px-8 flex-1 flex flex-col justify-center pb-20">
          <div className="mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/5 rounded-full mb-8">
              <div className="w-1.5 h-1.5 bg-[#bcf540] rounded-full animate-pulse"></div>
              <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-white/50">{t('systemNominal') || 'System Online'}</span>
            </div>
            <h1 className="text-4xl font-black text-white mb-3 tracking-tight">
              {isRegisterMode ? t('register') : t('signIn')}
            </h1>
            <p className="text-sm text-white/40 tracking-wide">
              {isRegisterMode ? t('registerDesc') : t('logisticsCoreDesc')}
            </p>
          </div>
          
          <form className="space-y-8" onSubmit={handleAuth}>
            <div className="group relative">
              <label className="flex justify-between items-center text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-3">
                {t('operatorId')}
                <span className="text-white/10 group-focus-within:text-[#bcf540]/30 transition-colors">ID_SEQ</span>
              </label>
              <div className="relative">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-white/20 material-symbols-outlined text-[18px]">person</span>
                <input 
                  name="operator_id_secure"
                  className="w-full bg-transparent border-0 border-b-2 border-white/10 pl-8 pr-0 py-2.5 text-white text-lg focus:ring-0 focus:border-[#bcf540] transition-colors placeholder:text-white/10 outline-none block" 
                  placeholder="00-X-ALPHA" 
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>
            
            <div className="group relative">
              <label className="flex justify-between items-center text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-3">
                {t('accessKey')}
                <span className="text-white/10 group-focus-within:text-[#bcf540]/30 transition-colors">SEC_KEY</span>
              </label>
              <div className="relative">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-white/20 material-symbols-outlined text-[18px]">key</span>
                <input 
                  name="access_key_secure"
                  className="w-full bg-transparent border-0 border-b-2 border-white/10 pl-8 pr-0 py-2.5 text-white text-lg tracking-widest focus:ring-0 focus:border-[#bcf540] transition-colors placeholder:text-white/10 outline-none block" 
                  placeholder="••••••••••••" 
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-none">
                <span className="material-symbols-outlined text-red-500 text-[16px]">warning</span>
                <span className="text-red-500 text-xs font-bold uppercase tracking-wider">{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 bg-[#bcf540]/10 border border-[#bcf540]/20 px-4 py-3 rounded-none">
                <span className="material-symbols-outlined text-[#bcf540] text-[16px]">check_circle</span>
                <span className="text-[#bcf540] text-xs font-bold uppercase tracking-wider">{success}</span>
              </div>
            )}
            
            <div className="pt-4">
              <button 
                disabled={loading}
                className="group relative w-full bg-[#bcf540] text-[#141f00] overflow-hidden py-4 flex items-center justify-center disabled:opacity-50 transition-all hover:shadow-[0_0_30px_rgba(188,245,64,0.3)]"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                <div className="relative flex items-center gap-3">
                  <span className="text-sm font-black uppercase tracking-[0.2em]">
                    {loading ? t('processing') : (isRegisterMode ? t('registerAccount') : t('authenticate'))}
                  </span>
                  <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                    {isRegisterMode ? 'arrow_forward' : 'login'}
                  </span>
                </div>
              </button>
            </div>
          </form>
          
          <div className="mt-10 flex flex-col gap-6">
            <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">
              <button 
                onClick={() => setIsRegisterMode(!isRegisterMode)}
                className="hover:text-white transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">
                  {isRegisterMode ? 'arrow_back' : 'add'}
                </span>
                {isRegisterMode ? t('backToSignIn') : t('adminRegister')}
              </button>
              <button type="button" className="hover:text-white transition-colors flex items-center gap-1" onClick={handleResetForm}>
                <span className="material-symbols-outlined text-[14px]">refresh</span>
                {t('resetTerminal') || 'Reset'}
              </button>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-10 py-6 border-t border-white/5">
          <div className="flex justify-between items-center">
            <p className="text-[9px] tracking-[0.2em] text-white/20 uppercase font-bold">
              © {new Date().getFullYear()} Genshougetsu.
            </p>
            <div className="flex gap-4">
              <button onClick={() => setNotice(t('privacyNotice'))} className="text-[9px] tracking-[0.2em] text-white/20 hover:text-white transition-colors uppercase font-bold">Privacy</button>
              <button onClick={() => setNotice(t('termsNotice'))} className="text-[9px] tracking-[0.2em] text-white/20 hover:text-white transition-colors uppercase font-bold">Terms</button>
            </div>
          </div>
        </footer>

        {/* Modal */}
        {notice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 pointer-events-auto" onClick={() => setNotice(null)}>
            <div className="w-full max-w-md bg-[#161818] border border-white/10 p-8 shadow-2xl transform scale-100 animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined text-[#bcf540]">info</span>
                <h3 className="text-white font-bold tracking-widest uppercase text-sm">Information</h3>
              </div>
              <p className="text-sm leading-relaxed text-zinc-400 mb-8">{notice}</p>
              <button type="button" onClick={() => setNotice(null)} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 py-3 text-xs font-black uppercase tracking-widest text-white transition-all">
                {t('close') || 'Close'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;

