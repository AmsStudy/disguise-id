'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faUser, faTrash, faEdit, faXmark, faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/services/usersApi';
import { toast } from 'sonner';

const UserModal: React.FC<{ user?: any, onClose: () => void, onSuccess: () => void }> = ({ user, onClose, onSuccess }) => {
  const [name, setName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(user?.role || 'operator');
  
  const isEditing = !!user;

  const saveMutation = useMutation({
    mutationFn: (data: any) => isEditing ? usersApi.update(user.id, data) : usersApi.create(data),
    onSuccess: () => {
      toast.success(isEditing ? 'Pengguna diperbarui' : 'Pengguna baru berhasil dibuat');
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Terjadi kesalahan saat menyimpan pengguna');
    }
  });

  const handleSave = () => {
    const payload: any = { full_name: name, email, role };
    if (password) payload.password = password; // only send password if provided
    saveMutation.mutate(payload);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(6, 13, 20, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#112236', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '460px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '18px', fontWeight: 700, color: '#E8F4F8' }}>
            {isEditing ? 'Edit Pengguna' : 'Tambah Pengguna'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8BAFC4', cursor: 'pointer' }}>
            <FontAwesomeIcon icon={faXmark} style={{ fontSize: '20px' }} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          <Input label="Nama Lengkap" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input 
            label={isEditing ? 'Kata Sandi Baru (Kosongkan jika tidak diubah)' : 'Kata Sandi'} 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required={!isEditing} 
          />
          <Select label="Role Akses" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="admin">Administrator (Penuh)</option>
            <option value="operator">Operator (Pengawasan & Investigasi)</option>
          </Select>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="ghost" fullWidth onClick={onClose}>Batal</Button>
          <Button 
            variant="fox" 
            fullWidth 
            loading={saveMutation.isPending} 
            onClick={handleSave}
            disabled={!name || !email || (!isEditing && !password)}
          >
            {saveMutation.isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [modalUser, setModalUser] = useState<{ show: boolean, user: any }>({ show: false, user: null });

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => {
      toast.success('Pengguna berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus pengguna');
    }
  });

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Yakin ingin menghapus akses sistem untuk ${name}?`)) {
      deleteMutation.mutate(id);
    }
  };

  const users = data?.data || [];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: '20px', fontWeight: 700, color: '#E8F4F8' }}>Manajemen Pengguna</h1>
          <p style={{ color: '#8BAFC4', fontSize: '13px', marginTop: '4px' }}>
            Kelola akses staf dan investigator sistem DISGUISE-ID
          </p>
        </div>
        <Button variant="fox" size="md" onClick={() => setModalUser({ show: true, user: null })}>
          <FontAwesomeIcon icon={faPlus} style={{ fontSize: '16px' }} /> Tambah User
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#4A6B84' }}>Memuat daftar pengguna...</div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#4A6B84' }}>Belum ada data pengguna.</div>
        ) : (
          users.map((u: any, i: number) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <GlassCard hover style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,151,178,0.15)', border: '2px solid #0097B2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#00CFE8', flexShrink: 0 }}>
                    {u.role === 'admin' ? <FontAwesomeIcon icon={faShieldHalved} /> : <FontAwesomeIcon icon={faUser} />}
                  </div>
                  
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: '#E8F4F8', fontFamily: 'Inter, sans-serif' }}>
                      {u.fullName}
                    </div>
                    <div style={{ color: '#8BAFC4', fontSize: '13px', marginTop: '2px' }}>
                      {u.email}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Badge variant={u.role === 'admin' ? 'high' : 'info'}>
                      {u.role.toUpperCase()}
                    </Badge>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button variant="secondary" size="sm" onClick={() => setModalUser({ show: true, user: u })}>
                        <FontAwesomeIcon icon={faEdit} />
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(u.id, u.fullName)} loading={deleteMutation.isPending && deleteMutation.variables === u.id}>
                        <FontAwesomeIcon icon={faTrash} />
                      </Button>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {modalUser.show && (
          <UserModal 
            user={modalUser.user} 
            onClose={() => setModalUser({ show: false, user: null })} 
            onSuccess={() => {
              setModalUser({ show: false, user: null });
              queryClient.invalidateQueries({ queryKey: ['users'] });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
