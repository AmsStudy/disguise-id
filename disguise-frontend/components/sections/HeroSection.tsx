'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRocket, faChevronDown, faCircle, faShieldHalved, faBolt, faBrain } from '@fortawesome/free-solid-svg-icons';
import CountUp from 'react-countup';

const stats = [
  { value: 512, label: 'Biometric Vector', suffix: '-D', prefix: '', decimals: 0, icon: faBrain, color: '#00E5FF' },
  { value: 0.5, label: 'WebRTC Latency', suffix: 's', prefix: '< ', decimals: 1, icon: faBolt, color: '#00CFE8' },
  { value: 100, label: 'Edge & Cloud Sync', suffix: '%', prefix: '', decimals: 0, icon: faShieldHalved, color: '#00E676' },
];

// 50 Seeded Floating White Dust Particles to ensure consistent SSR/CSR rendering
const dustParticles = Array.from({ length: 50 }).map((_, i) => ({
  id: i,
  left: `${((i * 19 + 7) % 100)}%`,
  top: `${((i * 23 + 13) % 100)}%`,
  size: (i % 4 === 0 ? 2.5 : i % 3 === 0 ? 2 : 1.5),
  opacity: 0.3 + ((i % 5) * 0.12),
  duration: 8 + ((i % 7) * 2),
  delay: ((i % 6) * 1.2),
}));

export const HeroSection: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoEnded, setVideoEnded] = useState(false);
  const [showImageBg, setShowImageBg] = useState(false);
  const [phase, setPhase] = useState(0);
  const [startCount, setStartCount] = useState(false);

  useEffect(() => {
    // Timeline orchestration:
    // 0s - 6s: Cinematic mascot intro video
    // 7.0s: Phase 1 (Status badge appears)
    // 7.8s: Phase 2 (Main Title appears)
    // 8.6s: Phase 3 (Subtitle narration appears)
    // 9.4s: Phase 4 (CTA Buttons appear)
    // 10.0s: Video transitions to after-background.webp + Phase 5 (Stats appear & settled in center)
    const timers = [
      setTimeout(() => setPhase(1), 7000),
      setTimeout(() => setPhase(2), 7800),
      setTimeout(() => setPhase(3), 8600),
      setTimeout(() => setPhase(4), 9400),
      setTimeout(() => {
        setPhase(5);
        setShowImageBg(true);
        setVideoEnded(true);
        setStartCount(true);
      }, 10000),
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  const handleVideoTimeUpdate = () => {
    if (videoRef.current && videoRef.current.currentTime >= 10 && !showImageBg) {
      setShowImageBg(true);
      setVideoEnded(true);
      setPhase(5);
      setStartCount(true);
    }
  };

  return (
    <section
      id="hero"
      style={{
        minHeight: '100vh',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: '#070F18',
      }}
    >
      {/* 1. Video Background (0 - 10s) */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        onTimeUpdate={handleVideoTimeUpdate}
        onEnded={() => {
          setShowImageBg(true);
          setVideoEnded(true);
          setPhase(5);
          setStartCount(true);
        }}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 1,
          opacity: showImageBg ? 0 : 1,
          transition: 'opacity 1.5s ease-in-out',
          pointerEvents: 'none',
        }}
      >
        <source src="/assets/background/main-section.mp4" type="video/mp4" />
      </video>

      {/* 2. After-Background Static Image (Appears smoothly after 10s) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(/assets/background/after-background.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 2,
          opacity: showImageBg ? 1 : 0,
          transition: 'opacity 1.5s ease-in-out',
          pointerEvents: 'none',
        }}
      />

      {/* 3. Dark Sci-Fi Overlay & Vignette for Maximum Contrast */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: showImageBg
            ? 'radial-gradient(circle at center, rgba(7, 15, 24, 0.45) 0%, rgba(7, 15, 24, 0.85) 100%)'
            : 'radial-gradient(circle at center, rgba(7, 15, 24, 0.2) 0%, rgba(7, 15, 24, 0.75) 100%)',
          zIndex: 3,
          pointerEvents: 'none',
          transition: 'background 1.5s ease',
        }}
      />

      {/* 4. Atmospheric Floating White Dust / Glowing Particles */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 4,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        {dustParticles.map((p) => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: p.left,
              top: p.top,
              width: `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: '50%',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 0 6px rgba(255, 255, 255, 0.9), 0 0 12px rgba(0, 229, 255, 0.6)',
              opacity: p.opacity,
              animation: `floatDust ${p.duration}s ease-in-out infinite`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* 5. Holographic Grid on Bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '45%',
          backgroundImage:
            'linear-gradient(rgba(0, 151, 178, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 151, 178, 0.1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          transform: 'perspective(600px) rotateX(55deg)',
          transformOrigin: 'center bottom',
          maskImage: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 80%)',
          WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 80%)',
          zIndex: 5,
          pointerEvents: 'none',
        }}
      />

      {/* 6. Main Hero Content Container (Centered & Staggered Animation at 7-10s) */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '140px 24px 80px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* Step 1 (7.0s): System Status Badge */}
        {/* <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : -20 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 20px',
            background: 'rgba(17, 34, 54, 0.75)',
            border: '1px solid rgba(0, 229, 255, 0.35)',
            backdropFilter: 'blur(16px)',
            borderRadius: '999px',
            marginBottom: '24px',
            boxShadow: '0 0 20px rgba(0, 229, 255, 0.2)',
          }}
        >
          <FontAwesomeIcon
            icon={faCircle}
            style={{
              fontSize: '8px',
              color: '#00E676',
              filter: 'drop-shadow(0 0 8px #00E676)',
              animation: 'pulseGlow 1.2s ease-in-out infinite',
            }}
          />
          <span
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '13px',
              color: '#E8F4F8',
              letterSpacing: '0.05em',
              fontWeight: 600,
            }}
          >
            DISGUISE-ID ACTIVE — REAL-TIME SURVEILLANCE
          </span>
        </motion.div> */}

        {/* Step 2 (7.8s): Main Title */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{
            opacity: phase >= 2 ? 1 : 0,
            scale: phase >= 2 ? 1 : 0.95,
            y: phase >= 2 ? 0 : 30,
          }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ marginBottom: '24px' }}
        >
          <h1 style={{ margin: 0 }}>
            <div
              style={{
                fontFamily: 'Orbitron, monospace',
                fontSize: 'clamp(32px, 5.5vw, 68px)',
                fontWeight: 800,
                color: '#E8F4F8',
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                marginBottom: '8px',
                textShadow: '0 4px 24px rgba(0,0,0,0.8)',
              }}
            >
              WAJAH TERTUTUP?
            </div>

            <div
              style={{
                fontFamily: 'Orbitron, monospace',
                fontSize: 'clamp(32px, 5.5vw, 68px)',
                fontWeight: 800,
                color: '#00E5FF',
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                textShadow: '0 0 25px rgba(0, 229, 255, 0.6), 2px 2px 0px rgba(255, 107, 53, 0.85)',
                animation: 'glitch 10s infinite',
              }}
            >
              <div>KAMI TETAP</div>
              <div>MENGENALINYA.</div>
            </div>
          </h1>
        </motion.div>

        {/* Step 3 (8.6s): Subtitle Narration */}
        <motion.p
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 25 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 'clamp(15px, 2vw, 18px)',
            color: '#B0CFE2',
            maxWidth: '680px',
            lineHeight: 1.7,
            marginBottom: '36px',
            textShadow: '0 2px 10px rgba(0,0,0,0.8)',
          }}
        >
          Sistem intelijen pengenalan wajah taktis berbasis <strong>Edge AI (Raspberry Pi)</strong> dan <strong>Cloud DeepFace</strong>.
          Mendeteksi identitas DPO secara instan meski wajah tersamar masker, helm, atau kacamata hitam.
        </motion.p>

        {/* Step 4 (9.4s): Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: phase >= 4 ? 1 : 0, y: phase >= 4 ? 0 : 20 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '48px',
          }}
        >
          <Link href="/login">
            <Button variant="fox" size="lg" id="hero-demo-btn">
              <FontAwesomeIcon icon={faRocket} style={{ marginRight: '10px' }} />
              Buka Dashboard Command Center
            </Button>
          </Link>
          <button
            onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
            style={{
              padding: '14px 28px',
              borderRadius: '999px',
              background: 'rgba(17, 34, 54, 0.6)',
              border: '1px solid rgba(0, 229, 255, 0.35)',
              backdropFilter: 'blur(12px)',
              color: '#00CFE8',
              fontSize: '15px',
              fontWeight: 600,
              fontFamily: 'Inter, sans-serif',
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 229, 255, 0.15)';
              e.currentTarget.style.borderColor = '#00E5FF';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(17, 34, 54, 0.6)';
              e.currentTarget.style.borderColor = 'rgba(0, 229, 255, 0.35)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Pelajari Arsitektur
            <FontAwesomeIcon icon={faChevronDown} style={{ fontSize: '12px' }} />
          </button>
        </motion.div>

        {/* Step 5 (10.0s+): Verified Capabilities Stats (Settled in Center) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: phase >= 5 ? 1 : 0, y: phase >= 5 ? 0 : 30 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '20px',
            width: '100%',
            maxWidth: '820px',
          }}
          className="hero-stats-grid"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              style={{
                padding: '18px 24px',
                background: 'rgba(17, 34, 54, 0.75)',
                border: '1px solid rgba(0, 229, 255, 0.2)',
                backdropFilter: 'blur(20px)',
                borderRadius: '18px',
                textAlign: 'center',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
              }}
            >
              <div
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 'clamp(22px, 3vw, 30px)',
                  fontWeight: 800,
                  color: stat.color,
                  textShadow: `0 0 20px ${stat.color}66`,
                  marginBottom: '4px',
                }}
              >
                {startCount ? (
                  <>
                    {stat.prefix}
                    <CountUp
                      end={stat.value}
                      duration={1.8}
                      decimals={stat.decimals}
                      separator=","
                      suffix={stat.suffix}
                    />
                  </>
                ) : (
                  '0'
                )}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#8BAFC4',
                  fontFamily: 'Inter, sans-serif',
                  letterSpacing: '0.04em',
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      <style>{`
        @keyframes floatDust {
          0% {
            transform: translateY(0px) translateX(0px);
            opacity: 0.2;
          }
          50% {
            transform: translateY(-30px) translateX(15px);
            opacity: 0.85;
          }
          100% {
            transform: translateY(-60px) translateX(-10px);
            opacity: 0.2;
          }
        }
        @keyframes saberSweep {
          0% {
            background-position: 200% center;
          }
          100% {
            background-position: -200% center;
          }
        }
        @keyframes saberGlowPulse {
          0%, 100% {
            filter: drop-shadow(0 0 12px rgba(0, 229, 255, 0.8));
          }
          50% {
            filter: drop-shadow(0 0 22px rgba(0, 229, 255, 1)) drop-shadow(0 0 35px #FFFFFF);
          }
        }
        @keyframes saberLaserSweep {
          0% {
            left: -60%;
            opacity: 0;
          }
          25% {
            opacity: 1;
          }
          75% {
            opacity: 1;
          }
          100% {
            left: 110%;
            opacity: 0;
          }
        }
        @media (max-width: 768px) {
          .hero-stats-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
        }
      `}</style>
    </section>
  );
};
