import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { NextRequest } from 'next/server';

// API test để kiểm tra logic xử lý kết quả phiên
export async function GET(request: NextRequest) {
  try {
    const db = await getMongoDb();
    if (!db) {
      throw new Error('Không thể kết nối cơ sở dữ liệu');
    }

    const now = new Date();
    const results = {
      sessions: [] as any[],
      trades: [] as any[],
      users: [] as any[]
    };

    // 1. Kiểm tra tất cả phiên
    const allSessions = await db.collection('trading_sessions').find({}).sort({ createdAt: -1 }).limit(10).toArray();
    results.sessions = allSessions.map(session => ({
      sessionId: session.sessionId,
      status: session.status,
      result: session.result,
      startTime: session.startTime,
      endTime: session.endTime,
      timeLeft: session.endTime ? Math.max(0, Math.floor((session.endTime.getTime() - now.getTime()) / 1000)) : 0
    }));

    // 2. Kiểm tra tất cả lệnh
    const allTrades = await db.collection('trades').find({}).sort({ createdAt: -1 }).limit(10).toArray();
    results.trades = allTrades.map(trade => ({
      id: trade._id,
      sessionId: trade.sessionId,
      userId: trade.userId,
      direction: trade.direction,
      amount: trade.amount,
      status: trade.status,
      result: trade.result,
      profit: trade.profit,
      createdAt: trade.createdAt
    }));

    // 3. Kiểm tra users
    const allUsers = await db.collection('users').find({}).limit(5).toArray();
    results.users = allUsers.map(user => ({
      id: user._id,
      username: user.username,
      balance: user.balance,
      balanceType: typeof user.balance
    }));

    // 4. Thống kê
    const stats = {
      totalSessions: await db.collection('trading_sessions').countDocuments(),
      totalTrades: await db.collection('trades').countDocuments(),
      totalUsers: await db.collection('users').countDocuments(),
      pendingTrades: await db.collection('trades').countDocuments({ status: 'pending' }),
      completedTrades: await db.collection('trades').countDocuments({ status: 'completed' }),
      activeSessions: await db.collection('trading_sessions').countDocuments({ status: 'ACTIVE' }),
      predictedSessions: await db.collection('trading_sessions').countDocuments({ status: 'PREDICTED' }),
      completedSessions: await db.collection('trading_sessions').countDocuments({ status: 'COMPLETED' })
    };

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      stats,
      results
    });

  } catch (error) {
    console.error('Lỗi khi test session result:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ nội bộ', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// API để test xử lý kết quả thủ công
export async function POST(request: NextRequest) {
  try {
    const { action, sessionId } = await request.json();
    const db = await getMongoDb();
    
    if (!db) {
      throw new Error('Không thể kết nối cơ sở dữ liệu');
    }

    if (action === 'process_session') {
      // Tìm phiên cần xử lý
      const session = await db.collection('trading_sessions').findOne({ 
        sessionId: sessionId || '202507130933' // Default session ID
      });

      if (!session) {
        return NextResponse.json({
          success: false,
          message: 'Không tìm thấy phiên'
        });
      }

      // Tạo kết quả random
      const random = Math.random();
      const result = random < 0.6 ? 'UP' : 'DOWN';

      // Chuyển phiên sang PREDICTED
      await db.collection('trading_sessions').updateOne(
        { _id: session._id },
        { 
          $set: { 
            status: 'PREDICTED',
            result: result,
            updatedAt: new Date()
          }
        }
      );

      // Tìm lệnh pending của phiên này
      const pendingTrades = await db.collection('trades').find({
        sessionId: session.sessionId,
        status: 'pending'
      }).toArray();

      // Xử lý từng lệnh
      for (const trade of pendingTrades) {
        const isWin = trade.direction === result;
        const profit = isWin ? Math.floor(trade.amount * 0.9) : 0;

        // Cập nhật lệnh
        await db.collection('trades').updateOne(
          { _id: trade._id },
          {
            $set: {
              status: 'completed',
              result: isWin ? 'win' : 'lose',
              profit: profit,
              completedAt: new Date(),
              updatedAt: new Date()
            }
          }
        );

        // Cập nhật số dư user
        const user = await db.collection('users').findOne({ _id: trade.userId });
        if (user) {
          let currentBalance = user.balance || 0;
          let newBalance = currentBalance;
          
          if (isWin) {
            newBalance += trade.amount + profit;
          } else {
            newBalance -= trade.amount;
          }

          await db.collection('users').updateOne(
            { _id: trade.userId },
            { 
              $set: { 
                balance: newBalance,
                updatedAt: new Date()
              }
            }
          );
        }
      }

      // Chuyển phiên sang COMPLETED
      await db.collection('trading_sessions').updateOne(
        { _id: session._id },
        { 
          $set: { 
            status: 'COMPLETED',
            totalTrades: pendingTrades.length,
            completedAt: new Date(),
            updatedAt: new Date()
          }
        }
      );

      return NextResponse.json({
        success: true,
        message: `Đã xử lý phiên ${session.sessionId}`,
        data: {
          sessionId: session.sessionId,
          result: result,
          tradesProcessed: pendingTrades.length
        }
      });
    }

    return NextResponse.json(
      { success: false, message: 'Hành động không hợp lệ' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Lỗi khi test xử lý kết quả:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ nội bộ', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 