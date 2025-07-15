import fs from 'fs';
import path from 'path';

/**
 * Utility để upload file sử dụng Local File Storage
 * File được lưu trong thư mục public/uploads và trả về URL để truy cập file
 */
export async function uploadFile(file: File): Promise<string> {
  try {
    // Tạo tên file duy nhất để tránh trùng lặp
    const uniqueFilename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    
    // Tạo thư mục uploads nếu chưa tồn tại
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Đường dẫn file đầy đủ
    const filePath = path.join(uploadsDir, uniqueFilename);
    
    // Chuyển đổi File thành Buffer và lưu
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);
    
    // Trả về URL công khai để truy cập file
    return `/uploads/${uniqueFilename}`;
  } catch (error) {
    console.error('Error uploading file to local storage:', error);
    throw new Error('Không thể upload file');
  }
}
