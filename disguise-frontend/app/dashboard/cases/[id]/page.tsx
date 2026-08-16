'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft, faSpinner, faUser, faShieldAlt, faCheck, faFolderOpen, faPaperPlane, faVideo
} from '@fortawesome/free-solid-svg-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge, DangerBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { formatRelative, formatDate } from '@/utils/format';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { casesApi } from '@/services/casesApi';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function CaseDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [noteContent, setNoteContent] = useState('');

  const { data: resData, isLoading, error } = useQuery({
    queryKey: ['cases', params.id],
    queryFn: () => casesApi.getById(params.id),
  });

  const caseData = resData?.data;

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => casesApi.updateStatus(params.id, { status }),
    onSuccess: () => {
      toast.success('Status kasus berhasil diperbarui');
      queryClient.invalidateQueries({ queryKey: ['cases', params.id] });
    },
    onError: () => toast.error('Gagal memperbarui status'),
  });

  const addNoteMutation = useMutation({
    mutationFn: (content: string) => {
      const fd = new FormData();
      fd.append('content', content);
      return casesApi.addNote(params.id, fd as any);
    },
    onSuccess: () => {
      setNoteContent('');
      toast.success('Catatan ditambahkan');
      queryClient.invalidateQueries({ queryKey: ['cases', params.id] });
    },
    onError: () => toast.error('Gagal menambahkan catatan'),
  });

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px', color: '#00CFE8' }}>
        <FontAwesomeIcon icon={faSpinner} spin size="2x" />
        <div style={{ marginTop: '16px', fontFamily: 'Orbitron, monospace' }}>Memuat data investigasi...</div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div style={{ textAlign: 'center', padding: '100px', color: '#FF3D3D' }}>
        <h2>Gagal memuat data kasus</h2>
        <Button onClick={() => router.back()} variant="ghost">Kembali</Button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <button
            onClick={() => router.back()}
            style={{ background: 'rgba(0, 229, 255, 0.1)', border: '1px solid rgba(0, 229, 255, 0.2)', width: 40, height: 40, borderRadius: '10px', color: '#00E5FF', cursor: 'pointer' }}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <div>
            <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: '24px', fontWeight: 700, color: '#E8F4F8', display: 'flex', alignItems: 'center', gap: '12px' }}>
              {caseData.title}
              <Badge variant={caseData.status === 'closed' ? 'default' : caseData.status === 'investigating' ? 'high' : 'info'}>
                {caseData.status.toUpperCase()}
              </Badge>
            </h1>
            <div style={{ color: '#8BAFC4', fontSize: '13px', marginTop: '4px', fontFamily: 'JetBrains Mono, monospace' }}>
              ID Kasus: {caseData.caseNumber} · Dibuat: {formatDate(new Date(caseData.createdAt), 'dd MMM yyyy HH:mm')}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {caseData.status !== 'closed' && (
            <Button
              variant="secondary"
              loading={updateStatusMutation.isPending}
              onClick={() => updateStatusMutation.mutate('closed')}
            >
              <FontAwesomeIcon icon={faCheck} style={{ marginRight: '8px' }} /> Tutup Kasus
            </Button>
          )}
          {caseData.status === 'open' && (
            <Button
              variant="fox"
              loading={updateStatusMutation.isPending}
              onClick={() => updateStatusMutation.mutate('investigating')}
            >
              <FontAwesomeIcon icon={faFolderOpen} style={{ marginRight: '8px' }} /> Mulai Investigasi
            </Button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Case Info */}
          <GlassCard style={{ padding: '24px' }}>
            <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '15px', fontWeight: 600, color: '#00CFE8', marginBottom: '16px', textTransform: 'uppercase' }}>
              Informasi Utama
            </h2>
            <div style={{ fontSize: '14px', color: '#E8F4F8', lineHeight: 1.6, marginBottom: '24px' }}>
              {caseData.description || 'Tidak ada deskripsi awal untuk kasus ini.'}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <div style={{ color: '#8BAFC4', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Penyidik Utama</div>
                <div style={{ color: '#E8F4F8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FontAwesomeIcon icon={faUser} style={{ color: '#00CFE8' }} />
                  {caseData.leadInvestigator?.fullName || 'Belum ditugaskan'}
                </div>
              </div>
              <div>
                <div style={{ color: '#8BAFC4', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Prioritas</div>
                <DangerBadge level={caseData.priority} />
              </div>
            </div>
          </GlassCard>

          {/* Attached Alerts */}
          <GlassCard style={{ padding: '24px' }}>
            <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '15px', fontWeight: 600, color: '#00CFE8', marginBottom: '20px', textTransform: 'uppercase' }}>
              Bukti Alert Tertaut ({caseData.caseAlerts?.length || 0})
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {caseData.caseAlerts && caseData.caseAlerts.length > 0 ? (
                caseData.caseAlerts.map((ca: any) => (
                  <div key={ca.id} style={{ display: 'flex', gap: '16px', padding: '16px', background: 'rgba(0,151,178,0.05)', borderRadius: '12px', border: '1px solid rgba(0,229,255,0.1)' }}>
                    <div style={{ width: 60, height: 60, borderRadius: '8px', overflow: 'hidden', border: '1px solid #00CFE8' }}>
                      <img src={ca.alert.detectionEvent?.faceCropUrl} alt="Target" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#E8F4F8', fontFamily: 'Inter, sans-serif' }}>
                        {ca.alert.person?.fullName || 'Target Tidak Dikenal'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#8BAFC4', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FontAwesomeIcon icon={faVideo} /> {ca.alert.detectionEvent?.source?.name || 'Kamera'}
                        <span>·</span>
                        {formatRelative(ca.alert.detectionEvent?.detectedAt)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#4A6B84', fontSize: '13px' }}>
                  Belum ada alert yang ditautkan ke kasus ini.
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Notes & Journal */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <GlassCard style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '15px', fontWeight: 600, color: '#00CFE8', marginBottom: '20px', textTransform: 'uppercase' }}>
              Jurnal Investigasi
            </h2>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
              {caseData.notes && caseData.notes.length > 0 ? (
                caseData.notes.map((note: any) => (
                  <div key={note.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#E8F4F8' }}>{note.createdByUser?.fullName}</span>
                      <span style={{ fontSize: '11px', color: '#4A6B84' }}>{formatRelative(note.createdAt)}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#8BAFC4', lineHeight: 1.5 }}>
                      {note.content}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#4A6B84', fontSize: '13px' }}>
                  Belum ada catatan investigasi.
                </div>
              )}
            </div>

            {/* Note Input */}
            {caseData.status !== 'closed' && (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <Textarea
                    placeholder="Tambahkan catatan/laporan..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                  />
                </div>
                <Button
                  variant="fox"
                  disabled={!noteContent.trim() || addNoteMutation.isPending}
                  onClick={() => addNoteMutation.mutate(noteContent)}
                >
                  <FontAwesomeIcon icon={faPaperPlane} />
                </Button>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
