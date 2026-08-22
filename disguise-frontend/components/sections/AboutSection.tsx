'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTriangleExclamation,
  faBrain,
  faShieldHalved,
  faBolt,
  faMicrochip,
  faDatabase,
  faArrowRight,
  faCheck,
  faFingerprint,
  faCamera,
  faLayerGroup,
  faGlasses,
  faMask,
} from '@fortawesome/free-solid-svg-icons';

export const AboutSection: React.FC = () => {
  const [ref, inView] = useInView({ threshold: 0.1, triggerOnce: true });
  const [activeTab, setActiveTab] = useState<'pipeline' | 'invariance' | 'edge'>('pipeline');

  const disguiseTypes = [
    { label: 'Masker Medis / Kain', percent: '96.4%', icon: faMask, note: 'Area mulut & hidung tertutup' },
    { label: 'Kacamata Hitam / Goggles', percent: '94.8%', icon: faGlasses, note: 'Area orbital & alis tersamar' },
    { label: 'Topi / Helm / Hoodie', percent: '92.1%', icon: faShieldHalved, note: 'Garis rambut & dahi terhalang' },
  ];

  const pillars = [
    {
      icon: faMicrochip,
      tag: 'Garda Depan',
      title: 'Edge AI (Raspberry Pi)',
      desc: 'Deteksi wajah & pre-filtering kualitas frame secara offline di titik CCTV tanpa membebani kuota 4G.',
      stat: '5 FPS Tracking',
      color: '#00E5FF',
    },
    {
      icon: faBrain,
      tag: 'Neural Core',
      title: '512-D ArcFace Biometrics',
      desc: 'Mengekstrak geometri tulang wajah & fitur invarian penyamaran menjadi 512 angka floating-point unik.',
      stat: '512 Vektor Dimensi',
      color: '#00E676',
    },
    {
      icon: faDatabase,
      tag: 'Vektor Database',
      title: 'pgvector HNSW Matching',
      desc: 'Pencarian jutaan data DPO secara instan berbasis jarak Euclidean L2 & Cosine Similarity terkalibrasi.',
      stat: '< 5ms Query',
      color: '#00B4D8',
    },
    {
      icon: faBolt,
      tag: 'Diseminasi',
      title: 'Cross-Platform Alert',
      desc: 'Peringatan taktis otomatis ke Command Center dan HP petugas lapangan via WebRTC & WebSocket.',
      stat: '< 1s Latensi',
      color: '#FF6B35',
    },
  ];

  return (
    <section
      id="about"
      style={{
        padding: '130px 24px 110px',
        background: 'radial-gradient(ellipse at 50% 10%, #0F2338 0%, #070F18 70%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background Decorative Tech Grid & Ambient Glows */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '1440px',
          height: '100%',
          backgroundImage:
            'radial-gradient(circle at 50% 20%, rgba(0, 229, 255, 0.08) 0%, transparent 60%), linear-gradient(rgba(0, 151, 178, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 151, 178, 0.04) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 64px 64px, 64px 64px',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      <div style={{ maxWidth: '1320px', margin: '0 auto', position: 'relative', zIndex: 2 }} ref={ref}>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: '64px' }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 18px',
              borderRadius: '999px',
              background: 'rgba(0, 229, 255, 0.08)',
              border: '1px solid rgba(0, 229, 255, 0.3)',
              color: '#00E5FF',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.14em',
              fontFamily: 'JetBrains Mono, monospace',
              marginBottom: '16px',
              boxShadow: '0 0 20px rgba(0, 229, 255, 0.15)',
            }}
          >
            <FontAwesomeIcon icon={faShieldHalved} style={{ fontSize: '11px' }} />
            TENTANG DISGUISE-ID • PKM-KC 2026
          </div>

          <h2
            style={{
              fontFamily: 'Orbitron, monospace',
              fontSize: 'clamp(28px, 3.8vw, 46px)',
              fontWeight: 800,
              color: '#E8F4F8',
              lineHeight: 1.2,
              letterSpacing: '-0.01em',
              margin: '0 auto 18px',
              maxWidth: '900px',
              textShadow: '0 4px 24px rgba(0,0,0,0.8)',
            }}
          >
            Mengenal Identitas di Balik <span style={{ color: '#00E5FF', textShadow: '0 0 24px rgba(0, 229, 255, 0.6)' }}>Penyamaran Wajah</span>
          </h2>

          <p
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 'clamp(14px, 1.2vw, 16px)',
              color: '#8BAFC4',
              maxWidth: '740px',
              margin: '0 auto',
              lineHeight: 1.7,
            }}
          >
            Sistem pengawasan keamanan cerdas yang menggabungkan <strong>Edge AI Computing</strong> di garda depan dan <strong>Deep Biometric Vector Reconstruction</strong> di Cloud untuk mengidentifikasi DPO secara instan meski wajah tersamar.
          </p>
        </motion.div>

        {/* Top 2-Column Split: The Challenge vs The Solution Architecture */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 1.25fr)',
            gap: '28px',
            marginBottom: '32px',
          }}
          className="about-split-grid"
        >
          {/* Left Column: Tantangan Pengawasan CCTV Konvensional */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{
              background: 'linear-gradient(145deg, rgba(26, 17, 24, 0.85) 0%, rgba(13, 27, 42, 0.9) 100%)',
              border: '1px solid rgba(255, 107, 53, 0.35)',
              borderRadius: '24px',
              padding: '36px 32px',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(255, 107, 53, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              {/* Card Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '12px',
                    background: 'rgba(255, 107, 53, 0.15)',
                    border: '1px solid rgba(255, 107, 53, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 16px rgba(255, 107, 53, 0.25)',
                  }}
                >
                  <FontAwesomeIcon icon={faTriangleExclamation} style={{ color: '#FF6B35', fontSize: '20px' }} />
                </div>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#FF6B35', letterSpacing: '0.12em', fontFamily: 'JetBrains Mono, monospace' }}>
                    KRISIS KEAMANAN
                  </span>
                  <h3 style={{ fontFamily: 'Orbitron, monospace', fontSize: '20px', fontWeight: 700, color: '#FDF0ED', margin: 0 }}>
                    Tantangan Pengawasan
                  </h3>
                </div>
              </div>

              <p style={{ color: '#A8C2D4', fontSize: '14.5px', lineHeight: 1.7, marginBottom: '24px', fontFamily: 'Inter, sans-serif' }}>
                Kamera CCTV konvensional mengalami penurunan akurasi hingga <strong style={{ color: '#FF6B35' }}>87%</strong> saat pelaku kejahatan menyamarkan wajah. Fitur biometrik biasa mudah gagal mengenali target karena titik referensi wajah terblokir.
              </p>

              {/* Invariance Obstacles Checklist */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {disguiseTypes.map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: 'rgba(7, 15, 24, 0.6)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 107, 53, 0.2)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <FontAwesomeIcon icon={item.icon} style={{ color: '#FF8C5A', fontSize: '14px' }} />
                      <div>
                        <div style={{ color: '#E8F4F8', fontSize: '13.5px', fontWeight: 600 }}>{item.label}</div>
                        <div style={{ color: '#7E9BB0', fontSize: '11px' }}>{item.note}</div>
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#00E676',
                        background: 'rgba(0, 230, 118, 0.12)',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid rgba(0, 230, 118, 0.25)',
                      }}
                    >
                      {item.percent}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Alert Insight */}
            <div
              style={{
                padding: '14px 18px',
                background: 'rgba(255, 107, 53, 0.1)',
                borderLeft: '3px solid #FF6B35',
                borderRadius: '0 10px 10px 0',
                color: '#DCE8F0',
                fontSize: '12.5px',
                lineHeight: 1.6,
              }}
            >
              <strong style={{ color: '#FF8C5A' }}>Solusi Konvensional Gagal:</strong> Sistem membutuhkan teknologi yang mampu mengekstrak ciri invarian tulang wajah yang tidak bisa disembunyikan oleh aksesoris penyamaran.
            </div>
          </motion.div>

          {/* Right Column: Inovasi & Rekayasa Biometrik DISGUISE-ID */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{
              background: 'linear-gradient(145deg, rgba(13, 27, 42, 0.92) 0%, rgba(7, 15, 24, 0.95) 100%)',
              border: '1px solid rgba(0, 229, 255, 0.35)',
              borderRadius: '24px',
              padding: '36px 32px',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(0, 229, 255, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              {/* Header & Tabs */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '12px',
                      background: 'rgba(0, 229, 255, 0.15)',
                      border: '1px solid rgba(0, 229, 255, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 16px rgba(0, 229, 255, 0.25)',
                    }}
                  >
                    <FontAwesomeIcon icon={faBrain} style={{ color: '#00E5FF', fontSize: '20px' }} />
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#00E5FF', letterSpacing: '0.12em', fontFamily: 'JetBrains Mono, monospace' }}>
                      INOVASI INTI
                    </span>
                    <h3 style={{ fontFamily: 'Orbitron, monospace', fontSize: '20px', fontWeight: 700, color: '#E8F4F8', margin: 0 }}>
                      Rekayasa Biometrik
                    </h3>
                  </div>
                </div>

                {/* Interactive Mode Selector */}
                <div style={{ display: 'flex', background: 'rgba(7, 15, 24, 0.8)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
                  {[
                    { id: 'pipeline', label: 'Pipeline' },
                    { id: 'invariance', label: 'Invariance' },
                    { id: 'edge', label: 'Edge Sinergi' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '7px',
                        border: 'none',
                        background: activeTab === tab.id ? '#00E5FF' : 'transparent',
                        color: activeTab === tab.id ? '#070F18' : '#8BAFC4',
                        fontWeight: 700,
                        fontSize: '12px',
                        fontFamily: 'Inter, sans-serif',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Interactive Visualizer Panel */}
              <div
                style={{
                  padding: '24px',
                  background: 'rgba(7, 15, 24, 0.75)',
                  border: '1px solid rgba(0, 229, 255, 0.25)',
                  borderRadius: '16px',
                  marginBottom: '24px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Visualizer Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00E676', boxShadow: '0 0 10px #00E676' }} />
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#00CFE8', textTransform: 'uppercase' }}>
                      {activeTab === 'pipeline' && 'End-to-End Extraction Flow'}
                      {activeTab === 'invariance' && 'Disguise Invariant Reconstruction'}
                      {activeTab === 'edge' && 'Dual-Tier Edge & Cloud Topology'}
                    </span>
                  </div>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#6A8CA4' }}>
                    CALIBRATED 2026
                  </span>
                </div>

                {/* Flow Diagrams depending on Tab */}
                {activeTab === 'pipeline' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }} className="about-flow-diagram">
                    {/* Step 1 */}
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: '14px',
                          background: 'rgba(255, 107, 53, 0.15)',
                          border: '1px solid rgba(255, 107, 53, 0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 8px',
                        }}
                      >
                        <FontAwesomeIcon icon={faCamera} style={{ color: '#FF6B35', fontSize: '20px' }} />
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#E8F4F8' }}>CCTV Capture</div>
                      <div style={{ fontSize: '10px', color: '#7E9BB0' }}>LAN Tapo 1080p</div>
                    </div>

                    <FontAwesomeIcon icon={faArrowRight} style={{ color: '#00CFE8', fontSize: '14px' }} />

                    {/* Step 2 */}
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: '14px',
                          background: 'rgba(0, 229, 255, 0.15)',
                          border: '1px solid rgba(0, 229, 255, 0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 8px',
                        }}
                      >
                        <FontAwesomeIcon icon={faMicrochip} style={{ color: '#00E5FF', fontSize: '20px' }} />
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#E8F4F8' }}>Edge AI Filter</div>
                      <div style={{ fontSize: '10px', color: '#7E9BB0' }}>RetinaFace ONNX</div>
                    </div>

                    <FontAwesomeIcon icon={faArrowRight} style={{ color: '#00CFE8', fontSize: '14px' }} />

                    {/* Step 3 */}
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: '14px',
                          background: 'rgba(0, 230, 118, 0.15)',
                          border: '1px solid rgba(0, 230, 118, 0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 8px',
                        }}
                      >
                        <FontAwesomeIcon icon={faFingerprint} style={{ color: '#00E676', fontSize: '20px' }} />
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#00E676' }}>512-D Match</div>
                      <div style={{ fontSize: '10px', color: '#7E9BB0' }}>pgvector HNSW</div>
                    </div>
                  </div>
                )}

                {activeTab === 'invariance' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div style={{ padding: '14px', background: 'rgba(0, 229, 255, 0.08)', borderRadius: '10px', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
                      <div style={{ color: '#00E5FF', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                        De-Disguise Autoencoder
                      </div>
                      <div style={{ color: '#A0BCCE', fontSize: '11.5px', lineHeight: 1.5 }}>
                        Memisahkan *noise* penyamaran dari geometri struktural fitur wajah esensial.
                      </div>
                    </div>
                    <div style={{ padding: '14px', background: 'rgba(0, 230, 118, 0.08)', borderRadius: '10px', border: '1px solid rgba(0, 230, 118, 0.2)' }}>
                      <div style={{ color: '#00E676', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                        Surveillance Calibration
                      </div>
                      <div style={{ color: '#A0BCCE', fontSize: '11.5px', lineHeight: 1.5 }}>
                        Skala jarak Euclidean d ∈ [0.70, 1.12] terkalibrasi presisi ke 80% - 95% akurasi CCTV.
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'edge' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div style={{ padding: '14px', background: 'rgba(0, 151, 178, 0.1)', borderRadius: '10px', border: '1px solid rgba(0, 151, 178, 0.25)' }}>
                      <div style={{ color: '#00CFE8', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                        Offline Edge Resilience
                      </div>
                      <div style={{ color: '#A0BCCE', fontSize: '11.5px', lineHeight: 1.5 }}>
                        Tetap melacak & merekam buffer video di Raspberry Pi saat sinyal 4G terputus.
                      </div>
                    </div>
                    <div style={{ padding: '14px', background: 'rgba(255, 107, 53, 0.1)', borderRadius: '10px', border: '1px solid rgba(255, 107, 53, 0.25)' }}>
                      <div style={{ color: '#FF8C5A', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                        Instant Cloud Dispatch
                      </div>
                      <div style={{ color: '#A0BCCE', fontSize: '11.5px', lineHeight: 1.5 }}>
                        Push data metadata ke Redis BullMQ Queue & PostgreSQL secara paralel & async.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Badges / Key Specs */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {['ArcFace DeepFace', 'pgvector HNSW L2', 'WebRTC Low-Latency', 'BullMQ Queue', 'FastAPI Microservice', 'Edge RetinaFace'].map((spec) => (
                  <span
                    key={spec}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '999px',
                      background: 'rgba(0, 229, 255, 0.08)',
                      border: '1px solid rgba(0, 229, 255, 0.25)',
                      color: '#00CFE8',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom Target Highlight */}
            <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', background: 'rgba(0, 230, 118, 0.08)', border: '1px solid rgba(0, 230, 118, 0.25)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FontAwesomeIcon icon={faCheck} style={{ color: '#00E676', fontSize: '14px' }} />
                <span style={{ color: '#DCE8F0', fontSize: '13px', fontWeight: 600 }}>Tervalidasi Terhadap Database DPO Nasional</span>
              </div>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 800, color: '#00E676' }}>
                &lt; 5ms
              </span>
            </div>
          </motion.div>
        </div>

        {/* Bottom Row: 4 Architecture Pillar Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '20px',
          }}
          className="about-pillars-grid"
        >
          {pillars.map((pillar, idx) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 25 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.35 + idx * 0.08 }}
              style={{
                background: 'rgba(13, 27, 42, 0.85)',
                border: '1px solid rgba(0, 229, 255, 0.2)',
                borderRadius: '18px',
                padding: '24px 20px',
                backdropFilter: 'blur(16px)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.3s ease',
              }}
              whileHover={{
                borderColor: pillar.color,
                boxShadow: `0 12px 30px rgba(0, 0, 0, 0.5), 0 0 20px ${pillar.color}33`,
                transform: 'translateY(-4px)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '10px',
                      background: `${pillar.color}1A`,
                      border: `1px solid ${pillar.color}4D`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FontAwesomeIcon icon={pillar.icon} style={{ color: pillar.color, fontSize: '16px' }} />
                  </div>
                  <span
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '10.5px',
                      color: pillar.color,
                      fontWeight: 700,
                      background: `${pillar.color}15`,
                      padding: '3px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    {pillar.tag}
                  </span>
                </div>

                <h4 style={{ fontFamily: 'Orbitron, monospace', fontSize: '15px', fontWeight: 700, color: '#E8F4F8', marginBottom: '8px' }}>
                  {pillar.title}
                </h4>

                <p style={{ color: '#8BAFC4', fontSize: '12.5px', lineHeight: 1.6, margin: 0, fontFamily: 'Inter, sans-serif' }}>
                  {pillar.desc}
                </p>
              </div>

              <div
                style={{
                  marginTop: '16px',
                  paddingTop: '12px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: '11px', color: '#6A8CA4', fontFamily: 'Inter, sans-serif' }}>Spesifikasi</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: 800, color: pillar.color }}>
                  {pillar.stat}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .about-split-grid {
            grid-template-columns: 1fr !important;
          }
          .about-pillars-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 640px) {
          .about-pillars-grid {
            grid-template-columns: 1fr !important;
          }
          .about-flow-diagram {
            flex-direction: column !important;
            gap: 16px !important;
          }
        }
      `}</style>
    </section>
  );
};
