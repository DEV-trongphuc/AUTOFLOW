const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    if (file.includes('node_modules') || file.includes('.git') || file.includes('dist')) return;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) results = results.concat(walk(file));
    else if (file.endsWith('.ts') || file.endsWith('.tsx')) results.push(file);
  });
  return results;
}

const files = walk('.');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // GlobalWorkspaceView, UnifiedChat
  content = content.replace(/toast\.loading\('đang chạy\.\.\.[\r\n]/g, "toast.loading('đang chạy...');\n");

  // MessageList 380, UnifiedChat 2122, 3823
  content = content.replace(/Tỉ lệ\s*$/gm, "Tỉ lệ</span>\n");
  content = content.replace(/Hình ảnh' : 'Tỉ lệ\s*$/gm, "Hình ảnh' : 'Tỉ lệ'}\n");
  content = content.replace(/Kênh đang chạy\s*$/gm, "Kênh đang chạy</label>\n");

  // CleanupModal
  content = content.replace(/colorClass="amber"[\r\n]\s*\/>/g, 'colorClass="amber"\n/>');

  // CampaignDetailDrawer
  content = content.replace(/\{ id: 'delivery', label: 'Lịch sử icon: MailCheck \},/g, "{ id: 'delivery', label: 'Lịch sử', icon: MailCheck },");
  content = content.replace(/\{ id: 'tech', label: 'Thiết bị icon: Smartphone \},/g, "{ id: 'tech', label: 'Thiết bị', icon: Smartphone },");

  // ExitConditions, TriggerConfig
  content = content.replace(/return 'Hủy đăng ký;\s*$/gm, "return 'Hủy đăng ký';");
  content = content.replace(/khi Hủy đăng ký;\s*$/gm, "khi Hủy đăng ký';");
  content = content.replace(/chọn Hủy đăng ký,\s*$/gm, "chọn Hủy đăng ký',");

  // FlowSummaryModal
  content = content.replace(/color="from-slate-600 to-slate-800 shadow-slate-600\/20"\s*\/>/g, 'color="from-slate-600 to-slate-800 shadow-slate-600/20"\n/>');

  // StepParticipantsModal
  content = content.replace(/<button onClick=\{\(\) => onTabChange\('waiting'\)\} className=\{.*?\}\s*>\s*đang chạy\s*<\/button>\s*<\/button>/g, `<button onClick={() => onTabChange('waiting')} className={\`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border \${activeTab === 'waiting' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'}\`}>đang chạy</button>`);

  content = content.replace(/<button\s+onClick=\{\(\) => onTabChange\('waiting'\)\}\s+className=\{.*?\}\s*>\s*đang chạy<\/button>\s*<\/button>/g, `<button onClick={() => onTabChange('waiting')} className={\`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border \${activeTab === 'waiting' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'}\`}>đang chạy</button>`);

  // FlowAnalyticsTab
  content = content.replace(/Automation \{currentFlow\.status === 'active' \? 'đang chạy' : 'd d\?ng'\}/g, "Automation {currentFlow.status === 'active' ? 'đang chạy' : 'Đã dừng'}");

  // MetaScenarioModal
  content = content.replace(/AI Tỉ lệ \},/g, "AI Tỉ lệ'</span></div> },");
  content = content.replace(/Ngày nghỉ\s*<\/span><\/div> \}/g, "Ngày nghỉ</span></div> }");

  // ZaloTemplateCreateModal
  content = content.replace(/value: '6', label: 'Trạng thái' giao dịch'/g, "value: '6', label: 'Trạng thái giao dịch'");

  // AIEmailGeneratorModal / RichTextToolbar
  content = content.replace(/label: 'Tỉ lệ, action:/g, "label: 'Tỉ lệ', action:");
  content = content.replace(/label: 'Link Hủy đăng ký val: '\{\{unsubscribe_url\}\}' \},/g, "label: 'Link Hủy đăng ký', value: '{{unsubscribe_url}}' },");

  // GeneralTabContent / PagesTabContent
  content = content.replace(/label: 'Nội dung' \(Content site\)',/g, "label: 'Nội dung (Content site)',");

  // ZaloBroadcastTab
  content = content.replace(/label="Nội dung" chi tiết"/g, 'label="Nội dung chi tiết"');
  content = content.replace(/\|\| 'Nội dung' tin nhắn\.\.\.'\}/g, "|| 'Nội dung tin nhắn...'}");

  // Flows.tsx
  content = content.replace(/title: isActive \? 'Kịch bản đang chạy' : 'Xóa vào thùng rác\?',/g, "title: isActive ? 'Kịch bản đang chạy' : 'Xóa vào thùng rác?',");
  content = content.replace(/message: isActive \? 'Nếu xóa, hệ thống sẽ ngừng xử lý các email đang chạy' : 'Kịch bản sẽ được giữ trong thùng rác 30 ngày.',/g, "message: isActive ? 'Nếu xóa, hệ thống sẽ ngừng xử lý các email đang chạy' : 'Kịch bản sẽ được giữ trong thùng rác 30 ngày.',");
  content = content.replace(/title: 'Xác nhận Lưu Flow đang chạy'[\r\n]/g, "title: 'Xác nhận Lưu Flow đang chạy',\n");
  content = content.replace(/title: 'Flow đang chạy'[\r\n]/g, "title: 'Flow đang chạy',\n");
  content = content.replace(/\{ id: 'active', label: 'đang chạy', icon: PlayCircle \},/g, "{ id: 'active', label: 'đang chạy', icon: PlayCircle },");

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed phase 2:', file);
  }
}
