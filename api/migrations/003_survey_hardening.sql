-- api/migrations/003_survey_hardening.sql

-- 1. Ensure Columns Exist (Legacy Support)
-- These columns store server-side quiz calculations and end-screen routing.
ALTER TABLE `survey_responses` 
  ADD COLUMN IF NOT EXISTS `total_score` FLOAT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `max_score` FLOAT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `end_screen_id` VARCHAR(100) DEFAULT 'default';

-- 2. Performance Indexes for survey_responses
-- idx_survey_time already exists on (survey_id, submitted_at), so we skip redundant ones.
ALTER TABLE `survey_responses`
  ADD INDEX IF NOT EXISTS `idx_survey_responses_ip_time` (`ip_hash`, `submitted_at`);

-- 3. Performance Indexes for survey_answer_details
-- Base schema already has idx_answer_question, idx_answer_response, and idx_answer_survey.
-- No new composite indexes needed for now beyond what's in database.sql.

-- 4. Essential Indexes for survey_questions
-- Helps with ordering questions during analytics and display.
ALTER TABLE `survey_questions`
  ADD INDEX IF NOT EXISTS `idx_survey_questions_survey_order` (`survey_id`, `order_index`);
