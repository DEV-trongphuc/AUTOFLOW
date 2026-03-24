-- Migration: Assign all existing workspace files to admin_id = 1
-- Created: 2026-02-17
-- Purpose: Set ownership of all workspace files and images to the main admin account

-- Update all workspace files to admin_id = 1
UPDATE ai_workspace_files 
SET admin_id = 1 
WHERE admin_id IS NULL OR admin_id = 0 OR admin_id = '';

-- Update all global assets to admin_id = 1
UPDATE ai_global_assets 
SET admin_id = 1 
WHERE admin_id IS NULL OR admin_id = 0 OR admin_id = '';

-- Verify the migration
SELECT 
    'ai_workspace_files' as table_name,
    COUNT(*) as total_files,
    SUM(CASE WHEN admin_id = 1 THEN 1 ELSE 0 END) as admin_files,
    SUM(CASE WHEN admin_id IS NULL OR admin_id = 0 THEN 1 ELSE 0 END) as orphaned_files
FROM ai_workspace_files

UNION ALL

SELECT 
    'ai_global_assets' as table_name,
    COUNT(*) as total_files,
    SUM(CASE WHEN admin_id = 1 THEN 1 ELSE 0 END) as admin_files,
    SUM(CASE WHEN admin_id IS NULL OR admin_id = 0 THEN 1 ELSE 0 END) as orphaned_files
FROM ai_global_assets;
