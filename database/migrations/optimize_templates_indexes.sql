-- =====================================================
-- TEMPLATES PERFORMANCE INDEXES OPTIMIZATION
-- Target: Instant template list retrieval by workspace
-- =====================================================

-- 1. Index templates by workspace_id and updated_at DESC for zero-filesort list loading
CREATE INDEX IF NOT EXISTS idx_templates_ws_updated 
ON templates(workspace_id, updated_at DESC);

-- 2. Index template_groups by workspace_id
CREATE INDEX IF NOT EXISTS idx_template_groups_ws 
ON template_groups(workspace_id);
