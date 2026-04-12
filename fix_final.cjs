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

  content = content.replace(/'Nội dung' (không được để trống|trích xuất|chi tiết|chuyển khoản|tin nhắn|Content site)/g, "'Nội dung $1");
  content = content.replace(/placeholder="Nội dung" chuyển khoản"/g, "placeholder=\"Nội dung chuyển khoản\"");
  content = content.replace(/"Báo cáo" (hi\?u qu\?|hiệu quả)/g, "\"Báo cáo $1");
  
  content = content.replace(/\|\| 'Tỉ lệ[\r\n]/g, "|| 'Tỉ lệ'\n");
  content = content.replace(/label = 'Hủy đăng ký[\r\n]/g, "label = 'Hủy đăng ký'\n");
  content = content.replace(/return 'Đã Hủy đăng ký[\r\n]/g, "return 'Đã Hủy đăng ký'\n");
  content = content.replace(/return 'Hủy đăng ký;[\r\n]/g, "return 'Hủy đăng ký';\n");
  content = content.replace(/title: 'Xác nhận Hủy đăng ký[\r\n]/g, "title: 'Xác nhận Hủy đăng ký',\n");
  content = content.replace(/confirmLabel: 'Hủy đăng ký[\r\n]/g, "confirmLabel: 'Hủy đăng ký',\n");
  
  content = content.replace(/>Tỉ lệ[\r\n]/g, ">Tỉ lệ</span>\n");
  content = content.replace(/>Tỉ lệ </g, ">Tỉ lệ< ");
  content = content.replace(/\{previewType === 'image' \? 'Hình ảnh' : 'Tỉ lệ[\r\n]/g, "{previewType === 'image' ? 'Hình ảnh' : 'Tỉ lệ'}\n");
  content = content.replace(/>Hủy đăng kýp>[\r\n]/g, ">Hủy đăng ký</p>\n");
  content = content.replace(/>Thiết bị[\r\n]/g, ">Thiết bị</span>\n");
  content = content.replace(/>Nhật ký[\r\n]/g, ">Nhật ký</span>\n");
  
  content = content.replace(/toast\.loading\('Đang chờ<\/button>/g, "toast.loading('Đang chờ...");
  content = content.replace(/\? 'Đang chờ<\/button> : 'Tạm dừng'/g, "? 'Đang chờ' : 'Tạm dừng'");
  content = content.replace(/Kênh Đang chờ<\/button>/g, "Kênh Đang chờ");
  content = content.replace(/Automation Đang chờ<\/button>/g, "Automation Đang chờ");
  content = content.replace(/Flow Đang chờ<\/button> /g, "Flow Đang chờ ");
  content = content.replace(/Đang chờ<\/button> /g, "Đang chờ ");
  content = content.replace(/Đang chờ<\/button> mẫu riêng/g, "Đang chờ mẫu riêng");
  content = content.replace(/'Kịch bản Đang chờ<\/button> /g, "'Kịch bản Đang chờ ");
  content = content.replace(/'Nếu xóa, hệ thống sẽ ngừng xử lý các email Đang chờ<\/button> /g, "'Nếu xóa, hệ thống sẽ ngừng xử lý các email Đang chờ ");
  content = content.replace(/'Xác nhận Lưu Flow Đang chờ<\/button>[\r\n]/g, "'Xác nhận Lưu Flow Đang chờ',\n");
  content = content.replace(/'Flow Đang chờ<\/button>[\r\n]/g, "'Flow Đang chờ',\n");
  content = content.replace(/'Đang chờ<\/button> icon: PlayCircle/g, "'Đang chờ', icon: PlayCircle");
  content = content.replace(/Automation \{currentFlow.status === 'active' \? 'Đang chờ<\/button> : 'd d\?ng'\}/g, "Automation {currentFlow.status === 'active' ? 'Đang chờ' : 'Đã dừng'}");
  content = content.replace(/xu\?t danh sách Hủy đăng ký\)/g, "xuất danh sách Hủy đăng ký')");
  
  content = content.replace(/\{ label: 'Thiết bị value:/g, "{ label: 'Thiết bị', value:");
  content = content.replace(/\{ label: 'Tổng quan & Tổng số bg:/g, "{ label: 'Tổng quan & Tổng số', bg:");
  content = content.replace(/Hủy đăng ký\{selectedIds/g, "Hủy đăng ký ${selectedIds");
  content = content.replace(/\{ id: 'delivery', label: 'Lịch sử icon: MailCheck \}/g, "{ id: 'delivery', label: 'Lịch sử', icon: MailCheck }");
  content = content.replace(/\{ id: 'tech', label: 'Thiết bị icon: Smartphone \}/g, "{ id: 'tech', label: 'Thiết bị', icon: Smartphone }");
  content = content.replace(/\{ label: 'Link Hủy đăng ký value: '\{\{unsubscribe_url\}\}' \}/g, "{ label: 'Link Hủy đăng ký', value: '{{unsubscribe_url}}' }");
  content = content.replace(/val: '\{\{unsubscribeLink\}\}'/g, "value: '{{unsubscribeLink}}'");
  content = content.replace(/\{ label: 'Tỉ lệ action:/g, "{ label: 'Tỉ lệ', action:");
  content = content.replace(/\{ label: 'Link Hủy đăng ký val: '\{\{unsubscribe_url\}\}' \}/g, "{ label: 'Link Hủy đăng ký', value: '{{unsubscribe_url}}' }");

  content = content.replace(/activeTỉ lệ[\r\n]/g, "activeTab\n");
  content = content.replace(/maxCò/g, "maxC) ");

  content = content.replace(/<h4 className="text-sm font-bold text-orange-900 mb-1">Tổng quan Hủy đăng kýh4>/g, '<h4 className="text-sm font-bold text-orange-900 mb-1">Tổng quan Hủy đăng ký</h4>');
  content = content.replace(/<h3 className="text-sm font-bold text-slate-800">K.*ch ho\?t khi Hủy đăng ký\/h3>/g, '<h3 className="text-sm font-bold text-slate-800">Kích hoạt khi Hủy đăng ký</h3>');
  content = content.replace(/trong Tổng số<\/span> className="text-slate-800 font-black">\{totalItems.toLocaleString\(\)\}<\/span>/g, 'trong <span className="text-slate-800 font-black">{totalItems.toLocaleString()}</span>');
  content = content.replace(/title="Ph.*n t.*ch Thiết bị icon/g, 'title="Phân tích Thiết bị" icon');
  content = content.replace(/Ng.*y ngh\?/g, 'Ngày nghỉ');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed:', file);
  }
}
