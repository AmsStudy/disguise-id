'use client';

import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { GlassCard } from '@/components/ui/GlassCard';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagnifyingGlass,
  faShieldHalved,
  faBullseye,
  faBolt,
  faSatelliteDish,
  faClipboardList
} from '@fortawesome/free-solid-svg-icons';
const features = [
  {
    icon: faMagnifyingGlass,
    title: 'Edge AI Detection',
    description: 'Deteksi wajah dan filter kualitas real-time di Raspberry Pi menggunakan RetinaFace tanpa membebani bandwidth.',
    metric: '5 FPS',
    metricLabel: 'Edge Tracking',
    color: '#0097B2',
  },
  {
    icon: faShieldHalved,
    title: 'De-Disguise Invariance',
    description: 'Mengenali target meski wajah tertutup masker, kacamata hitam, atau topi menggunakan model Stage20b Autoencoder.',
    metric: '512-D',
    metricLabel: 'Embedding Vector',
    color: '#00CFE8',
  },
  {
    icon: faBullseye,
    title: 'Dynamic Watchlist (pgvector)',
    description: 'Pendaftaran DPO instan. Vektor biometrik langsung terindeks di PostgreSQL untuk pencarian kilat berbasis HNSW.',
    metric: '<5ms',
    metricLabel: 'Query Match',
    color: '#00E5FF',
  },
  {
    icon: faBolt,
    title: 'Cross-Platform Alert',
    description: 'Peringatan otomatis seketika ke Dashboard Web Command Center dan aplikasi mobile petugas di lapangan.',
    metric: '<1s',
    metricLabel: 'Alert Latency',
    color: '#FF6B35',
  },
  {
    icon: faSatelliteDish,
    title: 'Live WebRTC Streaming',
    description: 'Transmisi video CCTV langsung dari lokasi terpencil via Modem 4G dengan latency ultra-rendah di browser dan mobile.',
    metric: '<0.5s',
    metricLabel: 'Live Delay',
    color: '#FF8C5A',
  },
  {
    icon: faClipboardList,
    title: 'Forensic Audit Trail',
    description: 'Setiap deteksi, pendaftaran DPO, dan aksi konfirmasi petugas tercatat permanen untuk kepatuhan hukum.',
    metric: '100%',
    metricLabel: 'Traceable',
    color: '#00B4D8',
  },
];

export const FeaturesSection: React.FC = () => {
  const [ref, inView] = useInView({ threshold: 0.1, triggerOnce: true });

  return (
    <section
      id="features"
      style={{
        padding: '120px 24px',
        background: '#112236',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,151,178,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ maxWidth: '1280px', margin: '0 auto' }} ref={ref}>
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
              background: 'rgba(255, 107, 53, 0.12)',
              border: '1px solid rgba(255, 107, 53, 0.3)',
              color: '#FF8C5A',
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontFamily: 'Inter, sans-serif',
              marginBottom: '16px',
            }}
          >
            Fitur Unggulan
          </span>
          <h2
            style={{
              fontFamily: 'Orbitron, monospace',
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 700,
              color: '#E8F4F8',
            }}
          >
            Kemampuan yang Membedakan
          </h2>
          <p style={{ color: '#8BAFC4', marginTop: '16px', fontSize: '16px', maxWidth: '500px', margin: '16px auto 0' }}>
            Enam kapabilitas inti yang menjadikan DISGUISE-ID berbeda dari sistem identifikasi konvensional.
          </p>
        </motion.div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '24px',
          }}
          className="features-grid"
        >
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <GlassCard
                hover
                style={{ padding: '28px', height: '100%', cursor: 'default' }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '14px',
                    background: `${feature.color}15`,
                    border: `1px solid ${feature.color}30`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    marginBottom: '16px',
                    filter: `drop-shadow(0 0 8px ${feature.color}40)`,
                    color: feature.color,
                  }}
                >
                  <FontAwesomeIcon icon={feature.icon} />
                </div>

                {/* Title */}
                <h3
                  style={{
                    fontFamily: 'Orbitron, monospace',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#E8F4F8',
                    marginBottom: '10px',
                  }}
                >
                  {feature.title}
                </h3>

                {/* Description */}
                <p
                  style={{
                    color: '#8BAFC4',
                    fontSize: '14px',
                    lineHeight: 1.6,
                    fontFamily: 'Inter, sans-serif',
                    marginBottom: '20px',
                  }}
                >
                  {feature.description}
                </p>

                {/* Metric badge */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px',
                    background: `${feature.color}12`,
                    border: `1px solid ${feature.color}25`,
                    borderRadius: '8px',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '16px',
                      fontWeight: 700,
                      color: feature.color,
                    }}
                  >
                    {feature.metric}
                  </span>
                  <span style={{ color: '#4A6B84', fontSize: '11px' }}>{feature.metricLabel}</span>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .features-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .features-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </section>
  );
};
