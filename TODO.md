# 📝 Wildcat Project — Comprehensive TODO List

## 1. Contacts Management

- [ ] **Design and implement a Contacts router**
  - REST endpoints for CRUD operations on contacts (add, update, delete, list)
  - Store WhatsApp IDs, display names, and optional metadata (e.g., isFavorite, notes)
  - Consider MongoDB schema: `{ waId, displayName, avatarUrl, ... }`
  - Expose endpoints like `/contacts`, `/contacts/:id`
- [ ] **Integrate contact resolution in DMs**
  - When returning DM objects, include a `contact` field:
    - Example: `{ contact: { isContact: true, contactName: "Johnny Sins" } }`
  - Fallback to WhatsApp ID if contact not found
  - Optionally, auto-sync contacts from WhatsApp if possible via Baileys

## 2. Group Management

- [ ] **Design and implement a Groups router**
  - REST endpoints for listing, searching, and managing groups
  - Store group metadata: `{ groupId, groupName, participants, ... }`
  - Expose endpoints like `/groups`, `/groups/:id`
- [ ] **Group ID resolution**
  - Map `random_id@g.us` to human-friendly group names
  - Optionally, cache group names and avatars for quick lookup
  - Provide endpoint to resolve group ID to group info

## 3. Media Storage Abstraction

- [ ] **Refactor media storage to support multiple backends**
  - Abstract media storage behind a service interface
  - Support GridFS (MongoDB), Cloudinary, and S3 (or alternatives)
  - Allow backend selection via config/env var
- [ ] **Implement Cloudinary support**
  - Add upload/download helpers for Cloudinary
  - Store Cloudinary URLs in media metadata
- [ ] **Implement S3-compatible support**
  - Use a library like `aws-sdk` or `minio` (for local S3-compatible storage)
  - Document how to use MinIO as a local S3 alternative (no credit card needed)
  - Add env/config for S3/MinIO credentials and bucket
- [ ] **Update `.env.example` and documentation**
  - Add all new required env vars for media backends

## 4. API & Documentation

- [ ] **Update API docs and README**
  - Document new endpoints for contacts, groups, and media
  - Add usage examples for each backend
- [ ] **Add OpenAPI/Swagger spec (optional but recommended)**
  - Makes API self-documenting and easier to consume

## 5. UX Improvements

- [ ] **Improve DM and group listing endpoints**
  - Always return resolved contact/group info, not just raw IDs
  - Add search/filter options for DMs, contacts, and groups

## 6. Testing & Validation

- [ ] **Add unit and integration tests for new routers**
  - Test contact/group CRUD, media upload/download, and ID resolution
- [ ] **Manual test plan**
  - List curl commands for all new endpoints
  - Validate media uploads to all supported backends

## 7. Roadmap / Stretch Goals

- [ ] **Webhook enhancements**
  - Add GET/DELETE endpoints, retries/backoff, request signing, SSRF protections
- [ ] **Multi-account improvements**
  - Per-account contacts/groups, better session management
- [ ] **Admin dashboard (optional)**
  - Web UI for managing contacts, groups, and media

---

## 💡 Notes & Recommendations

- **S3 Alternative:** Use [MinIO](https://min.io/) for local S3-compatible storage. It’s open-source, runs locally, and works with the same APIs as AWS S3—no credit card required.
- **Contact/Group Sync:** Baileys can fetch contacts and group metadata; consider periodic sync or on-demand fetch.
- **Abstraction:** Keep storage and contact/group logic modular for easy backend swaps and future expansion.
- **Security:** Be careful with webhooks and media URLs—avoid leaking sensitive info.

---

**Let me know which area you want to tackle first, or if you want me to start scaffolding any of these features!**
