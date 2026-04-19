const fs = require('fs');

function injectAndReplace(filePath, isJSX) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (!content.includes('EXTERNAL_ASSET_BASE')) {
        // If file already imports something from config, append EXTERNAL_ASSET_BASE
        if (content.includes("from '@/utils/config'")) {
            content = content.replace(/from\s+['"]@\/utils\/config['"]/, ", EXTERNAL_ASSET_BASE from '@/utils/config'");
            // Cleanup double braces if it was injected weirdly, or just do simpler matcher
            if (content.includes("{ API_BASE_URL }")) {
                content = content.replace("{ API_BASE_URL }", "{ API_BASE_URL, EXTERNAL_ASSET_BASE }");
                content = content.replace(", EXTERNAL_ASSET_BASE from", " from"); // undo previous blind insert
            }
        } else {
            const injectPoint = content.indexOf('import ');
            content = content.slice(0, injectPoint) + "import { EXTERNAL_ASSET_BASE } from '@/utils/config';\n" + content.slice(injectPoint);
        }
    }
    
    // JSX img src
    content = content.split(`src="https://automation.ideas.edu.vn/imgs/zalolog.png"`).join(`src={\`\${EXTERNAL_ASSET_BASE}/imgs/zalolog.png\`}`);
    // Object properties (Landing.tsx, SystemConnectionsModal.tsx)
    content = content.split(`'https://automation.ideas.edu.vn/imgs/zalolog.png'`).join(`\`\${EXTERNAL_ASSET_BASE}/imgs/zalolog.png\``);
    // String Constant (ZaloBroadcastTab.tsx)
    content = content.split(`"https://automation.ideas.edu.vn/imgs/zalolog.png"`).join(`\`\${EXTERNAL_ASSET_BASE}/imgs/zalolog.png\``);
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed', filePath);
}

injectAndReplace('pages/Campaigns/CampaignList.tsx', true);
injectAndReplace('pages/Landing.tsx', true);
injectAndReplace('pages/Dashboard.tsx', true);
injectAndReplace('components/zalo/ZaloBroadcastTab.tsx', true);
injectAndReplace('components/common/SystemConnectionsModal.tsx', true);
