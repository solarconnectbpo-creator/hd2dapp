CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  cover_url TEXT,
  location TEXT,
  date TEXT,
  start_time TEXT,
  end_time TEXT,
  capacity INTEGER,
  organizer_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_tickets (
  id TEXT PRIMARY KEY,
  event_id TEXT,
  user_id TEXT,
  type TEXT,
  qr_code TEXT,
  checked_in INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_sessions (
  id TEXT PRIMARY KEY,
  event_id TEXT,
  title TEXT,
  description TEXT,
  start_time TEXT,
  end_time TEXT,
  speaker TEXT
);

CREATE TABLE IF NOT EXISTS event_rsvp (
  id TEXT PRIMARY KEY,
  event_id TEXT,
  user_id TEXT,
  status TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_tickets_event ON event_tickets(event_id);
CREATE INDEX idx_rsvp_event ON event_rsvp(event_id);
