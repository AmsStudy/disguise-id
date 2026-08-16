'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/services/analyticsApi';

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('7d');

  const { data: dashboard, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => analyticsApi.getDashboard(),
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: performance, isLoading: isLoadingPerformance } = useQuery({
    queryKey: ['analytics', 'performance'],
    queryFn: () => analyticsApi.getPerformance(),
    refetchInterval: 60000,
  });

  const isLoading = isLoadingDashboard || isLoadingPerformance;

  // Format hourly detection data
  const detectionData = (dashboard?.hourly_detection_chart || []).map((d: any) => ({
    hour: new Date(d.hour).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    count: d.count,
  }));

  // Format alert status data
  const rawStatus = dashboard?.alerts_by_status || { pending: 0, confirmed: 0, dismissed: 0 };
  const alertStatusData = [
    { name: 'Pending', value: rawStatus.pending, fill: '#FF6B35' },
    { name: 'Confirmed', value: rawStatus.confirmed, fill: '#00E676' },
    { name: 'Dismissed', value: rawStatus.dismissed, fill: '#4A6B84' },
  ].filter(d => d.value > 0);

  // Default empty state if no data
  if (alertStatusData.length === 0) {
    alertStatusData.push({ name: 'No Alerts', value: 1, fill: 'rgba(255,255,255,0.1)' });
  }

  // Format similarity distribution data
  const similarityData = (performance?.similarity_distribution || []).map((d: any) => {
    let fill = '#00CFE8';
    if (d.bucket === '0.5-0.6') fill = '#FF3D3D';
    if (d.bucket === '0.6-0.7') fill = '#FF8C5A';
    if (d.bucket === '0.7-0.8') fill = '#FFD600';
    if (d.bucket === '0.8-0.9') fill = '#00CFE8';
    if (d.bucket === '0.9-1.0') fill = '#00E676';
    return {
      range: d.bucket,
      count: d.count,
      fill,
    };
  });

  // Format top camera data
  const topCameraData = (dashboard?.top_active_cameras || []).map((c: any) => ({
    camera: c.camera?.name || 'Unknown',
    count: c.detections,
  }));

  // Derived metrics
  const fpr = performance?.false_positive_rate ? (performance.false_positive_rate * 100).toFixed(2) : '0.00';
  const threshold = performance?.similarity_score?.avg ? performance.similarity_score.avg.toFixed(2) : '0.00';

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(0,229,255,0.2)', borderTopColor: '#00E5FF', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontFamily: 'Orbitron, monospace' }}>Loading Analytics...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: '20px', fontWeight: 700, color: '#E8F4F8' }}>Analytics</h1>
          <p style={{ color: '#8BAFC4', fontSize: '13px', marginTop: '4px' }}>Analitik performa sistem dan model ML</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {['24h', '7d', '30d'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: `1px solid ${period === p ? '#00E5FF' : 'rgba(0,229,255,0.1)'}`,
                  background: period === p ? 'rgba(0,229,255,0.1)' : 'transparent',
                  color: period === p ? '#00E5FF' : '#8BAFC4',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {p}
              </button>
            ))}
          </div>
          <Button variant="secondary" size="md" onClick={() => window.print()}>
            <FontAwesomeIcon icon={faDownload} style={{ fontSize: '16px' }} /> Export PDF
          </Button>
        </div>
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }} className="chart-row">
        <GlassCard style={{ padding: '24px' }}>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '14px', fontWeight: 600, color: '#E8F4F8', marginBottom: '20px' }}>
            Deteksi 24 Jam Terakhir
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            {detectionData.length > 0 ? (
              <AreaChart data={detectionData}>
                <defs>
                  <linearGradient id="detectGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0097B2" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0097B2" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,229,255,0.06)" />
                <XAxis dataKey="hour" tick={{ fill: '#4A6B84', fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fill: '#4A6B84', fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#1A3350', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '10px', color: '#E8F4F8', fontSize: '12px' }} />
                <Area type="monotone" dataKey="count" stroke="#0097B2" strokeWidth={2} fill="url(#detectGrad)" />
              </AreaChart>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
                Tidak ada data deteksi
              </div>
            )}
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard style={{ padding: '24px' }}>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '14px', fontWeight: 600, color: '#E8F4F8', marginBottom: '20px' }}>
            Alert Per Status (All Time)
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={alertStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                {alertStatusData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1A3350', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '10px', color: '#E8F4F8', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
            {alertStatusData.filter(d => d.name !== 'No Alerts').map((d) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.fill }} />
                  <span style={{ color: '#8BAFC4', fontFamily: 'Inter, sans-serif' }}>{d.name}</span>
                </div>
                <span style={{ color: '#E8F4F8', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{d.value}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }} className="chart-row2">
        <GlassCard style={{ padding: '24px' }}>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '14px', fontWeight: 600, color: '#E8F4F8', marginBottom: '20px' }}>
            Distribusi Similarity Score (Euclidean L2)
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            {similarityData.length > 0 ? (
              <BarChart data={similarityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,229,255,0.06)" />
                <XAxis dataKey="range" tick={{ fill: '#4A6B84', fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fill: '#4A6B84', fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#1A3350', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '10px', color: '#E8F4F8', fontSize: '12px' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {similarityData.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
                Tidak ada data score
              </div>
            )}
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard style={{ padding: '24px' }}>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '14px', fontWeight: 600, color: '#E8F4F8', marginBottom: '20px' }}>
            Top 5 Kamera Hari Ini
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            {topCameraData.length > 0 ? (
              <BarChart data={topCameraData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,229,255,0.06)" />
                <XAxis type="number" tick={{ fill: '#4A6B84', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="camera" tick={{ fill: '#8BAFC4', fontSize: 11 }} tickLine={false} width={120} />
                <Tooltip contentStyle={{ background: '#1A3350', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '10px', color: '#E8F4F8', fontSize: '12px' }} />
                <Bar dataKey="count" fill="#0097B2" radius={[0, 4, 4, 0]} />
              </BarChart>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
                Tidak ada data kamera
              </div>
            )}
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Model Metrics */}
      <GlassCard glow="teal" style={{ padding: '28px' }}>
        <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '15px', fontWeight: 600, color: '#E8F4F8', marginBottom: '20px' }}>
          Metrik Performa & Sistem
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }} className="metrics-grid">
          {[
            { label: 'Total Alert System', value: performance?.total_alerts || 0, color: '#00CFE8', desc: 'All time records' },
            { label: 'AVG Inference Time', value: `${performance?.avg_processing_ms ? Math.round(performance.avg_processing_ms) : 0}ms`, color: '#00E676', desc: 'Per wajah (InceptionResNet)' },
            { label: 'AVG Distance L2', value: threshold, color: '#FF6B35', desc: 'Rata-rata jarak vektor (Match)' },
            { label: 'False Positive Rate', value: `${fpr}%`, color: '#FFD600', desc: 'Alert ditolak (Dismissed)' },
          ].map((m) => (
            <div
              key={m.label}
              style={{
                padding: '20px',
                background: `${m.color}0A`,
                border: `1px solid ${m.color}25`,
                borderRadius: '14px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '28px', fontWeight: 700, color: m.color, marginBottom: '8px' }}>
                {m.value}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#E8F4F8', fontFamily: 'Inter, sans-serif', marginBottom: '4px' }}>
                {m.label}
              </div>
              <div style={{ fontSize: '11px', color: '#4A6B84', fontFamily: 'Inter, sans-serif' }}>
                {m.desc}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <style>{`
        @media (max-width: 1024px) {
          .chart-row { grid-template-columns: 1fr !important; }
          .chart-row2 { grid-template-columns: 1fr !important; }
          .metrics-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .metrics-grid { grid-template-columns: 1fr !important; }
        }
        
        @media print {
          body { background: white !important; color: black !important; }
          .chart-row, .chart-row2 { grid-template-columns: 1fr 1fr !important; break-inside: avoid; }
          button { display: none !important; }
          * { text-shadow: none !important; box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
