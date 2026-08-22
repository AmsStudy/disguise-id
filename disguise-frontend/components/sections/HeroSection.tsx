'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRocket, faChevronDown, faShieldHalved, faBolt, faBrain } from '@fortawesome/free-solid-svg-icons';
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
  const loopTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [videoEnded, setVideoEnded] = useState(false);
  const [showImageBg, setShowImageBg] = useState(false);
  const [phase, setPhase] = useState(0);
  const [startCount, setStartCount] = useState(false);

  useEffect(() => {
    // Timeline orchestration for first entrance:
    // 0s - 6s: Cinematic mascot intro video
    // 7.0s: Phase 1 (Status badge appears)
    // 7.8s: Phase 2 (Main Title appears)
    // 8.6s: Phase 3 (Subtitle narration appears)
    // 9.4s: Phase 4 (CTA Buttons appear)
    // 10.0s: Phase 5 (Stats appear & settled in position)
    const timers = [
      setTimeout(() => setPhase(1), 7000),
      setTimeout(() => setPhase(2), 7800),
      setTimeout(() => setPhase(3), 8600),
      setTimeout(() => setPhase(4), 9400),
      setTimeout(() => {
        setPhase(5);
        setStartCount(true);
      }, 10000),
    ];

    return () => {
      timers.forEach(clearTimeout);
      if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
    };
  }, []);

  const handleVideoEndedOrReached10s = () => {
    if (showImageBg) return;

    // 1. Show static freeze image
    setShowImageBg(true);
    setVideoEnded(true);
    setPhase(5);
    setStartCount(true);

    if (loopTimerRef.current) clearTimeout(loopTimerRef.current);

    // 2. Pause on static image for exactly 5 seconds, then replay the video smoothly
    loopTimerRef.current = setTimeout(() => {
      setShowImageBg(false);
      setVideoEnded(false);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => { });
      }
    }, 5000);
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current && videoRef.current.currentTime >= 10 && !showImageBg) {
      handleVideoEndedOrReached10s();
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
      {/* 1. Video Background (Plays 0 - 10s, then loops after 5s image freeze) */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        onTimeUpdate={handleVideoTimeUpdate}
        onEnded={handleVideoEndedOrReached10s}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'right center',
          zIndex: 1,
          opacity: showImageBg ? 0 : 1,
          transition: 'opacity 1.2s ease-in-out',
          pointerEvents: 'none',
        }}
      >
        <source src="/assets/background/main-section.mp4" type="video/mp4" />
      </video>

      {/* 2. After-Background Static Image (Appears smoothly after 10s for 5 seconds) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(/assets/background/after-background.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'right center',
          zIndex: 2,
          opacity: showImageBg ? 1 : 0,
          transition: 'opacity 1.2s ease-in-out',
          pointerEvents: 'none',
        }}
      />

      {/* 3. Dark Sci-Fi Asymmetric Gradient Overlay (Higher contrast on left for text, clear on right for mascot) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: showImageBg
            ? 'linear-gradient(to right, rgba(7, 15, 24, 0.95) 0%, rgba(7, 15, 24, 0.85) 45%, rgba(7, 15, 24, 0.35) 80%, rgba(7, 15, 24, 0.6) 100%)'
            : 'linear-gradient(to right, rgba(7, 15, 24, 0.92) 0%, rgba(7, 15, 24, 0.80) 45%, rgba(7, 15, 24, 0.20) 80%, rgba(7, 15, 24, 0.5) 100%)',
          zIndex: 3,
          pointerEvents: 'none',
          transition: 'background 1.2s ease',
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
          height: '40%',
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

      {/* 6. Main Hero Split Content Grid (Text Left, Reserved Mascot Area Right) */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: '1380px',
          width: '100%',
          margin: '0 auto',
          padding: '130px 32px 70px',
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 660px) 1fr',
          alignItems: 'center',
          gap: '40px',
        }}
        className="hero-split-grid"
      >
        {/* Left Column: Information Text, CTAs, and Statistics */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>

          {/* Main Title (Wajah Tertutup? Kami Tetap Mengenalinya.) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 25 }}
            animate={{
              opacity: phase >= 2 ? 1 : 0,
              scale: phase >= 2 ? 1 : 0.95,
              y: phase >= 2 ? 0 : 25,
            }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{ marginBottom: '20px' }}
          >
            <h1 style={{ margin: 0, textAlign: 'left' }}>
              <div
                style={{
                  fontFamily: 'Orbitron, monospace',
                  fontSize: 'clamp(28px, 4.2vw, 56px)',
                  fontWeight: 800,
                  color: '#E8F4F8',
                  lineHeight: 1.15,
                  letterSpacing: '-0.02em',
                  marginBottom: '8px',
                  textShadow: '0 4px 24px rgba(0,0,0,0.8)',
                }}
              >
                Kamu menyamar?
              </div>

              <div
                style={{
                  fontFamily: 'Orbitron, monospace',
                  fontSize: 'clamp(28px, 4.2vw, 56px)',
                  fontWeight: 800,
                  color: '#00E5FF',
                  lineHeight: 1.15,
                  letterSpacing: '-0.02em',
                  textShadow: '0 0 25px rgba(0, 229, 255, 0.6), 2px 2px 0px rgba(255, 107, 53, 0.85)',
                  animation: 'glitch 10s infinite',
                }}
              >
                <div>KAMI</div>
                <div>MEMBONGKAR!.</div>
              </div>
            </h1>
          </motion.div>

          {/* Subtitle Narration */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 20 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 'clamp(14px, 1.25vw, 17px)',
              color: '#B0CFE2',
              maxWidth: '580px',
              lineHeight: 1.7,
              marginBottom: '32px',
              textAlign: 'left',
              textShadow: '0 2px 10px rgba(0,0,0,0.8)',
            }}
          >
            Sistem intelijen pengenalan wajah taktis berbasis <strong>Edge AI (Raspberry Pi)</strong> dan <strong>Cloud DeepFace</strong>.
            Mendeteksi identitas DPO secara instan meski wajah tersamar masker, helm, atau kacamata hitam.
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: phase >= 4 ? 1 : 0, y: phase >= 4 ? 0 : 20 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              display: 'flex',
              gap: '14px',
              justifyContent: 'flex-start',
              flexWrap: 'wrap',
              marginBottom: '40px',
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
                padding: '14px 26px',
                borderRadius: '999px',
                background: 'rgba(17, 34, 54, 0.75)',
                border: '1px solid rgba(0, 229, 255, 0.35)',
                backdropFilter: 'blur(12px)',
                color: '#00CFE8',
                fontSize: '14px',
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
                e.currentTarget.style.background = 'rgba(17, 34, 54, 0.75)';
                e.currentTarget.style.borderColor = 'rgba(0, 229, 255, 0.35)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Pelajari Arsitektur
              <FontAwesomeIcon icon={faChevronDown} style={{ fontSize: '12px' }} />
            </button>
          </motion.div>

          {/* Capabilities Statistics Grid */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: phase >= 5 ? 1 : 0, y: phase >= 5 ? 0 : 25 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '14px',
              width: '100%',
              maxWidth: '580px',
            }}
            className="hero-stats-grid"
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                style={{
                  padding: '14px 18px',
                  background: 'rgba(17, 34, 54, 0.85)',
                  border: '1px solid rgba(0, 229, 255, 0.25)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: '14px',
                  textAlign: 'left',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                }}
              >
                <div
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 'clamp(20px, 2.4vw, 26px)',
                    fontWeight: 800,
                    color: stat.color,
                    textShadow: `0 0 16px ${stat.color}66`,
                    marginBottom: '2px',
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
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#8BAFC4',
                    fontFamily: 'Inter, sans-serif',
                    letterSpacing: '0.03em',
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right Column: Open space dedicated to showcase the Mascot in background */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }} className="hero-mascot-space" />
      </div>

      <style>{`
        @media (max-width: 992px) {
          .hero-split-grid {
            grid-template-columns: 1fr !important;
            padding-top: 110px !important;
            padding-bottom: 50px !important;
          }
          .hero-mascot-space {
            display: none !important;
          }
        }
        @media (max-width: 600px) {
          .hero-stats-grid {
            grid-template-columns: 1fr !important;
          }
        }
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
        @keyframes glitch {
          0% {
            transform: translate(0);
          }
          20% {
            transform: translate(-1px, 1px);
          }
          40% {
            transform: translate(-1px, -1px);
          }
          60% {
            transform: translate(1px, 1px);
          }
          80% {
            transform: translate(1px, -1px);
          }
          100% {
            transform: translate(0);
          }
        }
      `}</style>
    </section>
  );
};
