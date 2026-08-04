'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash, faEnvelope, faLock, faCircleExclamation } from '@fortawesome/free-solid-svg-icons';
import { FaceScanRing } from '@/components/face-scan-ring/FaceScanRing';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, user } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'match' | 'no-match'>('idle');

  useEffect(() => {
    if (user) {
      const hasCookie = document.cookie.includes('auth-token=');
      if (hasCookie) {
        router.push('/dashboard');
      } else {
        useAuthStore.getState().logout();
      }
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setScanStatus('scanning');

    try {
      await login(email, password);
      setScanStatus('match');
      setTimeout(() => router.push('/dashboard'), 1000);
    } catch (err: unknown) {
      setScanStatus('no-match');
      const msg = err instanceof Error ? err.message : 'Email atau password salah';
      setError(msg);
      setTimeout(() => setScanStatus('idle'), 2000);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0D1B2A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background grid */}
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
      {/* Glow center */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,151,178,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
        style={{
          width: '100%',
          maxWidth: '460px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Logo + FaceScanRing */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'inline-block', marginBottom: '16px' }}>
            <FaceScanRing size={120} isScanning matchStatus={scanStatus}>
              <Image
                src="/assets/logo.png"
                alt="DISGUISE-ID"
                width={60}
                height={60}
                style={{ objectFit: 'contain', width: 'auto', height: 'auto' }}
              />
            </FaceScanRing>
          </div>

          <h1
            style={{
              fontFamily: 'Orbitron, monospace',
              fontSize: '24px',
              fontWeight: 800,
              color: '#E8F4F8',
              marginBottom: '8px',
            }}
          >
            DISGUISE<span style={{ color: '#00E5FF' }}>-ID</span>
          </h1>
          <p style={{ color: '#8BAFC4', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>
            Masuk ke Dashboard Keamanan
          </p>
        </div>

        {/* Form card */}
        <div
          style={{
            background: 'rgba(17, 34, 54, 0.60)',
            border: '1px solid rgba(0, 229, 255, 0.15)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '40px',
          }}
        >
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <Input
                id="login-email"
                type="email"
                label="Email"
                placeholder="admin@polda.go.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<FontAwesomeIcon icon={faEnvelope} style={{ fontSize: '16px' }} />}
                required
                autoComplete="email"
              />

              <div style={{ position: 'relative' }}>
                <Input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  label="Password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<FontAwesomeIcon icon={faLock} style={{ fontSize: '16px' }} />}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    bottom: '10px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#4A6B84',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showPass ? <FontAwesomeIcon icon={faEyeSlash} style={{ fontSize: '16px' }} /> : <FontAwesomeIcon icon={faEye} style={{ fontSize: '16px' }} />}
                </button>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 16px',
                    background: 'rgba(255, 61, 61, 0.1)',
                    border: '1px solid rgba(255, 61, 61, 0.25)',
                    borderRadius: '12px',
                    color: '#FF3D3D',
                    fontSize: '14px',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  <FontAwesomeIcon icon={faCircleExclamation} style={{ fontSize: '16px' }} />
                  {error}
                </motion.div>
              )}

              <Button
                type="submit"
                variant="fox"
                size="lg"
                fullWidth
                loading={isLoading}
                id="login-submit-btn"
              >
                {scanStatus === 'scanning' ? 'Memverifikasi...' : scanStatus === 'match' ? 'Terverifikasi' : 'Masuk ke Dashboard'}
              </Button>
            </div>
          </form>

          {/* Demo credentials */}
          <div
            style={{
              marginTop: '28px',
              padding: '16px',
              background: 'rgba(0, 151, 178, 0.06)',
              border: '1px solid rgba(0, 151, 178, 0.15)',
              borderRadius: '12px',
            }}
          >
            <div style={{ fontSize: '11px', color: '#4A6B84', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px', fontFamily: 'Inter, sans-serif' }}>
              Demo Credentials
            </div>
            {[
              { role: 'Admin', email: 'admin@polda.go.id', password: 'Admin123!' },
              { role: 'Operator', email: 'operator@polda.go.id', password: 'Operator123!' },
            ].map((cred) => (
              <button
                key={cred.role}
                type="button"
                onClick={() => {
                  setEmail(cred.email);
                  setPassword(cred.password);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 0',
                  color: '#00CFE8',
                  fontSize: '12px',
                  fontFamily: 'JetBrains Mono, monospace',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#00E5FF')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#00CFE8')}
              >
                {cred.role}: {cred.email}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
