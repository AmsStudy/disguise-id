'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faExpand,
  faVideo,
  faSatelliteDish,
  faWrench,
  faXmark,
  faPen,
  faTrash,
  faInfoCircle,
  faCamera,
  faRotateRight,
  faServer,
  faKey,
  faCopy,
  faCheck,
  faEye,
  faEyeSlash,
  faCode,
  faTerminal,
  faShieldHalved
} from '@fortawesome/free-solid-svg-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusDot } from '@/components/ui/StatusDot';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cameraApi, systemApi } from '@/services/api';
import type { Camera } from '@/types';
import LiveCamera from '@/components/LiveCamera';

const DEFAULT_IOT_KEY = 'disguise-iot-secret-key-2026';

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
  const [generatedApiKey, setGeneratedApiKey] = useState<{ id: string; key: string } | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);

  // State untuk Modal Kredensial & Copy API Key
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const [currentCameraApiKey, setCurrentCameraApiKey] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

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

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => {
        setCopiedField((prev) => (prev === fieldName ? null : prev));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleRegenerateApiKey = async (camId: string) => {
    setGeneratingKey(true);
    try {
      const res = await cameraApi.regenerateKey(camId);
      if (res.data?.data?.api_key) {
        setCurrentCameraApiKey(res.data.data.api_key);
        setShowApiKey(true);
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Gagal meregenerasi API Key kamera.');
    } finally {
      setGeneratingKey(false);
    }
  };

  const fetchPreview = async (cam: Camera | null) => {
    if (!cam || cam.status === 'online' || !cam.streamUrl) {
      setPreviewUrl(null);
      return;
    }
    setLoadingPreview(true);
    try {
      const response = await cameraApi.preview(cam.id);
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

    fetchPreview(selected);
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
      if (selected.status !== 'online' && selected.streamUrl) {
        fetchPreview(selected);
      }
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
          setCurrentCameraApiKey(res.data.data.api_key);
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
      {/* Header Command Center */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-black/20 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#00E5FF]/10 flex items-center justify-center border border-[#00E5FF]/30 shadow-[0_0_15px_rgba(0,229,255,0.2)]">
            <FontAwesomeIcon icon={faServer} className="text-[#00E5FF]" />
          </div>
          <div>
            <p className="text-[#8BAFC4] text-sm leading-tight font-mono">Edge Infrastructure</p>
            <h2 className="text-[#E8F4F8] font-bold text-lg leading-tight font-orbitron">Command Center</h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" size="md" onClick={fetchCameras} disabled={loading} className="bg-black/40 hover:bg-black/60 border-white/10">
            <FontAwesomeIcon icon={faRotateRight} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
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

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-[600px] lg:min-h-0">

        {/* Sidebar: Camera List */}
        <div className="w-full lg:w-[320px] xl:w-[360px] shrink-0 flex flex-col">
          <GlassCard className="flex-1 flex flex-col overflow-hidden !p-0 border-[#00E5FF]/30 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            <div className="bg-gradient-to-b from-white/5 to-transparent border-b border-white/10 px-6 py-5 shrink-0 flex items-center justify-between">
              <h2 className="font-orbitron text-sm font-bold text-[#00E5FF] tracking-wider uppercase flex items-center">
                <FontAwesomeIcon icon={faCamera} className="mr-3 text-[#E8F4F8]" /> Daftar Kamera
              </h2>
              <Badge variant="info" className="!bg-[#00E5FF]/10 !text-[#00E5FF] !border-[#00E5FF]/30">{cameras.length}</Badge>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-black/10">
              {cameras.map((cam) => (
                <motion.div
                  key={cam.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setSelectedCameraId(cam.id)}
                  className={`p-3.5 rounded-xl cursor-pointer border transition-all duration-200 flex items-center justify-between group relative overflow-hidden ${
                    selected?.id === cam.id
                      ? 'bg-gradient-to-r from-[#00E5FF]/20 to-[#00E5FF]/5 border-[#00E5FF]/50 shadow-[inset_4px_0_0_#00E5FF]'
                      : 'bg-black/20 border-white/5 hover:border-[#00E5FF]/30 hover:bg-black/40'
                  }`}
                >
                  {selected?.id === cam.id && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#00E5FF]/10 blur-3xl rounded-full pointer-events-none" />
                  )}

                  <div className="flex items-center gap-3 truncate relative z-10">
                    <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center border ${
                      cam.status === 'online' ? 'bg-[#00E676]/10 border-[#00E676]/30 text-[#00E676]' :
                      cam.status === 'offline' ? 'bg-[#FF3D3D]/10 border-[#FF3D3D]/30 text-[#FF3D3D]' :
                      'bg-[#FFD600]/10 border-[#FFD600]/30 text-[#FFD600]'
                    }`}>
                      <FontAwesomeIcon icon={cam.status === 'online' ? faVideo : cam.status === 'offline' ? faSatelliteDish : faWrench} className="text-sm" />
                    </div>
                    <div className="truncate">
                      <h3 className="text-sm font-semibold text-[#E8F4F8] truncate font-inter">{cam.name}</h3>
                      <p className="text-xs text-[#8BAFC4] truncate mt-0.5 flex items-center gap-1.5 font-mono">
                        <StatusDot status={cam.status} /> {cam.location}
                      </p>
                    </div>
                  </div>
                  {cam.alertCount ? (
                    <Badge variant="high" className="!px-2 !py-0.5 !text-xs relative z-10">{cam.alertCount}</Badge>
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
            {/* Feed Header */}
            <div className="w-full shrink-0 px-6 py-4 bg-gradient-to-b from-white/10 to-transparent border-b border-white/10 flex flex-col xl:flex-row xl:items-center justify-between gap-4 z-10 backdrop-blur-md">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h2 className="font-orbitron text-2xl font-bold text-white drop-shadow-lg truncate tracking-wide">
                    {selected?.name ?? 'Pilih Kamera'}
                  </h2>
                  {selected && <StatusDot status={selected.status} showLabel />}
                </div>
                
                {/* Location and Quick Copy Toolbar */}
                {selected && (
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <span className="text-[#00E5FF] text-xs font-mono tracking-wider opacity-90 flex items-center gap-1">
                      📍 {selected.location}
                    </span>

                    <span className="text-white/20">•</span>

                    {/* Quick Copy Camera ID */}
                    <button
                      onClick={() => copyToClipboard(selected.id, 'quick-id')}
                      className="group/id flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 border border-[#00E5FF]/30 text-[#00E5FF] text-[11px] font-mono transition-all"
                      title="Klik untuk menyalin Camera ID"
                    >
                      <FontAwesomeIcon icon={copiedField === 'quick-id' ? faCheck : faCopy} className={copiedField === 'quick-id' ? 'text-[#00E676]' : ''} />
                      <span>ID: {selected.id.split('-')[0]}...</span>
                      {copiedField === 'quick-id' && <span className="text-[#00E676] font-bold text-[10px] ml-1">Tersalin!</span>}
                    </button>

                    {/* Quick Button: Kredensial & Edge Config */}
                    <button
                      onClick={() => setIsCredentialsModalOpen(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FFD600]/10 hover:bg-[#FFD600]/20 border border-[#FFD600]/30 text-[#FFD600] text-[11px] font-semibold transition-all shadow-[0_0_10px_rgba(255,214,0,0.15)]"
                      title="Buka detail API Key dan Kredensial Kamera"
                    >
                      <FontAwesomeIcon icon={faKey} />
                      <span>API Key & Kredensial</span>
                    </button>
                  </div>
                )}
              </div>

              {selected && (
                <div className="flex flex-wrap items-center gap-2 shrink-0 bg-black/40 p-1.5 rounded-xl border border-white/10">
                  {/* Button: Kredensial & API Key Modal */}
                  <button
                    onClick={() => setIsCredentialsModalOpen(true)}
                    className="h-9 px-3 rounded-lg bg-gradient-to-r from-[#00E5FF]/20 to-[#00E5FF]/5 hover:from-[#00E5FF]/30 hover:to-[#00E5FF]/15 border border-[#00E5FF]/40 text-[#00E5FF] hover:text-white transition-all flex items-center gap-2 text-xs font-semibold shadow-[0_0_12px_rgba(0,229,255,0.2)]"
                    title="Salin ID & API Key Kamera"
                  >
                    <FontAwesomeIcon icon={faKey} />
                    <span className="hidden sm:inline">Kredensial</span>
                  </button>

                  <div className="w-px h-5 bg-white/10 my-auto" />

                  {/* Telemetry Button */}
                  <button
                    onClick={() => setShowInfoPanel(!showInfoPanel)}
                    className={`w-9 h-9 rounded-lg backdrop-blur-md transition-all flex items-center justify-center ${
                      showInfoPanel
                        ? 'bg-[#00E5FF] text-black shadow-[0_0_15px_rgba(0,229,255,0.5)]'
                        : 'text-[#8BAFC4] hover:bg-white/10 hover:text-white'
                    }`}
                    title="Telemetri Kamera"
                  >
                    <FontAwesomeIcon icon={faInfoCircle} />
                  </button>

                  {/* Edit Camera */}
                  <button
                    onClick={() => handleEditClick(selected)}
                    className="w-9 h-9 rounded-lg text-[#8BAFC4] hover:bg-[#FFD600]/20 hover:text-[#FFD600] transition-colors flex items-center justify-center"
                    title="Edit Kamera"
                  >
                    <FontAwesomeIcon icon={faPen} />
                  </button>

                  {/* Test Connection */}
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
                    className="w-9 h-9 rounded-lg text-[#8BAFC4] hover:bg-[#00E5FF]/20 hover:text-[#00E5FF] transition-colors disabled:opacity-50 flex items-center justify-center"
                    title="Test Connection"
                  >
                    <FontAwesomeIcon icon={testingConnection ? faRotateRight : faSatelliteDish} className={testingConnection ? 'animate-spin' : ''} />
                  </button>

                  {/* Delete Camera */}
                  <button
                    onClick={() => handleDeleteClick(selected)}
                    className="w-9 h-9 rounded-lg text-[#8BAFC4] hover:bg-[#FF3D3D]/20 hover:text-[#FF3D3D] transition-colors flex items-center justify-center"
                    title="Hapus Kamera"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>

                  <div className="w-px h-5 bg-white/10 my-auto" />

                  {/* Fullscreen */}
                  <button
                    className="w-9 h-9 rounded-lg text-[#8BAFC4] hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center"
                    title="Fullscreen"
                  >
                    <FontAwesomeIcon icon={faExpand} />
                  </button>
                </div>
              )}
            </div>

            {/* Video Container */}
            <div className="flex-1 bg-black flex items-center justify-center relative w-full h-full min-h-[300px]">
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
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-5 border border-white/10">
                    <FontAwesomeIcon icon={faVideo} className="text-3xl text-white/20" />
                  </div>
                  <div className="text-[#8BAFC4] text-sm font-inter mb-3">
                    {loadingPreview ? 'Menyambungkan ke stream...' : (selected ? 'Perangkat sedang offline / menunggu feed' : 'Silakan pilih kamera')}
                  </div>
                  {selected && (
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        onClick={() => copyToClipboard(selected.id, 'empty-id')}
                        className="text-[11px] text-[#00CFE8] font-mono bg-[#00CFE8]/10 hover:bg-[#00CFE8]/20 px-3.5 py-1.5 rounded-lg border border-[#00CFE8]/20 flex items-center gap-1.5 transition-colors"
                      >
                        <FontAwesomeIcon icon={copiedField === 'empty-id' ? faCheck : faCopy} />
                        <span>CAMERA ID: {selected.id}</span>
                      </button>
                      <button
                        onClick={() => setIsCredentialsModalOpen(true)}
                        className="text-[11px] text-[#FFD600] font-semibold bg-[#FFD600]/10 hover:bg-[#FFD600]/20 px-3 py-1.5 rounded-lg border border-[#FFD600]/20 flex items-center gap-1.5 transition-colors"
                      >
                        <FontAwesomeIcon icon={faKey} />
                        <span>Lihat Kredensial</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Info / Telemetry Overlay Panel */}
              <AnimatePresence>
                {showInfoPanel && selected && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10, x: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10, x: 10 }}
                    className="absolute top-4 right-4 w-[360px] bg-[#060D14]/95 backdrop-blur-2xl border border-[#00E5FF]/30 rounded-2xl p-5 shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-20"
                  >
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/10">
                      <h4 className="text-[13px] font-bold text-[#00E5FF] uppercase tracking-widest flex items-center">
                        <FontAwesomeIcon icon={faServer} className="mr-2" /> Telemetri & Identitas
                      </h4>
                      <button onClick={() => setShowInfoPanel(false)} className="text-[#8BAFC4] hover:text-white bg-white/5 rounded-full w-7 h-7 flex items-center justify-center transition-colors">
                        <FontAwesomeIcon icon={faXmark} />
                      </button>
                    </div>

                    <div className="space-y-3.5">
                      {/* Camera ID copy in Telemetry */}
                      <div className="bg-black/60 p-3 rounded-xl border border-white/10">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] text-[#8BAFC4] font-bold uppercase tracking-wider font-mono">Camera ID</span>
                          <button
                            onClick={() => copyToClipboard(selected.id, 'panel-id')}
                            className="text-[10px] text-[#00E5FF] hover:underline flex items-center gap-1"
                          >
                            <FontAwesomeIcon icon={copiedField === 'panel-id' ? faCheck : faCopy} className={copiedField === 'panel-id' ? 'text-[#00E676]' : ''} />
                            {copiedField === 'panel-id' ? 'Tersalin' : 'Salin ID'}
                          </button>
                        </div>
                        <div className="text-xs text-[#E8F4F8] font-mono break-all select-all">{selected.id}</div>
                      </div>

                      {/* Quick Open Credentials Modal */}
                      <button
                        onClick={() => {
                          setShowInfoPanel(false);
                          setIsCredentialsModalOpen(true);
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 border border-[#00E5FF]/30 text-[#00E5FF] text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                      >
                        <FontAwesomeIcon icon={faKey} />
                        <span>Buka Detail API Key & Konfigurasi Edge</span>
                      </button>

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

      {/* ========================================================================= */}
      {/* MODAL 1: KREDENSIAL & API KEY COPY (TAMPILAN LENGKAP & CEPAT)              */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isCredentialsModalOpen && selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#060D14]/90 backdrop-blur-md flex items-center justify-center z-[1100] p-4 sm:p-6"
            onClick={() => setIsCredentialsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0B1726] border border-[#00E5FF]/40 rounded-3xl p-6 sm:p-8 w-full max-w-2xl shadow-[0_0_50px_rgba(0,229,255,0.15)] relative overflow-hidden"
            >
              {/* Background ambient glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[85%] h-32 bg-[#00E5FF]/15 blur-[70px] pointer-events-none" />

              {/* Modal Header */}
              <div className="flex items-start justify-between mb-6 relative z-10 border-b border-white/10 pb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF] text-xl shadow-[0_0_20px_rgba(0,229,255,0.3)]">
                    <FontAwesomeIcon icon={faKey} />
                  </div>
                  <div>
                    <h2 className="font-orbitron text-xl sm:text-2xl font-bold text-[#E8F4F8] flex items-center gap-2">
                      Kredensial Edge & API Key
                    </h2>
                    <p className="text-[#8BAFC4] text-xs sm:text-sm mt-0.5">
                      Gunakan kredensial ini untuk menghubungkan <span className="text-[#00E5FF] font-semibold">{selected.name}</span> ke Camera Agent.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCredentialsModalOpen(false)}
                  className="text-[#8BAFC4] hover:text-white hover:bg-white/10 rounded-full w-9 h-9 flex items-center justify-center transition-colors"
                >
                  <FontAwesomeIcon icon={faXmark} className="text-lg" />
                </button>
              </div>

              {/* Content Grid */}
              <div className="space-y-4 relative z-10">
                {/* 1. Camera ID Box */}
                <div className="bg-black/60 p-4 rounded-2xl border border-white/10 hover:border-[#00E5FF]/30 transition-all">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[11px] text-[#8BAFC4] font-bold uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faShieldHalved} className="text-[#00E5FF]" /> CAMERA ID (UUID)
                    </span>
                    <span className="text-[10px] text-white/40 font-mono">Unique Identifier</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-black/80 text-[#00E5FF] font-mono text-xs sm:text-sm p-3 rounded-xl border border-white/10 select-all overflow-x-auto truncate">
                      {selected.id}
                    </div>
                    <Button
                      variant="fox"
                      size="sm"
                      onClick={() => copyToClipboard(selected.id, 'modal-cam-id')}
                      className="shrink-0 !h-11 px-4 !text-xs font-semibold shadow-[0_0_15px_rgba(255,107,53,0.3)]"
                    >
                      <FontAwesomeIcon icon={copiedField === 'modal-cam-id' ? faCheck : faCopy} className="mr-1.5" />
                      {copiedField === 'modal-cam-id' ? 'Tersalin!' : 'Salin ID'}
                    </Button>
                  </div>
                </div>

                {/* 2. API Key Box */}
                <div className="bg-black/60 p-4 rounded-2xl border border-white/10 hover:border-[#00E5FF]/30 transition-all">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[11px] text-[#8BAFC4] font-bold uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faKey} className="text-[#FFD600]" /> CAMERA API KEY
                    </span>
                    <span className="text-[10px] text-[#00E676] font-mono">X-Api-Key Header</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-black/80 text-[#00E676] font-mono text-xs sm:text-sm p-3 rounded-xl border border-white/10 select-all overflow-x-auto truncate flex items-center justify-between">
                      <span>
                        {showApiKey
                          ? currentCameraApiKey || DEFAULT_IOT_KEY
                          : '••••••••••••••••••••••••••••••••••••••••••••••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="text-[#8BAFC4] hover:text-white ml-2 text-xs"
                        title={showApiKey ? 'Sembunyikan' : 'Tampilkan'}
                      >
                        <FontAwesomeIcon icon={showApiKey ? faEyeSlash : faEye} />
                      </button>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => copyToClipboard(currentCameraApiKey || DEFAULT_IOT_KEY, 'modal-api-key')}
                      className="shrink-0 !h-11 px-4 !text-xs font-semibold bg-white/10 hover:bg-white/20 border-white/10 text-white"
                    >
                      <FontAwesomeIcon icon={copiedField === 'modal-api-key' ? faCheck : faCopy} className="mr-1.5" />
                      {copiedField === 'modal-api-key' ? 'Tersalin!' : 'Salin Key'}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-white/5 text-[11px]">
                    <span className="text-white/50">
                      Gunakan key di atas atau master IoT key: <code className="text-[#00E5FF] bg-black/60 px-1.5 py-0.5 rounded font-mono">{DEFAULT_IOT_KEY}</code>
                    </span>
                    <button
                      type="button"
                      disabled={generatingKey}
                      onClick={() => handleRegenerateApiKey(selected.id)}
                      className="text-[#00E5FF] hover:underline font-medium disabled:opacity-50 flex items-center gap-1"
                    >
                      <FontAwesomeIcon icon={faRotateRight} className={generatingKey ? 'animate-spin' : ''} />
                      <span>{generatingKey ? 'Membuat...' : 'Regenerasi Key'}</span>
                    </button>
                  </div>
                </div>

                {/* 3. Ready-to-use .env Config Snippet */}
                <div className="bg-black/70 p-4 rounded-2xl border border-white/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] text-[#8BAFC4] font-bold uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faTerminal} className="text-[#00E5FF]" /> Snippet Konfigurasi (camera-agent/.env)
                    </span>
                    <button
                      onClick={() => {
                        const envSnippet = `BACKEND_URL=http://localhost:3002\nAPI_KEY=${currentCameraApiKey || DEFAULT_IOT_KEY}\nCAMERA_ID=${selected.id}\nCAMERA_NAME="${selected.name}"\nRTSP_URL=/home/ichwal/disguise-id-fix/stream-record/Highlight_Manusia_CCTV.mp4\nSTREAM_PUSH_RTSP_URL=/home/ichwal/disguise-id-fix/stream-record/Highlight_Manusia_CCTV.mp4\nMEDIAMTX_HOST=localhost\nSTREAM_PUSH_ENABLED=true`;
                        copyToClipboard(envSnippet, 'env-snippet');
                      }}
                      className="text-xs text-[#00E5FF] hover:underline font-semibold flex items-center gap-1"
                    >
                      <FontAwesomeIcon icon={copiedField === 'env-snippet' ? faCheck : faCopy} className={copiedField === 'env-snippet' ? 'text-[#00E676]' : ''} />
                      {copiedField === 'env-snippet' ? 'Seluruh .env Tersalin!' : 'Salin Seluruh .env'}
                    </button>
                  </div>
                  <pre className="bg-[#050B12] p-3 rounded-xl border border-white/5 text-[11px] font-mono text-[#A5F3FC] overflow-x-auto leading-relaxed select-all">
{`CAMERA_ID=${selected.id}
API_KEY=${currentCameraApiKey || DEFAULT_IOT_KEY}
BACKEND_URL=http://localhost:3002
RTSP_URL=stream-record/Highlight_Manusia_CCTV.mp4`}
                  </pre>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-white/10 relative z-10">
                <Button
                  variant="fox"
                  size="md"
                  onClick={() => setIsCredentialsModalOpen(false)}
                  className="px-6 shadow-[0_0_15px_rgba(255,107,53,0.3)]"
                >
                  Selesai
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 2: REGISTER / EDIT DEVICE MODAL                                     */}
      {/* ========================================================================= */}
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

        {/* MODAL 3: GENERATED API KEY UPON NEW DEVICE REGISTRATION */}
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

              <div className="bg-black/50 p-5 rounded-2xl mb-8 border border-white/10 text-left relative z-10 shadow-inner space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] text-[#8BAFC4] font-bold tracking-widest uppercase">CAMERA_ID</span>
                    <button
                      onClick={() => copyToClipboard(generatedApiKey.id, 'gen-id')}
                      className="text-[11px] text-[#00E5FF] hover:underline flex items-center gap-1 font-mono"
                    >
                      <FontAwesomeIcon icon={copiedField === 'gen-id' ? faCheck : faCopy} />
                      {copiedField === 'gen-id' ? 'Tersalin' : 'Salin'}
                    </button>
                  </div>
                  <div className="text-base text-[#00E5FF] font-mono bg-[#00E5FF]/5 p-3 rounded-lg border border-[#00E5FF]/20 select-all cursor-text">
                    {generatedApiKey.id}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] text-[#8BAFC4] font-bold tracking-widest uppercase">API_KEY</span>
                    <button
                      onClick={() => copyToClipboard(generatedApiKey.key, 'gen-key')}
                      className="text-[11px] text-[#00E676] hover:underline flex items-center gap-1 font-mono"
                    >
                      <FontAwesomeIcon icon={copiedField === 'gen-key' ? faCheck : faCopy} />
                      {copiedField === 'gen-key' ? 'Tersalin' : 'Salin'}
                    </button>
                  </div>
                  <div className="text-base text-[#00E676] font-mono bg-[#00E676]/5 p-3 rounded-lg border border-[#00E676]/20 select-all cursor-text break-all">
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

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 229, 255, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 229, 255, 0.5); }
      `}</style>
    </div>
  );
}
