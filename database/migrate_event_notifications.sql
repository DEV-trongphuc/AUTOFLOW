-- Purchase Events table
ALTER TABLE purchase_events ADD COLUMN notification_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE purchase_events ADD COLUMN notification_emails TEXT;
ALTER TABLE purchase_events ADD COLUMN notification_subject VARCHAR(255);

-- Custom Events table
ALTER TABLE custom_events ADD COLUMN notification_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE custom_events ADD COLUMN notification_emails TEXT;
ALTER TABLE custom_events ADD COLUMN notification_subject VARCHAR(255);
