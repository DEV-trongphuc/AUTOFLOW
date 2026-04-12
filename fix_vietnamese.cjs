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
    else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.cjs')) results.push(file);
  });
  return results;
}

const files = walk('.');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Specific Vietnamese character corruptions
  content = content.replace(/LượtĐã mở duy nh\?t/g, 'Lượt đã mở duy nhất');
  content = content.replace(/Lượt hoặc đang ở đây/g, 'Lượt hoặc đang ở đây');
  content = content.replace(/d. d\?ng/g, 'Đã dừng');
  content = content.replace(/khách/g, 'khách');
  content = content.replace(/Kích hoạt/g, 'Kích hoạt');
  content = content.replace(/xu\?t/g, 'xuất');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed Vietnamese corruptions in:', file);
  }
}
