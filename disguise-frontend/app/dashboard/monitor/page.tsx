'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faRotateRight, faExpand, faVideo, faSatelliteDish, faWrench, faUser, faXmark, faPen, faTrash } from '@fortawesome/free-solid-svg-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusDot } from '@/components/ui/StatusDot';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cameraApi, systemApi } from '@/services/api';
import type { Camera } from '@/types';
import LiveCamera from '@/components/LiveCamera';

const emptyCamera: Camera = {
  id: '',
  name: '',
  status: 'offline',
  location: '',
};

export default function MonitorPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editCameraId, setEditCameraId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [systemHealth, setSystemHealth] = useState<{ available: boolean; reason: string } | null>(null);
  const [generatedApiKey, setGeneratedApiKey] = useState<{ id: string, key: string } | null>(null);

  const [name, setName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [streamUrl, setStreamUrl] = useState('');

  const selected = useMemo(
    () => cameras.find((cam) => cam.id === selectedCameraId) || cameras[0] || null,
    [cameras, selectedCameraId]
  );

  const fetchPreview = async (cameraId: string) => {
    setLoadingPreview(true);
    try {
      const response = await cameraApi.preview(cameraId);
      const imageBlob = response.data as Blob;
      const url = URL.createObjectURL(imageBlob);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (err) {
      setPreviewUrl(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    if (!selected) {
      setPreviewUrl(null);
      return;
    }

    fetchPreview(selected.id);
    const fetchHealth = async () => {
      try {
        const [resCamera, resSystem] = await Promise.all([
          cameraApi.getHealth(selected.id),
          systemApi.getMediaMtxHealth()
        ]);
        setHealthData(resCamera.data.data);
        if (resSystem.data.data.preview.available === false) {
           // We can store this in a state or just use it
           setSystemHealth(resSystem.data.data.preview);
        } else {
           setSystemHealth({ available: true, reason: 'OK' });
        }
      } catch (err) {
        setHealthData(null);
      }
    };
    fetchHealth();

    const interval = setInterval(() => {
      fetchPreview(selected.id);
      fetchHealth();
    }, 10000);
    return () => {
      clearInterval(interval);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [selected]);

  const fetchCameras = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const response = await cameraApi.list();
      const cameraData = (response.data.data as any[]).map((cam) => ({
        ...cam,
        location: cam.location ?? cam.locationName ?? 'Tidak diketahui',
        alertCount: cam.alerts_today ?? 0,
      })) as Camera[];
      setCameras(cameraData);
      if (!selectedCameraId && cameraData.length > 0) {
        setSelectedCameraId(cameraData[0].id);
      }
    } catch (error) {
      setErrorMessage('Gagal memuat daftar kamera.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setLocationName('');
    setLatitude('');
    setLongitude('');
    setIpAddress('');
    setUsername('');
    setPassword('');
    setStreamUrl('');
    setEditCameraId(null);
  };

  const handleSaveCamera = async () => {
    setSaving(true);
    setErrorMessage('');
    try {
      const payload = {
        name,
        location_name: locationName || undefined,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
      };

      if (editCameraId) {
        await cameraApi.update(editCameraId, payload);
      } else {
        const res = await cameraApi.create(payload);
        if (res.data?.data?.api_key) {
          setGeneratedApiKey({ id: res.data.data.id, key: res.data.data.api_key });
        }
      }
      resetForm();
      setIsModalOpen(false);
      fetchCameras();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error?.message || 'Gagal menyimpan data.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = async (camera: Camera) => {
    if (confirm(`Apakah Anda yakin ingin menghapus kamera ${camera.name}?`)) {
      try {
        await cameraApi.delete(camera.id);
        if (selectedCameraId === camera.id) {
          setSelectedCameraId(null);
        }
        fetchCameras();
      } catch (err: any) {
        alert(err.response?.data?.error?.message || 'Gagal menghapus kamera.');
      }
    }
  };

  const handleEditClick = (cam: Camera) => {
    setEditCameraId(cam.id);
    setName(cam.name || '');
    setLocationName(cam.location || '');
    setLatitude(cam.latitude !== null && cam.latitude !== undefined ? String(cam.latitude) : '');
    setLongitude(cam.longitude !== null && cam.longitude !== undefined ? String(cam.longitude) : '');
    setIpAddress(cam.ipAddress || '');
    setUsername(cam.username || '');
    setPassword((cam as any).password || '');
    setStreamUrl(cam.streamUrl || '');
    setIsModalOpen(true);
  };

  useEffect(() => {
    fetchCameras();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: '20px', fontWeight: 700, color: '#E8F4F8' }}>Live Monitor</h1>
          <p style={{ color: '#8BAFC4', fontSize: '13px', marginTop: '4px' }}>Tambah dan pantau kamera CCTV langsung dari panel ini.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="secondary" size="md" onClick={fetchCameras} disabled={loading}>
            {loading ? 'Memuat...' : 'Muat Ulang Kamera'}
          </Button>
          <Button variant="fox" size="md" onClick={() => setIsModalOpen(true)}>
            <FontAwesomeIcon icon={faPlus} /> Tambah Monitor
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div style={{ marginBottom: '16px', color: '#FF6B35', fontWeight: 600 }}>{errorMessage}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }} className="camera-grid">
        {cameras.map((cam) => (
          <motion.div key={cam.id} whileHover={{ scale: 1.02 }} transition={{ duration: 0.15 }}>
            <GlassCard
              style={{
                padding: '16px',
                cursor: 'pointer',
                borderColor: selected?.id === cam.id ? '#00E5FF' : undefined,
                boxShadow: selected?.id === cam.id ? '0 0 20px rgba(0,229,255,0.3)' : undefined,
              }}
              onClick={() => setSelectedCameraId(cam.id)}
            >
              <div
                style={{
                  width: '100%',
                  aspectRatio: '16/9',
                  background: cam.status === 'offline'
                    ? 'repeating-linear-gradient(45deg, #060D14, #060D14 10px, #0D1B2A 10px, #0D1B2A 20px)'
                    : 'linear-gradient(135deg, #0D1B2A, #112236)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '1px solid rgba(0,229,255,0.08)',
                }}
              >
                {cam.status === 'online' ? (
                  <>
                    <div style={{ fontSize: '36px', opacity: 0.3, color: '#E8F4F8' }}><FontAwesomeIcon icon={faVideo} /></div>
                    {cam.alertCount && cam.alertCount > 0 && (
                      <div style={{ position: 'absolute', inset: 0, border: '2px solid #FF6B35', borderRadius: '10px', animation: 'pulseGlow 1.5s ease-in-out infinite' }} />
                    )}
                    <div style={{ position: 'absolute', top: 8, right: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,230,118,0.2)', border: '1px solid rgba(0,230,118,0.3)', borderRadius: '4px', padding: '2px 8px', fontSize: '10px', color: '#00E676', fontFamily: 'JetBrains Mono, monospace' }}>
                        ● LIVE
                      </div>
                    </div>
                  </>
                ) : cam.status === 'offline' ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', marginBottom: '4px', color: '#FF3D3D' }}><FontAwesomeIcon icon={faSatelliteDish} /></div>
                    <div style={{ fontSize: '11px', color: '#FF3D3D', fontFamily: 'Inter, sans-serif' }}>NO SIGNAL</div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', marginBottom: '4px', color: '#FFD600' }}><FontAwesomeIcon icon={faWrench} /></div>
                    <div style={{ fontSize: '11px', color: '#FFD600', fontFamily: 'Inter, sans-serif' }}>MAINTENANCE</div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#E8F4F8', fontFamily: 'Inter, sans-serif' }}>{cam.name}</div>
                  <div style={{ fontSize: '11px', color: '#4A6B84', marginTop: '2px' }}>{cam.location}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <StatusDot status={cam.status} showLabel />
                  {cam.alertCount ? <Badge variant="high">{cam.alertCount} alert</Badge> : null}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <GlassCard style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '15px', fontWeight: 600, color: '#E8F4F8' }}>
              LIVE FEED: {selected?.name ?? 'Pilih kamera'}
            </h2>
            <div style={{ color: '#4A6B84', fontSize: '12px', marginTop: '4px' }}>{selected?.location ?? 'Tidak ada kamera terpilih'}</div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {selected ? <StatusDot status={selected.status} showLabel /> : null}
            {selected ? (
              <>
                <button
                  type="button"
                  onClick={() => handleEditClick(selected)}
                  style={{ background: 'rgba(255,214,0,0.12)', border: '1px solid rgba(255,214,0,0.2)', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', color: '#FFD600', fontSize: '12px' }}
                >
                  <FontAwesomeIcon icon={faPen} style={{ marginRight: '6px' }} /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteClick(selected)}
                  style={{ background: 'rgba(255,51,51,0.12)', border: '1px solid rgba(255,51,51,0.2)', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', color: '#FF3333', fontSize: '12px' }}
                >
                  <FontAwesomeIcon icon={faTrash} style={{ marginRight: '6px' }} /> Hapus
                </button>
                <button
                  type="button"
                  onClick={async () => {
                  setTestingConnection(true);
                  setConnectionMessage('');
                  try {
                    const response = await cameraApi.testConnection(selected.id);
                    setConnectionMessage(response.data.data.message || 'Koneksi RTSP berhasil.');
                  } catch (err) {
                    setConnectionMessage('Gagal terhubung ke kamera. Pastikan URL dan kredensial benar.');
                  } finally {
                    setTestingConnection(false);
                  }
                }}
                style={{ background: 'rgba(0,229,255,0.12)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', color: '#E8F4F8', fontSize: '12px' }}
                disabled={testingConnection}
              >
                {testingConnection ? 'Memeriksa...' : 'Test Connection'}
              </button>
              </>
            ) : null}
            <button
              aria-label="Fullscreen"
              style={{ background: 'none', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#8BAFC4' }}
            >
              <FontAwesomeIcon icon={faExpand} style={{ fontSize: '16px' }} />
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }} className="feed-grid">
          <div
            style={{
              aspectRatio: '16/9',
              background: 'linear-gradient(135deg, #060D14, #0D1B2A)',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid rgba(0,229,255,0.1)',
            }}
          >
            {systemHealth?.available === false ? (
              <>
                <div style={{ fontSize: '64px', opacity: 0.15, color: '#FF3D3D' }}><FontAwesomeIcon icon={faVideo} /></div>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ color: '#FF3D3D', fontSize: '14px', fontFamily: 'Inter, sans-serif', textAlign: 'center', fontWeight: 'bold' }}>
                    <div>Preview Unavailable</div>
                    <div style={{ fontSize: '12px', marginTop: '4px', color: '#A5F3FC', fontFamily: 'JetBrains Mono, monospace' }}>
                      {systemHealth.reason}
                    </div>
                  </div>
                </div>
              </>
            ) : selected?.status === 'online' ? (
              <LiveCamera cameraId={selected.id} />
            ) : previewUrl ? (
              <img src={previewUrl} alt="Live feed preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <>
                <div style={{ fontSize: '64px', opacity: 0.15, color: '#E8F4F8' }}><FontAwesomeIcon icon={faVideo} /></div>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ color: '#4A6B84', fontSize: '14px', fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>
                    <div>{loadingPreview ? 'Memuat live feed...' : 'Live feed stream'}</div>
                    <div style={{ fontSize: '12px', marginTop: '4px', color: '#00CFE8', fontFamily: 'JetBrains Mono, monospace' }}>
                      {selected ? `ws://camera/${selected.id}/stream` : 'ws://camera/{id}/stream'}
                    </div>
                  </div>
                </div>
              </>
            )}
            {selected?.status === 'online' && (
              <>
                <div style={{ position: 'absolute', top: 12, left: 12, width: 20, height: 20, borderTop: '2px solid #00E5FF', borderLeft: '2px solid #00E5FF' }} />
                <div style={{ position: 'absolute', top: 12, right: 12, width: 20, height: 20, borderTop: '2px solid #00E5FF', borderRight: '2px solid #00E5FF' }} />
                <div style={{ position: 'absolute', bottom: 12, left: 12, width: 20, height: 20, borderBottom: '2px solid #00E5FF', borderLeft: '2px solid #00E5FF' }} />
                <div style={{ position: 'absolute', bottom: 12, right: 12, width: 20, height: 20, borderBottom: '2px solid #00E5FF', borderRight: '2px solid #00E5FF' }} />
              </>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '12px', color: '#4A6B84', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'Inter, sans-serif' }}>
              Informasi Kamera
            </div>
            {selected ? (
              <div style={{ padding: '16px', background: 'rgba(17, 34, 54, 0.85)', border: '1px solid rgba(0,229,255,0.08)', borderRadius: '12px' }}>
                <div style={{ fontSize: '13px', color: '#8BAFC4', marginBottom: '10px' }}>Stream URL</div>
                <div style={{ fontSize: '14px', color: '#E8F4F8', wordBreak: 'break-all', marginBottom: '16px' }}>{selected.streamUrl || 'Tidak tersedia'}</div>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '12px 0' }} />
                <div style={{ fontSize: '12px', color: '#00E5FF', fontWeight: 600, marginBottom: '12px' }}>Status Operasional</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#8BAFC4' }}>FPS Saat Ini</div>
                    <div style={{ fontSize: '14px', color: '#E8F4F8', fontFamily: 'JetBrains Mono, monospace' }}>{healthData?.operational?.currentFps || 0} fps</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#8BAFC4' }}>Dropped Frames</div>
                    <div style={{ fontSize: '14px', color: '#FF6B35', fontFamily: 'JetBrains Mono, monospace' }}>{healthData?.operational?.droppedFrames || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#8BAFC4' }}>Queue Backlog</div>
                    <div style={{ fontSize: '14px', color: '#E8F4F8', fontFamily: 'JetBrains Mono, monospace' }}>{healthData?.operational?.queueBacklog || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#8BAFC4' }}>Failures (Consecutive)</div>
                    <div style={{ fontSize: '14px', color: '#E8F4F8', fontFamily: 'JetBrains Mono, monospace' }}>{healthData?.operational?.consecutiveFailures || 0}</div>
                  </div>
                </div>

                <div style={{ marginTop: '16px', fontSize: '11px', color: '#4A6B84' }}>
                  Last Heartbeat: {healthData?.operational?.agentHeartbeatAt ? new Date(healthData.operational.agentHeartbeatAt).toLocaleTimeString() : 'N/A'}
                </div>
                {healthData?.operational?.lastErrorCode && (
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#FF3D3D' }}>
                    Error: {healthData.operational.lastErrorCode}
                  </div>
                )}
                {connectionMessage && (
                  <div style={{ marginTop: '12px', fontSize: '12px', color: '#A5F3FC' }}>{connectionMessage}</div>
                )}
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: '#4A6B84', fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>
                Pilih kamera untuk melihat detail.
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(6, 13, 20, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ background: '#112236', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '18px', fontWeight: 700, color: '#E8F4F8' }}>{editCameraId ? 'Edit Edge Device' : 'Register Edge Device (Raspi)'}</h2>
                  <p style={{ color: '#8BAFC4', fontSize: '13px', marginTop: '4px' }}>Daftarkan titik Edge Device baru untuk pengiriman data.</p>
                </div>
                <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} aria-label="Tutup" style={{ background: 'none', border: 'none', color: '#8BAFC4', cursor: 'pointer' }}>
                  <FontAwesomeIcon icon={faXmark} style={{ fontSize: '20px' }} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <Input label="Nama Titik (Kamera)" value={name} onChange={(e) => setName(e.target.value)} placeholder="Pintu Masuk Utama" />
                <Input label="Lokasi" value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="Lobby A" />
                <Input label="Latitude (Opsional)" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="-6.200000" />
                <Input label="Longitude (Opsional)" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="106.816666" />
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Button variant="ghost" size="md" onClick={() => { setIsModalOpen(false); resetForm(); }}>Batal</Button>
                <Button variant="fox" size="md" loading={saving} onClick={handleSaveCamera}>{saving ? 'Menyimpan...' : (editCameraId ? 'Simpan Perubahan' : 'Simpan Monitor')}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {generatedApiKey && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(6, 13, 20, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '24px' }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: '#112236', border: '1px solid #00E676', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '500px' }}
            >
              <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '20px', fontWeight: 700, color: '#00E676', marginBottom: '8px' }}>Pendaftaran Berhasil!</h2>
              <p style={{ color: '#E8F4F8', fontSize: '14px', marginBottom: '24px' }}>
                Edge Device berhasil terdaftar. Segera salin kredensial di bawah ini dan masukkan ke file <code style={{ color: '#00E5FF' }}>.env</code> pada Raspberry Pi Anda.
                <br /><br />
                <strong style={{ color: '#FF6B35' }}>Penting:</strong> API Key ini hanya ditampilkan satu kali ini saja demi keamanan!
              </p>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#8BAFC4', marginBottom: '4px' }}>CAMERA_ID</div>
                  <div style={{ fontSize: '14px', color: '#00E5FF', fontFamily: 'JetBrains Mono, monospace', userSelect: 'all', background: 'rgba(0,229,255,0.05)', padding: '8px', borderRadius: '6px' }}>
                    {generatedApiKey.id}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#8BAFC4', marginBottom: '4px' }}>API_KEY</div>
                  <div style={{ fontSize: '14px', color: '#00E5FF', fontFamily: 'JetBrains Mono, monospace', userSelect: 'all', background: 'rgba(0,229,255,0.05)', padding: '8px', borderRadius: '6px' }}>
                    {generatedApiKey.key}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="fox" size="md" onClick={() => setGeneratedApiKey(null)}>Saya Sudah Menyalinnya</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 1024px) {
          .camera-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .feed-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .camera-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
