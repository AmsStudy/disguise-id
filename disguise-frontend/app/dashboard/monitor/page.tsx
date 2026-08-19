'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faExpand, faVideo, faSatelliteDish, faWrench, faXmark, faPen, faTrash, faInfoCircle, faCamera, faRotateRight, faServer } from '@fortawesome/free-solid-svg-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusDot } from '@/components/ui/StatusDot';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cameraApi, systemApi } from '@/services/api';
import type { Camera } from '@/types';
import LiveCamera from '@/components/LiveCamera';

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
  const [showInfoPanel, setShowInfoPanel] = useState(false);

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
    <div className="flex flex-col gap-6 h-full w-full max-w-[1920px] mx-auto">
      {/* Refined Header Section: Removed redundant H1 title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-black/20 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#00E5FF]/10 flex items-center justify-center border border-[#00E5FF]/30">
            <FontAwesomeIcon icon={faServer} className="text-[#00E5FF]" />
          </div>
          <div>
            <p className="text-[#8BAFC4] text-sm leading-tight">Edge Infrastructure</p>
            <h2 className="text-[#E8F4F8] font-bold text-lg leading-tight">Command Center</h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" size="md" onClick={fetchCameras} disabled={loading} className="bg-black/40 hover:bg-black/60 border-white/10">
            {loading ? 'Memuat...' : 'Refresh Network'}
          </Button>
          <Button variant="fox" size="md" onClick={() => setIsModalOpen(true)} className="shadow-[0_0_15px_rgba(255,107,53,0.3)]">
            <FontAwesomeIcon icon={faPlus} className="mr-2" /> Register Device
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="text-[#FF6B35] font-semibold shrink-0 bg-[#FF6B35]/10 p-3 rounded-lg border border-[#FF6B35]/30">
          {errorMessage}
        </div>
      )}

      {/* Main Layout: Fixed Flex heights for true responsiveness */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-[600px] lg:min-h-0">

        {/* Sidebar: Camera List */}
        <div className="w-full lg:w-[320px] xl:w-[360px] shrink-0 flex flex-col">
          <GlassCard className="flex-1 flex flex-col overflow-hidden !p-0 border-[#00E5FF]/30 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            <div className="bg-gradient-to-b from-white/5 to-transparent border-b border-white/10 px-8 py-6 shrink-0 flex items-center justify-between">
              <h2 className="font-orbitron text-sm font-bold text-[#00E5FF] tracking-wider uppercase flex items-center">
                <FontAwesomeIcon icon={faCamera} className="mr-3 text-[#E8F4F8]" /> Daftar Kamera
              </h2>
              <Badge variant="info" className="!bg-[#00E5FF]/10 !text-[#00E5FF] !border-[#00E5FF]/30">{cameras.length}</Badge>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-black/10">
              {cameras.map((cam) => (
                <motion.div
                  key={cam.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedCameraId(cam.id)}
                  className={`p-4 rounded-xl cursor-pointer border transition-all duration-200 flex items-center justify-between group relative overflow-hidden ${selected?.id === cam.id
                    ? 'bg-gradient-to-r from-[#00E5FF]/20 to-[#00E5FF]/5 border-[#00E5FF]/50 shadow-[inset_4px_0_0_#00E5FF]'
                    : 'bg-black/20 border-white/5 hover:border-[#00E5FF]/30 hover:bg-black/40'
                    }`}
                >
                  {/* Subtle active glow */}
                  {selected?.id === cam.id && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#00E5FF]/10 blur-3xl rounded-full pointer-events-none" />
                  )}

                  <div className="flex items-center gap-4 truncate relative z-10">
                    <div className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center border ${cam.status === 'online' ? 'bg-[#00E676]/10 border-[#00E676]/30 text-[#00E676]' :
                      cam.status === 'offline' ? 'bg-[#FF3D3D]/10 border-[#FF3D3D]/30 text-[#FF3D3D]' :
                        'bg-[#FFD600]/10 border-[#FFD600]/30 text-[#FFD600]'
                      }`}>
                      <FontAwesomeIcon icon={cam.status === 'online' ? faVideo : cam.status === 'offline' ? faSatelliteDish : faWrench} className="text-[15px]" />
                    </div>
                    <div className="truncate">
                      <h3 className="text-[15px] font-semibold text-[#E8F4F8] truncate font-inter">{cam.name}</h3>
                      <p className="text-xs text-[#8BAFC4] truncate mt-1 flex items-center gap-1.5">
                        <StatusDot status={cam.status} /> {cam.location}
                      </p>
                    </div>
                  </div>
                  {cam.alertCount ? (
                    <Badge variant="high" className="!px-2 !py-1 !text-xs relative z-10">{cam.alertCount}</Badge>
                  ) : null}
                </motion.div>
              ))}
              {cameras.length === 0 && !loading && (
                <div className="text-center text-[#8BAFC4] text-sm py-10 flex flex-col items-center">
                  <FontAwesomeIcon icon={faCamera} className="text-4xl text-white/10 mb-3" />
                  Belum ada kamera terdaftar.
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Live Feed Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <GlassCard className="flex-1 flex flex-col relative overflow-hidden group !p-0 border-[#00E5FF]/30 shadow-[0_8px_32px_rgba(0,0,0,0.3)] bg-black/40">
            {/* Feed Header - Transparent to blend with GlassCard */}
            <div className="w-full shrink-0 px-6 py-5 bg-gradient-to-b from-white/10 to-transparent border-b border-white/10 flex flex-col xl:flex-row xl:items-center justify-between gap-4 z-10 backdrop-blur-md">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h2 className="font-orbitron text-2xl font-bold text-white drop-shadow-lg truncate tracking-wide">
                    {selected?.name ?? 'Pilih Kamera'}
                  </h2>
                  {selected && <StatusDot status={selected.status} showLabel />}
                </div>
                <p className="text-[#00E5FF] text-sm mt-1 font-mono truncate tracking-wider opacity-80">{selected?.location ?? ''}</p>
              </div>

              {selected && (
                <div className="flex flex-wrap gap-2 shrink-0 bg-black/30 p-1.5 rounded-xl border border-white/10">
                  <button
                    onClick={() => setShowInfoPanel(!showInfoPanel)}
                    className={`w-10 h-10 rounded-lg backdrop-blur-md transition-all flex items-center justify-center ${showInfoPanel ? 'bg-[#00E5FF] text-black shadow-[0_0_15px_rgba(0,229,255,0.5)]' : 'text-[#8BAFC4] hover:bg-white/10 hover:text-white'}`}
                    title="Telemetri"
                  >
                    <FontAwesomeIcon icon={faInfoCircle} />
                  </button>
                  <div className="w-px h-6 bg-white/10 my-auto mx-1" />
                  <button
                    onClick={() => handleEditClick(selected)}
                    className="w-10 h-10 rounded-lg text-[#8BAFC4] hover:bg-[#FFD600]/20 hover:text-[#FFD600] transition-colors flex items-center justify-center"
                    title="Edit Kamera"
                  >
                    <FontAwesomeIcon icon={faPen} />
                  </button>
                  <button
                    onClick={async () => {
                      setTestingConnection(true);
                      setConnectionMessage('');
                      try {
                        const response = await cameraApi.testConnection(selected.id);
                        setConnectionMessage(response.data.data.message || 'Koneksi RTSP berhasil.');
                        setShowInfoPanel(true);
                      } catch (err) {
                        setConnectionMessage('Gagal terhubung ke kamera.');
                        setShowInfoPanel(true);
                      } finally {
                        setTestingConnection(false);
                      }
                    }}
                    disabled={testingConnection}
                    className="w-10 h-10 rounded-lg text-[#8BAFC4] hover:bg-[#00E5FF]/20 hover:text-[#00E5FF] transition-colors disabled:opacity-50 flex items-center justify-center"
                    title="Test Connection"
                  >
                    <FontAwesomeIcon icon={testingConnection ? faRotateRight : faSatelliteDish} className={testingConnection ? "animate-spin" : ""} />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(selected)}
                    className="w-10 h-10 rounded-lg text-[#8BAFC4] hover:bg-[#FF3D3D]/20 hover:text-[#FF3D3D] transition-colors flex items-center justify-center"
                    title="Hapus Kamera"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                  <div className="w-px h-6 bg-white/10 my-auto mx-1" />
                  <button
                    className="w-10 h-10 rounded-lg text-[#8BAFC4] hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center"
                    title="Fullscreen"
                  >
                    <FontAwesomeIcon icon={faExpand} />
                  </button>
                </div>
              )}
            </div>

            {/* Video Container - Pure black for video player contrast */}
            <div className="flex-1 bg-black flex items-center justify-center relative w-full h-full min-h-[300px]">
              {/* Optional: Subtle grid background when empty */}
              <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02] pointer-events-none" />

              {systemHealth?.available === false ? (
                <div className="flex flex-col items-center p-6 text-center z-10">
                  <FontAwesomeIcon icon={faVideo} className="text-6xl text-[#FF3D3D]/30 mb-4" />
                  <div className="text-[#FF3D3D] text-lg font-bold font-inter">
                    Preview Unavailable
                    <div className="text-sm text-[#A5F3FC] font-mono mt-3 p-3 bg-[#FF3D3D]/10 rounded-lg border border-[#FF3D3D]/30 inline-block">{systemHealth.reason}</div>
                  </div>
                </div>
              ) : selected?.status === 'online' ? (
                <LiveCamera cameraId={selected.id} />
              ) : previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-full h-full object-contain relative z-10" />
              ) : (
                <div className="flex flex-col items-center p-6 text-center z-10">
                  <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10">
                    <FontAwesomeIcon icon={faVideo} className="text-4xl text-white/20" />
                  </div>
                  <div className="text-[#8BAFC4] text-base font-inter mb-2">
                    {loadingPreview ? 'Menyambungkan ke stream...' : (selected ? 'Perangkat sedang offline' : 'Silakan pilih kamera')}
                  </div>
                  {selected && (
                    <div className="text-[11px] text-[#00CFE8] font-mono bg-[#00CFE8]/10 px-4 py-2 rounded-lg border border-[#00CFE8]/20 inline-block tracking-wider">
                      AGENT ID: {selected.id.split('-')[0]}
                    </div>
                  )}
                </div>
              )}

              {/* Info Overlay Panel */}
              <AnimatePresence>
                {showInfoPanel && selected && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10, x: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10, x: 10 }}
                    className="absolute top-4 right-4 w-[340px] bg-[#060D14]/95 backdrop-blur-2xl border border-[#00E5FF]/30 rounded-2xl p-5 shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-20"
                  >
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/10">
                      <h4 className="text-[13px] font-bold text-[#00E5FF] uppercase tracking-widest flex items-center">
                        <FontAwesomeIcon icon={faServer} className="mr-2" /> Telemetri Edge
                      </h4>
                      <button onClick={() => setShowInfoPanel(false)} className="text-[#8BAFC4] hover:text-white bg-white/5 rounded-full w-7 h-7 flex items-center justify-center transition-colors">
                        <FontAwesomeIcon icon={faXmark} />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="text-[11px] text-[#8BAFC4] font-semibold mb-1">Stream URL</div>
                        <div className="text-xs text-[#E8F4F8] font-mono break-all bg-black/50 p-2.5 rounded-lg border border-white/5">{selected.streamUrl || 'Tidak ada URL'}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-black/50 p-3 rounded-xl border border-[#00E676]/20">
                          <div className="text-[11px] text-[#8BAFC4] mb-1">Current FPS</div>
                          <div className="text-lg text-[#00E676] font-mono font-semibold">{healthData?.operational?.currentFps || 0}</div>
                        </div>
                        <div className="bg-black/50 p-3 rounded-xl border border-[#FF6B35]/20">
                          <div className="text-[11px] text-[#8BAFC4] mb-1">Dropped</div>
                          <div className="text-lg text-[#FF6B35] font-mono font-semibold">{healthData?.operational?.droppedFrames || 0}</div>
                        </div>
                        <div className="bg-black/50 p-3 rounded-xl border border-white/5">
                          <div className="text-[11px] text-[#8BAFC4] mb-1">Backlog</div>
                          <div className="text-lg text-[#E8F4F8] font-mono font-semibold">{healthData?.operational?.queueBacklog || 0}</div>
                        </div>
                        <div className="bg-black/50 p-3 rounded-xl border border-white/5">
                          <div className="text-[11px] text-[#8BAFC4] mb-1">Failures</div>
                          <div className="text-lg text-[#E8F4F8] font-mono font-semibold">{healthData?.operational?.consecutiveFailures || 0}</div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-white/5">
                        <span className="text-[11px] text-[#8BAFC4]">Last Heartbeat</span>
                        <span className="text-xs font-mono text-[#A5F3FC] bg-[#00E5FF]/10 px-2 py-1 rounded">
                          {healthData?.operational?.agentHeartbeatAt ? new Date(healthData.operational.agentHeartbeatAt).toLocaleTimeString() : 'N/A'}
                        </span>
                      </div>

                      {connectionMessage && (
                        <div className="text-[12px] text-[#00E5FF] bg-[#00E5FF]/10 p-3 rounded-lg border border-[#00E5FF]/20 text-center mt-2">
                          {connectionMessage}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#060D14]/85 backdrop-blur-sm flex items-center justify-center z-[1000] p-6"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#112236] border border-[#00E5FF]/30 rounded-3xl p-8 w-full max-w-xl shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-32 bg-[#00E5FF]/10 blur-[60px] pointer-events-none" />

              <div className="flex items-start justify-between mb-8 relative z-10 border-b border-white/10 pb-6">
                <div>
                  <h2 className="font-orbitron text-2xl font-bold text-[#E8F4F8]">{editCameraId ? 'Edit Device' : 'Register Device'}</h2>
                  <p className="text-[#8BAFC4] text-sm mt-2">Konfigurasi edge endpoint untuk object detection</p>
                </div>
                <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} className="text-[#8BAFC4] hover:text-white hover:bg-white/10 rounded-full w-10 h-10 flex items-center justify-center transition-colors">
                  <FontAwesomeIcon icon={faXmark} className="text-xl" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 relative z-10">
                <Input label="Nama Kamera" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mis: Pintu Utama" />
                <Input label="Lokasi" value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="Mis: Lobby Depan" />
                <Input label="Latitude (Opsional)" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="-6.200000" />
                <Input label="Longitude (Opsional)" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="106.816666" />
              </div>

              <div className="flex justify-end gap-3 relative z-10">
                <Button variant="ghost" size="md" onClick={() => { setIsModalOpen(false); resetForm(); }} className="hover:bg-white/5">Batal</Button>
                <Button variant="fox" size="md" loading={saving} onClick={handleSaveCamera} className="shadow-[0_0_15px_rgba(255,107,53,0.3)]">
                  {saving ? 'Menyimpan...' : (editCameraId ? 'Simpan Perubahan' : 'Register Endpoint')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {generatedApiKey && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#060D14]/90 backdrop-blur-md flex items-center justify-center z-[1100] p-6"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#112236] border border-[#00E676] rounded-3xl p-10 w-full max-w-lg shadow-[0_0_40px_rgba(0,230,118,0.15)] text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-32 bg-[#00E676]/10 blur-[60px] pointer-events-none" />

              <div className="w-20 h-20 rounded-full bg-[#00E676]/20 flex items-center justify-center mx-auto mb-6 border border-[#00E676]/50 text-[#00E676] text-3xl relative z-10 shadow-[0_0_20px_rgba(0,230,118,0.3)]">
                ✓
              </div>
              <h2 className="font-orbitron text-2xl font-bold text-[#00E676] mb-3 relative z-10">Endpoint Terdaftar!</h2>
              <p className="text-[#E8F4F8] text-sm mb-8 relative z-10 leading-relaxed">
                Salin kredensial di bawah ini dan masukkan ke file <code className="text-[#00E5FF] bg-[#00E5FF]/10 px-2 py-1 rounded">.env</code> pada Raspberry Pi Anda.
                <br /><br />
                <span className="text-[#FF6B35] font-semibold bg-[#FF6B35]/10 px-2 py-1 rounded">Penting:</span> API Key ini hanya ditampilkan satu kali demi keamanan!
              </p>

              <div className="bg-black/50 p-5 rounded-2xl mb-8 border border-white/10 text-left relative z-10 shadow-inner">
                <div className="mb-5">
                  <div className="text-[11px] text-[#8BAFC4] mb-1.5 font-bold tracking-widest uppercase">CAMERA_ID</div>
                  <div className="text-base text-[#00E5FF] font-mono bg-[#00E5FF]/5 p-3 rounded-lg border border-[#00E5FF]/20 select-all cursor-text">
                    {generatedApiKey.id}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#8BAFC4] mb-1.5 font-bold tracking-widest uppercase">API_KEY</div>
                  <div className="text-base text-[#00E5FF] font-mono bg-[#00E5FF]/5 p-3 rounded-lg border border-[#00E5FF]/20 select-all cursor-text break-all">
                    {generatedApiKey.key}
                  </div>
                </div>
              </div>

              <div className="flex justify-center relative z-10">
                <Button variant="fox" size="lg" onClick={() => setGeneratedApiKey(null)} className="w-full text-lg shadow-[0_0_20px_rgba(255,107,53,0.4)]">
                  Saya Sudah Menyalinnya
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 229, 255, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 229, 255, 0.5); }
      `}</style>
    </div>
  );
}
