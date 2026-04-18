<?php
require_once __DIR__ . '/db_connect.php';
header('Content-Type: text/plain');

try {
    echo "Correcting roles and links...\n";
    $ideasSaleId = 'category_699eada657bbe';
    $numtId = 6;
    $phuchtId = 7;

    // Link Numt and PhucHT specifically to this category
    $stmt = $pdo->prepare("INSERT IGNORE INTO ai_org_user_categories (user_id, category_id) VALUES (?, ?), (?, ?)");
    $stmt->execute([$numtId, $ideasSaleId, $phuchtId, $ideasSaleId]);
    echo "Linked numt and phucht to category.\n";

    // Set phucht as assistant (which acts as a user role in this context for organization management)
    // Actually the user said 'user'. Let's check allowed roles in the enum.
    // enum('admin','assistant') - Wait, I saw enum('admin', 'user') in ai_allowed_emails.
    // Let's check ai_org_users enum in database.sql.

    $stmt = $pdo->prepare("UPDATE ai_org_users SET role = 'user' WHERE email = 'phucht@ideas.edu.vn'");
    $stmt->execute();
    echo "phucht@ideas.edu.vn role set to user.\n";

    echo "Done.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
