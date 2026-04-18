-- Database Schema Updates for MailFlow Pro AI Chatbot

-- 1. Table: ai_chatbot_settings (Unified settings table)
CREATE TABLE IF NOT EXISTS ai_chatbot_settings (
    property_id VARCHAR(50) PRIMARY KEY,
    is_enabled TINYINT(1) DEFAULT 1,
    bot_name VARCHAR(100),
    company_name VARCHAR(100),
    brand_color VARCHAR(20),
    bot_avatar TEXT,
    welcome_msg TEXT,
    persona_prompt TEXT,
    gemini_api_key TEXT,
    quick_actions JSON,
    gemini_cache_name VARCHAR(255) DEFAULT NULL,
    gemini_cache_expires_at DATETIME DEFAULT NULL,
    chunk_size INT DEFAULT 1000,
    chunk_overlap INT DEFAULT 150,
    system_instruction LONGTEXT DEFAULT NULL,
    fast_replies JSON DEFAULT NULL,
    similarity_threshold FLOAT DEFAULT 0.45,
    top_k INT DEFAULT 12,
    history_limit INT DEFAULT 20,
    widget_position VARCHAR(20) DEFAULT 'bottom-right',
    excluded_pages JSON DEFAULT NULL,
    excluded_paths JSON DEFAULT NULL,
    auto_open TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Table: ai_conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
    id VARCHAR(50) PRIMARY KEY,
    visitor_id VARCHAR(50),
    property_id VARCHAR(50),
    status ENUM('ai', 'human', 'closed') DEFAULT 'ai',
    last_message TEXT,
    last_message_at TIMESTAMP NULL,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX (visitor_id),
    INDEX (property_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Table: ai_messages
CREATE TABLE IF NOT EXISTS ai_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id VARCHAR(50),
    sender ENUM('visitor', 'ai', 'human') NOT NULL,
    message TEXT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (conversation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Table: ai_training_docs
CREATE TABLE IF NOT EXISTS ai_training_docs (
    id VARCHAR(50) PRIMARY KEY,
    property_id VARCHAR(50),
    name VARCHAR(255),
    source_type VARCHAR(50) DEFAULT 'manual',
    is_active TINYINT(1) DEFAULT 1,
    status ENUM('pending', 'trained', 'error') DEFAULT 'pending',
    priority INT DEFAULT 0,
    parent_id VARCHAR(50) DEFAULT '0',
    content LONGTEXT,
    tags JSON,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Table: ai_training_chunks
CREATE TABLE IF NOT EXISTS ai_training_chunks (
    id VARCHAR(50) PRIMARY KEY,
    doc_id VARCHAR(50),
    property_id VARCHAR(50),
    content LONGTEXT,
    embedding JSON,
    tags JSON,
    priority_level INT DEFAULT 0,
    vector_norm FLOAT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add Fulltext Index for FTS
ALTER TABLE ai_training_chunks ADD FULLTEXT INDEX IF NOT EXISTS content_fts (content);

-- 6. Table: ai_vector_cache (Optimization: Embedding Cache)
CREATE TABLE IF NOT EXISTS ai_vector_cache (
    hash VARCHAR(32) PRIMARY KEY,
    vector JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Table: ai_rag_search_cache (Optimization: Search Result Cache)
CREATE TABLE IF NOT EXISTS ai_rag_search_cache (
    query_hash CHAR(32) PRIMARY KEY,
    property_id VARCHAR(50),
    results JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (property_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
