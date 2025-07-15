import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { NextRequest } from 'next/server';

// API để sửa tất cả các phiên đã kết thúc nhưng chưa được cập nhật
export async function GET(request: NextRequest) {
  try {
    const db = await getMongoDb();
    if (!db) {
      throw new Error('Không thể kết nối cơ sở dữ liệu');
    }

    const now = new Date();
    const results = {
      fixedSessions: [] as any[],
      totalFixed: 0,
      errors: [] as string[]
    };

    // Tìm tất cả phiên ACTIVE đã kết thúc
    const expiredActiveSessions = await db.collection('trading_sessions').find({
      status: 'ACTIVE',
      endTime: { $lte: now }
    }).toArray();

    console.log(`🔍 Tìm thấy ${expiredActiveSessions.length} phiên ACTIVE đã kết thúc`);

    // Xử lý từng phiên đã kết thúc
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
        
        results.fixedSessions.push({
          sessionId: session.sessionId,
          oldStatus: 'ACTIVE',
          newStatus: 'PREDICTED',
          result: predictedResult,
          endTime: session.endTime,
          timeExpired: Math.floor((now.getTime() - session.endTime.getTime()) / 1000)
        });
        
        results.totalFixed++;
        
        console.log(`✅ Đã sửa phiên ${session.sessionId}: ACTIVE -> PREDICTED, Kết quả: ${predictedResult}`);
        
      } catch (error) {
        const errorMsg = `Lỗi khi sửa phiên ${session.sessionId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // Tìm tất cả phiên PREDICTED đã kết thúc và chưa được xử lý
    const expiredPredictedSessions = await db.collection('trading_sessions').find({
      status: 'PREDICTED',
      endTime: { $lte: now }
    }).toArray();

    console.log(`🔍 Tìm thấy ${expiredPredictedSessions.length} phiên PREDICTED đã kết thúc`);

    // Xử lý các phiên PREDICTED đã kết thúc
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
          
          console.log(`✅ Đã thêm kết quả cho phiên ${session.sessionId}: ${predictedResult}`);
        }

        // Tìm tất cả lệnh pending của phiên này
        const pendingTrades = await db.collection('trades').find({
          sessionId: session.sessionId,
          status: 'pending'
        }).toArray();

        console.log(`🔍 Tìm thấy ${pendingTrades.length} lệnh pending cho phiên ${session.sessionId}`);

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

          console.log(`✅ Cập nhật lệnh ${trade._id}: ${isWin ? 'THẮNG' : 'THUA'} - Lợi nhuận: ${profit}`);

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

            console.log(`💰 Cập nhật số dư user ${trade.userId}: ${currentBalance} -> ${newBalance} (${isWin ? 'THẮNG' : 'THUA'})`);
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

        results.fixedSessions.push({
          sessionId: session.sessionId,
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
        
        results.totalFixed++;
        
        console.log(`📈 Hoàn thành phiên ${session.sessionId}: ${totalWins} thắng, ${totalLosses} thua, Tổng thắng: ${totalWinAmount}, Tổng thua: ${totalLossAmount}`);
        
      } catch (error) {
        const errorMsg = `Lỗi khi xử lý phiên PREDICTED ${session.sessionId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã sửa ${results.totalFixed} phiên đã kết thúc`,
      timestamp: now.toISOString(),
      results
    });

  } catch (error) {
    console.error('Lỗi khi sửa phiên đã kết thúc:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ nội bộ', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 