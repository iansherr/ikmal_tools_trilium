# FleetSync & Ikmal App Bridge Specification `[BETA / IN DEVELOPMENT]`

> [!WARNING]
> **BETA / IN DEVELOPMENT**: The FleetSync & FleetCrew HTTP integration (`src/engine/fleetBridge.ts`) is an unreleased preview feature under active development. Endpoints (`/api/v1/sync/items`) and sync protocols described here are subject to change before live production deployment.

---

## Targeted Sync Strategy

To prevent database bloat, Trilium Notes **does NOT sync all items out of Ikmal**. 

Trilium **only syncs notes explicitly tagged** with:
- `#extTask` (Tasks)
- `#story` (Stories & Projects)
- `#ikmalSynced` (Explicitly tagged notes)

---

## Payload Schema

```json
{
  "noteId": "abc123note",
  "title": "Audit Auth Middleware",
  "status": "in_progress",
  "priority": "high",
  "utcDateCreated": "2026-08-01T09:00:00.000Z",
  "utcDateModified": "2026-08-01T09:30:00.000Z",
  "contentSnippet": "Task description and details..."
}
```

---

## FleetSync API Endpoints (Preview)

- **Push Endpoint**: `POST /api/v1/sync/items`
- **Pull Endpoint**: `GET /api/v1/sync/items?since={timestamp}`
- **Authentication**: `Authorization: Bearer {fleetcrew_token}`
