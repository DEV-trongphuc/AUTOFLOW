-- Fix bounce rate for existing sessions
-- This query recalculates is_bounce based on the correct logic:
-- Bounce = 1 if page_count = 1 AND no interactions (clicks)

UPDATE web_sessions s
SET is_bounce = CASE
    WHEN s.page_count > 1 THEN 0
    WHEN EXISTS (
        SELECT 1 FROM web_events 
        WHERE session_id = s.id 
        AND event_type IN ('click', 'canvas_click', 'form')
        LIMIT 1
    ) THEN 0
    ELSE 1
END
WHERE s.property_id IS NOT NULL;

-- Verify the results
SELECT 
    property_id,
    COUNT(*) as total_sessions,
    SUM(is_bounce) as bounced_sessions,
    ROUND((SUM(is_bounce) / COUNT(*)) * 100, 2) as bounce_rate_percent
FROM web_sessions
GROUP BY property_id;
