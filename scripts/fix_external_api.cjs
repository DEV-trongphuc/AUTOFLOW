const fs = require('fs');

function injectAndReplace(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Ensure EXTERNAL_API_BASE is imported if not already
    if (!content.includes('EXTERNAL_API_BASE')) {
        content = content.replace(/import\s+\{\s*API_BASE_URL\s*\}\s+from\s+['"]@\/utils\/config['"];/, `import { API_BASE_URL, EXTERNAL_API_BASE } from '@/utils/config';`);
    }
    
    // Apply exact replacements
    for (const [target, replacement] of replacements) {
        content = content.split(target).join(replacement);
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed', filePath);
}

// 1. AITrainingDetail.tsx
injectAndReplace('components/ai/training/AITrainingDetail.tsx', [
    ['<script src="${API_BASE_URL}/tracker.js', '<script src="${EXTERNAL_API_BASE}/tracker.js']
]);

// 2. CountdownTimer.tsx
injectAndReplace('components/templates/EmailEditor/components/CountdownTimer.tsx', [
    ['return `${API_BASE_URL}/timer.php', 'return `${EXTERNAL_API_BASE}/timer.php']
]);

// 3. htmlCompiler.ts
injectAndReplace('components/templates/EmailEditor/utils/htmlCompiler.ts', [
    ['const timerUrl = `${API_BASE_URL}/timer.php', 'const timerUrl = `${EXTERNAL_API_BASE}/timer.php']
]);

// 4. PurchaseEventDetailModal.tsx
injectAndReplace('components/triggers/PurchaseEventDetailModal.tsx', [
    ['curl -X POST ${API_BASE_URL}/webhook.php', 'curl -X POST ${EXTERNAL_API_BASE}/webhook.php']
]);

// 5. CustomEventDetailModal.tsx
injectAndReplace('components/triggers/CustomEventDetailModal.tsx', [
    ['curl -X POST ${API_BASE_URL}/webhook.php', 'curl -X POST ${EXTERNAL_API_BASE}/webhook.php']
]);

// 6. ZaloSetupGuide.tsx
injectAndReplace('components/common/ZaloSetupGuide.tsx', [
    ['${API_BASE_URL}/zalo_oauth_callback.php', '${EXTERNAL_API_BASE}/zalo_oauth_callback.php'],
    ['${API_BASE_URL}/zalo_webhook.php', '${EXTERNAL_API_BASE}/zalo_webhook.php'],
    ['onClick={() => copyToClipboard(`${API_BASE_URL}', 'onClick={() => copyToClipboard(`${EXTERNAL_API_BASE}']
]);
