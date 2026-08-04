# Phase 3C: ML V2 Observability API

This documentation describes the read-only observability endpoints for the ML V2 inference telemetry.

All endpoints require authentication (Bearer token) and are restricted to users with `admin`, `operator`, or `investigator` roles.
Data is strictly isolated per organization (`orgId` from JWT).

## Endpoints

### 1. List ML V2 Telemetry

**GET** `/api/v1/ml-v2`

Fetch a paginated list of ML V2 inference results with optional filtering.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number (min 1) |
| `pageSize` | number | 20 | Items per page (min 1, max 100) |
| `startDate` | string | | ISO 8601 datetime (e.g. `2026-08-04T00:00:00Z`) |
| `endDate` | string | | ISO 8601 datetime |
| `status` | enum | | Filter by exact status (`HIGH_PRIORITY_CANDIDATE`, `POSSIBLE_CANDIDATE`, `UNKNOWN`, `FAILED`) |
| `frameDecision` | enum | | Filter by `FACE_DETECTED` or `NO_FACE_DETECTED` |
| `cameraId` | string | | Filter by the specific camera ID |
| `minConfidence`| number | | Minimum score (0.0 to 1.0) |
| `maxConfidence`| number | | Maximum score (0.0 to 1.0) |
| `hasNearestCandidate`| boolean| | If `true`, returns only records where a candidate ID exists. |
| `hasWatchlistHit`| boolean | | If `true`, returns records that hit the watchlist (`HIGH_PRIORITY_CANDIDATE` or `POSSIBLE_CANDIDATE`). |
| `requiresOperatorVerification`| boolean | | Filter by records that require human verification. |

#### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "detectionEventId": "...",
      "status": "HIGH_PRIORITY_CANDIDATE",
      "frameDecision": "FACE_DETECTED",
      "score": 0.95,
      "requiresOperatorVerification": true,
      "createdAt": "...",
      "detectionEvent": {
        "id": "...",
        "sourceId": "...",
        "detectedAt": "..."
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 2. ML V2 Statistics

**GET** `/api/v1/ml-v2/stats`

Retrieve aggregated statistics for ML V2 telemetry.

#### Query Parameters
Accepts `startDate`, `endDate`, and `cameraId`.

#### Response

```json
{
  "success": true,
  "data": {
    "total": 1000,
    "byStatus": {
      "HIGH_PRIORITY_CANDIDATE": 10,
      "POSSIBLE_CANDIDATE": 20,
      "UNKNOWN": 900,
      "FAILED": 70
    }
  }
}
```

### 3. Get Telemetry by Detection Event

**GET** `/api/v1/detection-events/:id/ml-v2`

Fetch the ML V2 telemetry associated with a specific Detection Event.

#### Response

- **200 OK**: If the detection event belongs to the org, and V2 telemetry exists. Returns `{ "success": true, "data": { ... } }`.
- **200 OK**: If the detection event belongs to the org, but no V2 telemetry exists yet. Returns `{ "success": true, "data": null }`.
- **404 Not Found**: If the detection event does not exist or belongs to a different organization.

```json
{
  "success": true,
  "data": {
    "id": "...",
    "status": "...",
    "score": 0.88
  }
}
```
