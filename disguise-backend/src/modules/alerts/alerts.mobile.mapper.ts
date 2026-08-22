import { formatBiometricScore } from '../../utils/biometric';

export const mapAlertToMobile = (alert: any) => {
  const scoreInfo = formatBiometricScore(alert.similarityScore);

  return {
    id: alert.id,
    created_at: alert.createdAt,
    status: alert.status,
    priority: alert.priority,
    detection_mode: 'single_frame',
    score: {
      raw: scoreInfo.percentage / 100,
      distance: scoreInfo.distance,
      display_text: scoreInfo.display_text,
      confidence_band: scoreInfo.confidence_band,
      tier_label: scoreInfo.tier_label
    },
    evidence: {
      vote_count: 1,
      total_frames: 1,
      vote_ratio: 1.0,
      summary_text: '1 dari 1 frame cocok',
      thumbnails: alert.detectionEvent?.faceCropUrl ? [alert.detectionEvent.faceCropUrl] : []
    },
    person: {
      id: alert.person?.id || '',
      full_name: alert.person?.fullName || 'Unknown',
      danger_level: alert.person?.dangerLevel || 'unknown',
      photo_url: alert.person?.photoUrl || '',
      case_number: alert.person?.caseReference || 'N/A'
    },
    camera: {
      id: alert.detectionEvent?.source?.id || '',
      name: alert.detectionEvent?.source?.name || 'Unknown Camera',
      location_name: alert.detectionEvent?.source?.locationName || '',
      zone_name: alert.detectionEvent?.source?.zoneName || 'Area',
      floor_level: alert.detectionEvent?.source?.floorLevel || 'Lantai 1',
      latitude: alert.detectionEvent?.source?.latitude ? Number(alert.detectionEvent.source.latitude) : null,
      longitude: alert.detectionEvent?.source?.longitude ? Number(alert.detectionEvent.source.longitude) : null
    }
  };
};
