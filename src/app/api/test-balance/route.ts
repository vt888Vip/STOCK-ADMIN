import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
    const user = await verifyToken(token);
    
    if (!user?.userId) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const { action, sessionId } = await req.json();
    const db = await getMongoDb();

    if (action === 'check_trade') {
      // Kiểm tra lệnh của user cho phiên cụ thể
      const trade = await db.collection('trades').findOne({
        userId: new ObjectId(user.userId),
        sessionId: sessionId
      });

      if (!trade) {
        return NextResponse.json({
          success: false,
          message: 'Không tìm thấy lệnh cho phiên này'
        });
      }

      return NextResponse.json({
        success: true,
        trade: {
          _id: trade._id.toString(),
          sessionId: trade.sessionId,
          direction: trade.direction,
          amount: trade.amount,
          status: trade.status,
          result: trade.result,
          profit: trade.profit,
          sessionResult: trade.sessionResult
        }
      });
    }

    if (action === 'update_balance') {
      // Cập nhật số dư cho lệnh thắng
      const trade = await db.collection('trades').findOne({
        userId: new ObjectId(user.userId),
        sessionId: sessionId,
        result: 'win'
      });

      if (!trade) {
        return NextResponse.json({
          success: false,
          message: 'Không tìm thấy lệnh thắng cho phiên này'
        });
      }

      // Lấy thông tin user hiện tại
      const userData = await db.collection('users').findOne({ _id: new ObjectId(user.userId) });
      if (!userData) {
        return NextResponse.json({
          success: false,
          message: 'Không tìm thấy thông tin user'
        });
      }

      const userBalance = userData.balance || { available: 0, frozen: 0 };
      const currentAvailable = typeof userBalance === 'number' ? userBalance : userBalance.available || 0;
      
      // Tính toán số dư mới: số dư hiện tại + tiền đặt cược + tiền thắng
      const newBalance = currentAvailable + trade.amount + trade.profit;
      
      // Cập nhật số dư
      await db.collection('users').updateOne(
        { _id: new ObjectId(user.userId) },
        {
          $set: {
            balance: {
              available: newBalance,
              frozen: typeof userBalance === 'number' ? 0 : userBalance.frozen || 0
            },
            updatedAt: new Date()
          }
        }
      );

      // Cập nhật trạng thái lệnh thành completed
      await db.collection('trades').updateOne(
        { _id: trade._id },
        {
          $set: {
            status: 'completed',
            publishedAt: new Date(),
            updatedAt: new Date()
          }
        }
      );

      return NextResponse.json({
        success: true,
        message: 'Đã cập nhật số dư thành công',
        data: {
          oldBalance: currentAvailable,
          newBalance: newBalance,
          tradeAmount: trade.amount,
          profit: trade.profit,
          totalAdded: trade.amount + trade.profit
        }
      });
    }

    return NextResponse.json({
      success: false,
      message: 'Hành động không hợp lệ'
    });

  } catch (error) {
    console.error('Lỗi khi test balance:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ nội bộ' },
      { status: 500 }
    );
  }
} 