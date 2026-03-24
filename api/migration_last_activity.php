<?php
require_once 'db_connect.php';
try {
    // 1. Add Column
    $check = $pdo->query("SHOW COLUMNS FROM subscribers LIKE 'last_activity_at'");
    if ($check->rowCount() == 0) {
        $pdo->exec("ALTER TABLE subscribers ADD COLUMN last_activity_at DATETIME DEFAULT NULL");
        echo "Column last_activity_at added.<br>";
        
        // 2. Backfill
        echo "Backfilling data... This may take a while for large datasets.<br>";
        $sql = "UPDATE subscribers s 
                SET last_activity_at = (
                    SELECT MAX(created_at) 
                    FROM subscriber_activity 
                    WHERE subscriber_id = s.id
                ) 
                WHERE last_activity_at IS NULL";
        $pdo->exec($sql);
        echo "Backfill complete.<br>";
    } else {
        echo "Column already exists.<br>";
    }
    
    // Ensure index for performance
    try {
        $pdo->exec("CREATE INDEX idx_last_activity ON subscribers(last_activity_at)");
        echo "Index created.<br>";
    } catch(Exception $e) {
        // Index might exist
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
