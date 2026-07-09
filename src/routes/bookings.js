const express = require('express');
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function validateSlot(starts_at, ends_at) {
  const start = new Date(starts_at);
  const end = new Date(ends_at);
  if (isNaN(start) || isNaN(end)) return 'starts_at and ends_at must be valid ISO dates';
  if (start >= end) return 'starts_at must be before ends_at';
  return null;
}

function hasOverlap(starts_at, ends_at, excludeId = -1) {
  return !!db
    .prepare(
      `SELECT id FROM bookings
       WHERE status = 'confirmed' AND id != ?
         AND starts_at < ? AND ends_at > ?
       LIMIT 1`
    )
    .get(excludeId, ends_at, starts_at);
}

// Список: юзер видит свои, админ — все
router.get('/', (req, res) => {
  const rows =
    req.user.role === 'admin'
      ? db.prepare('SELECT * FROM bookings ORDER BY starts_at').all()
      : db.prepare('SELECT * FROM bookings WHERE user_id = ? ORDER BY starts_at').all(req.user.id);
  res.json(rows);
});

router.post('/', (req, res) => {
  const { title, starts_at, ends_at } = req.body || {};
  if (!title || !starts_at || !ends_at) {
    return res.status(400).json({ error: 'title, starts_at, ends_at required' });
  }
  const err = validateSlot(starts_at, ends_at);
  if (err) return res.status(400).json({ error: err });
  if (hasOverlap(starts_at, ends_at)) {
    return res.status(409).json({ error: 'Time slot overlaps with existing booking' });
  }

  const result = db
    .prepare('INSERT INTO bookings (user_id, title, starts_at, ends_at) VALUES (?, ?, ?, ?)')
    .run(req.user.id, title, starts_at, ends_at);

  res.status(201).json(db.prepare('SELECT * FROM bookings WHERE id = ?').get(result.lastInsertRowid));
});

router.get('/:id', (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (req.user.role !== 'admin' && booking.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(booking);
});

// Отмена своей брони (или любой — для админа)
router.delete('/:id', (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (req.user.role !== 'admin' && booking.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(booking.id);
  res.json({ ...booking, status: 'cancelled' });
});

// Только админ: жёсткое удаление
router.delete('/:id/hard', requireRole('admin'), (req, res) => {
  const result = db.prepare('DELETE FROM bookings WHERE id = ?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Booking not found' });
  res.status(204).end();
});

module.exports = router;
