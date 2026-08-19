'use client';

import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faVideo,
  faMagnifyingGlass,
  faNetworkWired,
  faBell
} from '@fortawesome/free-solid-svg-icons';

const steps = [
  {
    num: '01',
    icon: faVideo,
    title: 'Edge CCTV Capture (LAN)',
    description: 'CCTV Tapo mengalirkan dual-stream ke Raspberry Pi via jaringan kabel LAN lokal tanpa tergantung cloud.',
  },
  {
    num: '02',
    icon: faMagnifyingGlass,
    title: 'Edge AI & 4G Cellular Uplink',
    description: 'Raspberry Pi mendeteksi wajah (RetinaFace), memfilter blur, dan mengirim data via Modem USB 4G ke GCP.',
  },
  {
    num: '03',
    icon: faNetworkWired,
    title: 'De-Disguise & pgvector Match',
    description: 'ML Service V2 membuka penyamaran target (Autoencoder) & mencocokkan vektor 512-D di PostgreSQL.',
  },
  {
    num: '04',
    icon: faBell,
    title: 'Cross-Platform Alert',
    description: 'Notifikasi instan terkirim serentak ke Web Command Center dan aplikasi mobile petugas di lapangan.',
  },
];

export const HowItWorksSection: React.FC = () => {
  const [ref, inView] = useInView({ threshold: 0.15, triggerOnce: true });

  return (
    <section
      id="how-it-works"
      style={{ padding: '120px 24px', background: '#0D1B2A', position: 'relative', overflow: 'hidden' }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }} ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: '80px' }}
        >
          <span
            style={{
              display: 'inline-block',
              padding: '6px 20px',
              borderRadius: '999px',
              background: 'rgba(0, 151, 178, 0.12)',
              border: '1px solid rgba(0, 151, 178, 0.3)',
              color: '#00CFE8',
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontFamily: 'Inter, sans-serif',
              marginBottom: '16px',
            }}
          >
            Cara Kerja
          </span>
          <h2
            style={{
              fontFamily: 'Orbitron, monospace',
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 700,
              color: '#E8F4F8',
            }}
          >
            Bagaimana DISGUISE-ID Bekerja
          </h2>
        </motion.div>

        {/* Steps with connecting lines */}
        <div style={{ position: 'relative' }}>
          {/* Connecting line (desktop) */}
          <div
            className="flow-line"
            style={{
              position: 'absolute',
              top: '80px',
              left: 'calc(12.5% + 40px)',
              right: 'calc(12.5% + 40px)',
              height: '2px',
              background: 'rgba(0, 151, 178, 0.2)',
              zIndex: 0,
            }}
          >
            {/* Animated beam */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={inView ? { scaleX: 1 } : {}}
              transition={{ duration: 1.5, delay: 0.5, ease: 'easeInOut' }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #0097B2, #00E5FF)',
                boxShadow: '0 0 10px rgba(0, 229, 255, 0.5)',
                transformOrigin: 'left',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '-60%',
                  width: '60%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
                  animation: 'borderScan 2s linear infinite',
                }}
              />
            </motion.div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '24px',
              position: 'relative',
              zIndex: 1,
            }}
            className="steps-grid"
          >
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 40 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.15 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
              >
                {/* Step circle */}
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: 'rgba(0, 151, 178, 0.15)',
                    border: '2px solid rgba(0, 229, 255, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    marginBottom: '20px',
                    position: 'relative',
                    boxShadow: '0 0 20px rgba(0, 151, 178, 0.2)',
                    color: '#00CFE8',
                  }}
                >
                  <FontAwesomeIcon icon={step.icon} />
                  <div
                    style={{
                      position: 'absolute',
                      top: -10,
                      right: -10,
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: '#0097B2',
                      border: '2px solid #060D14',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#E8F4F8',
                    }}
                  >
                    {step.num}
                  </div>
                </div>

                <h3
                  style={{
                    fontFamily: 'Orbitron, monospace',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#E8F4F8',
                    marginBottom: '10px',
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    color: '#8BAFC4',
                    fontSize: '13px',
                    lineHeight: 1.6,
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom callout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 1 }}
          style={{
            marginTop: '64px',
            padding: '24px 32px',
            background: 'rgba(0, 151, 178, 0.08)',
            border: '1px solid rgba(0, 229, 255, 0.15)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '16px', color: '#E8F4F8', fontWeight: 600 }}>
              End-to-End Pipeline
            </div>
            <div style={{ color: '#8BAFC4', fontSize: '14px', marginTop: '4px' }}>
              Dari frame CCTV hingga notifikasi operator dalam waktu kurang dari 1 detik
            </div>
          </div>
          <div style={{ display: 'flex', gap: '32px' }}>
            {[
              { v: '<1s', l: 'End-to-End Latency' },
              { v: '512-D', l: 'Feature Embedding' },
              { v: '<0.5s', l: 'WebRTC Delay' },
            ].map((m) => (
              <div key={m.l} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '20px', color: '#00E5FF', fontWeight: 700 }}>
                  {m.v}
                </div>
                <div style={{ fontSize: '11px', color: '#4A6B84', marginTop: '2px' }}>{m.l}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .steps-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .flow-line { display: none !important; }
        }
        @media (max-width: 480px) {
          .steps-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
};
