'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faFileLines, faChevronRight, faXmark, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { formatRelative } from '@/utils/format';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { casesApi } from '@/services/casesApi';
import { toast } from 'sonner';

import { useRouter } from 'next/navigation';

const statusColors: Record<string, 'info' | 'high' | 'default'> = {
  open: 'info',
  investigating: 'high',
  closed: 'default',
};

const statusLabels: Record<string, string> = {
  open: 'Terbuka',
  investigating: 'Investigasi',
  closed: 'Ditutup',
};

const NewCaseModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  const createMutation = useMutation({
    mutationFn: casesApi.create,
    onSuccess: () => {
      toast.success('Kasus baru berhasil dibuat!');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal membuat kasus.');
    }
  });

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
        style={{ background: '#112236', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '500px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '18px', fontWeight: 700, color: '#E8F4F8' }}>Buat Kasus Baru</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8BAFC4', cursor: 'pointer' }}>
            <FontAwesomeIcon icon={faXmark} style={{ fontSize: '20px' }} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          <Input 
            label="Judul Kasus" 
            placeholder="Misal: Pencurian Area Parkir A" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            required 
          />
          <Textarea 
            label="Deskripsi & Catatan Awal" 
            placeholder="Kronologi singkat..." 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="ghost" fullWidth onClick={onClose}>Batal</Button>
          <Button 
            variant="fox" 
            fullWidth 
            loading={createMutation.isPending} 
            onClick={() => createMutation.mutate({ title, description })}
            disabled={!title.trim()}
          >
            {createMutation.isPending ? 'Menyimpan...' : 'Simpan Kasus'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function CasesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showNewModal, setShowNewModal] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['cases'],
    queryFn: () => casesApi.list(),
  });

  const cases = data?.data || [];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: '20px', fontWeight: 700, color: '#E8F4F8' }}>Cases</h1>
          <p style={{ color: '#8BAFC4', fontSize: '13px', marginTop: '4px' }}>
            {isLoading ? 'Memuat...' : `${cases.filter((c: any) => c.status !== 'closed').length} kasus aktif`}
          </p>
        </div>
        <Button variant="fox" size="md" id="new-case-btn" onClick={() => setShowNewModal(true)}>
          <FontAwesomeIcon icon={faPlus} style={{ fontSize: '16px' }} /> Buat Kasus Baru
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#4A6B84' }}>
            <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: '24px', marginBottom: '12px', color: '#00CFE8' }} />
            <div>Memuat daftar kasus...</div>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#FF3D3D' }}>
            Gagal memuat daftar kasus.
          </div>
        ) : cases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#4A6B84' }}>
            Tidak ada kasus investigasi.
          </div>
        ) : (
          cases.map((c: any, i: number) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => router.push(`/dashboard/cases/${c.id}`)}
            >
              <GlassCard hover style={{ padding: '24px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '12px',
                      background: 'rgba(0,151,178,0.15)',
                      border: '1px solid rgba(0,151,178,0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <FontAwesomeIcon icon={faFileLines} style={{ fontSize: '20px', color: '#00CFE8' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: '#E8F4F8', fontFamily: 'Inter, sans-serif' }}>{c.title}</div>
                    <div style={{ color: '#4A6B84', fontSize: '12px', marginTop: '4px', fontFamily: 'JetBrains Mono, monospace' }}>
                      {c.caseNumber} · Dibuat: {formatRelative(c.createdAt)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '20px', fontWeight: 700, color: '#00CFE8' }}>
                        {c.alerts ? c.alerts.length : 0}
                      </div>
                      <div style={{ fontSize: '11px', color: '#4A6B84' }}>Alerts Terkait</div>
                    </div>
                    <div style={{ fontSize: '13px', color: '#8BAFC4', fontFamily: 'Inter, sans-serif', width: '120px' }}>
                      Penyidik: {c.assignee?.name || 'Belum di-assign'}
                    </div>
                    <Badge variant={statusColors[c.status] || 'default'}>{statusLabels[c.status] || c.status}</Badge>
                    <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: '18px', color: '#4A6B84' }} />
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {showNewModal && (
          <NewCaseModal 
            onClose={() => setShowNewModal(false)} 
            onSuccess={() => {
              setShowNewModal(false);
              queryClient.invalidateQueries({ queryKey: ['cases'] });
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
