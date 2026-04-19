const fs = require('fs');

const file = 'api/ai_org_chatbot.php';
let code = fs.readFileSync(file, 'utf8');

// 2. UPDATE ai_org_conversations SET is_public = ? WHERE id = ? OR visitor_id = ?
const t2 = `$pdo->prepare("UPDATE ai_org_conversations SET is_public = ? WHERE id = ? OR visitor_id = ?")
                ->execute([$isPublic, $convIdRaw, $convIdRaw]);`;
const r2 = `$verifiedId = getVerifiedConversationId($pdo, $convIdRaw);
            if ($verifiedId) { $pdo->prepare("UPDATE ai_org_conversations SET is_public = ? WHERE id = ?")->execute([$isPublic, $verifiedId]); }`;
code = code.split(t2).join(r2);

// 3. share_conversation
const t3 = `$stmtCheck = $pdo->prepare("SELECT id, user_id, is_public FROM ai_org_conversations WHERE (id = ? OR visitor_id = ?) LIMIT 1");
            $stmtCheck->execute([$convIdRaw, $convIdRaw]);`;
const r3 = `$verifiedId = getVerifiedConversationId($pdo, $convIdRaw);
            $stmtCheck = $pdo->prepare("SELECT id, user_id, is_public FROM ai_org_conversations WHERE id = ? LIMIT 1");
            $stmtCheck->execute([$verifiedId]);`;
code = code.split(t3).join(r3);

// 4. duplicate_conversation
const t4 = `$stmtSrc = $pdo->prepare("SELECT id, visitor_id, property_id, user_id, title, is_public FROM ai_org_conversations WHERE (id = ? OR visitor_id = ?) LIMIT 1");
            $stmtSrc->execute([$convIdRaw, $convIdRaw]);`;
const r4 = `$verifiedId = getVerifiedConversationId($pdo, $convIdRaw);
            $stmtSrc = $pdo->prepare("SELECT id, visitor_id, property_id, user_id, title, is_public FROM ai_org_conversations WHERE id = ? LIMIT 1");
            $stmtSrc->execute([$verifiedId]);`;
code = code.split(t4).join(r4);

// 5. check_conversation_access
const t5 = `$stmt = $pdo->prepare("SELECT id, user_id, visitor_id, title, is_public, property_id FROM ai_org_conversations WHERE (id = ? OR visitor_id = ?) LIMIT 1");
            $stmt->execute([$convIdRaw, $convIdRaw]);`;
const r5 = `$verifiedId = getVerifiedConversationId($pdo, $convIdRaw);
            $stmt = $pdo->prepare("SELECT id, user_id, visitor_id, title, is_public, property_id FROM ai_org_conversations WHERE id = ? LIMIT 1");
            $stmt->execute([$verifiedId]);`;
code = code.split(t5).join(r5);

// 6. STREAMING chat engine query line 1797
const t6 = `$stmtConv = $pdo->prepare("SELECT id FROM ai_org_conversations WHERE (id = ? OR visitor_id = ?) AND
                property_id = ?");
        $stmtConv->execute([$convIdRaw, $convIdRaw, $propertyId]);`;
const r6 = `$verifiedId = getVerifiedConversationId($pdo, $convIdRaw);
        $stmtConv = $pdo->prepare("SELECT id FROM ai_org_conversations WHERE id = ? AND property_id = ?");
        if ($verifiedId) { $stmtConv->execute([$verifiedId, $propertyId]); } else { $stmtConv->execute([null, $propertyId]); }`;
code = code.split(t6).join(r6);

fs.writeFileSync(file, code, 'utf8');
console.log('Script processed successfully.');
