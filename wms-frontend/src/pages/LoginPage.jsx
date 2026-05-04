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

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x121414, 0.012);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 15, 30);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
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
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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
      setError(err.response?.data?.message || 'Action failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const languages = [
    { code: 'zh', name: '中文', icon: '🇨🇳' },
    { code: 'en', name: 'English', icon: '🇺🇸' },
    { code: 'ja', name: '日本語', icon: '🇯🇵' }
  ];

  return (
    <div className="relative w-full h-screen bg-[#121414] overflow-hidden">
      <div ref={containerRef} className="absolute inset-0 z-0" />
      
      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/60 z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90 z-10 pointer-events-none" />

      {/* UI Layer */}
      <div className="relative z-20 w-full h-full flex flex-col items-center justify-center pointer-events-none">
        
        {/* Top Bar */}
        <header className="absolute top-0 left-0 w-full flex justify-between items-center px-10 py-6 bg-transparent backdrop-blur-sm border-b border-white/10 pointer-events-auto">
          <div className="flex items-center gap-3">
            <span className="text-xl font-black tracking-widest text-white uppercase">{t('omniWMS')}</span>
            <span className="text-[10px] px-2 py-0.5 border border-[#bcf540] text-[#bcf540] font-bold uppercase tracking-tighter">PREDICTIVE AI</span>
          </div>
          <div className="flex items-center gap-6 relative">
            <span className="material-symbols-outlined text-white/60 hover:text-[#bcf540] transition-colors cursor-pointer">help_outline</span>
            <div className="relative">
              <span 
                className="material-symbols-outlined text-white/60 hover:text-[#bcf540] transition-colors cursor-pointer"
                onClick={() => setShowLangMenu(!showLangMenu)}
              >
                language
              </span>
              {showLangMenu && (
                <div className="absolute right-0 mt-2 w-32 bg-[#1e2020] border border-white/10 rounded-xl shadow-2xl py-2 z-50">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        setShowLangMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
                        language === lang.code ? 'text-[#bcf540] bg-white/5' : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span>{lang.icon}</span>
                      {lang.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Auth Card */}
        <main className="w-full max-w-md px-6 pointer-events-auto mt-16">
          <div className="backdrop-blur-xl bg-black/40 p-12 border border-white/10 rounded-sm shadow-2xl">
            <div className="mb-12">
              <h1 className="font-h1 text-h1 text-white mb-4">{isRegisterMode ? t('register') : t('signIn')}</h1>
              <p className="font-body-lg text-on-surface-variant tracking-wide">
                {isRegisterMode ? t('registerDesc') : t('logisticsCoreDesc')}
              </p>
            </div>
            
            <form className="space-y-8" onSubmit={handleAuth}>
              <div className="group relative">
                <label className="block text-xs font-bold text-white/40 uppercase tracking-[0.2em] mb-2 text-[10px]">{t('operatorId')}</label>
                <input 
                  name="operator_id_secure"
                  className="w-full bg-transparent border-0 border-b border-white/20 px-0 py-2 text-white focus:ring-0 focus:border-[#bcf540] transition-colors placeholder:text-white/20 outline-none block" 
                  placeholder="00-X-ALPHA" 
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  required
                  autoComplete="new-password"
                />
                <div className="absolute bottom-0 left-0 h-[1px] w-0 bg-[#bcf540] transition-all duration-500 group-focus-within:w-full" />
              </div>
              
              <div className="group relative">
                <label className="block text-xs font-bold text-white/40 uppercase tracking-[0.2em] mb-2 text-[10px]">{t('accessKey')}</label>
                <input 
                  name="access_key_secure"
                  className="w-full bg-transparent border-0 border-b border-white/20 px-0 py-2 text-white focus:ring-0 focus:border-[#bcf540] transition-colors placeholder:text-white/20 outline-none block" 
                  placeholder="••••••••••••" 
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                  autoComplete="new-password"
                />
                <div className="absolute bottom-0 left-0 h-[1px] w-0 bg-[#bcf540] transition-all duration-500 group-focus-within:w-full" />
              </div>

              {error && (
                <div className="text-red-500 text-xs font-bold uppercase tracking-wider animate-pulse">
                  {error}
                </div>
              )}

              {success && (
                <div className="text-[#bcf540] text-xs font-bold uppercase tracking-wider">
                  {success}
                </div>
              )}
              
              <div className="pt-6">
                <button 
                  disabled={loading}
                  className="w-full bg-[#bcf540] text-[#141f00] text-base py-5 uppercase tracking-widest font-black hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  <span>{loading ? t('processing') : (isRegisterMode ? t('registerAccount') : t('authenticate'))}</span>
                  <span className="material-symbols-outlined text-[20px]">{isRegisterMode ? 'person_add' : 'lock_open'}</span>
                </button>
              </div>
            </form>
            
            <div className="mt-10 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-white/30">
              <button 
                onClick={() => setIsRegisterMode(!isRegisterMode)}
                className="hover:text-white transition-colors"
              >
                {isRegisterMode ? t('backToSignIn') : t('adminRegister')}
              </button>
              <a className="hover:text-white transition-colors" href="#">{t('resetTerminal')}</a>
            </div>
          </div>
          
          <div className="mt-8 text-center flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-[#bcf540] rounded-full animate-pulse"></div>
              <span className="text-[10px] text-white/40 uppercase tracking-tighter font-bold">{t('systemNominal')}</span>
            </div>
            <div className="w-[1px] h-3 bg-white/10" />
            <span className="text-[10px] text-white/40 uppercase tracking-tighter font-bold">{t('terminalId')}</span>
          </div>
        </main>

        <footer className="absolute bottom-0 w-full flex flex-col items-center gap-4 pb-8 bg-transparent pointer-events-auto">
          <div className="flex gap-8">
            <a className="text-[10px] tracking-[0.2em] text-white/30 hover:text-white transition-opacity uppercase font-bold" href="#">{t('privacyPolicy') || 'Privacy Policy'}</a>
            <a className="text-[10px] tracking-[0.2em] text-white/30 hover:text-white transition-opacity uppercase font-bold" href="#">{t('termsOfService') || 'Terms of Service'}</a>
            <a className="text-[10px] tracking-[0.2em] text-white/30 hover:text-white transition-opacity uppercase font-bold" href="#">{t('systemStatus') || 'System Status'}</a>
          </div>
          <p className="text-[10px] tracking-[0.2em] text-white/30 uppercase font-bold">© Genshougetsu. ALL RIGHTS RESERVED.</p>
        </footer>
      </div>
    </div>
  );
};

export default LoginPage;
