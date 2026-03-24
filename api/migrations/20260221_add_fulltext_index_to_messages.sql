-- Migration: Add FULLTEXT index to ai_org_messages for efficient searching
-- Date: 2026-02-21

ALTER TABLE `ai_org_messages` ADD FULLTEXT KEY `ft_message_search` (`message`);
