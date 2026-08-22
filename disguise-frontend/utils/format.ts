import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

export const formatDate = (date: string | Date, fmt = 'dd MMM yyyy, HH:mm') => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, fmt, { locale: id });
};

export const formatRelative = (date: string | Date) => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: id });
};

function calculateCalibratedPercentage(distance: number): number {
  if (distance <= 0.70) {
    return Math.min(99.0, Math.max(92.0, 99.0 - (distance / 0.70) * 7.0));
  } else if (distance <= 1.12) {
    return 92.0 - ((distance - 0.70) / (1.12 - 0.70)) * 14.0;
  } else if (distance <= 1.30) {
    return 78.0 - ((distance - 1.12) / (1.30 - 1.12)) * 23.0;
  } else {
    return Math.max(0.0, 55.0 - ((distance - 1.30) / 0.70) * 55.0);
  }
}

export const formatSimilarity = (score: number): string => {
  const distance = Math.abs(score);
  if (score < 0 || distance > 1.0) {
    return `${calculateCalibratedPercentage(distance).toFixed(1)}%`;
  }
  return `${(score * 100).toFixed(1)}%`;
};

export const getSimilarityColor = (score: number): string => {
  const distance = Math.abs(score);
  let pct = score * 100;
  if (score < 0 || distance > 1.0) {
    pct = calculateCalibratedPercentage(distance);
  }
  if (pct >= 78.0) return '#00E676';
  if (pct >= 55.0) return '#FFD600';
  return '#FF3D3D';
};

export const getDangerColor = (level: string): string => {
  switch (level) {
    case 'critical': return '#FF3D3D';
    case 'high': return '#FF6B35';
    case 'medium': return '#FFD600';
    case 'low': return '#00E676';
    default: return '#4A6B84';
  }
};

export const formatNumber = (n: number): string => {
  return new Intl.NumberFormat('id-ID').format(n);
};
