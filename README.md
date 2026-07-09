# Booking API

REST API for time-slot bookings. Built with **Node.js + Express + SQLite**.

**Features:**
- JWT authentication (register / login), 24h token expiry
- Role-based access: `user` sees own bookings, `admin` sees and manages all
- Overlap validation — conflicting time slots are rejected with `409`
- Soft cancel + admin-only hard delete
- Interactive **Swagger docs** at `/docs`
- Zero-config storage (SQLite), Docker-ready

## Quick start

```bash
npm install
npm start
# → http://localhost:3000/docs
```

Or with Docker:

```bash
docker build -t booking-api .
docker run -p 3000:3000 booking-api
```

## Try it in 60 seconds

```bash
# 1. Register (first user becomes admin)
curl -s -X POST localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@test.com","password":"secret123"}'

# 2. Save the token from the response, then create a booking
curl -s -X POST localhost:3000/api/bookings \
  -H "Authorization: Bearer <TOKEN>" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Haircut","starts_at":"2026-07-10T10:00:00Z","ends_at":"2026-07-10T11:00:00Z"}'

# 3. Try to book an overlapping slot → 409 Conflict
```

## API overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | — | Register, get JWT |
| POST | `/api/auth/login` | — | Login, get JWT |
| GET | `/api/bookings` | JWT | List bookings (all for admin) |
| POST | `/api/bookings` | JWT | Create booking (overlap-checked) |
| GET | `/api/bookings/:id` | JWT | Get booking |
| DELETE | `/api/bookings/:id` | JWT | Cancel booking |
| DELETE | `/api/bookings/:id/hard` | admin | Permanently delete |

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `JWT_SECRET` | dev value | **Set in production** |
| `DB_PATH` | `./data.sqlite` | SQLite file location |
