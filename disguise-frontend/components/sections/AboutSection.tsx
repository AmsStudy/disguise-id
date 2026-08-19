'use client';

import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { GlassCard } from '@/components/ui/GlassCard';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation, faBrain, faArrowRight, faMaskFace } from '@fortawesome/free-solid-svg-icons';

export const AboutSection: React.FC = () => {
  const [ref, inView] = useInView({ threshold: 0.2, triggerOnce: true });

  return (
    <section id="about" style={{ padding: '120px 24px', background: '#0D1B2A', position: 'relative' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }} ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: '64px' }}
        >
          <span style={{ display: 'inline-block', padding: '6px 20px', borderRadius: '999px', background: 'rgba(0, 151, 178, 0.15)', border: '1px solid rgba(0, 151, 178, 0.3)', color: '#00CFE8', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'Inter, sans-serif', marginBottom: '16px' }}>
            Tentang DISGUISE-ID
          </span>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, color: '#E8F4F8' }}>
            Mengenal Identitas di Balik Penyamaran
          </h2>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'start' }} className="about-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <motion.div initial={{ opacity: 0, x: -40 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.6, delay: 0.2 }}>
              <GlassCard glow="teal" style={{ padding: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(255, 61, 61, 0.15)', border: '1px solid rgba(255, 61, 61, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FontAwesomeIcon icon={faTriangleExclamation} style={{ color: '#FF6B35', fontSize: '18px' }} />
                  </div>
                  <h3 style={{ fontFamily: 'Orbitron, monospace', fontSize: '16px', fontWeight: 700, color: '#FF6B35' }}>TANTANGAN</h3>
                </div>
                <p style={{ color: '#8BAFC4', fontSize: '15px', lineHeight: 1.7, fontFamily: 'Inter, sans-serif' }}>
                  Wajah yang tersamar oleh <strong style={{ color: '#E8F4F8' }}>helm, masker, dan topi</strong> menjadi hambatan utama sistem identifikasi konvensional. Kamera CCTV tidak dapat mengenali individu yang sengaja menyamarkan wajahnya, membuat pengawasan keamanan publik menjadi tidak efektif.
                </p>
              </GlassCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: -40 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.6, delay: 0.4 }}>
              <GlassCard glow="cyan" style={{ padding: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(0, 229, 255, 0.15)', border: '1px solid rgba(0, 229, 255, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FontAwesomeIcon icon={faBrain} style={{ color: '#00E5FF', fontSize: '18px' }} />
                  </div>
                  <h3 style={{ fontFamily: 'Orbitron, monospace', fontSize: '16px', fontWeight: 700, color: '#00E5FF' }}>SOLUSI</h3>
                </div>
                <p style={{ color: '#8BAFC4', fontSize: '15px', lineHeight: 1.7, fontFamily: 'Inter, sans-serif' }}>
                  DISGUISE-ID menggabungkan <strong style={{ color: '#E8F4F8' }}>Stage20b De-Disguise Autoencoder</strong> dan <strong style={{ color: '#E8F4F8' }}>InceptionResNet (512-D Embedding)</strong> untuk mengekstrak ciri biometrik wajah yang invarian terhadap penyamaran (masker, kacamata, topi) dan memvalidasinya secara instan melalui database vektor.
                </p>
                <div style={{ marginTop: '20px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {['RetinaFace Edge', 'Stage20b Autoencoder', 'InceptionResNet', 'pgvector HNSW'].map((tech) => (
                    <span key={tech} style={{ padding: '4px 12px', borderRadius: '999px', background: 'rgba(0, 151, 178, 0.15)', border: '1px solid rgba(0, 151, 178, 0.3)', color: '#00CFE8', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}>
                      {tech}
                    </span>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, x: 40 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.6, delay: 0.3 }}>
            <GlassCard style={{ padding: '48px 32px', width: '100%', textAlign: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
                {/* Disguised → Identified visualization */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'linear-gradient(135deg, #1A3350, #0D1B2A)', border: '2px solid rgba(0, 229, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>
                    <FontAwesomeIcon icon={faMaskFace} style={{ fontSize: '36px', color: '#8BAFC4' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: 40, height: 2, background: 'linear-gradient(90deg, #00E5FF, #00E676)', boxShadow: '0 0 8px #00E5FF', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: '-100%', width: '100%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)', animation: 'borderScan 1.5s linear infinite' }} />
                      </div>
                      <FontAwesomeIcon icon={faArrowRight} style={{ color: '#00E676', fontSize: '12px' }} />
                    </div>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#00E676' }}>MATCH</span>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '28px', fontWeight: 700, color: '#00E676', textShadow: '0 0 20px rgba(0, 230, 118, 0.5)' }}>512-D</div>
                    <div style={{ color: '#8BAFC4', fontSize: '13px', marginTop: '4px' }}>Biometric Match</div>
                  </div>
                </div>

                <div style={{ width: '100%', padding: '16px', background: 'rgba(0, 151, 178, 0.08)', borderRadius: '12px', border: '1px solid rgba(0, 151, 178, 0.15)' }}>
                  <div style={{ color: '#4A6B84', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Biometric Distance Metric</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '22px', color: '#00E5FF' }}>Euclidean L2 & Cosine</div>
                  <div style={{ color: '#8BAFC4', fontSize: '12px', marginTop: '4px' }}>Fast Vector Search via pgvector</div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>

      <style>{`@media (max-width: 768px) { .about-grid { grid-template-columns: 1fr !important; } }`}</style>
    </section>
  );
};
