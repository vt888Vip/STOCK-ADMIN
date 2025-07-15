import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Xác thực người dùng
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ message: 'Bạn cần đăng nhập' }, { status: 401 });
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
    const user = await verifyToken(token);
    
    if (!user?.userId) {
      return NextResponse.json({ message: 'Token không hợp lệ' }, { status: 401 });
    }

    // Lấy tham số phân trang từ query string
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    // Kết nối DB
    const db = await getMongoDb();
    if (!db) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Lấy danh sách nạp tiền của người dùng
    const deposits = await db.collection('deposits')
      .find({ user: new ObjectId(user.userId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Lấy tổng số bản ghi để phân trang
    const total = await db.collection('deposits')
      .countDocuments({ user: new ObjectId(user.userId) });

    return NextResponse.json({
      success: true,
      data: deposits,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Error fetching deposit history:', error);
    return NextResponse.json(
      { message: 'Đã xảy ra lỗi khi lấy lịch sử nạp tiền' },
      { status: 500 }
    );
  }
}
