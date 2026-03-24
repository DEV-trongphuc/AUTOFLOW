ALTER TABLE ai_chatbot_settings 
ADD COLUMN notification_emails TEXT DEFAULT NULL AFTER auto_open,
ADD COLUMN notification_cc_emails TEXT DEFAULT NULL AFTER notification_emails,
ADD COLUMN notification_subject VARCHAR(255) DEFAULT NULL AFTER notification_cc_emails;
