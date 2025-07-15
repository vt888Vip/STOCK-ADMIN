import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { NextRequest } from 'next/server';

// API để theo dõi sự thay đổi phiên và cập nhật trạng thái lệnh
export async function GET(request: NextRequest) {
  try {
    const db = await getMongoDb();
    if (!db) {
      throw new Error('Không thể kết nối cơ sở dữ liệu');
    }

    const now = new Date();
    const currentMinute = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes()));
    const nextMinute = new Date(currentMinute.getTime() + 60000);

    // Tạo sessionId cho phiên hiện tại
    const sessionId = `${currentMinute.getUTCFullYear()}${String(currentMinute.getUTCMonth() + 1).padStart(2, '0')}${String(currentMinute.getUTCDate()).padStart(2, '0')}${String(currentMinute.getUTCHours()).padStart(2, '0')}${String(currentMinute.getUTCMinutes()).padStart(2, '0')}`;

    // Lấy phiên hiện tại từ database
    let currentSession = await db.collection('trading_sessions').findOne({ 
      sessionId: sessionId,
      status: { $in: ['ACTIVE', 'PREDICTED'] }
    });

    // Kiểm tra xem phiên hiện tại có kết thúc chưa
    const sessionEnded = currentSession && currentSession.endTime <= now;
    const sessionChanged = sessionEnded || !currentSession;

    // Nếu phiên đã kết thúc, tự động sửa các phiên đã kết thúc trước đó
    if (sessionEnded) {
      try {
        const fixResponse = await fetch(`${request.nextUrl.origin}/api/trading-sessions/fix-expired`);
        if (fixResponse.ok) {
          const fixData = await fixResponse.json();
        }
      } catch (error) {
      }
    }

    if (sessionChanged) {

      // Nếu phiên cũ đã kết thúc và có trạng thái PREDICTED, xử lý kết quả
      if (sessionEnded && currentSession && currentSession.status === 'PREDICTED') {
        const oldSessionId = currentSession.sessionId;
        const sessionResult = currentSession.result;


        // Tìm tất cả lệnh của phiên đã kết thúc
        const pendingTrades = await db.collection('trades').find({
          sessionId: oldSessionId,
          status: 'pending'
        }).toArray();


        // Thống kê kết quả
        let totalWins = 0;
        let totalLosses = 0;
        let totalWinAmount = 0;
        let totalLossAmount = 0;

        // Cập nhật kết quả cho từng lệnh
        for (const trade of pendingTrades) {
          const isWin = trade.direction === sessionResult;
          const profit = isWin ? Math.floor(trade.amount * 0.9) : 0; // 10 ăn 9

          const updateData = {
            status: 'completed',
            result: isWin ? 'win' : 'lose',
            profit: profit,
            completedAt: now,
            updatedAt: now
          };

          await db.collection('trades').updateOne(
            { _id: trade._id },
            { $set: updateData }
          );

          // Cập nhật số dư người dùng
          const user = await db.collection('users').findOne({ _id: trade.userId });
          if (user) {
            let currentBalance = user.balance || 0;
            let newBalance = currentBalance;
            
            if (isWin) {
              // Thắng: cộng tiền thắng (tiền cược + lợi nhuận)
              newBalance += trade.amount + profit;
              totalWins++;
              totalWinAmount += trade.amount + profit;
            } else {
              // Thua: trừ tiền cược (vì không trừ khi đặt lệnh)
              newBalance -= trade.amount;
              totalLosses++;
              totalLossAmount += trade.amount;
            }

            await db.collection('users').updateOne(
              { _id: trade.userId },
              { 
                $set: { 
                  balance: newBalance,
                  updatedAt: now
                }
              }
            );
          }
        }

        // Chuyển phiên từ PREDICTED sang COMPLETED sau khi xử lý xong
        await db.collection('trading_sessions').updateOne(
          { sessionId: oldSessionId },
          { 
            $set: { 
              status: 'COMPLETED',
              totalTrades: pendingTrades.length,
              totalWins: totalWins,
              totalLosses: totalLosses,
              totalWinAmount: totalWinAmount,
              totalLossAmount: totalLossAmount,
              completedAt: now,
              updatedAt: now
            }
          }
        );
      }

      // Tạo phiên mới nếu cần
      if (!currentSession || sessionEnded) {
        const newSession = {
          sessionId,
          startTime: currentMinute,
          endTime: nextMinute,
          status: 'ACTIVE', // Bắt đầu với ACTIVE
          result: null, // Chưa có kết quả
          createdAt: now,
          updatedAt: now
        };

        // Tạo phiên mới (không xóa phiên cũ)
        await db.collection('trading_sessions').insertOne(newSession);
        currentSession = newSession as any;
      }
    }

    // Tính thời gian còn lại
    const timeLeft = Math.max(0, Math.floor((nextMinute.getTime() - now.getTime()) / 1000));

    return NextResponse.json({
      success: true,
      sessionChanged,
      currentSession: {
        sessionId: currentSession?.sessionId || sessionId,
        startTime: currentSession?.startTime || currentMinute,
        endTime: currentSession?.endTime || nextMinute,
        timeLeft,
        status: currentSession?.status || 'ACTIVE',
        result: currentSession?.result || null
      },
      serverTime: now.toISOString()
    });

  } catch (error) {
    console.error('Lỗi khi theo dõi thay đổi phiên:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ nội bộ' },
      { status: 500 }
    );
  }
} 