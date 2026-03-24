-- Migration to add missing columns for Advanced AI Settings and Optimization Tables

-- 1. Update ai_chatbot_settings table
-- (Use IGNORE or check locally if you aren't sure, but these are safe to run if columns don't exist in standard MySQL if you wrap them, 
-- but straightforward ALTERs are provided here. If a column exists, it might error, so checking first is good practice 
-- or just run them one by one.)

ALTER TABLE ai_chatbot_settings ADD COLUMN IF NOT EXISTS similarity_threshold FLOAT DEFAULT 0.45;
ALTER TABLE ai_chatbot_settings ADD COLUMN IF NOT EXISTS top_k INT DEFAULT 12;
ALTER TABLE ai_chatbot_settings ADD COLUMN IF NOT EXISTS history_limit INT DEFAULT 20;

-- Additional settings if missing
ALTER TABLE ai_chatbot_settings ADD COLUMN IF NOT EXISTS chunk_size INT DEFAULT 1000;
ALTER TABLE ai_chatbot_settings ADD COLUMN IF NOT EXISTS chunk_overlap INT DEFAULT 150;
ALTER TABLE ai_chatbot_settings ADD COLUMN IF NOT EXISTS system_instruction LONGTEXT DEFAULT NULL;
ALTER TABLE ai_chatbot_settings ADD COLUMN IF NOT EXISTS fast_replies JSON DEFAULT NULL;
ALTER TABLE ai_chatbot_settings ADD COLUMN IF NOT EXISTS gemini_cache_name VARCHAR(255) DEFAULT NULL;
ALTER TABLE ai_chatbot_settings ADD COLUMN IF NOT EXISTS gemini_cache_expires_at DATETIME DEFAULT NULL;

-- 2. Create Optimization Tables (Cache)

-- Vector Cache (for Embedding Speedup)
CREATE TABLE IF NOT EXISTS ai_vector_cache (
    hash VARCHAR(32) PRIMARY KEY,
    vector JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- RAG Search Cache (for Search Speedup)
CREATE TABLE IF NOT EXISTS ai_rag_search_cache (
    query_hash CHAR(32) PRIMARY KEY,
    property_id VARCHAR(50),
    results JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (property_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
