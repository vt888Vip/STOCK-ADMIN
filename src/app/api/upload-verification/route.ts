import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import cloudinary from '@/lib/cloudinary';

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed file types
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'Bạn cần đăng nhập' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ message: 'Phiên đăng nhập hết hạn' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as 'front' | 'back';

    if (!file || !type) {
      return NextResponse.json(
        { message: 'Thiếu file hoặc loại file' },
        { status: 400 }
      );
    }

    // Verify file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { message: 'Chỉ chấp nhận file ảnh định dạng JPG hoặc PNG' },
        { status: 400 }
      );
    }

    // Verify file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: 'Kích thước file tối đa là 5MB' },
        { status: 400 }
      );
    }

    // Upload lên Cloudinary
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileExt = file.name.split('.').pop();
    const publicId = `cccd/${user.userId}-${type}-${Date.now()}`;

    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'cccd',
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

    // Lấy URL Cloudinary
    const fileUrl = (uploadResult as any).secure_url;

    // Update user document in MongoDB
    const client = await clientPromise;
    const db = client.db();
    const updateField = type === 'front' ? 'verification.cccdFront' : 'verification.cccdBack';
    await db.collection('users').updateOne(
      { _id: new ObjectId(user.userId) },
      {
        $set: {
          [updateField]: fileUrl,
          'verification.verified': false,
          'verification.status': 'pending',
          'verification.submittedAt': new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    // Kiểm tra nếu đã đủ 2 ảnh thì tự động xác minh
    const updatedUser = await db.collection('users').findOne({ _id: new ObjectId(user.userId) });
    if (updatedUser?.verification?.cccdFront && updatedUser?.verification?.cccdBack) {
      await db.collection('users').updateOne(
        { _id: new ObjectId(user.userId) },
        {
          $set: {
            'verification.verified': true,
            'verification.status': 'verified',
            'verification.verifiedAt': new Date(),
          }
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Tải lên thành công',
      url: fileUrl,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Lỗi khi tải lên' },
      { status: 500 }
    );
  }
}
