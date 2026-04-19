const fs = require('fs');
const file = 'api/ai_org_chatbot.php';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// 1. Line 1809 (streaming engine)
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('SELECT id FROM ai_org_conversations WHERE (id = ? OR visitor_id = ?) AND')) {
        if (lines[i+1] && lines[i+1].includes('property_id = ? AND status != \'closed\' ORDER BY created_at DESC LIMIT 1')) {
            lines[i] = `        $s1 = $pdo->prepare("SELECT id FROM ai_org_conversations WHERE id = ? AND property_id = ? AND status != 'closed'");`;
            lines[i+1] = `        $s1->execute([$visitorUuid, $propertyId]);`;
            lines[i+2] = `        $convId = $s1->fetchColumn();`;
            lines[i+3] = `        if (!$convId) {`;
            lines.splice(i+4, 0, 
                         `            $s2 = $pdo->prepare("SELECT id FROM ai_org_conversations WHERE visitor_id = ? AND property_id = ? AND status != 'closed' ORDER BY created_at DESC LIMIT 1");`,
                         `            $s2->execute([$visitorUuid, $propertyId]);`,
                         `            $convId = $s2->fetchColumn();`,
                         `        }`);
            break;
        }
    }
}

// 2. Line 1205 (UPDATE share mode is_public) - around share_conversation
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('UPDATE ai_org_conversations SET is_public = ? WHERE id = ? OR visitor_id = ?')) {
        lines[i] = `            $verifiedId = getVerifiedConversationId($pdo, $convIdRaw);`;
        lines[i+1] = `            if ($verifiedId) { $pdo->prepare("UPDATE ai_org_conversations SET is_public = ? WHERE id = ?")->execute([$isPublic, $verifiedId]); }`;
        break;
    }
}

// 3. duplicate_conversation SELECT
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('SELECT id, visitor_id, property_id, user_id, title, is_public FROM ai_org_conversations WHERE (id = ? OR visitor_id = ?) LIMIT 1')) {
        lines[i] = `            $verifiedId = getVerifiedConversationId($pdo, $convIdRaw);`;
        lines.splice(i+1, 0, `            $stmtSrc = $pdo->prepare("SELECT id, visitor_id, property_id, user_id, title, is_public FROM ai_org_conversations WHERE id = ? LIMIT 1");`);
        lines[i+2] = `            $stmtSrc->execute([$verifiedId]);`;
        break; // duplicate_conversation
    }
}

// 4. check_conversation_access SELECT
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('SELECT id, user_id, visitor_id, title, is_public, property_id FROM ai_org_conversations WHERE (id = ? OR visitor_id = ?) LIMIT 1')) {
        lines[i] = `            $verifiedId = getVerifiedConversationId($pdo, $convIdRaw);`;
        lines.splice(i+1, 0, `            $stmt = $pdo->prepare("SELECT id, user_id, visitor_id, title, is_public, property_id FROM ai_org_conversations WHERE id = ? LIMIT 1");`);
        lines[i+2] = `            $stmt->execute([$verifiedId]);`;
        break; // check access
    }
}

// 5. share_conversation SELECT
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('SELECT id, user_id, is_public FROM ai_org_conversations WHERE (id = ? OR visitor_id = ?) LIMIT 1')) {
        lines[i] = `            $verifiedId = getVerifiedConversationId($pdo, $convIdRaw);`;
        lines.splice(i+1, 0, `            $stmtCheck = $pdo->prepare("SELECT id, user_id, is_public FROM ai_org_conversations WHERE id = ? LIMIT 1");`);
        lines[i+2] = `            $stmtCheck->execute([$verifiedId]);`;
        break; // share
    }
}

fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log('Fixed successfully');
