# FleetSync & Ikmal App Bridge Specification

The **FleetSync Bridge** (`src/engine/fleetBridge.ts`) handles targeted bi-directional synchronization between Trilium Notes and your standalone **Ikmal App** (`~/Projects/ikmal`) via FleetSync endpoints.

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

## FleetSync API Endpoints

- **Push Endpoint**: `POST /api/v1/sync/items`
- **Pull Endpoint**: `GET /api/v1/sync/items?since={timestamp}`
- **Authentication**: `Authorization: Bearer {fleetcrew_token}`
