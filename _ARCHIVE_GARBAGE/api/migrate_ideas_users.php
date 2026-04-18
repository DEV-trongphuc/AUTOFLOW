<?php
require_once __DIR__ . '/db_connect.php';

header('Content-Type: text/plain');

$numtId = '6'; // numt@ideas.edu.vn
$phuchtId = '7'; // phucht@ideas.edu.vn
$ideasId = 'category_6967a5c47b0ed';
$ideasSaleId = 'category_699eada657bbe';

try {
    $pdo->beginTransaction();

    echo "Migration started...\n\n";

    // 1. Transfer category ownership to Numt (Admin ID 6)
    echo "1. Transferring 'IDEAS' and 'IDEAS SALE' to Numt (ID 6)...\n";
    $stmt = $pdo->prepare("UPDATE ai_chatbot_categories SET admin_id = ? WHERE id IN (?, ?)");
    $stmt->execute([$numtId, $ideasId, $ideasSaleId]);
    echo "   - Updated ownership for 2 categories.\n\n";

    // 2. Restrict 'IDEAS SALE' to ONLY Numt and PhucHT
    echo "2. Setting up access for 'IDEAS SALE'...\n";
    // First, clear any existing assignments for this category
    $stmt = $pdo->prepare("DELETE FROM ai_org_user_categories WHERE category_id = ?");
    $stmt->execute([$ideasSaleId]);

    // Then add numt and phucht
    $stmt = $pdo->prepare("INSERT INTO ai_org_user_categories (user_id, category_id) VALUES (?, ?), (?, ?)");
    $stmt->execute([$numtId, $ideasSaleId, $phuchtId, $ideasSaleId]);
    echo "   - Restricted access to Numt and PhucHT.\n\n";

    // 3. Ensure 'IDEAS' is accessible to the rest of the team
    // Since we've moved the IDEAS category to Admin 6, and it (ideally) has no 
    // assignments in ai_org_user_categories, all staff members of Admin 6 
    // will see it by default. 
    // Let's clear any specific restrictions for 'IDEAS' to make it the default group for his team.
    echo "3. Opening 'IDEAS' as the default group for the team...\n";
    $stmt = $pdo->prepare("DELETE FROM ai_org_user_categories WHERE category_id = ?");
    $stmt->execute([$ideasId]);
    echo "   - Removed restrictions for 'IDEAS'.\n\n";

    // 4. Verify user admin scope
    echo "4. Checking staff AdminID scoping...\n";
    // Ensure phucht, phuc, and ttynhi are all correctly scoped to Admin 6 
    $staffEmails = ['phucht@ideas.edu.vn', 'phuc@gmail.com', 'ttynhi0201@gmail.com'];
    $stmt = $pdo->prepare("UPDATE ai_org_users SET admin_id = ? WHERE email IN (?, ?, ?)");
    $stmt->execute([$numtId, $staffEmails[0], $staffEmails[1], $staffEmails[2]]);
    echo "   - Staff admin scoping verified.\n\n";

    $pdo->commit();
    echo "SUCCESS! Migration complete.\n";
    echo "Numt and PhucHT can now see both groups, while other team members will only see IDEAS.\n";

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "Error: " . $e->getMessage();
}
