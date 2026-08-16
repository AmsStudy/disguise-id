'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHistory, faUserShield, faServer, faClock, faSearch } from '@fortawesome/free-solid-svg-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '@/services/auditApi';
import { formatRelative, formatDate } from '@/utils/format';

export default function AuditTrailPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['auditLogs', search],
    queryFn: () => auditApi.list({ search, limit: 100 }),
  });

  const logs = data?.data || [];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: '20px', fontWeight: 700, color: '#E8F4F8' }}>System Audit Trail</h1>
          <p style={{ color: '#8BAFC4', fontSize: '13px', marginTop: '4px' }}>
            Rekaman aktivitas sistem dan jejak forensik operasi pengguna.
          </p>
        </div>
        <div style={{ width: '300px' }}>
          <Input 
            placeholder="Cari aksi atau resource..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            icon={<FontAwesomeIcon icon={faSearch} />} 
          />
        </div>
      </div>

      <GlassCard style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(0, 229, 255, 0.1)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FontAwesomeIcon icon={faHistory} style={{ color: '#00CFE8' }} />
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '14px', fontWeight: 600, color: '#E8F4F8' }}>Log Aktivitas Terakhir</h2>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#4A6B84' }}>Memuat log...</div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#4A6B84' }}>Belum ada rekaman audit.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(0,151,178,0.05)', color: '#8BAFC4', fontSize: '12px', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>
                  <th style={{ padding: '16px 24px', fontWeight: 600 }}>Waktu</th>
                  <th style={{ padding: '16px 24px', fontWeight: 600 }}>Pengguna / Aktor</th>
                  <th style={{ padding: '16px 24px', fontWeight: 600 }}>Aksi</th>
                  <th style={{ padding: '16px 24px', fontWeight: 600 }}>Target Resource</th>
                  <th style={{ padding: '16px 24px', fontWeight: 600 }}>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any, i: number) => (
                  <motion.tr 
                    key={log.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '13px' }}
                  >
                    <td style={{ padding: '16px 24px', color: '#E8F4F8', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FontAwesomeIcon icon={faClock} style={{ color: '#4A6B84', fontSize: '12px' }} />
                        {formatDate(new Date(log.createdAt), 'dd MMM yy HH:mm:ss')}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      {log.user ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00CFE8', fontWeight: 500 }}>
                          <FontAwesomeIcon icon={faUserShield} style={{ fontSize: '12px' }} />
                          {log.user.fullName}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FF6B35', fontWeight: 500 }}>
                          <FontAwesomeIcon icon={faServer} style={{ fontSize: '12px' }} />
                          Sistem
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <Badge variant={log.action.includes('DELETE') ? 'high' : log.action.includes('CREATE') ? 'online' : 'info'}>
                        {log.action}
                      </Badge>
                    </td>
                    <td style={{ padding: '16px 24px', color: '#8BAFC4', fontFamily: 'JetBrains Mono, monospace' }}>
                      {log.resourceType} <span style={{ color: '#4A6B84' }}>#{log.resourceId}</span>
                    </td>
                    <td style={{ padding: '16px 24px', color: '#8BAFC4', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.newValue ? JSON.stringify(log.newValue) : '-'}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
