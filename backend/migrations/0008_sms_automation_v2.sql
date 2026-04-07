-- SMS automation v2: contact profile fields, no_response cooldown

ALTER TABLE sms_contacts ADD COLUMN address TEXT NOT NULL DEFAULT '';
ALTER TABLE sms_contacts ADD COLUMN pipeline_stage TEXT NOT NULL DEFAULT '';
ALTER TABLE sms_contacts ADD COLUMN claim_filed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sms_contacts ADD COLUMN tags_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE sms_contacts ADD COLUMN last_no_response_event_at INTEGER;
