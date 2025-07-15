import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { processExpiredSessions } from '@/lib/sessionUtils';

export async function GET(req: Request) {
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

    const db = await getMongoDb();
    
    // Xử lý các phiên hết hạn trước khi lấy lịch sử
    await processExpiredSessions(db, 'TradeHistory');
    
    // Lấy tất cả lệnh của user, sắp xếp theo thời gian tạo mới nhất
    const trades = await db.collection('trades')
      .find({ userId: new ObjectId(user.userId) })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    console.log('API /trades/history - userId:', user.userId, 'Số lệnh:', trades.length);

    return NextResponse.json({
      success: true,
      trades: trades.map(trade => ({
        ...trade,
        _id: trade._id.toString(),
        userId: trade.userId.toString()
      }))
    });

  } catch (error) {
    console.error('Lỗi khi lấy lịch sử lệnh:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ nội bộ' },
      { status: 500 }
    );
  }
} 