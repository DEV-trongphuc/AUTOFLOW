const fs = require('fs');

function replaceStr(file, find, replace) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(find, replace);
  fs.writeFileSync(file, content, 'utf8');
}

replaceStr('components/ai/UnifiedChat.tsx', "{previewType === 'image' ? 'Hình ảnh' : 'Tỉ lệ'}", "{previewType === 'image' ? 'Hình ảnh' : 'Tỉ lệ'}</p>");
replaceStr('components/flows/config/TriggerConfig.tsx', "return 'Khi khch Hủy đăng ký;", "return 'Khi khách Hủy đăng ký';");
replaceStr('components/flows/modals/StepParticipantsModal.tsx', "border-slate-100 hover:border-slate-200'}\`}>đang chạy", "border-slate-100 hover:border-slate-200'}\`}>đang chạy</button>");
replaceStr('components/flows/tabs/FlowAnalyticsTab.tsx', "Automation {currentFlow.status === 'active' ? 'đang chạy : 'd d?ng'}", "Automation {currentFlow.status === 'active' ? 'đang chạy' : 'Đã dừng'}");
replaceStr('components/reports/AIChatReport.tsx', 'name="AI Tỉ lệ stroke="#10b981"', 'name="AI Tỉ lệ" stroke="#10b981"');
replaceStr('components/settings/ZaloTemplateCreateModal.tsx', 'newBody.content = "Nội dung" template này chưa được đồng bộ từ Zalo', 'newBody.content = "Nội dung template này chưa được đồng bộ từ Zalo');
replaceStr('components/templates/EmailEditor/AIEmailGeneratorModal.tsx', "label: 'Tỉ lệ action: () => fileInputRef.current?.click(),", "label: 'Tỉ lệ', action: () => fileInputRef.current?.click(),");
replaceStr('components/templates/EmailEditor/components/RichTextToolbar.tsx', "{ label: 'Link Hủy đăng ký value: '{{unsubscribeLink}}' },", "{ label: 'Link Hủy đăng ký', value: '{{unsubscribeLink}}' },");
replaceStr('components/web-tracking/VisitorsTab.tsx', 'tracking-wider">Thiết bị</span>', 'tracking-wider">Thiết bị</p>');
replaceStr('pages/Flows.tsx', "{ id: 'active', label: 'đang chạy icon: PlayCircle },", "{ id: 'active', label: 'đang chạy', icon: PlayCircle },");
replaceStr('pages/WebTracking.tsx', 'tracking-widest ml-1">Thiết bị</span>', 'tracking-widest ml-1">Thiết bị</label>');

console.log("Final pass done");