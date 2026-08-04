import prisma from '../../config/database';

export class AnalyticsService {
  async getDashboard(orgId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalDetectionsToday,
      totalAlertsToday,
      confirmedMatchesToday,
      falsePositivesToday,
      camerasOnline,
      camerasOffline,
      alertsByStatus,
      topActiveCameras,
      hourlyDetections,
    ] = await Promise.all([
      prisma.detectionEvent.count({ where: { organizationId: orgId, detectedAt: { gte: today } } }),
      prisma.alert.count({ where: { organizationId: orgId, createdAt: { gte: today } } }),
      prisma.alert.count({ where: { organizationId: orgId, status: 'confirmed', createdAt: { gte: today } } }),
      prisma.alert.count({ where: { organizationId: orgId, status: 'false_positive', createdAt: { gte: today } } }),
      prisma.cctvSource.count({ where: { organizationId: orgId, status: 'online', deletedAt: null } }),
      prisma.cctvSource.count({ where: { organizationId: orgId, status: 'offline', deletedAt: null } }),

      // Alerts by status
      prisma.alert.groupBy({
        by: ['status'],
        where: { organizationId: orgId },
        _count: { status: true },
      }),

      // Top active cameras today
      prisma.detectionEvent.groupBy({
        by: ['sourceId'],
        where: { organizationId: orgId, detectedAt: { gte: today } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),

      // Hourly detections for the last 24 hours
      this.getHourlyDetections(orgId),
    ]);

    // Enrich top active cameras
    const cameraIds = topActiveCameras.map((c) => c.sourceId);
    const cameras = await prisma.cctvSource.findMany({
      where: { id: { in: cameraIds } },
      select: { id: true, name: true, locationName: true },
    });

    const cameraMap = Object.fromEntries(cameras.map((c) => [c.id, c]));
    const topCamerasEnriched = topActiveCameras.map((c) => ({
      camera: cameraMap[c.sourceId],
      detections: c._count.id,
    }));

    const alertsByStatusMap = Object.fromEntries(
      alertsByStatus.map((a) => [a.status, a._count.status])
    );

    return {
      today: {
        total_detections: totalDetectionsToday,
        total_alerts: totalAlertsToday,
        confirmed_matches: confirmedMatchesToday,
        false_positives: falsePositivesToday,
        cameras_online: camerasOnline,
        cameras_offline: camerasOffline,
      },
      alerts_by_status: {
        pending: alertsByStatusMap['pending'] || 0,
        confirmed: alertsByStatusMap['confirmed'] || 0,
        dismissed: alertsByStatusMap['dismissed'] || 0,
        false_positive: alertsByStatusMap['false_positive'] || 0,
      },
      top_active_cameras: topCamerasEnriched,
      hourly_detection_chart: hourlyDetections,
    };
  }

  async getHourlyDetections(orgId: string) {
    const now = new Date();
    const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const result = await prisma.$queryRawUnsafe<Array<{ hour: string; count: string }>>(
      `SELECT
        date_trunc('hour', detected_at) AS hour,
        COUNT(*) AS count
      FROM detection_events
      WHERE organization_id = $1
        AND detected_at >= $2::timestamptz
      GROUP BY hour
      ORDER BY hour`,
      orgId,
      from.toISOString()
    );

    return result.map((r) => ({
      hour: r.hour,
      count: parseInt(r.count, 10),
    }));
  }

  async getDetectionStats(orgId: string, period: string, sourceId?: string) {
    const now = new Date();
    let from: Date;

    switch (period) {
      case '7d': from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      case '90d': from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
      default: from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const result = await prisma.$queryRawUnsafe<Array<{ date: string; detections: string; matches: string }>>(
      `SELECT
        date_trunc('day', detected_at) AS date,
        COUNT(*) AS detections,
        COUNT(*) FILTER (WHERE is_match = true) AS matches
      FROM detection_events
      WHERE organization_id = $1
        AND detected_at >= $2::timestamptz
        ${sourceId ? 'AND source_id = $3' : ''}
      GROUP BY date
      ORDER BY date`,
      orgId,
      from.toISOString(),
      ...(sourceId ? [sourceId] : [])
    );

    return result.map((r) => ({
      date: r.date,
      detections: parseInt(r.detections, 10),
      matches: parseInt(r.matches, 10),
    }));
  }

  async getPerformanceMetrics(orgId: string) {
    const [avgSimilarity, simDistribution, fpRate, avgProcessingMs] = await Promise.all([
      // Average similarity score for matches
      prisma.alert.aggregate({
        where: { organizationId: orgId },
        _avg: { similarityScore: true },
        _min: { similarityScore: true },
        _max: { similarityScore: true },
      }),

      // Similarity score distribution (buckets)
      prisma.$queryRawUnsafe<Array<{ bucket: string; count: string }>>(
        `SELECT
          CASE
            WHEN similarity_score < 0.6 THEN '0.5-0.6'
            WHEN similarity_score < 0.7 THEN '0.6-0.7'
            WHEN similarity_score < 0.8 THEN '0.7-0.8'
            WHEN similarity_score < 0.9 THEN '0.8-0.9'
            ELSE '0.9-1.0'
          END AS bucket,
          COUNT(*) AS count
        FROM alerts
        WHERE organization_id = $1
        GROUP BY bucket
        ORDER BY bucket`,
        orgId
      ),

      // False positive rate
      prisma.alert.count({ where: { organizationId: orgId, status: 'false_positive' } }),

      // Average processing time
      prisma.detectionEvent.aggregate({
        where: { organizationId: orgId },
        _avg: { processingMs: true },
      }),
    ]);

    const totalAlerts = await prisma.alert.count({ where: { organizationId: orgId } });

    return {
      similarity_score: {
        avg: Number(avgSimilarity._avg.similarityScore) || 0,
        min: Number(avgSimilarity._min.similarityScore) || 0,
        max: Number(avgSimilarity._max.similarityScore) || 0,
      },
      similarity_distribution: simDistribution.map((d) => ({
        bucket: d.bucket,
        count: parseInt(d.count, 10),
      })),
      false_positive_rate: totalAlerts > 0 ? fpRate / totalAlerts : 0,
      avg_processing_ms: Number(avgProcessingMs._avg.processingMs) || 0,
      total_alerts: totalAlerts,
    };
  }
}

export const analyticsService = new AnalyticsService();
