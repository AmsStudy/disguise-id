export interface BiometricScoreInfo {
  raw: number;
  distance: number;
  percentage: number;
  display_text: string;
  confidence_band: 'high' | 'medium' | 'low';
  tier_label: 'TINGGI' | 'SEDANG' | 'RENDAH';
}

/**
 * Calibrated Biometric Score Mapping for ArcFace / InsightFace Surveillance CCTV:
 * 
 * In real-world surveillance CCTV (angle, distance, compression, lighting variations),
 * true positive matches have L2 Euclidean distances between 0.60 and 1.12.
 * 
 * Calibrated Mapping:
 * - d <= 0.70  -> 92.0% - 99.0% (Identitas Positif / Studio Quality)
 * - d = 0.88   -> 86.0% (Match CCTV Sangat Tinggi)
 * - d = 1.00   -> 82.0% (Match CCTV Tinggi)
 * - d = 1.12   -> 78.0% (Ambang Batas Match Positif)
 * - d = 1.25   -> 62.0% (Kemiripan Sedang / Perlu Verifikasi)
 * - d >= 1.40  -> < 45.0% (Bukan Target / Orang Berbeda)
 */
export function calculateCalibratedPercentage(distance: number): number {
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

export function formatBiometricScore(rawScore: unknown): BiometricScoreInfo {
  const num = Number(rawScore || 0);
  const distance = Math.abs(num);

  let percentage: number;
  // If score was stored as negative L2 distance in DB (e.g. -0.88 or -1.1129) or raw distance > 1.0:
  if (num < 0 || distance > 1.0) {
    percentage = calculateCalibratedPercentage(distance);
  } else {
    // If score was already a normalized cosine similarity (0.0 to 1.0)
    percentage = Math.max(0, Math.min(100, num * 100));
  }

  const roundedPct = Number(percentage.toFixed(1));
  const displayText = `${roundedPct}%`;

  let confidenceBand: 'high' | 'medium' | 'low' = 'low';
  let tierLabel: 'TINGGI' | 'SEDANG' | 'RENDAH' = 'RENDAH';

  if (roundedPct >= 78.0 || (distance <= 1.12 && num < 0)) {
    confidenceBand = 'high';
    tierLabel = 'TINGGI';
  } else if (roundedPct >= 55.0 || (distance <= 1.30 && num < 0)) {
    confidenceBand = 'medium';
    tierLabel = 'SEDANG';
  } else {
    confidenceBand = 'low';
    tierLabel = 'RENDAH';
  }

  return {
    raw: num,
    distance: Number(distance.toFixed(3)),
    percentage: roundedPct,
    display_text: displayText,
    confidence_band: confidenceBand,
    tier_label: tierLabel,
  };
}
