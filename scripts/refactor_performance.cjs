const fs = require('fs');

const file = 'api/ai_org_chatbot.php';
let code = fs.readFileSync(file, 'utf8');

// Inject the generic ID resolver function at the top right after ensureConversationId
const helperStr = `
function getVerifiedConversationId($pdo, $idStr) {
    if (!$idStr) return null;
    $stmt = $pdo->prepare("SELECT id FROM ai_org_conversations WHERE id = ?");
    $stmt->execute([$idStr]);
    $realId = $stmt->fetchColumn();
    if ($realId) return $realId;
    $stmt = $pdo->prepare("SELECT id FROM ai_org_conversations WHERE visitor_id = ? ORDER BY created_at DESC LIMIT 1");
    $stmt->execute([$idStr]);
    return $stmt->fetchColumn();
}
`;
if (!code.includes('getVerifiedConversationId(')) {
    code = code.replace('function ensureConversationId($pdo, $id, $propertyId)', helperStr + 'function ensureConversationId($pdo, $id, $propertyId)');
}

// 1. DELETE FROM ai_org_conversations WHERE id = ? OR visitor_id = ?
// Line: $pdo->prepare("DELETE FROM ai_org_conversations WHERE id = ? OR visitor_id = ?")->execute([$convId, $convIdRaw]);
code = code.replace(
    /\$pdo->prepare\("DELETE FROM ai_org_conversations WHERE id = \? OR visitor_id = \?"\)->execute\(\[\$convId, \$convIdRaw\]\);/g,
    `$verifiedId = getVerifiedConversationId($pdo, $convIdRaw);
            if ($verifiedId) { $pdo->prepare("DELETE FROM ai_org_conversations WHERE id = ?")->execute([$verifiedId]); }`
);

// 2. UPDATE ai_org_conversations SET is_public = ? WHERE id = ? OR visitor_id = ?
// Line: $pdo->prepare("UPDATE ai_org_conversations SET is_public = ? WHERE id = ? OR visitor_id = ?")->execute([$isPublic, $convIdRaw, $convIdRaw]);
code = code.replace(
    /\$pdo->prepare\("UPDATE ai_org_conversations SET is_public = \? WHERE id = \? OR visitor_id = \?"\)\n\s*->execute\(\[\$isPublic, \$convIdRaw, \$convIdRaw\]\);/g,
    `$verifiedId = getVerifiedConversationId($pdo, $convIdRaw);
            if ($verifiedId) { $pdo->prepare("UPDATE ai_org_conversations SET is_public = ? WHERE id = ?")->execute([$isPublic, $verifiedId]); }`
);

// 3. SELECT id, user_id, is_public FROM ai_org_conversations WHERE (id = ? OR visitor_id = ?) LIMIT 1
// share_conversation validation:
code = code.replace(
    /\$stmtCheck = \$pdo->prepare\("SELECT id, user_id, is_public FROM ai_org_conversations WHERE \(id = \? OR visitor_id = \?\) LIMIT 1"\);\n\s*\$stmtCheck->execute\(\[\$convIdRaw, \$convIdRaw\]\);/g,
    `$verifiedId = getVerifiedConversationId($pdo, $convIdRaw);
            $stmtCheck = $pdo->prepare("SELECT id, user_id, is_public FROM ai_org_conversations WHERE id = ? LIMIT 1");
            $stmtCheck->execute([$verifiedId]);`
);

// 4. SELECT id, visitor_id, property_id, user_id, title, is_public FROM ai_org_conversations WHERE (id = ? OR visitor_id = ?) LIMIT 1
// duplicate_conversation:
code = code.replace(
    /\$stmtSrc = \$pdo->prepare\("SELECT id, visitor_id, property_id, user_id, title, is_public FROM ai_org_conversations WHERE \(id = \? OR visitor_id = \?\) LIMIT 1"\);\n\s*\$stmtSrc->execute\(\[\$convIdRaw, \$convIdRaw\]\);/g,
    `$verifiedId = getVerifiedConversationId($pdo, $convIdRaw);
            $stmtSrc = $pdo->prepare("SELECT id, visitor_id, property_id, user_id, title, is_public FROM ai_org_conversations WHERE id = ? LIMIT 1");
            $stmtSrc->execute([$verifiedId]);`
);

// 5. SELECT id, user_id, visitor_id, title, is_public, property_id FROM ai_org_conversations WHERE (id = ? OR visitor_id = ?) LIMIT 1
// check_conversation_access:
code = code.replace(
    /\$stmt = \$pdo->prepare\("SELECT id, user_id, visitor_id, title, is_public, property_id FROM ai_org_conversations WHERE \(id = \? OR visitor_id = \?\) LIMIT 1"\);\n\s*\$stmt->execute\(\[\$convIdRaw, \$convIdRaw\]\);/g,
    `$verifiedId = getVerifiedConversationId($pdo, $convIdRaw);
            $stmt = $pdo->prepare("SELECT id, user_id, visitor_id, title, is_public, property_id FROM ai_org_conversations WHERE id = ? LIMIT 1");
            $stmt->execute([$verifiedId]);`
);

// 6. SELECT id FROM ai_org_conversations WHERE (id = ? OR visitor_id = ?) AND property_id = ?
// STREAMING chat engine query line 1797:
code = code.replace(
    /\$stmtConv = \$pdo->prepare\("SELECT id FROM ai_org_conversations WHERE \(id = \? OR visitor_id = \?\) AND\n\s*property_id = \?"\);\n\s*\$stmtConv->execute\(\[\$convIdRaw, \$convIdRaw, \$propertyId\]\);/g,
    `$verifiedId = getVerifiedConversationId($pdo, $convIdRaw);
        $stmtConv = $pdo->prepare("SELECT id FROM ai_org_conversations WHERE id = ? AND property_id = ?");
        if ($verifiedId) { $stmtConv->execute([$verifiedId, $propertyId]); } else { $stmtConv->execute([null, $propertyId]); /* forces empty result safely */ }`
);

fs.writeFileSync(file, code, 'utf8');
console.log('Script processed successfully.');
