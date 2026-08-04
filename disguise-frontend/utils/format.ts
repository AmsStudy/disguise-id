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

export const formatSimilarity = (score: number): string => {
  return `${(score * 100).toFixed(1)}%`;
};

export const getSimilarityColor = (score: number): string => {
  if (score >= 0.8) return '#00E676';
  if (score >= 0.57) return '#FFD600';
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
