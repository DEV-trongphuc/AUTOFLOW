const fs = require('fs');

function replaceFile(path, replacements) {
    if (!fs.existsSync(path)) return;
    let content = fs.readFileSync(path, 'utf8');
    for (const [search, replace] of replacements) {
        content = content.replace(search, replace);
    }
    fs.writeFileSync(path, content, 'utf8');
}

// 1. UnifiedChat.tsx 2122
replaceFile('components/ai/UnifiedChat.tsx', [
    [/(<p className="text-\[10px\].*?\{previewType === 'image' \? 'Hình ảnh' : 'Tỉ lệ'\})([\r\n])/g, "$1</p>$2"]
]);

// 2. CleanupModal.tsx 403
replaceFile('components/audience/CleanupModal.tsx', [
    [/colorClass="amber"\s*\/>/g, 'colorClass="amber"\n/>'],
    [/colorClass="amber"[\r\n]/g, 'colorClass="amber",\n'] // Wait, if it's an object property
]);

// 3. CampaignDetailDrawer.tsx 89
replaceFile('components/campaigns/CampaignDetailDrawer.tsx', [
    [/activeTỉ lệ[\r\n]/g, "activeTab\n"],
    [/activeTỉ lệ,/g, "activeTab,"]
]);

// 4. TriggerConfig.tsx 171
replaceFile('components/flows/config/TriggerConfig.tsx', [
    [/return 'Khi kh.*ch Hủy đăng ký;/g, "return 'Khi khách Hủy đăng ký';"]
]);

// 5. FlowSummaryModal.tsx 153
replaceFile('components/flows/modals/FlowSummaryModal.tsx', [
    [/color="from-slate-600 to-slate-800 shadow-slate-600\/20"\s*\/>/g, 'color="from-slate-600 to-slate-800 shadow-slate-600/20"\n/>'],
    [/color="from-slate-600 to-slate-800 shadow-slate-600\/20"[\r\n]/g, 'color="from-slate-600 to-slate-800 shadow-slate-600/20",\n'] // if it's an object
]);

// 6. StepParticipantsModal.tsx 681
replaceFile('components/flows/modals/StepParticipantsModal.tsx', [
    [/>Đang chờ[\r\n]/g, ">Đang chờ</button>\n"]
]);

// 7. FlowAnalyticsTab.tsx 905
replaceFile('components/flows/tabs/FlowAnalyticsTab.tsx', [
    [/\? 'Đang chờ : 'd.*d\?ng'\}/g, "? 'Đang chờ' : 'Đã dừng'}"]
]);

// 8. FlowSettingsTab.tsx 243
replaceFile('components/flows/tabs/FlowSettingsTab.tsx', [
    [/(<p.*?>Tỉ lệ)<\/span>/g, "$1</p>"]
]);

// 9. AIChatReport.tsx 89
replaceFile('components/reports/AIChatReport.tsx', [
    [/name="AI Tỉ lệ stroke=/g, 'name="AI Tỉ lệ" stroke=']
]);

// 10. ZaloTemplateCreateModal.tsx 270
replaceFile('components/settings/ZaloTemplateCreateModal.tsx', [
    [/newBody.content = "Nội dung" template/g, 'newBody.content = "Nội dung template']
]);

// 11. AIEmailGeneratorModal.tsx 399
replaceFile('components/templates/EmailEditor/AIEmailGeneratorModal.tsx', [
    [/label: 'Tỉ lệ action:/g, "label: 'Tỉ lệ', action:"]
]);

// 12. RichTextToolbar.tsx 43
replaceFile('components/templates/EmailEditor/components/RichTextToolbar.tsx', [
    [/label: 'Link Hủy đăng ký value: /g, "label: 'Link Hủy đăng ký', value: "]
]);

// 13. VisitorsTab.tsx 571
replaceFile('components/web-tracking/VisitorsTab.tsx', [
    [/(<p.*?>Thiết bị)<\/span>/g, "$1</p>"]
]);

// 14. Flows.tsx 1098, 1099, 1545
replaceFile('pages/Flows.tsx', [
    [/\? 'Kịch bản Đang chờ : '/g, "? 'Kịch bản Đang chờ' : '"],
    [/\? 'Nếu xóa, hệ thống sẽ ngừng xử lý các email Đang chờ : '/g, "? 'Nếu xóa, hệ thống sẽ ngừng xử lý các email Đang chờ' : '"],
    [/'Đang chờ icon: /g, "'Đang chờ', icon: "]
]);

// 15. WebTracking.tsx 605
replaceFile('pages/WebTracking.tsx', [
    [/(<label.*?>Thiết bị)<\/span>/g, "$1</label>"]
]);

console.log("Ran targeted fixes.");
