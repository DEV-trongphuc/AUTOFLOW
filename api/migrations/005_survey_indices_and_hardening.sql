-- api/migrations/005_survey_indices_and_hardening.sql

-- Add performance index for session_token to speed up idempotency duplicate checks
ALTER TABLE `survey_responses` 
  ADD INDEX IF NOT EXISTS `idx_survey_responses_session_token` (`session_token`);
