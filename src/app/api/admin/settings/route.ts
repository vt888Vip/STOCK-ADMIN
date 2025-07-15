import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // Xác thực người dùng
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'Bạn cần đăng nhập' }, { status: 401 });
    }

    const tokenData = await verifyToken(token);
    if (!tokenData?.isValid) {
      return NextResponse.json({ message: 'Token không hợp lệ' }, { status: 401 });
    }
    
    const db = await getMongoDb();
    const settings = await db.collection('settings').findOne({});

    // Trả về cài đặt mặc định nếu không có
    const defaultSettings = {
      minDeposit: 100000,
      maxDeposit: 100000000,
      minWithdraw: 50000,
      maxWithdraw: 50000000,
      ...settings
    };

    return NextResponse.json(defaultSettings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ message: 'Đã xảy ra lỗi khi lấy cài đặt' }, { status: 500 });
  }
} 