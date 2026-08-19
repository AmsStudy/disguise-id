'use client';

import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { GlassCard } from '@/components/ui/GlassCard';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBrain, faBolt, faDatabase } from '@fortawesome/free-solid-svg-icons';

const techCards = [
  {
    title: 'AI DE-DISGUISE & BIOMETRICS',
    subtitle: 'Stage20b + InceptionResNet',
    description: 'Autoencoder Skip-Connected merekonstruksi area wajah yang tertutup (masker/kacamata) & mengekstrak vektor biometrik 512-dimensi.',
    details: ['Stage20b Autoencoder', 'InceptionResNet (512-D)', 'ArcFace Biometric Invariance'],
    metric: '512-D',
    metricLabel: 'Feature Vector',
    color: '#0097B2',
    icon: faBrain,
  },
  {
    title: 'EDGE COMPUTING & 4G UPLINK',
    subtitle: 'Raspberry Pi + RetinaFace',
    description: 'Pemrosesan frame lokal di Raspberry Pi OS, filter kualitas blur Laplacian, dan transmisi data via Modem USB 4G LTE.',
    details: ['RetinaFace Edge AI', 'Modem USB 4G Cellular', 'Dual-Stream RTSP (1080p/360p)'],
    metric: '5 FPS',
    metricLabel: 'Edge Tracking',
    color: '#FF6B35',
    icon: faBolt,
  },
  {
    title: 'VECTOR DATABASE & STREAMING',
    subtitle: 'PostgreSQL + pgvector & MediaMTX',
    description: 'Indeks HNSW untuk pencarian vektor biometrik instan serta MediaMTX untuk streaming WebRTC berlatensi ultra-rendah.',
    details: ['pgvector HNSW Index', 'MediaMTX WebRTC WHEP', 'Sub-second Latency (<0.5s)'],
    metric: '<5ms',
    metricLabel: 'Vector Match',
    color: '#00CFE8',
    icon: faDatabase,
  },
];

export const TechSection: React.FC = () => {
  const [ref, inView] = useInView({ threshold: 0.15, triggerOnce: true });

  return (
    <section
      id="tech"
      style={{
        padding: '120px 24px',
        background: '#112236',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(0, 151, 178, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 151, 178, 0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }}
      />

      <div style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative' }} ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: '64px' }}
        >
          <span
            style={{
              display: 'inline-block',
              padding: '6px 20px',
              borderRadius: '999px',
              background: 'rgba(0, 229, 255, 0.1)',
              border: '1px solid rgba(0, 229, 255, 0.25)',
              color: '#00E5FF',
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontFamily: 'Inter, sans-serif',
              marginBottom: '16px',
            }}
          >
            Teknologi
          </span>
          <h2
            style={{
              fontFamily: 'Orbitron, monospace',
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 700,
              color: '#E8F4F8',
            }}
          >
            Stack Teknologi Inti
          </h2>
          <p style={{ color: '#8BAFC4', marginTop: '16px', fontSize: '16px', maxWidth: '480px', margin: '16px auto 0' }}>
            Kombinasi state-of-the-art yang dipilih untuk performa maksimal di kondisi nyata.
          </p>
        </motion.div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '28px',
          }}
          className="tech-grid"
        >
          {techCards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.15 }}
            >
              <GlassCard hover style={{ padding: '32px', height: '100%', position: 'relative', overflow: 'hidden' }}>
                {/* Metric badge top-right */}
                <div
                  style={{
                    position: 'absolute',
                    top: 20,
                    right: 20,
                    padding: '6px 12px',
                    background: `${card.color}15`,
                    border: `1px solid ${card.color}30`,
                    borderRadius: '8px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '16px', fontWeight: 700, color: card.color }}>
                    {card.metric}
                  </div>
                  <div style={{ fontSize: '10px', color: '#4A6B84', marginTop: '2px' }}>{card.metricLabel}</div>
                </div>

                {/* Icon */}
                <div style={{ fontSize: '32px', marginBottom: '16px', color: card.color }}>
                  <FontAwesomeIcon icon={card.icon} />
                </div>

                {/* Title */}
                <div
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '11px',
                    color: card.color,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: '8px',
                  }}
                >
                  {card.title}
                </div>
                <h3
                  style={{
                    fontFamily: 'Orbitron, monospace',
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#E8F4F8',
                    marginBottom: '16px',
                    lineHeight: 1.3,
                  }}
                >
                  {card.subtitle}
                </h3>
                <p style={{ color: '#8BAFC4', fontSize: '14px', lineHeight: 1.6, fontFamily: 'Inter, sans-serif', marginBottom: '24px' }}>
                  {card.description}
                </p>

                {/* Detail tags */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {card.details.map((d) => (
                    <div
                      key={d}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        color: '#8BAFC4',
                        fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: card.color, flexShrink: 0 }} />
                      {d}
                    </div>
                  ))}
                </div>

                {/* Bottom gradient line */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: `linear-gradient(90deg, transparent, ${card.color}, transparent)`,
                    opacity: 0.5,
                  }}
                />
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .tech-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .tech-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
};
