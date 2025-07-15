import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    // Lấy token từ header
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
      return NextResponse.json(
        { success: false, message: 'Chưa đăng nhập hoặc phiên đăng nhập đã hết hạn' },
        { status: 401 }
      );
    }

    const tokenData = await verifyToken(token);
    if (!tokenData?.isValid) {
      return NextResponse.json(
        { success: false, message: 'Token không hợp lệ' },
        { status: 401 }
      );
    }

    const { tradeId, result, profit } = await request.json();

    if (!tradeId || !result) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    const db = await getMongoDb();
    if (!db) {
      throw new Error('Không thể kết nối cơ sở dữ liệu');
    }

    // Lấy thông tin giao dịch
    const trade = await db.collection('trades').findOne({ _id: new ObjectId(tradeId) });
    if (!trade) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy giao dịch' },
        { status: 404 }
      );
    }

    // Cập nhật trạng thái giao dịch
    const updateResult = await db.collection('trades').updateOne(
      { _id: new ObjectId(tradeId), userId: new ObjectId(tokenData.userId) },
      { $set: { status: 'completed', result, profit, updatedAt: new Date() } }
    );

    // Lấy thông tin user hiện tại
    const userData = await db.collection('users').findOne({ _id: new ObjectId(tokenData.userId) });
    if (!userData) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy người dùng' },
        { status: 404 }
      );
    }

    // Tính toán balance mới
    const userBalance = userData.balance || { available: 0, frozen: 0 };
    const currentAvailable = typeof userBalance === 'number' ? userBalance : userBalance.available || 0;
    
    // Cập nhật số dư dựa trên kết quả
    let newAvailableBalance = currentAvailable;
    if (result === 'win') {
      // Thắng: cộng thêm lợi nhuận (10 ăn 9)
      newAvailableBalance = currentAvailable + trade.amount + profit;
    } else if (result === 'lose') {
      // Thua: tiền đã bị trừ khi đặt lệnh, không cần làm gì thêm
      newAvailableBalance = currentAvailable;
    }

    // Cập nhật balance
    await db.collection('users').updateOne(
      { _id: new ObjectId(tokenData.userId) },
      { 
        $set: { 
          balance: {
            available: newAvailableBalance,
            frozen: typeof userBalance === 'number' ? 0 : userBalance.frozen || 0
          },
          updatedAt: new Date()
        } 
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Lỗi khi cập nhật kết quả giao dịch:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ nội bộ' },
      { status: 500 }
    );
  }
}
