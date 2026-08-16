'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFloppyDisk, faShieldHalved, faSliders, faServer, faCheck } from '@fortawesome/free-solid-svg-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/services/settingsApi';
import { toast } from 'sonner';

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const { data: organization, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getSettings(),
  });

  const { data: modelVersions, isLoading: isLoadingModels } = useQuery({
    queryKey: ['modelVersions'],
    queryFn: () => settingsApi.getModelVersions(),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: settingsApi.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings saved successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save settings');
    }
  });

  const activateModelMutation = useMutation({
    mutationFn: settingsApi.activateModelVersion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelVersions'] });
      toast.success('Model version activated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to activate model');
    }
  });

  // Local state for the form
  const [formData, setFormData] = useState({
    notification_email: '',
    default_threshold: '0.57',
    retention_days_events: '90',
  });

  // Load from DB to local state when query finishes
  useEffect(() => {
    if (organization?.settings) {
      setFormData({
        notification_email: organization.settings.notification_email || '',
        default_threshold: organization.settings.default_threshold?.toString() || '0.57',
        retention_days_events: organization.settings.retention_days_events?.toString() || '90',
      });
    }
  }, [organization]);

  const handleSave = () => {
    updateSettingsMutation.mutate({
      notification_email: formData.notification_email,
      default_threshold: parseFloat(formData.default_threshold),
      retention_days_events: parseInt(formData.retention_days_events, 10),
      retention_days_frames: parseInt(formData.retention_days_events, 10), // We sync them for simplicity
    });
  };

  const handleActivateModel = (versionId: string) => {
    if (confirm('Are you sure you want to activate this model version? This will affect all new inferences.')) {
      activateModelMutation.mutate(versionId);
    }
  };

  if (isLoadingSettings || isLoadingModels) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(0,229,255,0.2)', borderTopColor: '#00E5FF', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontFamily: 'Orbitron, monospace' }}>Loading Settings...</div>
        </div>
      </div>
    );
  }

  const activeModel = modelVersions?.find(v => v.isActive);

  const settingSections = [
    {
      icon: faShieldHalved,
      title: 'Konfigurasi Organisasi',
      color: '#0097B2',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input 
            label="Nama Organisasi (Read-Only)" 
            value={organization?.name || ''} 
            disabled 
            style={{ opacity: 0.7 }}
          />
          <Input 
            label="Email Alert Notifikasi" 
            type="email" 
            value={formData.notification_email} 
            onChange={(e) => setFormData(prev => ({ ...prev, notification_email: e.target.value }))} 
            placeholder="alert@polda.go.id"
          />
        </div>
      ),
    },
    {
      icon: faSliders,
      title: 'Parameter Model',
      color: '#FF6B35',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <Input
              label={`Similarity Threshold Default (Saat ini: ${formData.default_threshold})`}
              type="range"
              min="0.3"
              max="0.9"
              step="0.01"
              value={formData.default_threshold}
              onChange={(e) => setFormData(prev => ({ ...prev, default_threshold: e.target.value }))}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: '#4A6B84', fontFamily: 'JetBrains Mono, monospace' }}>
              <span>0.3 (lebih sensitif)</span>
              <span style={{ color: '#00E5FF', fontWeight: 700 }}>{formData.default_threshold}</span>
              <span>0.9 (lebih presisi)</span>
            </div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>
              Threshold ini digunakan secara default untuk sistem alert. Nilai yang terlalu rendah akan meningkatkan *false positive*.
            </p>
          </div>
          
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>
              Model Version (Active)
            </label>
            
            {activeModel ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,229,255,0.05)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(0,229,255,0.2)' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#00E5FF', fontFamily: 'Inter, sans-serif' }}>
                    {activeModel.version}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                    {activeModel.description || 'No description'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#00E5FF', fontSize: '12px', fontWeight: 600 }}>
                  <FontAwesomeIcon icon={faCheck} /> ACTIVE
                </div>
              </div>
            ) : (
              <div style={{ color: '#FF5555', fontSize: '13px' }}>No active model version selected!</div>
            )}

            <div style={{ marginTop: '16px' }}>
              <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', display: 'block' }}>
                Available Versions
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {modelVersions?.map(version => {
                  if (version.isActive) return null; // Skip active model here
                  return (
                    <div key={version.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>{version.version}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Created: {new Date(version.createdAt).toLocaleDateString()}</div>
                      </div>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => handleActivateModel(version.id)}
                        disabled={activateModelMutation.isPending}
                        style={{ fontSize: '11px', padding: '4px 12px' }}
                      >
                        Activate
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
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
            label="Retensi Data Events (Hari)"
            type="number"
            value={formData.retention_days_events}
            onChange={(e) => setFormData(prev => ({ ...prev, retention_days_events: e.target.value }))}
            placeholder="e.g. 90"
          />
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '-8px' }}>
            Data frame dan event inference yang usianya lebih tua dari batas ini akan dihapus secara otomatis dari storage.
          </p>
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
        <Button 
          variant="fox" 
          size="md" 
          loading={updateSettingsMutation.isPending} 
          onClick={handleSave} 
          id="save-settings-btn"
        >
          <FontAwesomeIcon icon={faFloppyDisk} style={{ fontSize: '16px' }} /> 
          {updateSettingsMutation.isPending ? 'Menyimpan...' : 'Simpan Semua'}
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }}>
        {settingSections.map((section, i) => {
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
