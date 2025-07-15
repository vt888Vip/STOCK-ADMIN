import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Session ID is required' 
      }, { status: 400 });
    }

    const db = await getMongoDb();
    if (!db) {
      return NextResponse.json({ 
        success: false, 
        message: 'Database connection failed' 
      }, { status: 500 });
    }

    // Bắt đầu transaction để đảm bảo tính nhất quán
    const session = (db as any).client.startSession();
    
    try {
      await session.withTransaction(async () => {
        // 1. Tìm phiên giao dịch
        const tradingSession = await db.collection('trading_sessions').findOne(
          { sessionId },
          { session }
        );

        if (!tradingSession) {
          throw new Error('Trading session not found');
        }

        if (tradingSession.status === 'COMPLETED') {
          throw new Error('Trading session already completed');
        }

        // 2. Xác định kết quả phiên
        let finalResult: 'UP' | 'DOWN';
        
        if (tradingSession.result) {
          // Sử dụng kết quả do admin nhập trước
          finalResult = tradingSession.result;
          console.log('📊 Using admin predicted result:', finalResult);
        } else {
          // Random kết quả nếu admin chưa nhập
          const random = Math.random();
          finalResult = random < 0.6 ? 'UP' : 'DOWN';
          console.log('🎲 Using random result:', finalResult);
        }

        // 3. Tìm tất cả lệnh pending của phiên này
        const pendingTrades = await db.collection('trades').find(
          { 
            sessionId,
            status: 'pending'
          },
          { session }
        ).toArray();

        console.log(`🔍 Found ${pendingTrades.length} pending trades for session ${sessionId}`);

        // 4. Xử lý từng lệnh
        let totalWins = 0;
        let totalLosses = 0;
        let totalWinAmount = 0;
        let totalLossAmount = 0;

        for (const trade of pendingTrades) {
          // Xác định thắng/thua
          const isWin = trade.direction === finalResult;
          const profit = isWin ? Math.floor(trade.amount * 0.9) : 0; // 10 ăn 9

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
            },
            { session }
          );

          // Cập nhật số dư user
          const user = await db.collection('users').findOne(
            { _id: new ObjectId(trade.userId) },
            { session }
          );

          if (user) {
            const userBalance = user.balance || { available: 0, frozen: 0 };
            const currentAvailable = typeof userBalance === 'number' ? userBalance : userBalance.available || 0;
            const currentFrozen = typeof userBalance === 'number' ? 0 : userBalance.frozen || 0;

            let newAvailable = currentAvailable;
            let newFrozen = currentFrozen - trade.amount; // Giải phóng frozen balance

            if (isWin) {
              // Thắng: cộng tiền thắng (tiền cược + lợi nhuận)
              newAvailable += trade.amount + profit;
              totalWins++;
              totalWinAmount += trade.amount + profit;
            } else {
              // Thua: chỉ giải phóng frozen balance (tiền cược đã bị trừ khi đặt lệnh)
              totalLosses++;
              totalLossAmount += trade.amount;
            }

            await db.collection('users').updateOne(
              { _id: new ObjectId(trade.userId) },
              {
                $set: {
                  balance: {
                    available: newAvailable,
                    frozen: newFrozen
                  },
                  updatedAt: new Date()
                }
              },
              { session }
            );

            console.log(`💰 Updated user ${trade.userId} balance:`, {
              isWin,
              oldAvailable: currentAvailable,
              newAvailable,
              oldFrozen: currentFrozen,
              newFrozen,
              profit
            });
          }
        }

        // 5. Cập nhật phiên giao dịch
        await db.collection('trading_sessions').updateOne(
          { sessionId },
          {
            $set: {
              status: 'COMPLETED',
              actualResult: finalResult,
              totalTrades: pendingTrades.length,
              totalWins: totalWins,
              totalLosses: totalLosses,
              totalWinAmount: totalWinAmount,
              totalLossAmount: totalLossAmount,
              completedAt: new Date(),
              updatedAt: new Date()
            }
          },
          { session }
        );

        console.log(`📈 Session ${sessionId} completed:`, {
          result: finalResult,
          totalTrades: pendingTrades.length,
          totalWins,
          totalLosses,
          totalWinAmount,
          totalLossAmount
        });
      });

      // Transaction thành công
      return NextResponse.json({
        success: true,
        message: `Session ${sessionId} closed successfully`,
        data: {
          sessionId,
          totalTrades: 0, // Sẽ được cập nhật từ database
          totalWins: 0,
          totalLosses: 0
        }
      });

    } catch (error) {
      // Rollback transaction nếu có lỗi
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }

  } catch (error) {
    console.error('Error closing trading session:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      success: false,
      message: errorMessage
    }, { status: 400 });
  }
} 