'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faFileLines, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatRelative } from '@/utils/format';

const mockCases = [
  { id: '1', caseNumber: 'KASUS/001/2024', title: 'Pencurian Kendaraan Terminal A', status: 'investigating' as const, alertCount: 4, createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), assignedTo: 'Investigator A' },
  { id: '2', caseNumber: 'KASUS/002/2024', title: 'Penguntitan Zona Parkir B', status: 'open' as const, alertCount: 2, createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), assignedTo: 'Investigator B' },
  { id: '3', caseNumber: 'KASUS/003/2024', title: 'Ancaman Keamanan Lobi', status: 'closed' as const, alertCount: 7, createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), assignedTo: 'Investigator A' },
];

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

export default function CasesPage() {
  const [cases] = useState(mockCases);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: '20px', fontWeight: 700, color: '#E8F4F8' }}>Cases</h1>
          <p style={{ color: '#8BAFC4', fontSize: '13px', marginTop: '4px' }}>{cases.filter(c => c.status !== 'closed').length} kasus aktif</p>
        </div>
        <Button variant="fox" size="md" id="new-case-btn">
          <FontAwesomeIcon icon={faPlus} style={{ fontSize: '16px' }} /> Buat Kasus Baru
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {cases.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
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
                    {c.caseNumber} · {formatRelative(c.createdAt)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '20px', fontWeight: 700, color: '#00CFE8' }}>{c.alertCount}</div>
                    <div style={{ fontSize: '11px', color: '#4A6B84' }}>Alert</div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#8BAFC4', fontFamily: 'Inter, sans-serif' }}>
                    {c.assignedTo}
                  </div>
                  <Badge variant={statusColors[c.status]}>{statusLabels[c.status]}</Badge>
                  <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: '18px', color: '#4A6B84' }} />
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
