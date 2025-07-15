import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getMongoDb } from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    // Xác thực người dùng
    let token = request.headers.get('authorization')?.split(' ')[1];
    
    if (!token) {
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const [name, value] = cookie.trim().split('=');
          acc[name] = value;
          return acc;
        }, {} as Record<string, string>);
        
        token = cookies['token'] || cookies['authToken'];
      }
    }
    
    if (!token) {
      return NextResponse.json({ success: false, message: 'Bạn cần đăng nhập' }, { status: 401 });
    }

    const tokenData = await verifyToken(token);
    if (!tokenData?.isValid) {
      return NextResponse.json({ success: false, message: 'Token không hợp lệ' }, { status: 401 });
    }

    const db = await getMongoDb();
    const userId = new ObjectId(tokenData.userId);

    // Lấy thông tin user
    const user = await db.collection('users').findOne({ _id: userId });
    if (!user) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    // Lấy số dư từ field balance của user
    const userBalance = user.balance || { available: 0, frozen: 0 };
    const availableBalance = typeof userBalance === 'number' ? userBalance : userBalance.available || 0;
    const frozenBalance = typeof userBalance === 'number' ? 0 : userBalance.frozen || 0;

    return NextResponse.json({
      success: true,
      balance: {
        available: availableBalance,
        frozen: frozenBalance,
        total: availableBalance + frozenBalance
      },
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Error getting user balance:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi lấy số dư' },
      { status: 500 }
    );
  }
} 