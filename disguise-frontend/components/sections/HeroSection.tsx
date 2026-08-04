'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { FaceScanRing } from '@/components/face-scan-ring/FaceScanRing';
import { Button } from '@/components/ui/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRocket, faChevronDown, faCircle } from '@fortawesome/free-solid-svg-icons';
import CountUp from 'react-countup';
import { MascotCanvas } from '@/components/mascot/MascotCanvasWrapper';

const stats = [
  { value: 40898, label: 'Wajah Tervalidasi', suffix: '', decimals: 0 },
  { value: 97.5, label: 'Akurasi Verifikasi', suffix: '%', decimals: 1 },
  { value: 0.99, label: 'ROC-AUC Score', suffix: '', decimals: 2 },
];

export const HeroSection: React.FC = () => {
  const [phase, setPhase] = useState(0);
  const [scanStatus, setScanStatus] = useState<'scanning' | 'match'>('scanning');
  const [scanText, setScanText] = useState('SCANNING...');
  const [startCount, setStartCount] = useState(false);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 800),
      setTimeout(() => setPhase(4), 1000),
      setTimeout(() => setPhase(5), 1200),
      setTimeout(() => setPhase(6), 1800),
      setTimeout(() => setPhase(7), 2200),
      setTimeout(() => setStartCount(true), 2500),
      setTimeout(() => { setScanStatus('match'); setScanText('IDENTITY CONFIRMED'); }, 2800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <section
      id="hero"
      style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', background: '#0D1B2A' }}
    >
      {/* Holographic Grid */}
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : 60 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%',
          overflow: 'hidden',
          backgroundImage: 'linear-gradient(rgba(0, 151, 178, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 151, 178, 0.12) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          transform: 'perspective(800px) rotateX(45deg)',
          transformOrigin: 'center bottom',
          maskImage: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 80%)',
          WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 80%)',
          pointerEvents: 'none',
        }}
      />

      {/* Particles */}
      {phase >= 2 && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'clip' }}>
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: Math.random() * 3 + 1, height: Math.random() * 3 + 1,
                borderRadius: '50%',
                background: ['#0097B2', '#00E5FF', '#FF6B35'][i % 3],
                left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.4 + 0.1,
                animation: `float ${Math.random() * 6 + 4}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 4}s`,
              }}
            />
          ))}
        </div>
      )}

      <div
        style={{
          maxWidth: '1400px', margin: '0 auto', padding: '120px 40px 80px',
          display: 'grid', gridTemplateColumns: '1fr auto', gap: '40px',
          alignItems: 'center', width: '100%',
        }}
        className="hero-grid"
      >
        {/* Left */}
        <div>
          <div style={{ marginBottom: '24px' }}>
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: phase >= 5 ? 1 : 0 }}
              transition={{ duration: 0.5 }}
            >
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(36px, 5vw, 72px)', fontWeight: 800, color: '#E8F4F8', lineHeight: 1.1, marginBottom: '8px' }}>
                WAJAH TERTUTUP?
              </div>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(36px, 5vw, 72px)', fontWeight: 800, color: '#00E5FF', lineHeight: 1.1, textShadow: '0 0 30px rgba(0, 229, 255, 0.6)', animation: 'glitch 10s infinite' }}>
                KAMI TETAP MENGENALINYA.
              </div>
            </motion.h1>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: phase >= 4 ? 1 : 0 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px',
              background: 'rgba(0, 229, 255, 0.08)', border: '1px solid rgba(0, 229, 255, 0.2)',
              borderRadius: '999px', marginBottom: '24px',
            }}
          >
            <FontAwesomeIcon
              icon={faCircle}
              style={{
                fontSize: '8px',
                color: scanStatus === 'match' ? '#00E676' : '#00E5FF',
                filter: `drop-shadow(0 0 6px ${scanStatus === 'match' ? '#00E676' : '#00E5FF'})`,
                animation: 'pulseGlow 1s ease-in-out infinite',
              }}
            />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: scanStatus === 'match' ? '#00E676' : '#00E5FF', fontWeight: 500 }}>
              {scanText}
            </span>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: phase >= 6 ? 1 : 0, y: phase >= 6 ? 0 : 20 }}
            transition={{ duration: 0.5 }}
            style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', color: '#8BAFC4', maxWidth: '520px', lineHeight: 1.7, marginBottom: '40px' }}
          >
            Sistem verifikasi wajah berteknologi AI untuk keamanan publik berbasis CCTV pintar.
            Akurat meski wajah tertutup masker, helm, atau kacamata.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: phase >= 7 ? 1 : 0, scale: phase >= 7 ? 1 : 0.9 }}
            transition={{ duration: 0.4 }}
            style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '60px' }}
          >
            <Link href="/login">
              <Button variant="fox" size="lg" id="hero-demo-btn">
                <FontAwesomeIcon icon={faRocket} style={{ marginRight: '8px' }} />
                Mulai Demo
              </Button>
            </Link>
            <button
              onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
              style={{
                padding: '14px 32px', borderRadius: '999px', background: 'transparent',
                border: '1px solid rgba(0, 229, 255, 0.3)', color: '#00CFE8',
                fontSize: '16px', fontWeight: 600, fontFamily: 'Inter, sans-serif',
                cursor: 'pointer', transition: 'all 0.2s ease',
                display: 'inline-flex', alignItems: 'center', gap: '8px',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0, 229, 255, 0.08)'; e.currentTarget.style.borderColor = '#00E5FF'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(0, 229, 255, 0.3)'; }}
            >
              Pelajari Lebih Lanjut
              <FontAwesomeIcon icon={faChevronDown} style={{ fontSize: '13px' }} />
            </button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: startCount ? 1 : 0, y: startCount ? 0 : 20 }}
            transition={{ duration: 0.6 }}
            style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                style={{
                  padding: '20px 24px',
                  background: 'rgba(17, 34, 54, 0.60)', border: '1px solid rgba(0, 229, 255, 0.15)',
                  backdropFilter: 'blur(16px)', borderRadius: '16px', minWidth: '140px',
                }}
              >
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '28px', fontWeight: 700, color: '#00E5FF', textShadow: '0 0 20px rgba(0,229,255,0.5)' }}>
                  {startCount ? (
                    <CountUp end={stat.value} duration={2} decimals={stat.decimals} separator="," suffix={stat.suffix} />
                  ) : '0'}
                </div>
                <div style={{ fontSize: '12px', color: '#8BAFC4', marginTop: '4px', fontFamily: 'Inter, sans-serif' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right: Maskot 3D */}
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: phase >= 3 ? 1 : 0, x: phase >= 3 ? 0 : 60 }}
          transition={{ duration: 0.8, type: 'spring', stiffness: 100, damping: 20 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', flexShrink: 0 }}
          className="hero-maskot"
        >
          {/* Canvas container — perfectly centered with responsive dimensions */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '460px', height: '480px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="mascot-canvas-box">
            {/* Three.js Canvas fills the container automatically */}
            {phase >= 3 && (
              <MascotCanvas width="100%" height="100%" />
            )}
            {/* HUD Ring overlay — pointer-events none so canvas remains interactive */}
            <div
              className="face-scan-hud"
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <FaceScanRing size={340} isScanning={phase >= 4} matchStatus={scanStatus}>
                {/* Empty — canvas behind provides the visual */}
                <div style={{ width: 260, height: 300 }} />
              </FaceScanRing>
            </div>
          </div>
        </motion.div>
      </div>

      <style>{`
        .hero-grid {
          grid-template-columns: minmax(0, 1.2fr) minmax(320px, 460px);
          justify-content: space-between;
          align-items: center;
        }
        @media (max-width: 960px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; padding: 110px 24px 70px !important; text-align: left; }
          .hero-maskot { width: 100% !important; display: flex !important; align-items: center !important; justify-content: center !important; order: -1 !important; margin: 0 auto 10px auto !important; }
          .mascot-canvas-box { max-width: 380px !important; height: 390px !important; transform: none !important; }
          .face-scan-hud { transform: scale(0.95); }
        }
        @media (max-width: 500px) {
          .hero-grid { padding: 90px 16px 50px !important; gap: 25px !important; }
          .hero-maskot { width: 100% !important; margin: 0 auto 5px auto !important; order: -1 !important; }
          .mascot-canvas-box { max-width: 300px !important; height: 320px !important; }
          .face-scan-hud { transform: scale(0.82); transform-origin: center center; }
          #hero-demo-btn { width: 100% !important; justify-content: center !important; }
        }
      `}</style>
    </section>
  );
};
