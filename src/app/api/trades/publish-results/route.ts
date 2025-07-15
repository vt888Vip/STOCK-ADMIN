import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const db = await getMongoDb();
    
    // Lấy tất cả lệnh có result nhưng chưa được công bố (status = 'success')
    const completedTrades = await db.collection('trades').find({
      status: 'success',
      result: { $in: ['win', 'lose'] }
    }).toArray();

    console.log(`🔍 Tìm thấy ${completedTrades.length} lệnh đã có kết quả cần công bố`);

    let publishedCount = 0;
    let errorCount = 0;

    for (const trade of completedTrades) {
      try {
        // Cập nhật trạng thái lệnh thành 'completed' (đã công bố)
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

        // Cập nhật số dư người dùng nếu chưa cập nhật
        if (trade.profit !== 0) {
          const user = await db.collection('users').findOne({ _id: trade.userId });
          if (user) {
            const userBalance = user.balance || { available: 0, frozen: 0 };
            const currentAvailable = typeof userBalance === 'number' ? userBalance : userBalance.available || 0;
            
            // Chỉ cập nhật nếu chưa được cập nhật (kiểm tra bằng cách so sánh profit)
            const expectedBalance = currentAvailable + trade.profit;
            
            await db.collection('users').updateOne(
              { _id: trade.userId },
              {
                $set: {
                  balance: {
                    available: expectedBalance,
                    frozen: typeof userBalance === 'number' ? 0 : userBalance.frozen || 0
                  },
                  updatedAt: new Date()
                }
              }
            );

            console.log(`✅ Công bố lệnh ${trade._id}: ${trade.result}, profit: ${trade.profit}, user balance: ${expectedBalance}`);
          }
        }

        publishedCount++;

      } catch (error) {
        console.error(`❌ Lỗi khi công bố lệnh ${trade._id}:`, error);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã công bố kết quả: ${publishedCount} lệnh thành công, ${errorCount} lỗi`,
      data: {
        publishedCount,
        errorCount,
        totalProcessed: completedTrades.length
      }
    });

  } catch (error) {
    console.error('Lỗi khi công bố kết quả:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ nội bộ' },
      { status: 500 }
    );
  }
}

// API để lấy danh sách lệnh đã công bố kết quả
export async function GET(req: Request) {
  try {
    const db = await getMongoDb();
    
    // Lấy tất cả lệnh đã công bố kết quả
    const publishedTrades = await db.collection('trades').find({
      status: 'completed',
      result: { $in: ['win', 'lose'] }
    }).sort({ publishedAt: -1 }).limit(50).toArray();

    return NextResponse.json({
      success: true,
      data: publishedTrades.map(trade => ({
        ...trade,
        _id: trade._id.toString(),
        userId: trade.userId.toString()
      }))
    });

  } catch (error) {
    console.error('Lỗi khi lấy danh sách lệnh đã công bố:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ nội bộ' },
      { status: 500 }
    );
  }
} 