<?php
require_once 'db_connect.php';

try {
    // 1. Subscribers table: email must be unique PER workspace
    // Check if email_UNIQUE exists
    $stmt = $pdo->query("SHOW INDEX FROM subscribers WHERE Key_name = 'email' OR Key_name = 'email_unique'");
    $indexes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($indexes as $idx) {
        $keyName = $idx['Key_name'];
        if ($keyName !== 'PRIMARY') {
            try {
                $pdo->exec("ALTER TABLE subscribers DROP INDEX `$keyName`");
                echo "Dropped index $keyName from subscribers<br>";
            } catch (Exception $e) {}
        }
    }

    // Add composite index
    try {
        $pdo->exec("ALTER TABLE subscribers ADD UNIQUE INDEX `ws_email_unique` (workspace_id, email)");
        echo "Added ws_email_unique to subscribers<br>";
    } catch (Exception $e) {
        echo "ws_email_unique might already exist: " . $e->getMessage() . "<br>";
    }

    // 2. Forms table: no strict unique constraint needed, handled by logic

    // 3. Lists table: name unique per workspace?
    $stmt = $pdo->query("SHOW INDEX FROM lists WHERE Key_name = 'name' OR Key_name = 'name_unique'");
    $indexes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($indexes as $idx) {
        $keyName = $idx['Key_name'];
        if ($keyName !== 'PRIMARY' && $keyName !== 'ws_name_unique') {
            try {
                $pdo->exec("ALTER TABLE lists DROP INDEX `$keyName`");
            } catch (Exception $e) {}
        }
    }
    try {
        $pdo->exec("ALTER TABLE lists ADD UNIQUE INDEX `ws_name_unique` (workspace_id, name)");
        echo "Added ws_name_unique to lists<br>";
    } catch (Exception $e) {}

    // 4. Tags table: name unique per workspace?
    $stmt = $pdo->query("SHOW INDEX FROM tags WHERE Key_name = 'name' OR Key_name = 'name_unique'");
    $indexes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($indexes as $idx) {
        $keyName = $idx['Key_name'];
        if ($keyName !== 'PRIMARY' && $keyName !== 'ws_name_unique') {
            try {
                $pdo->exec("ALTER TABLE tags DROP INDEX `$keyName`");
            } catch (Exception $e) {}
        }
    }
    try {
        $pdo->exec("ALTER TABLE tags ADD UNIQUE INDEX `ws_name_unique` (workspace_id, name)");
        echo "Added ws_name_unique to tags<br>";
    } catch (Exception $e) {}

    echo "Tenant Keys Migration Done.";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
