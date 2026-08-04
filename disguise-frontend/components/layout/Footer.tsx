'use client';

import Image from 'next/image';

export const Footer: React.FC = () => {
  return (
    <footer
      style={{
        background: '#060D14',
        borderTop: '1px solid rgba(0, 151, 178, 0.2)',
        padding: '40px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle grid bg */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(0, 151, 178, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 151, 178, 0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
          position: 'relative',
        }}
      >
        {/* Logo + Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Image
            src="/assets/logo.png"
            alt="DISGUISE-ID Logo"
            width={48}
            height={48}
            style={{ objectFit: 'contain' }}
          />
          <div>
            <div
              style={{
                fontFamily: 'Orbitron, monospace',
                fontSize: '20px',
                fontWeight: 700,
                color: '#E8F4F8',
              }}
            >
              DISGUISE<span style={{ color: '#00E5FF' }}>-ID</span>
            </div>
            <div style={{ color: '#8BAFC4', fontSize: '13px', marginTop: '4px' }}>
              Sistem Verifikasi Wajah Berbasis AI untuk Keamanan Publik
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div
          style={{
            color: '#4A6B84',
            fontSize: '13px',
            fontFamily: 'Inter, sans-serif',
            textAlign: 'right',
          }}
          className="footer-copy"
        >
          <div>© 2026 Tim PKM DISGUISE-ID</div>
          <div style={{ marginTop: '4px', color: '#00CFE8', fontSize: '12px' }}>
            AI · Security · Innovation
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 600px) {
          footer > div { flex-direction: column !important; align-items: flex-start !important; gap: 20px !important; }
          .footer-copy { text-align: left !important; width: 100% !important; }
        }
      `}</style>
    </footer>
  );
};
