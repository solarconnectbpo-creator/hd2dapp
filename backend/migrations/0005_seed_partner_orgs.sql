-- Optional starter rows so /api/orgs/directory and rep sign-up preview are non-empty.
-- Safe to re-run: INSERT OR IGNORE.
INSERT OR IGNORE INTO organizations (id, name, service_states, org_kind, created_at, updated_at)
VALUES
  (
    'org-hd2d-tx-ok',
    'HD2D Partner — South Central',
    '["TX","OK"]',
    'both',
    (strftime('%s', 'now')),
    (strftime('%s', 'now'))
  ),
  (
    'org-hd2d-storm',
    'HD2D Storm Response (CAT)',
    '[]',
    'storm',
    (strftime('%s', 'now')),
    (strftime('%s', 'now'))
  );
