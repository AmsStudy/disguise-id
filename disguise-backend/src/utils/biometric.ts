export interface BiometricScoreInfo {
  raw: number;
  distance: number;
  percentage: number;
  display_text: string;
  confidence_band: 'high' | 'medium' | 'low';
  tier_label: 'TINGGI' | 'SEDANG' | 'RENDAH';
}

/**
 * Standard centralized formula to convert raw L2 Euclidean distance
 * or cosine similarity scores into consistent, user-friendly biometric percentages across Web and Mobile.
 * 
 * L2 Euclidean Distance (0.0 to 2.0):
 * - Distance 0.0 -> 100.0% match (Identitas Identik)
 * - Distance 0.6 -> 70.0% match (Sangat Mirip / Positif)
 * - Distance 1.11 -> 44.4% match (Kemiripan Rendah)
 * - Distance 2.0 -> 0.0% match (Berbeda Total)
 */
export function formatBiometricScore(rawScore: unknown): BiometricScoreInfo {
  const num = Number(rawScore || 0);
  const distance = Math.abs(num);

  let percentage: number;
  // If score was stored as negative L2 distance in DB (e.g. -1.1129) or raw distance > 1.0:
  if (num < 0 || distance > 1.0) {
    percentage = Math.max(0, Math.min(100, 100 * (1 - distance / 2.0)));
  } else {
    // Normalized 0.0 to 1.0
    percentage = Math.max(0, Math.min(100, num * 100));
  }

  const roundedPct = Number(percentage.toFixed(1));
  const displayText = `${roundedPct}%`;

  let confidenceBand: 'high' | 'medium' | 'low' = 'low';
  let tierLabel: 'TINGGI' | 'SEDANG' | 'RENDAH' = 'RENDAH';

  if (roundedPct >= 70.0 || (distance <= 0.60 && num < 0)) {
    confidenceBand = 'high';
    tierLabel = 'TINGGI';
  } else if (roundedPct >= 50.0 || (distance <= 1.00 && num < 0)) {
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
