const fs = require('fs');

function injectAndReplace(filePath, options) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    const { imports, replacements } = options;
    
    // Inject imports
    if (imports && imports.length > 0) {
        if (!content.includes(imports[0])) {
            const injectPoint = content.indexOf('import ');
            if (injectPoint > -1) {
                content = content.slice(0, injectPoint) + `import { ${imports.join(', ')} } from '@/utils/config';\n` + content.slice(injectPoint);
            } else {
                content = `import { ${imports.join(', ')} } from '@/utils/config';\n` + content;
            }
        }
    }
    
    // Exact string replacements
    for (const [target, replacement] of replacements) {
        content = content.split(target).join(replacement);
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed', filePath);
}

// 1. Flow Builder Modals (Zalo Logo)
const flowModals = [
    'components/flows/nodes/FlowNodes.tsx',
    'components/flows/tabs/FlowAnalyticsTab.tsx',
    'components/flows/modals/FlowSimulateModal.tsx',
    'components/flows/modals/StepParticipantsModal.tsx'
];
flowModals.forEach(f => {
    injectAndReplace(f, {
        imports: ['EXTERNAL_ASSET_BASE'],
        replacements: [
            ['src="https://automation.ideas.edu.vn/imgs/zalolog.png"', 'src={`${EXTERNAL_ASSET_BASE}/imgs/zalolog.png`}']
        ]
    });
});

// 2. Zalo Setup Guide Labels (Text inside HTML)
injectAndReplace('components/common/ZaloSetupGuide.tsx', {
    imports: [], // Already imported EXTERNAL_API_BASE previously
    replacements: [
        ['https://automation.ideas.edu.vn/mail_api/zalo_oauth_callback.php', '{EXTERNAL_API_BASE}/zalo_oauth_callback.php'],
        ['https://automation.ideas.edu.vn/mail_api/zalo_webhook.php', '{EXTERNAL_API_BASE}/zalo_webhook.php']
    ]
});

// 3. WebTracking.tsx & Modals
const trackFiles = [
    'pages/WebTracking.tsx',
    'components/web-tracking/WebTrackingModals.tsx'
];
trackFiles.forEach(f => {
    injectAndReplace(f, {
        imports: ['EXTERNAL_ASSET_BASE'],
        replacements: [
            ['<script src="https://automation.ideas.edu.vn/tracker.js"', '<script src="${EXTERNAL_ASSET_BASE}/tracker.js"']
        ]
    });
});

// 4. Settings.tsx State Initialization
injectAndReplace('pages/Settings.tsx', {
    imports: ['API_BASE_URL'],
    replacements: [
        ["useState('https://automation.ideas.edu.vn/mail_api');", "useState(API_BASE_URL);"]
    ]
});

// 5. Voucher API Modal
injectAndReplace('components/vouchers/VoucherApiEmbedModal.tsx', {
    imports: ['EXTERNAL_ASSET_BASE'],
    replacements: [
        ["'https://automation.ideas.edu.vn'", "EXTERNAL_ASSET_BASE"]
    ]
});
