'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, BarChart as RechartBarChart,
} from 'recharts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';

// Mock analytics data
const detectionData = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i.toString().padStart(2, '0')}:00`,
  count: Math.floor(Math.random() * 100 + 20),
}));

const similarityData = [
  { range: '> 5.5 (Low)', count: 45, fill: '#FF3D3D' },
  { range: '4.5-5.5', count: 120, fill: '#FF8C5A' },
  { range: '3.5-4.5 (Sedang)', count: 280, fill: '#FFD600' },
  { range: '2.5-3.5 (Tinggi)', count: 390, fill: '#00CFE8' },
  { range: '< 2.5 (Kuat)', count: 165, fill: '#00E676' },
];

const alertStatusData = [
  { name: 'Pending', value: 15, fill: '#FF6B35' },
  { name: 'Confirmed', value: 48, fill: '#00E676' },
  { name: 'Dismissed', value: 12, fill: '#4A6B84' },
];

const topCameraData = [
  { camera: 'Pintu Masuk', count: 342 },
  { camera: 'Terminal A', count: 280 },
  { camera: 'Parkir B', count: 215 },
  { camera: 'Lobi Utama', count: 178 },
  { camera: 'Exit Gate', count: 134 },
];

const modelMetrics = {
  rocAuc: 0.9927,
  tpr: 97.42,
  threshold: 3.50,
  fpr: 10.57,
};

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('7d');

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
          <Button variant="secondary" size="md">
            <FontAwesomeIcon icon={faDownload} style={{ fontSize: '16px' }} /> Export PDF
          </Button>
        </div>
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }} className="chart-row">
        <GlassCard style={{ padding: '24px' }}>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '14px', fontWeight: 600, color: '#E8F4F8', marginBottom: '20px' }}>
            Deteksi Per Jam
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={detectionData}>
              <defs>
                <linearGradient id="detectGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0097B2" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0097B2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,229,255,0.06)" />
              <XAxis dataKey="hour" tick={{ fill: '#4A6B84', fontSize: 10 }} tickLine={false} interval={5} />
              <YAxis tick={{ fill: '#4A6B84', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#1A3350', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '10px', color: '#E8F4F8', fontSize: '12px' }} />
              <Area type="monotone" dataKey="count" stroke="#0097B2" strokeWidth={2} fill="url(#detectGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard style={{ padding: '24px' }}>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '14px', fontWeight: 600, color: '#E8F4F8', marginBottom: '20px' }}>
            Alert Per Status
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
            {alertStatusData.map((d) => (
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
            Distribusi Similarity Score
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={similarityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,229,255,0.06)" />
              <XAxis dataKey="range" tick={{ fill: '#4A6B84', fontSize: 10 }} tickLine={false} />
              <YAxis tick={{ fill: '#4A6B84', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#1A3350', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '10px', color: '#E8F4F8', fontSize: '12px' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {similarityData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard style={{ padding: '24px' }}>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '14px', fontWeight: 600, color: '#E8F4F8', marginBottom: '20px' }}>
            Top Kamera Terbanyak Deteksi
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topCameraData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,229,255,0.06)" />
              <XAxis type="number" tick={{ fill: '#4A6B84', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="camera" tick={{ fill: '#8BAFC4', fontSize: 11 }} tickLine={false} width={80} />
              <Tooltip contentStyle={{ background: '#1A3350', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '10px', color: '#E8F4F8', fontSize: '12px' }} />
              <Bar dataKey="count" fill="#0097B2" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Model Metrics */}
      <GlassCard glow="teal" style={{ padding: '28px' }}>
        <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '15px', fontWeight: 600, color: '#E8F4F8', marginBottom: '20px' }}>
          Metrik Performa Model
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }} className="metrics-grid">
          {[
            { label: 'ROC-AUC', value: modelMetrics.rocAuc.toFixed(4), color: '#00E676', desc: 'Area Under Curve' },
            { label: 'True Positive Rate', value: `${modelMetrics.tpr}%`, color: '#00CFE8', desc: 'Sensitivity' },
            { label: 'Optimal Threshold', value: modelMetrics.threshold.toFixed(2), color: '#FF6B35', desc: 'Euclidean Distance (L2)' },
            { label: 'False Positive Rate', value: `${modelMetrics.fpr}%`, color: '#FFD600', desc: 'Global Evaluated' },
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
      `}</style>
    </div>
  );
}
