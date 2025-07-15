const fs = require('fs');
const path = require('path');

function removeConsoleLogs(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Bỏ qua node_modules và .git
      if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
        removeConsoleLogs(filePath);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.js')) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Xóa tất cả console.log, console.error, console.warn, console.info, console.debug
      const originalContent = content;
      content = content.replace(/console\.(log|error|warn|info|debug)\s*\([^)]*\);?\s*/g, '');
      
      // Nếu có thay đổi, ghi lại file
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Cleaned: ${filePath}`);
      }
    }
  });
}

// Bắt đầu từ thư mục src
removeConsoleLogs('./src');
console.log('Đã xóa tất cả console.log trong thư mục src'); 