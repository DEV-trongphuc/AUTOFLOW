<?php
require_once 'db_connect.php';
try {
    $pdo->exec("TRUNCATE TABLE ai_rag_search_cache");
    echo "Cache cleared successfully.";
} catch (Exception $e) {
    echo "Error clearing cache: " . $e->getMessage();
}
