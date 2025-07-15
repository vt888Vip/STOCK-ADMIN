import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { NextRequest } from 'next/server';

// API Cron để tự động xử lý phiên giao dịch
export async function GET(request: NextRequest) {
  try {
    const db = await getMongoDb();
    if (!db) {
      throw new Error('Không thể kết nối cơ sở dữ liệu');
    }

    const now = new Date();
    const results = {
      processedSessions: [] as any[],
      totalProcessed: 0,
      errors: [] as string[],
      timestamp: now.toISOString()
    };

    console.log('🕐 Cron job bắt đầu xử lý phiên:', now.toISOString());

    // 1. Xử lý các phiên ACTIVE đã kết thúc
    const expiredActiveSessions = await db.collection('trading_sessions').find({
      status: 'ACTIVE',
      endTime: { $lte: now }
    }).toArray();

    console.log(`🔍 Tìm thấy ${expiredActiveSessions.length} phiên ACTIVE đã kết thúc`);

    for (const session of expiredActiveSessions) {
      try {
        // Tạo kết quả random cho phiên đã kết thúc (60% UP, 40% DOWN)
        const random = Math.random();
        const predictedResult = random < 0.6 ? 'UP' : 'DOWN';
        
        // Chuyển phiên từ ACTIVE sang PREDICTED với kết quả
        await db.collection('trading_sessions').updateOne(
          { _id: session._id },
          { 
            $set: { 
              status: 'PREDICTED',
              result: predictedResult,
              updatedAt: now
            }
          }
        );
        
        results.processedSessions.push({
          sessionId: session.sessionId,
          action: 'ACTIVE_TO_PREDICTED',
          oldStatus: 'ACTIVE',
          newStatus: 'PREDICTED',
          result: predictedResult,
          endTime: session.endTime,
          timeExpired: Math.floor((now.getTime() - session.endTime.getTime()) / 1000)
        });
        
        results.totalProcessed++;
        
        console.log(`✅ Cron: Đã chuyển phiên ${session.sessionId} từ ACTIVE sang PREDICTED, Kết quả: ${predictedResult}`);
        
      } catch (error) {
        const errorMsg = `Lỗi khi xử lý phiên ACTIVE ${session.sessionId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // 2. Xử lý các phiên PREDICTED đã kết thúc
    const expiredPredictedSessions = await db.collection('trading_sessions').find({
      status: 'PREDICTED',
      endTime: { $lte: now }
    }).toArray();

    console.log(`🔍 Tìm thấy ${expiredPredictedSessions.length} phiên PREDICTED đã kết thúc`);

    for (const session of expiredPredictedSessions) {
      try {
        const sessionResult = session.result;
        
        if (!sessionResult) {
          // Nếu phiên PREDICTED không có kết quả, tạo kết quả random
          const random = Math.random();
          const predictedResult = random < 0.6 ? 'UP' : 'DOWN';
          
          await db.collection('trading_sessions').updateOne(
            { _id: session._id },
            { 
              $set: { 
                result: predictedResult,
                updatedAt: now
              }
            }
          );
          
          console.log(`✅ Cron: Đã thêm kết quả cho phiên ${session.sessionId}: ${predictedResult}`);
        }

        // Tìm tất cả lệnh pending của phiên này
        const pendingTrades = await db.collection('trades').find({
          sessionId: session.sessionId,
          status: 'pending'
        }).toArray();

        console.log(`🔍 Cron: Tìm thấy ${pendingTrades.length} lệnh pending cho phiên ${session.sessionId}`);

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

          console.log(`✅ Cron: Cập nhật lệnh ${trade._id}: ${isWin ? 'THẮNG' : 'THUA'} - Lợi nhuận: ${profit}`);

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

            console.log(`💰 Cron: Cập nhật số dư user ${trade.userId}: ${currentBalance} -> ${newBalance} (${isWin ? 'THẮNG' : 'THUA'})`);
          }
        }

        // Chuyển phiên từ PREDICTED sang COMPLETED sau khi xử lý xong
        await db.collection('trading_sessions').updateOne(
          { _id: session._id },
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

        results.processedSessions.push({
          sessionId: session.sessionId,
          action: 'PREDICTED_TO_COMPLETED',
          oldStatus: 'PREDICTED',
          newStatus: 'COMPLETED',
          result: sessionResult,
          totalTrades: pendingTrades.length,
          totalWins: totalWins,
          totalLosses: totalLosses,
          totalWinAmount: totalWinAmount,
          totalLossAmount: totalLossAmount,
          endTime: session.endTime,
          timeExpired: Math.floor((now.getTime() - session.endTime.getTime()) / 1000)
        });
        
        results.totalProcessed++;
        
        console.log(`📈 Cron: Hoàn thành phiên ${session.sessionId}: ${totalWins} thắng, ${totalLosses} thua, Tổng thắng: ${totalWinAmount}, Tổng thua: ${totalLossAmount}`);
        
      } catch (error) {
        const errorMsg = `Lỗi khi xử lý phiên PREDICTED ${session.sessionId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // 3. Tạo phiên mới nếu cần
    const currentMinute = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes()));
    const nextMinute = new Date(currentMinute.getTime() + 60000);
    const sessionId = `${currentMinute.getUTCFullYear()}${String(currentMinute.getUTCMonth() + 1).padStart(2, '0')}${String(currentMinute.getUTCDate()).padStart(2, '0')}${String(currentMinute.getUTCHours()).padStart(2, '0')}${String(currentMinute.getUTCMinutes()).padStart(2, '0')}`;

    // Kiểm tra xem phiên hiện tại có tồn tại không
    const currentSession = await db.collection('trading_sessions').findOne({ 
      sessionId: sessionId,
      status: { $in: ['ACTIVE', 'PREDICTED'] }
    });

    if (!currentSession) {
      // Tạo phiên mới
      const newSession = {
        sessionId,
        startTime: currentMinute,
        endTime: nextMinute,
        status: 'ACTIVE',
        result: null,
        createdAt: now,
        updatedAt: now
      };

      await db.collection('trading_sessions').insertOne(newSession);
      
      results.processedSessions.push({
        sessionId: sessionId,
        action: 'CREATE_NEW_SESSION',
        newStatus: 'ACTIVE',
        startTime: currentMinute,
        endTime: nextMinute
      });
      
      results.totalProcessed++;
      
      console.log(`🆕 Cron: Đã tạo phiên mới ${sessionId} với trạng thái ACTIVE`);
    }

    console.log(`✅ Cron job hoàn thành: Xử lý ${results.totalProcessed} phiên, ${results.errors.length} lỗi`);

    return NextResponse.json({
      success: true,
      message: `Cron job hoàn thành: Xử lý ${results.totalProcessed} phiên`,
      results
    });

  } catch (error) {
    console.error('Lỗi trong cron job:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ nội bộ', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 