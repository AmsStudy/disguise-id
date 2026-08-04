'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faMagnifyingGlass, faUser, faFilter, faTrash, faXmark, faUpload } from '@fortawesome/free-solid-svg-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge, DangerBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { StatusDot } from '@/components/ui/StatusDot';
import { Toast, ToastType } from '@/components/ui/Toast';
import { FaceScanRing } from '@/components/face-scan-ring/FaceScanRing';
import { watchlistApi } from '@/services/api';

const AddPersonModal: React.FC<{ onClose: () => void, onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [alias, setAlias] = useState('');
  const [dangerLevel, setDangerLevel] = useState('high');
  const [notes, setNotes] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleFile = (selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) return;
    setFile(selectedFile);
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      const formData = new FormData();
      formData.append('full_name', name);
      if (alias) formData.append('alias', JSON.stringify([alias]));
      formData.append('danger_level', dangerLevel);
      if (notes) formData.append('description', notes);
      if (file) formData.append('photo', file);

      await watchlistApi.create(formData);
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || err.message || 'Failed to save person');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(6, 13, 20, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '24px',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#112236',
          border: '1px solid rgba(0, 229, 255, 0.2)',
          borderRadius: '24px',
          padding: '32px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '18px', fontWeight: 700, color: '#E8F4F8' }}>
            Tambah Person Watchlist
          </h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4A6B84' }}
          >
            <FontAwesomeIcon icon={faXmark} style={{ fontSize: '20px' }} />
          </button>
        </div>

        {error && (
          <div style={{ color: '#FF3D3D', marginBottom: '16px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        {/* Photo upload */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '13px', fontWeight: 500, color: '#8BAFC4', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px', fontFamily: 'Inter, sans-serif' }}>
            Foto
          </label>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${isDragging ? '#00E5FF' : 'rgba(0,229,255,0.2)'}`,
              borderRadius: '16px',
              padding: '32px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: isDragging ? 'rgba(0,229,255,0.05)' : 'transparent',
              position: 'relative',
            }}
          >
            {previewUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                <img src={previewUrl} alt="Preview" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid #0097B2' }} />
                <div style={{ color: '#00E676', fontFamily: 'Inter, sans-serif', fontSize: '14px' }}>Foto siap diproses</div>
              </div>
            ) : (
              <>
                <FontAwesomeIcon icon={faUpload} style={{ fontSize: '28px', color: '#4A6B84', margin: '0 auto 12px', display: 'block' }} />
                <div style={{ color: '#8BAFC4', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>
                  Drag & drop foto atau <span style={{ color: '#00CFE8', cursor: 'pointer' }}>klik untuk pilih</span>
                </div>
                <div style={{ color: '#4A6B84', fontSize: '12px', marginTop: '4px' }}>PNG, JPG · Maks 5MB</div>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
              onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          <Input label="Nama Lengkap" placeholder="Ahmad Basri" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Alias / Nama Panggilan" placeholder="Ucok" value={alias} onChange={(e) => setAlias(e.target.value)} />
          <Select label="Danger Level" value={dangerLevel} onChange={(e) => setDangerLevel(e.target.value)}>
            <option value="critical">CRITICAL</option>
            <option value="high">HIGH</option>
            <option value="medium">MEDIUM</option>
            <option value="low">LOW</option>
          </Select>
          <Textarea label="Catatan" placeholder="Informasi tambahan..." value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="ghost" size="lg" fullWidth onClick={onClose}>Batal</Button>
          <Button
            variant="fox"
            size="lg"
            fullWidth
            loading={saving}
            onClick={handleSave}
            id="save-person-btn"
          >
            {saving ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaceScanRing size={24} isScanning matchStatus="scanning" />
                Menyimpan...
              </div>
            ) : 'Simpan Person'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const EditPersonModal: React.FC<{ person: any, onClose: () => void, onSuccess: () => void }> = ({ person, onClose, onSuccess }) => {
  const [name, setName] = useState(person.fullName || '');
  const [alias, setAlias] = useState(person.alias?.join(', ') || '');
  const [dangerLevel, setDangerLevel] = useState(person.dangerLevel || 'high');
  const [notes, setNotes] = useState(person.description || '');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(person.photoUrl || null);
  const [isDragging, setIsDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleFile = (selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) return;
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      
      const formData = new FormData();
      formData.append('full_name', name);
      if (alias) formData.append('alias', JSON.stringify(alias.split(',').map((a: string) => a.trim())));
      formData.append('danger_level', dangerLevel);
      if (notes) formData.append('description', notes);
      if (file) formData.append('photo', file);

      await watchlistApi.update(person.id, formData as any);
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || err.message || 'Failed to save person');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(6, 13, 20, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '24px',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#112236',
          border: '1px solid rgba(0, 229, 255, 0.2)',
          borderRadius: '24px',
          padding: '32px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '18px', fontWeight: 700, color: '#E8F4F8' }}>
            Edit Person Watchlist
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4A6B84' }}
          >
            <FontAwesomeIcon icon={faXmark} style={{ fontSize: '20px' }} />
          </button>
        </div>

        {error && (
          <div style={{ color: '#FF3D3D', marginBottom: '16px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        {/* Photo upload */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '13px', fontWeight: 500, color: '#8BAFC4', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px', fontFamily: 'Inter, sans-serif' }}>
            Ubah Foto (Opsional)
          </label>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${isDragging ? '#00E5FF' : 'rgba(0,229,255,0.2)'}`,
              borderRadius: '16px',
              padding: '32px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: isDragging ? 'rgba(0,229,255,0.05)' : 'transparent',
              position: 'relative',
            }}
          >
            {previewUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                <img src={previewUrl} alt="Preview" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid #0097B2' }} />
                <div style={{ color: '#00E676', fontFamily: 'Inter, sans-serif', fontSize: '14px' }}>
                  {file ? 'Foto baru siap diunggah' : 'Foto saat ini'}
                </div>
              </div>
            ) : (
              <>
                <FontAwesomeIcon icon={faUpload} style={{ fontSize: '28px', color: '#4A6B84', margin: '0 auto 12px', display: 'block' }} />
                <div style={{ color: '#8BAFC4', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>
                  Drag & drop foto baru atau <span style={{ color: '#00CFE8', cursor: 'pointer' }}>klik untuk pilih</span>
                </div>
                <div style={{ color: '#4A6B84', fontSize: '12px', marginTop: '4px' }}>PNG, JPG · Maks 5MB</div>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
              onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          <Input label="Nama Lengkap" placeholder="Ahmad Basri" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Alias / Nama Panggilan (pisahkan dengan koma)" placeholder="Ucok, Udin" value={alias} onChange={(e) => setAlias(e.target.value)} />
          <Select label="Danger Level" value={dangerLevel} onChange={(e) => setDangerLevel(e.target.value)}>
            <option value="critical">CRITICAL</option>
            <option value="high">HIGH</option>
            <option value="medium">MEDIUM</option>
            <option value="low">LOW</option>
          </Select>
          <Textarea label="Catatan" placeholder="Informasi tambahan..." value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="ghost" size="lg" fullWidth onClick={onClose}>Batal</Button>
          <Button variant="fox" size="lg" fullWidth loading={saving} onClick={handleSave}>
            Simpan Perubahan
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function WatchlistPage() {
  const [persons, setPersons] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterDeleted, setFilterDeleted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState<any | null>(null);
  const [deletingPerson, setDeletingPerson] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: ToastType }>({ visible: false, message: '', type: 'info' });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ visible: true, message, type });
  };

  const fetchPersons = async () => {
    try {
      setLoading(true);
      const res = await watchlistApi.list({ 
        danger_level: filterLevel !== 'all' ? filterLevel : undefined, 
        search: search || undefined,
        is_deleted: filterDeleted ? true : undefined
      });
      setPersons(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch watchlist', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersons();
  }, [filterLevel, search, filterDeleted]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: '20px', fontWeight: 700, color: '#E8F4F8' }}>Watchlist</h1>
          <p style={{ color: '#8BAFC4', fontSize: '13px', marginTop: '4px' }}>{persons.filter((p) => p.isActive).length} person aktif dari {persons.length} total</p>
        </div>
        <Button variant="fox" size="md" onClick={() => setShowModal(true)} id="add-person-btn">
          <FontAwesomeIcon icon={faPlus} style={{ fontSize: '16px' }} /> Tambah Person
        </Button>
      </div>

      {/* Search & filter */}
      <GlassCard style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid rgba(0, 229, 255, 0.1)', paddingBottom: '16px' }}>
          <button
            onClick={() => setFilterDeleted(false)}
            style={{
              background: 'transparent', border: 'none', color: !filterDeleted ? '#00CFE8' : '#8BAFC4',
              fontSize: '14px', fontWeight: !filterDeleted ? 600 : 400, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              borderBottom: !filterDeleted ? '2px solid #00CFE8' : '2px solid transparent', paddingBottom: '8px', marginBottom: '-17px'
            }}
          >
            Data Watchlist
          </button>
          <button
            onClick={() => setFilterDeleted(true)}
            style={{
              background: 'transparent', border: 'none', color: filterDeleted ? '#FF3D3D' : '#8BAFC4',
              fontSize: '14px', fontWeight: filterDeleted ? 600 : 400, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              borderBottom: filterDeleted ? '2px solid #FF3D3D' : '2px solid transparent', paddingBottom: '8px', marginBottom: '-17px'
            }}
          >
            <FontAwesomeIcon icon={faTrash} style={{ marginRight: '6px' }} />
            Sampah (Terhapus)
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <Input
              placeholder="Cari nama atau alias..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: '16px' }} />}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['all', 'critical', 'high', 'medium', 'low'].map((level) => (
              <button
                key={level}
                onClick={() => setFilterLevel(level)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: `1px solid ${filterLevel === level ? '#00E5FF' : 'rgba(0,229,255,0.1)'}`,
                  background: filterLevel === level ? 'rgba(0,229,255,0.1)' : 'transparent',
                  color: filterLevel === level ? '#00E5FF' : '#8BAFC4',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontFamily: 'Inter, sans-serif',
                  textTransform: 'capitalize',
                }}
              >
                {level === 'all' ? 'Semua' : level}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#4A6B84' }}>Memuat data...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {persons.map((person, i) => (
            <motion.div
              key={person.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <GlassCard hover style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  {/* Avatar */}
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(0,151,178,0.15)', border: '2px solid #0097B2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0, overflow: 'hidden' }}>
                    {person.photoUrl ? (
                       <img src={person.photoUrl} alt={person.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                       <FontAwesomeIcon icon={faUser} />
                    )}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: '#E8F4F8', fontFamily: 'Inter, sans-serif' }}>
                      {person.fullName}
                      {person.alias?.length > 0 && <span style={{ color: '#4A6B84', marginLeft: '8px', fontSize: '13px' }}>({person.alias.join(', ')})</span>}
                    </div>
                    <div style={{ color: '#4A6B84', fontSize: '12px', marginTop: '2px', fontFamily: 'JetBrains Mono, monospace' }}>
                      {person.description || 'Tidak ada catatan'}
                    </div>
                  </div>
                  {/* Danger level */}
                  <DangerBadge level={person.dangerLevel} />
                  {/* Active status */}
                  <StatusDot status={person.isActive ? 'online' : 'offline'} showLabel />
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {!filterDeleted ? (
                      <>
                        <Button variant="secondary" size="sm" onClick={() => setEditingPerson(person)}>Edit</Button>
                        <Button
                          variant={person.isActive ? 'danger' : 'ghost'}
                          size="sm"
                          onClick={async () => {
                            await watchlistApi.update(person.id, { is_active: !person.isActive } as any);
                            fetchPersons();
                            showToast(`Person berhasil ${person.isActive ? 'dinonaktifkan' : 'diaktifkan'}`);
                          }}
                        >
                          {person.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeletingPerson(person)}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </Button>
                      </>
                    ) : (
                      <span style={{ color: '#FF3D3D', fontSize: '12px', fontWeight: 600, padding: '6px 12px', background: 'rgba(255, 61, 61, 0.1)', borderRadius: '99px', fontFamily: 'Inter, sans-serif' }}>
                        Telah Dihapus
                      </span>
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
          {persons.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px', color: '#4A6B84', fontFamily: 'Inter, sans-serif' }}>
              Tidak ada person ditemukan
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && <AddPersonModal onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); fetchPersons(); showToast('Person berhasil ditambahkan!'); }} />}
        {editingPerson && <EditPersonModal person={editingPerson} onClose={() => setEditingPerson(null)} onSuccess={() => { setEditingPerson(null); fetchPersons(); showToast('Person berhasil diperbarui!'); }} />}
        
        {/* Delete Confirmation Modal */}
        {deletingPerson && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(6, 13, 20, 0.85)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px'
            }}
            onClick={() => setDeletingPerson(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#112236', border: '1px solid rgba(255, 61, 61, 0.3)', borderRadius: '24px',
                padding: '32px', width: '100%', maxWidth: '400px', textAlign: 'center'
              }}
            >
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,61,61,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#FF3D3D'
              }}>
                <FontAwesomeIcon icon={faTrash} style={{ fontSize: '24px' }} />
              </div>
              <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '18px', fontWeight: 700, color: '#E8F4F8', marginBottom: '8px' }}>
                Hapus dari Watchlist?
              </h2>
              <p style={{ color: '#8BAFC4', fontSize: '14px', marginBottom: '24px', lineHeight: 1.5 }}>
                Apakah Anda yakin ingin menghapus <strong>{deletingPerson.fullName}</strong>? Data ini tidak akan ditampilkan lagi.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button variant="ghost" fullWidth onClick={() => setDeletingPerson(null)}>Batal</Button>
                <Button variant="danger" fullWidth onClick={async () => {
                  try {
                    await watchlistApi.delete(deletingPerson.id);
                    setDeletingPerson(null);
                    fetchPersons();
                    showToast('Person berhasil dihapus dari Watchlist');
                  } catch (err) {
                    console.error(err);
                    showToast('Gagal menghapus person', 'error');
                  }
                }}>Hapus</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />
    </div>
  );
}
