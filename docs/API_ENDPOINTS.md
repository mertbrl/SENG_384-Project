# ClinBridge API Endpoints

## Auth

- `POST /api/auth/register`
- `POST /api/auth/verify-email`
- `POST /api/auth/resend-verification`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

## Locations

- `GET /api/locations`
- `GET /api/locations/countries`
- `GET /api/locations/countries/:id/cities`
- `GET /api/locations/cities`

## Users

- `GET /api/users/me`
- `PUT /api/users/me`
- `GET /api/users/export`
- `DELETE /api/users/me`
- `GET /api/users/:id`

## Posts

- `GET /api/posts`
- `GET /api/posts/search`
- `GET /api/posts/mine`
- `GET /api/posts/:id`
- `POST /api/posts`
- `PUT /api/posts/:id`
- `PATCH /api/posts/:id/status`
- `PATCH /api/posts/:id/publish`
- `PATCH /api/posts/:id/close`
- `PATCH /api/posts/:id/expire`
- `DELETE /api/posts/:id`

## Meetings

- `GET /api/meetings`
- `GET /api/meetings/:id`
- `POST /api/meetings`
- `POST /api/meetings/:id/time-slots`
- `PATCH /api/meetings/:id`
- `PATCH /api/meetings/:id/accept`
- `PATCH /api/meetings/:id/decline`
- `PATCH /api/meetings/:id/cancel`
- `PATCH /api/meetings/:id/time-slots/:slotId/confirm`

## Notifications

- `GET /api/notifications`
- `GET /api/notifications/unread-count`
- `PATCH /api/notifications/read-all`
- `DELETE /api/notifications/read`
- `GET /api/notifications/:id`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/:id/unread`
- `DELETE /api/notifications/:id`

## Admin

- `GET /api/admin/users`
- `GET /api/admin/users/:id`
- `PATCH /api/admin/users/:id/suspend`
- `PATCH /api/admin/users/:id/verify`
- `GET /api/admin/posts`
- `PATCH /api/admin/posts/:id/status`
- `DELETE /api/admin/posts/:id`
- `GET /api/admin/logs`
- `GET /api/admin/logs/export`
- `GET /api/admin/overview`
- `GET /api/admin/stats`

## System

- `GET /api/health`
