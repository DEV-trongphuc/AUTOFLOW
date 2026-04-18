
const fs = require('fs');
const path = 'e:\\AUTOFLOW\\AUTOMATION_FLOW\\components\\web-tracking\\conversations\\ConversationsTab.tsx';
let content = fs.readFileSync(path, 'utf8');

// Regex patterns to match the corrupted strings
const fixes = [
    { search: /title="X.a li.n h\? vinh vi.n\?"/g, replace: 'title="Xóa liên hệ vĩnh viễn?"' },
    { search: /confirmLabel="X.a vinh vi.n"/g, replace: 'confirmLabel="Xóa vĩnh viễn"' },
    { search: /B.n s.p x.a li.n h. n.y kh.i h. th.ng ho.n to.n\./g, replace: 'Bạn sắp xóa liên hệ này khỏi hệ thống hoàn toàn.' },
    { search: /\?. To.n b. l.ch s., tag v. d. li.u c.a li.n h. n.y s. b. x.a vinh vi.n, kh.ng th. kh.i ph.c\./g, replace: '🔞 Toàn bộ lịch sử, tag và dữ liệu của liên hệ này sẽ bị xóa vĩnh viễn, không thể khôi phục.' },
    { search: /title="Xu.t d. li.u h.i tho.i"/g, replace: 'title="Xuất dữ liệu hội thoại"' },
    { search: /confirmLabel="X.c nh.n xu.t CSV"/g, replace: 'confirmLabel="Xác nhận xuất CSV"' },
    { search: /C.u h.nh xu.t CSV/g, replace: 'Cấu hình xuất CSV' },
    { search: /Ch.n ph.m vi Th.i gian b.n mu.n tr.ch xu.t d. li.u cu.c tr. chuy.n\./g, replace: 'Chọn phạm vi Thời gian bạn muốn trích xuất dữ liệu cuộc trò chuyện.' }
];

fixes.forEach(f => {
    content = content.replace(f.search, f.replace);
});

fs.writeFileSync(path, content, 'utf8');
console.log('Final fix applied');
