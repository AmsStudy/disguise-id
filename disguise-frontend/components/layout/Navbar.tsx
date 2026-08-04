'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faXmark, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@/components/ui/Button';

const navItems = [
  { label: 'Beranda', href: '#hero' },
  { label: 'Tentang', href: '#about' },
  { label: 'Fitur', href: '#features' },
  { label: 'Cara Kerja', href: '#how-it-works' },
  { label: 'Tim', href: '#team' },
];

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      const sections = navItems.map((item) => item.href.slice(1));
      for (const section of [...sections].reverse()) {
        const el = document.getElementById(section);
        if (el && window.scrollY >= el.offsetTop - 120) {
          setActiveSection(section);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    const id = href.slice(1);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          transition: 'all 0.3s ease',
          background: scrolled ? 'rgba(13, 27, 42, 0.92)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(0, 229, 255, 0.1)' : '1px solid transparent',
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '0 24px',
            height: '72px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <Image src="/assets/logo.png" alt="DISGUISE-ID Logo" width={40} height={40} style={{ objectFit: 'contain' }} />
            <span style={{ fontFamily: 'Orbitron, monospace', fontSize: '18px', fontWeight: 700, color: '#E8F4F8', letterSpacing: '0.05em' }}>
              DISGUISE<span style={{ color: '#00E5FF' }}>-ID</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="hidden-mobile">
            {navItems.map((item) => {
              const isActive = activeSection === item.href.slice(1);
              return (
                <button
                  key={item.href}
                  onClick={() => handleNavClick(item.href)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '8px 16px',
                    color: isActive ? '#00E5FF' : '#8BAFC4',
                    fontFamily: 'Inter, sans-serif', fontSize: '14px',
                    fontWeight: isActive ? 600 : 400,
                    transition: 'color 0.2s ease', position: 'relative',
                  }}
                >
                  {item.label}
                  {isActive && (
                    <motion.div
                      layoutId="nav-underline"
                      style={{
                        position: 'absolute', bottom: 0, left: '16px', right: '16px',
                        height: '2px', background: '#00E5FF', boxShadow: '0 0 8px #00E5FF', borderRadius: '1px',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link href="/login" className="hidden-mobile">
              <Button variant="fox" size="md" id="nav-login-btn">
                Masuk <FontAwesomeIcon icon={faArrowRight} style={{ marginLeft: '6px' }} />
              </Button>
            </Link>
            <button
              aria-label="Toggle mobile menu"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="show-mobile"
              style={{
                background: 'none', border: '1px solid rgba(0, 229, 255, 0.2)',
                borderRadius: '8px', padding: '8px 10px', cursor: 'pointer',
                color: '#00CFE8', display: 'none',
              }}
            >
              <FontAwesomeIcon icon={mobileOpen ? faXmark : faBars} style={{ fontSize: '18px' }} />
            </button>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed', top: '72px', left: 0, right: 0, zIndex: 999,
              background: 'rgba(13, 27, 42, 0.98)', backdropFilter: 'blur(20px)',
              borderBottom: '1px solid rgba(0, 229, 255, 0.15)', padding: '16px 24px 24px',
            }}
          >
            {navItems.map((item) => (
              <button
                key={item.href}
                onClick={() => handleNavClick(item.href)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '14px 0',
                  color: activeSection === item.href.slice(1) ? '#00E5FF' : '#8BAFC4',
                  fontFamily: 'Inter, sans-serif', fontSize: '16px', fontWeight: 500,
                  borderBottom: '1px solid rgba(0, 229, 255, 0.08)',
                }}
              >
                {item.label}
              </button>
            ))}
            <div style={{ marginTop: '16px' }}>
              <Link href="/login">
                <Button variant="fox" size="lg" fullWidth>Masuk</Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
      `}</style>
    </>
  );
};
