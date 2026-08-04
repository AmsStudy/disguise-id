'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter, faCircleCheck, faCircleXmark, faUser, faTrash, faXmark, faClock, faVideo, faFingerprint, faShieldAlt, faEye } from '@fortawesome/free-solid-svg-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge, DangerBadge } from '@/components/ui/Badge';
import { SimilarityScore } from '@/components/ui/SimilarityScore';
import { Button } from '@/components/ui/Button';
import { formatRelative } from '@/utils/format';
import { alertApi } from '@/services/api';

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  dismissed: 'Dismissed',
};

const AlertDetailModal: React.FC<{
  alert: any;
  onClose: () => void;
  onAction: (id: string, action: 'confirmed' | 'dismissed') => void;
  onDelete: (id: string) => void;
}> = ({ alert, onClose, onAction, onDelete }) => {
  if (!alert) return null;

  const faceCrop = alert.detectionEvent?.faceCropUrl;
  const personPhoto = alert.person?.photoUrl || alert.person?.avatarUrl;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(6, 13, 20, 0.88)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'linear-gradient(135deg, rgba(17, 34, 54, 0.95) 0%, rgba(8, 18, 30, 0.98) 100%)',
            border: `1.5px solid ${alert.priority === 'critical' ? '#FF3D3D' : '#00E5FF'}`,
            boxShadow: alert.priority === 'critical' ? '0 0 40px rgba(255, 61, 61, 0.4), inset 0 0 20px rgba(255, 61, 61, 0.15)' : '0 0 35px rgba(0, 229, 255, 0.35), inset 0 0 15px rgba(0, 229, 255, 0.1)',
            borderRadius: '24px',
            padding: '28px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '92vh',
            overflowY: 'auto',
            position: 'relative'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', borderBottom: '1px solid rgba(0, 229, 255, 0.15)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '10px', background: alert.priority === 'critical' ? 'rgba(255, 61, 61, 0.2)' : 'rgba(0, 229, 255, 0.15)', border: `1px solid ${alert.priority === 'critical' ? '#FF3D3D' : '#00CFE8'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: alert.priority === 'critical' ? '#FF3D3D' : '#00E5FF', fontSize: '18px' }}>
                <FontAwesomeIcon icon={faFingerprint} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '16px', fontWeight: 700, color: '#E8F4F8', letterSpacing: '1px' }}>
                    FORENSIC DETAILED RECORD
                  </h2>
                  <Badge variant={alert.status === 'confirmed' ? 'online' : alert.status === 'dismissed' ? 'default' : 'high'}>
                    {statusLabels[alert.status] || alert.status.toUpperCase()}
                  </Badge>
                </div>
                <p style={{ color: '#8BAFC4', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', marginTop: '2px' }}>
                  ID: #{alert.id}
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label="Tutup Detail" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', width: 36, height: 36, borderRadius: '50%', color: '#8BAFC4', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
              <FontAwesomeIcon icon={faXmark} style={{ fontSize: '16px' }} />
            </button>
          </div>

          {/* Side by Side Biometric Comparison Photo Box */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: 'rgba(10, 22, 36, 0.8)', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '16px', padding: '12px', textAlign: 'center', position: 'relative' }}>
              <div style={{ fontSize: '11px', fontFamily: 'Orbitron, monospace', color: '#00CFE8', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00E676', display: 'inline-block' }} /> Tangkapan CCTV Live
              </div>
              <div style={{ width: '100%', height: '180px', borderRadius: '12px', overflow: 'hidden', background: 'rgba(0,151,178,0.1)', border: '1px solid rgba(0, 151, 178, 0.3)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {faceCrop ? (
                  <img src={faceCrop} alt="Live CCTV Capture" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <FontAwesomeIcon icon={faUser} style={{ fontSize: '48px', color: '#00CFE8', opacity: 0.5 }} />
                )}
                <div style={{ position: 'absolute', left: 0, right: 0, height: '2px', background: alert.priority === 'critical' ? '#FF3D3D' : '#00E5FF', boxShadow: `0 0 12px ${alert.priority === 'critical' ? '#FF3D3D' : '#00E5FF'}`, animation: 'faceScanLaser 2.5s ease-in-out infinite' }} />
              </div>
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#8BAFC4', fontFamily: 'JetBrains Mono, monospace' }}>
                {alert.detectionEvent?.source?.name || 'Kamera Utama'}
              </div>
            </div>

            <div style={{ background: 'rgba(10, 22, 36, 0.8)', border: '1px solid rgba(255, 107, 53, 0.2)', borderRadius: '16px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', fontFamily: 'Orbitron, monospace', color: '#FF6B35', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <FontAwesomeIcon icon={faShieldAlt} style={{ color: '#FF6B35' }} /> Foto Database Pengawasan
              </div>
              <div style={{ width: '100%', height: '180px', borderRadius: '12px', overflow: 'hidden', background: 'rgba(255, 107, 53, 0.1)', border: '1px solid rgba(255, 107, 53, 0.3)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {personPhoto ? (
                  <img src={personPhoto} alt="Database Reference" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <FontAwesomeIcon icon={faUser} style={{ fontSize: '44px', color: '#FF6B35', opacity: 0.6 }} />
                    <span style={{ fontSize: '10px', color: '#FF6B35', opacity: 0.8 }}>Foto Daftar Tidak Tersedia</span>
                  </div>
                )}
              </div>
              <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 700, color: '#E8F4F8', fontFamily: 'Inter, sans-serif', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {alert.person?.fullName || 'Target Pengawasan'}
              </div>
            </div>
          </div>

          {/* Biometric Accuracy Banner */}
          <div style={{ background: 'rgba(0, 151, 178, 0.08)', border: '1px dashed rgba(0, 229, 255, 0.25)', borderRadius: '16px', padding: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#8BAFC4', fontFamily: 'Orbitron, monospace', textTransform: 'uppercase' }}>Tingkat Kemiripan Biometrik (AI Score)</div>
              <div style={{ fontSize: '11px', color: '#00E5FF', marginTop: '2px' }}>Dihitung berdasarkan Euclidean Distance vektor wajah</div>
            </div>
            <SimilarityScore score={alert.similarityScore} size="lg" showBar />
          </div>

          {/* Metadata Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '28px', fontSize: '13px' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ color: '#8BAFC4', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FontAwesomeIcon icon={faUser} style={{ color: '#00CFE8' }} /> Nama Subjek Target
              </div>
              <div style={{ color: '#E8F4F8', fontWeight: 700, fontSize: '15px' }}>{alert.person?.fullName || 'Unknown'}</div>
              {alert.person?.aliases?.length > 0 && (
                <div style={{ color: '#00CFE8', fontSize: '12px', marginTop: '2px' }}>Alias: {alert.person.aliases.join(', ')}</div>
              )}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ color: '#8BAFC4', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FontAwesomeIcon icon={faVideo} style={{ color: '#00CFE8' }} /> Sumber Kamera CCTV
              </div>
              <div style={{ color: '#E8F4F8', fontWeight: 600 }}>{alert.detectionEvent?.source?.name || 'Kamera Utama'}</div>
              <div style={{ color: '#8BAFC4', fontSize: '12px', marginTop: '2px' }}>Lokasi: {alert.detectionEvent?.source?.location || 'Area Terawasi'}</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ color: '#8BAFC4', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FontAwesomeIcon icon={faClock} style={{ color: '#00CFE8' }} /> Waktu Deteksi
              </div>
              <div style={{ color: '#E8F4F8', fontWeight: 600 }}>{alert.createdAt ? formatRelative(alert.createdAt) : 'Baru saja'}</div>
              <div style={{ color: '#8BAFC4', fontSize: '11px', marginTop: '2px' }}>{alert.createdAt ? new Date(alert.createdAt).toLocaleString('id-ID') : ''}</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ color: '#8BAFC4', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FontAwesomeIcon icon={faShieldAlt} style={{ color: '#FF3D3D' }} /> Prioritas Ancaman
              </div>
              <div style={{ marginTop: '2px' }}>
                <DangerBadge level={alert.priority} />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', borderTop: '1px solid rgba(0, 229, 255, 0.15)', paddingTop: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '240px' }}>
              {alert.status === 'pending' ? (
                <>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => { onAction(alert.id, 'confirmed'); onClose(); }}
                    fullWidth
                  >
                    <FontAwesomeIcon icon={faCircleCheck} style={{ marginRight: '8px' }} /> Konfirmasi Valid
                  </Button>
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => { onAction(alert.id, 'dismissed'); onClose(); }}
                    fullWidth
                  >
                    <FontAwesomeIcon icon={faCircleXmark} style={{ marginRight: '8px' }} /> Abaikan
                  </Button>
                </>
              ) : (
                <Button variant="secondary" size="md" onClick={onClose} fullWidth>
                  Status: {statusLabels[alert.status] || alert.status.toUpperCase()} (Tutup)
                </Button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="danger"
                size="md"
                onClick={() => { onClose(); onDelete(alert.id); }}
                aria-label="Hapus Alert"
              >
                <FontAwesomeIcon icon={faTrash} style={{ marginRight: '6px' }} /> Hapus Data
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, confirmed: 0, dismissed: 0 });

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await alertApi.list({ 
        status: filterStatus !== 'all' ? filterStatus : undefined,
        priority: filterPriority !== 'all' ? filterPriority : undefined,
        limit: 100
      });
      if (res.data && res.data.data) {
        // Best-Shot promotion: collapse repeated captures of the same suspect within a 10-minute window into their clearest, highest-accuracy photo
        const bestShots = new Map<string, any>();
        res.data.data.forEach((a: any) => {
          const pid = a.person?.id || a.personId || a.id;
          const time = new Date(a.createdAt || Date.now()).getTime();
          const bucketKey = `${pid}_${Math.floor(time / (10 * 60 * 1000))}`; // Group by 10-minute session intervals
          const existing = bestShots.get(bucketKey);
          const aDist = Math.abs(Number(a.similarityScore || 999));
          const existDist = existing ? Math.abs(Number(existing.similarityScore || 999)) : Infinity;
          if (!existing || aDist < existDist) {
            bestShots.set(bucketKey, a);
          }
        });
        const cleanAlerts = Array.from(bestShots.values());
        setAlerts(cleanAlerts);
        
        // Update stats based on fetched data
        if (filterStatus === 'all') {
           const p = cleanAlerts.filter((a: any) => a.status === 'pending').length;
           const c = cleanAlerts.filter((a: any) => a.status === 'confirmed').length;
           const d = cleanAlerts.filter((a: any) => a.status === 'dismissed').length;
           setStats({ pending: p, confirmed: c, dismissed: d });
        }
      }
    } catch (err) {
      console.error('Failed to fetch alerts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [filterStatus, filterPriority]);

  const handleAction = async (id: string, action: 'confirmed' | 'dismissed') => {
    try {
      await alertApi.update(id, { status: action });
      setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, status: action } : a));
      
      // Update stats optimistically
      setStats((prev) => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        [action]: prev[action] + 1
      }));
    } catch (err) {
      console.error('Failed to update alert', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus data alert ini? Tindakan ini tidak dapat dibatkan.')) return;
    try {
      await alertApi.delete(id);
      const targetAlert = alerts.find((a) => a.id === id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));

      if (targetAlert) {
        const st = targetAlert.status as 'pending' | 'confirmed' | 'dismissed';
        if (st && stats[st] !== undefined) {
          setStats((prev) => ({ ...prev, [st]: Math.max(0, prev[st] - 1) }));
        }
      }
    } catch (err) {
      console.error('Failed to delete alert', err);
      alert('Gagal menghapus data alert.');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: '20px', fontWeight: 700, color: '#E8F4F8' }}>Alerts</h1>
        <p style={{ color: '#8BAFC4', fontSize: '13px', marginTop: '4px' }}>Kelola dan tindaklanjuti alert deteksi wajah</p>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { label: 'PENDING', count: stats.pending, color: '#FF6B35' },
          { label: 'CONFIRMED', count: stats.confirmed, color: '#00E676' },
          { label: 'DISMISSED (hari ini)', count: stats.dismissed, color: '#4A6B84' },
        ].map((s) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '20px', fontWeight: 700, color: s.color }}>{s.count}</span>
            <span style={{ fontSize: '12px', color: '#8BAFC4', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <GlassCard style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <FontAwesomeIcon icon={faFilter} style={{ fontSize: '16px', color: '#8BAFC4' }} />
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['all', 'pending', 'confirmed', 'dismissed'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: `1px solid ${filterStatus === s ? '#00E5FF' : 'rgba(0,229,255,0.1)'}`,
                background: filterStatus === s ? 'rgba(0,229,255,0.1)' : 'transparent',
                color: filterStatus === s ? '#00E5FF' : '#8BAFC4',
                cursor: 'pointer',
                fontSize: '13px',
                fontFamily: 'Inter, sans-serif',
                textTransform: 'capitalize',
              }}
            >
              {s === 'all' ? 'Semua' : statusLabels[s]}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['all', 'critical', 'high', 'medium', 'low'].map((p) => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: `1px solid ${filterPriority === p ? '#FF6B35' : 'rgba(0,229,255,0.1)'}`,
                background: filterPriority === p ? 'rgba(255,107,53,0.1)' : 'transparent',
                color: filterPriority === p ? '#FF8C5A' : '#8BAFC4',
                cursor: 'pointer',
                fontSize: '13px',
                fontFamily: 'Inter, sans-serif',
                textTransform: 'capitalize',
              }}
            >
              {p === 'all' ? 'Semua Level' : p}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Alert list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#4A6B84' }}>Memuat data...</div>
        ) : (
          <AnimatePresence>
            {alerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <GlassCard
                  style={{
                    padding: '20px',
                    background: alert.priority === 'critical' ? 'linear-gradient(135deg, rgba(40, 16, 26, 0.85) 0%, rgba(17, 34, 54, 0.9) 100%)' : 'linear-gradient(135deg, rgba(17, 34, 54, 0.8) 0%, rgba(10, 22, 36, 0.9) 100%)',
                    border: `1px solid ${alert.priority === 'critical' ? '#FF3D3D' : alert.status === 'pending' ? '#00E5FF' : 'rgba(0,151,178,0.25)'}`,
                    boxShadow: alert.priority === 'critical' ? '0 0 20px rgba(255, 61, 61, 0.35)' : alert.status === 'pending' ? '0 0 14px rgba(0, 229, 255, 0.25)' : 'none',
                    animation: alert.priority === 'critical' && alert.status === 'pending' ? 'pulseGlow 2s ease-in-out infinite' : undefined,
                  }}
                >
                  <div className="alert-card-container">
                    {/* Left: Badge, Face Crop with Laser Scan, and Target Info */}
                    <div className="alert-card-left">
                      <DangerBadge level={alert.priority} />

                      {/* Forensic Face Crop with Holographic Laser Sweep */}
                      <div
                        style={{
                          width: 54,
                          height: 54,
                          borderRadius: '12px',
                          background: 'rgba(0,151,178,0.15)',
                          border: `1.5px solid ${alert.priority === 'critical' ? '#FF3D3D' : '#00CFE8'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '24px',
                          flexShrink: 0,
                          position: 'relative',
                          overflow: 'hidden',
                          boxShadow: alert.priority === 'critical' ? '0 0 12px rgba(255, 61, 61, 0.4)' : '0 0 10px rgba(0, 207, 232, 0.3)',
                        }}
                      >
                        {alert.detectionEvent?.faceCropUrl ? (
                           <img src={alert.detectionEvent.faceCropUrl} alt="Face" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                           <FontAwesomeIcon icon={faUser} style={{ color: '#00CFE8' }} />
                        )}
                        {/* Active Laser Line */}
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            height: '2px',
                            background: alert.priority === 'critical' ? '#FF3D3D' : '#00E5FF',
                            boxShadow: `0 0 8px ${alert.priority === 'critical' ? '#FF3D3D' : '#00E5FF'}`,
                            animation: 'faceScanLaser 2s ease-in-out infinite',
                          }}
                        />
                      </div>

                      {/* Target Identity Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '15px', color: '#E8F4F8', fontFamily: 'Inter, sans-serif' }}>
                            {alert.person?.fullName || 'Unknown Target'}
                          </span>
                          {alert.person?.aliases?.length > 0 && (
                            <span style={{ color: '#00CFE8', fontSize: '12px', background: 'rgba(0, 229, 255, 0.1)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
                              "{alert.person.aliases[0]}"
                            </span>
                          )}
                          {alert.status === 'pending' && (
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: alert.priority === 'critical' ? '#FF3D3D' : '#00E676', boxShadow: `0 0 8px ${alert.priority === 'critical' ? '#FF3D3D' : '#00E676'}`, display: 'inline-block' }} title="Alert Aktif / Pending" />
                          )}
                        </div>
                        <div style={{ color: '#8BAFC4', fontSize: '13px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#00E5FF', fontWeight: 500 }}>{alert.detectionEvent?.source?.name || 'Kamera CCTV'}</span>
                          <span>·</span>
                          <span>{alert.createdAt ? formatRelative(alert.createdAt) : 'Baru saja'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Center: Forensic Accuracy Score & Status Badge */}
                    <div className="alert-card-center">
                      <SimilarityScore score={alert.similarityScore} size="md" showBar />
                      <Badge variant={alert.status === 'confirmed' ? 'online' : alert.status === 'dismissed' ? 'default' : 'high'}>
                        {statusLabels[alert.status] || alert.status.toUpperCase()}
                      </Badge>
                    </div>

                    {/* Right: Operator Action Buttons */}
                    <div className="alert-card-right">
                      {alert.status === 'pending' && (
                        <>
                          <div style={{ flex: 1, display: 'flex' }}>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleAction(alert.id, 'confirmed')}
                              id={`confirm-${alert.id}`}
                              fullWidth
                            >
                              <FontAwesomeIcon icon={faCircleCheck} style={{ fontSize: '14px', marginRight: '6px' }} /> Konfirmasi
                            </Button>
                          </div>
                          <div style={{ flex: 1, display: 'flex' }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAction(alert.id, 'dismissed')}
                              id={`dismiss-${alert.id}`}
                              fullWidth
                            >
                              <FontAwesomeIcon icon={faCircleXmark} style={{ fontSize: '14px', marginRight: '6px' }} /> Abaikan
                            </Button>
                          </div>
                          <div style={{ display: 'flex', flexShrink: 0 }} title="Detail Biometrik Forensik">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setSelectedAlert(alert)}
                            >
                              <FontAwesomeIcon icon={faEye} style={{ fontSize: '14px', marginRight: '6px' }} /> Detail
                            </Button>
                          </div>
                        </>
                      )}
                      {alert.status !== 'pending' && (
                        <div style={{ flex: 1, display: 'flex' }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            fullWidth
                            onClick={() => setSelectedAlert(alert)}
                          >
                            <FontAwesomeIcon icon={faEye} style={{ fontSize: '14px', marginRight: '6px' }} /> Detail Riwayat
                          </Button>
                        </div>
                      )}
                      <div style={{ display: 'flex', flexShrink: 0 }}>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(alert.id)}
                          id={`delete-${alert.id}`}
                          aria-label="Hapus Alert"
                        >
                          <FontAwesomeIcon icon={faTrash} style={{ fontSize: '14px' }} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        {!loading && alerts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#4A6B84', fontFamily: 'Inter, sans-serif', border: '1px dashed rgba(0, 151, 178, 0.2)', borderRadius: '16px' }}>
            <FontAwesomeIcon icon={faUser} style={{ fontSize: '32px', color: 'rgba(0, 229, 255, 0.3)', marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
            Tidak ada data deteksi alert yang cocok dengan filter
          </div>
        )}
      </div>

      {/* Render Forensic Biometric Alert Detail Modal */}
      {selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onAction={(id, act) => {
            handleAction(id, act);
            setSelectedAlert(null);
          }}
          onDelete={(id) => {
            handleDelete(id);
            setSelectedAlert(null);
          }}
        />
      )}

      <style>{`
        @keyframes faceScanLaser {
          0% { top: 0%; opacity: 0.7; }
          50% { top: 88%; opacity: 1; }
          100% { top: 0%; opacity: 0.7; }
        }
        .alert-card-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
        }
        .alert-card-left {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1;
          min-width: 260px;
        }
        .alert-card-center {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-shrink: 0;
        }
        .alert-card-right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        @media (max-width: 820px) {
          .alert-card-container {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 16px !important;
          }
          .alert-card-left {
            width: 100% !important;
            min-width: 0 !important;
          }
          .alert-card-center {
            width: 100% !important;
            justify-content: space-between !important;
            background: rgba(0, 151, 178, 0.05) !important;
            padding: 12px 16px !important;
            border-radius: 10px !important;
            border: 1px dashed rgba(0, 229, 255, 0.18) !important;
          }
          .alert-card-right {
            width: 100% !important;
            display: flex !important;
            gap: 12px !important;
          }
          .alert-card-right > button {
            flex: 1 !important;
            justify-content: center !important;
            padding: 10px !important;
          }
        }
      `}</style>
    </div>
  );
}
