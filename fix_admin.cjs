const fs = require('fs');
const path = 'e:/AUTOFLOW/AUTOMATION_FLOW/pages/AdminUsers.tsx';
let text = fs.readFileSync(path, 'utf8');

text = text.replace(/L[^a-zA-Z0-9]+i t[^a-zA-Z0-9]+i danh s[^a-zA-Z0-9]+ch ng[^a-zA-Z0-9]+i d[^a-zA-Z0-9]+ng/g, 'Lỗi tải danh sách người dùng');
text = text.replace(/L[^a-zA-Z0-9]+i k[^a-zA-Z0-9]+t n[^a-zA-Z0-9]+i/g, 'Lỗi kết nối');

fs.writeFileSync(path, text, 'utf8');
