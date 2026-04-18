<?php
// api/reset_ai_pause.php - Reset AI pause state for Zalo user
require_once 'db_connect.php';

// The Zalo User ID that got paused
$zaloUserId = '7052207665078724814';

// Reset by zalo_user_id (the correct column)
$stmt = $pdo->prepare("UPDATE zalo_subscribers SET ai_paused_until = NULL WHERE zalo_user_id = ?");
$stmt->execute([$zaloUserId]);
echo "✅ Updated zalo_subscribers: " . $stmt->rowCount() . " row(s)\n";

// Check current state
$stmt2 = $pdo->prepare("SELECT id, zalo_user_id, ai_paused_until FROM zalo_subscribers WHERE zalo_user_id = ?");
$stmt2->execute([$zaloUserId]);
$row = $stmt2->fetch();
echo "\nCurrent state:\n";
print_r($row);

echo "\n✅ Done! AI pause reset. Try sending a message to Zalo now.\n";
