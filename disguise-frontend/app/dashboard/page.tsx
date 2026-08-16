'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faBell, faCamera, faUsers, faArrowTrendUp, faArrowTrendDown, faArrowRight, faUser } from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { SimilarityScore } from '@/components/ui/SimilarityScore';
import { StatusDot } from '@/components/ui/StatusDot';
import { useAuthStore } from '@/store/authStore';
import { formatRelative, formatDate } from '@/utils/format';
import CountUp from 'react-countup';
import { analyticsApi, alertApi } from '@/services/api';
import { useAlertStore } from '@/store/alertStore';



export default function DashboardPage() {
  const { user } = useAuthStore();
  const [started, setStarted] = useState(false);
  const [stats, setStats] = useState<any>({
    detectionsToday: 0,
    detectionsChange: 0,
    pendingAlerts: 0,
    camerasOnline: 0,
    camerasTotal: 0,
    watchlistActive: 0,
  });
  const { alerts, setAlerts } = useAlertStore();
  const recentAlerts = alerts.slice(0, 5);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), 200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [dashRes, alertsRes] = await Promise.all([
          analyticsApi.dashboard(),
          alertApi.list({ limit: 5 })
        ]);
        
        if (dashRes.data && dashRes.data.data) {
          const dashboardData = dashRes.data.data;
          setStats({
            detectionsToday: dashboardData.today?.total_detections || 0,
            detectionsChange: 0, // Mocking change for now
            pendingAlerts: dashboardData.alerts_by_status?.pending || 0,
            camerasOnline: dashboardData.today?.cameras_online || 0,
            camerasTotal: (dashboardData.today?.cameras_online || 0) + (dashboardData.today?.cameras_offline || 0),
            watchlistActive: dashboardData.watchlist_count || 0,
          });

          if (dashboardData.hourly_detection_chart) {
            setChartData(dashboardData.hourly_detection_chart.map((d: any) => ({
              hour: new Date(d.hour).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
              detections: d.count
            })));
          }
        }
        
        if (alertsRes.data && alertsRes.data.data) {
          // Best-Shot selection: showcase the capture with the highest biometric accuracy (smallest distance) per target person
          const bestShots = new Map<string, any>();
          alertsRes.data.data.forEach((a: any) => {
            const pid = a.person?.id || a.personId || a.id;
            const existing = bestShots.get(pid);
            const aDist = Math.abs(Number(a.similarityScore || 999));
            const existDist = existing ? Math.abs(Number(existing.similarityScore || 999)) : Infinity;
            if (!existing || aDist < existDist) {
              bestShots.set(pid, a);
            }
          });
          // Only overwrite store if it's currently empty, to not destroy WebSocket live updates
          if (useAlertStore.getState().alerts.length === 0) {
             setAlerts(Array.from(bestShots.values()));
          }
        }
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      }
    };
    
    fetchDashboard();
  }, []);

  const statCards = [
    { label: 'Deteksi Hari Ini', value: stats.detectionsToday, change: stats.detectionsChange, icon: faEye, color: '#0097B2', positive: true },
    { label: 'Alert Pending', value: stats.pendingAlerts, icon: faBell, color: '#FF6B35', alert: true },
    { label: 'Kamera Online', value: `${stats.camerasOnline}/${stats.camerasTotal}`, icon: faCamera, color: '#00CFE8', isString: true },
    { label: 'Watchlist Aktif', value: stats.watchlistActive, icon: faUsers, color: '#00E5FF' },
  ];

  return (
    <div>
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '32px' }}
      >
        <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: '22px', fontWeight: 700, color: '#E8F4F8' }}>
          Selamat datang, <span style={{ color: '#00E5FF' }}>{user?.name || 'Operator'}</span>
        </h1>
        <p style={{ color: '#8BAFC4', fontSize: '14px', marginTop: '4px', fontFamily: 'Inter, sans-serif' }}>
          {formatDate(new Date(), 'EEEE, dd MMMM yyyy')} · Semua sistem operasional
        </p>
      </motion.div>

      {/* Stat cards */}
      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '28px' }}
        className="stat-grid"
      >
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <GlassCard style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '12px',
                      background: `${stat.color}15`,
                      border: `1px solid ${stat.color}30`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FontAwesomeIcon icon={Icon} style={{ fontSize: '20px', color: stat.color }} />
                  </div>
                  {stat.alert && (
                    <Badge variant="high" pulse>urgent</Badge>
                  )}
                  {stat.change !== undefined && stat.change !== 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: stat.positive ? '#00E676' : '#FF3D3D', fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>
                      {stat.positive ? <FontAwesomeIcon icon={faArrowTrendUp} style={{ fontSize: '14px' }} /> : <FontAwesomeIcon icon={faArrowTrendDown} style={{ fontSize: '14px' }} />}
                      +{stat.change}%
                    </div>
                  )}
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '32px', fontWeight: 700, color: stat.color, marginBottom: '4px' }}>
                  {stat.isString ? stat.value : (
                    started ? <CountUp end={stat.value as number} duration={1.5} separator="," /> : 0
                  )}
                </div>
                <div style={{ fontSize: '13px', color: '#8BAFC4', fontFamily: 'Inter, sans-serif' }}>
                  {stat.label}
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }} className="bottom-grid">
        {/* Recent Alerts */}
        <GlassCard style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '15px', fontWeight: 600, color: '#E8F4F8' }}>
              Alert Terbaru
            </h2>
            <Link href="/dashboard/alerts" style={{ color: '#00CFE8', fontSize: '13px', fontFamily: 'Inter, sans-serif', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Lihat Semua <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: '14px' }} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentAlerts.map((alert) => (
              <div
                key={alert.id}
                className="alert-item-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '14px',
                  background: 'linear-gradient(135deg, rgba(17, 34, 54, 0.8) 0%, rgba(10, 22, 36, 0.9) 100%)',
                  border: `1px solid ${alert.priority === 'critical' ? '#FF3D3D' : alert.status === 'pending' ? '#00E5FF' : 'rgba(0,229,255,0.15)'}`,
                  boxShadow: alert.priority === 'critical' ? '0 0 16px rgba(255, 61, 61, 0.35)' : alert.status === 'pending' ? '0 0 12px rgba(0, 229, 255, 0.25)' : 'none',
                  borderRadius: '12px',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                  animation: alert.priority === 'critical' && alert.status === 'pending' ? 'pulseGlow 2s ease-in-out infinite' : undefined,
                }}
              >
                {/* Left Header Group for Mobile Responsive Splitting */}
                <div className="alert-item-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                  {/* Forensic Face Crop with Animated Scan Laser */}
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '10px',
                      background: 'rgba(0, 151, 178, 0.15)',
                      border: `1.5px solid ${alert.priority === 'critical' ? '#FF3D3D' : '#00CFE8'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      flexShrink: 0,
                      position: 'relative',
                      overflow: 'hidden',
                      boxShadow: alert.priority === 'critical' ? '0 0 10px rgba(255, 61, 61, 0.4)' : '0 0 8px rgba(0, 207, 232, 0.3)',
                    }}
                  >
                    {alert.detectionEvent?.faceCropUrl ? (
                      <img src={alert.detectionEvent.faceCropUrl} alt="Face" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" decoding="async" />
                    ) : (
                      <FontAwesomeIcon icon={faUser} style={{ color: '#00CFE8' }} />
                    )}
                    {/* Active Holographic Laser Beam */}
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        height: '2px',
                        background: alert.priority === 'critical' ? '#FF3D3D' : '#00E5FF',
                        boxShadow: `0 0 8px ${alert.priority === 'critical' ? '#FF3D3D' : '#00E5FF'}`,
                        animation: 'faceScanLaser 2.2s ease-in-out infinite',
                      }}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#E8F4F8', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {alert.person?.fullName || 'Unknown Target'}
                      </span>
                      {alert.status === 'pending' && (
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: alert.priority === 'critical' ? '#FF3D3D' : '#00E676', boxShadow: `0 0 6px ${alert.priority === 'critical' ? '#FF3D3D' : '#00E676'}`, display: 'inline-block' }} />
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#8BAFC4', fontFamily: 'Inter, sans-serif', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                      <span style={{ color: '#00CFE8', fontWeight: 500 }}>{alert.detectionEvent?.source?.name || 'Kamera CCTV'}</span>
                      <span>·</span>
                      <span>{alert.createdAt ? formatRelative(alert.createdAt) : 'Baru saja'}</span>
                    </div>
                  </div>
                </div>

                {/* Right / Bottom Metrics */}
                <div className="alert-item-metrics" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', minWidth: '80px' }}>
                  <SimilarityScore score={alert.similarityScore ?? alert.similarity ?? 0} size="sm" />
                  <Badge variant={alert.priority}>{alert.priority.toUpperCase()}</Badge>
                </div>
              </div>
            ))}
            {recentAlerts.length === 0 && (
              <div style={{ textAlign: 'center', color: '#4A6B84', fontSize: '13px', padding: '24px 0', border: '1px dashed rgba(0, 151, 178, 0.2)', borderRadius: '12px' }}>
                <FontAwesomeIcon icon={faUser} style={{ fontSize: '24px', color: 'rgba(0, 229, 255, 0.3)', marginBottom: '8px', display: 'block', margin: '0 auto 8px' }} />
                Belum ada deteksi alert baru dari CCTV
              </div>
            )}
          </div>
        </GlassCard>

        {/* Activity chart */}
        <GlassCard style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '15px', fontWeight: 600, color: '#E8F4F8' }}>
              Aktivitas 24 Jam
            </h2>
            <StatusDot status="online" showLabel />
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0097B2" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0097B2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,229,255,0.06)" />
              <XAxis dataKey="hour" tick={{ fill: '#4A6B84', fontSize: 10 }} tickLine={false} interval={5} />
              <YAxis tick={{ fill: '#4A6B84', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: '#1A3350', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '10px', color: '#E8F4F8', fontSize: '12px' }}
                cursor={{ stroke: '#00E5FF', strokeWidth: 1, strokeOpacity: 0.4 }}
              />
              <Area type="monotone" dataKey="detections" stroke="#0097B2" strokeWidth={2} fill="url(#tealGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      <style>{`
        @keyframes faceScanLaser {
          0% { top: 0%; opacity: 0.8; }
          50% { top: 88%; opacity: 1; }
          100% { top: 0%; opacity: 0.8; }
        }
        @media (max-width: 1200px) {
          .stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 768px) {
          .stat-grid { grid-template-columns: 1fr !important; }
          .bottom-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .alert-item-card {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
            padding: 16px !important;
          }
          .alert-item-header {
            width: 100% !important;
          }
          .alert-item-metrics {
            width: 100% !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between !important;
            border-top: 1px dashed rgba(0, 229, 255, 0.15) !important;
            padding-top: 10px !important;
          }
        }
      `}</style>
    </div>
  );
}
