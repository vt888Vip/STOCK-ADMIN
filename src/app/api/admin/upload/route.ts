import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import cloudinary from '@/lib/cloudinary';

export async function POST(req: NextRequest) {
  try {
    // Xác thực admin
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'Bạn cần đăng nhập' }, { status: 401 });
    }

    const { userId, isValid } = await verifyToken(token);
    if (!isValid || !userId) {
      return NextResponse.json({ message: 'Token không hợp lệ' }, { status: 401 });
    }

    // Xử lý form data
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ message: 'Không tìm thấy file' }, { status: 400 });
    }

    // Kiểm tra loại file
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ message: 'Chỉ chấp nhận file ảnh' }, { status: 400 });
    }

    // Kiểm tra kích thước file (giới hạn 5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ message: 'Kích thước file không được vượt quá 5MB' }, { status: 400 });
    }

    try {
      // Upload lên Cloudinary
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const publicId = `admin-uploads/${userId}-${Date.now()}`;

      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: 'admin-uploads',
            public_id: publicId,
            resource_type: 'image',
            overwrite: true,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(buffer);
      });

      const fileUrl = (uploadResult as any).secure_url;
      
      // Trả về đường dẫn file
      return NextResponse.json({
        success: true,
        message: 'Đã tải lên thành công',
        url: fileUrl
      }, { status: 200 });
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ 
      message: 'Đã xảy ra lỗi khi upload file',
      error: (error as Error).message 
    }, { status: 500 });
  }
} 