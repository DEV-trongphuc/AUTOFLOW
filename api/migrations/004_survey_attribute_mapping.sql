-- api/migrations/004_survey_attribute_mapping.sql
ALTER TABLE `survey_questions` ADD COLUMN IF NOT EXISTS `target_attribute` VARCHAR(100) DEFAULT NULL;
