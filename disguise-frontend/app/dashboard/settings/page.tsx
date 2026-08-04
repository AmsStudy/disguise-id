'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFloppyDisk, faShieldHalved, faSliders, faUsers, faServer } from '@fortawesome/free-solid-svg-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';

export default function SettingsPage() {
  const [threshold, setThreshold] = useState('0.57');
  const [orgName, setOrgName] = useState('Kepolisian Daerah XYZ');
  const [alertEmail, setAlertEmail] = useState('alert@polda.go.id');
  const [retentionDays, setRetentionDays] = useState('90');
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaved(true);
    await new Promise((r) => setTimeout(r, 1500));
    setSaved(false);
  };

  const settingSections = [
    {
      icon: faShieldHalved,
      title: 'Konfigurasi Organisasi',
      color: '#0097B2',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input label="Nama Organisasi" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
          <Input label="Email Alert" type="email" value={alertEmail} onChange={(e) => setAlertEmail(e.target.value)} />
        </div>
      ),
    },
    {
      icon: faSliders,
      title: 'Parameter Model',
      color: '#FF6B35',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <Input
              label={`Similarity Threshold (saat ini: ${threshold})`}
              type="range"
              min="0.3"
              max="0.9"
              step="0.01"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: '#4A6B84', fontFamily: 'JetBrains Mono, monospace' }}>
              <span>0.3 (lebih sensitif)</span>
              <span style={{ color: '#00E5FF', fontWeight: 700 }}>{threshold}</span>
              <span>0.9 (lebih presisi)</span>
            </div>
          </div>
          <Select label="Model Version">
            <option value="v1">InceptionResNetV1 v1.0 (aktif)</option>
            <option value="v2">InceptionResNetV1 v1.1 (beta)</option>
          </Select>
          <Input label="Max Detections per Frame" type="number" defaultValue="5" />
        </div>
      ),
    },
    {
      icon: faServer,
      title: 'Data & Retensi',
      color: '#00CFE8',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Retensi Data (hari)"
            type="number"
            value={retentionDays}
            onChange={(e) => setRetentionDays(e.target.value)}
          />
          <Select label="Timezone">
            <option value="Asia/Jakarta">Asia/Jakarta (WIB, UTC+7)</option>
            <option value="Asia/Makassar">Asia/Makassar (WITA, UTC+8)</option>
            <option value="Asia/Jayapura">Asia/Jayapura (WIT, UTC+9)</option>
          </Select>
        </div>
      ),
    },
    {
      icon: faUsers,
      title: 'Manajemen User',
      color: '#00E5FF',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { name: 'Super Admin', email: 'superadmin@disguiseid.local', role: 'super_admin' },
            { name: 'Admin Polda', email: 'admin@polda.go.id', role: 'admin' },
            { name: 'Operator 1', email: 'operator@polda.go.id', role: 'operator' },
          ].map((u) => (
            <div
              key={u.email}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'rgba(17, 34, 54, 0.5)',
                borderRadius: '12px',
                border: '1px solid rgba(0,229,255,0.08)',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#E8F4F8', fontFamily: 'Inter, sans-serif' }}>{u.name}</div>
                <div style={{ fontSize: '12px', color: '#4A6B84', fontFamily: 'JetBrains Mono, monospace' }}>{u.email}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', background: 'rgba(0,151,178,0.15)', border: '1px solid rgba(0,151,178,0.3)', color: '#00CFE8', padding: '3px 8px', borderRadius: '6px', fontFamily: 'Inter, sans-serif' }}>
                  {u.role}
                </span>
                <Button variant="ghost" size="sm">Edit</Button>
              </div>
            </div>
          ))}
          <Button variant="secondary" size="md" id="add-user-btn">+ Tambah User</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: '20px', fontWeight: 700, color: '#E8F4F8' }}>Settings</h1>
          <p style={{ color: '#8BAFC4', fontSize: '13px', marginTop: '4px' }}>Konfigurasi sistem dan parameter DISGUISE-ID</p>
        </div>
        <Button variant="fox" size="md" loading={saved} onClick={handleSave} id="save-settings-btn">
          <FontAwesomeIcon icon={faFloppyDisk} style={{ fontSize: '16px' }} /> {saved ? 'Tersimpan' : 'Simpan Semua'}
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {settingSections.map((section, i) => {
          const Icon = section.icon;
          return (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <GlassCard style={{ padding: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '10px',
                      background: `${section.color}15`,
                      border: `1px solid ${section.color}30`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FontAwesomeIcon icon={section.icon} style={{ fontSize: '18px', color: section.color }} />
                  </div>
                  <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '15px', fontWeight: 600, color: '#E8F4F8' }}>
                    {section.title}
                  </h2>
                </div>
                {section.content}
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
