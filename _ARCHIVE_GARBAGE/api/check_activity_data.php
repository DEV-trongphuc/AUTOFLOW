<?php
require_once 'db_connect.php';
echo "<pre>--- ACTIVITY LOG SCHEMA ---\n";
try {
    $stmt = $pdo->query("DESCRIBE subscriber_activity");
    foreach ($stmt->fetchAll() as $row) {
        echo "{$row['Field']} - {$row['Type']}\n";
    }

    echo "\n--- SAMPLE DATA FOR turniodev ---\n";
    $email = 'turniodev@gmail.com';
    $stmt = $pdo->prepare("SELECT id FROM subscribers WHERE email = ?");
    $stmt->execute([$email]);
    $subId = $stmt->fetchColumn();

    $stmt = $pdo->prepare("SELECT * FROM subscriber_activity WHERE subscriber_id = ? ORDER BY created_at DESC LIMIT 5");
    $stmt->execute([$subId]);
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        print_r($row);
    }
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
echo "</pre>";
