import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { NextRequest } from 'next/server';

// API test để kiểm tra logic so sánh kết quả
export async function POST(request: NextRequest) {
  try {
    const { userDirection, sessionResult } = await request.json();
    
    if (!userDirection || !sessionResult) {
      return NextResponse.json({
        success: false,
        message: 'Thiếu thông tin userDirection hoặc sessionResult'
      });
    }

    console.log('🧪 Test logic so sánh kết quả:');
    console.log('User Direction:', userDirection);
    console.log('Session Result:', sessionResult);

    // Kiểm tra logic so sánh
    const isWin = userDirection === sessionResult;
    const profit = isWin ? 900000 : -1000000; // Giả sử đặt 1,000,000 VND

    console.log('Kết quả so sánh:', {
      userDirection,
      sessionResult,
      isWin,
      profit
    });

    return NextResponse.json({
      success: true,
      data: {
        userDirection,
        sessionResult,
        isWin,
        profit,
        result: isWin ? 'win' : 'lose',
        explanation: isWin 
          ? `User đặt ${userDirection}, kết quả phiên ${sessionResult} → THẮNG`
          : `User đặt ${userDirection}, kết quả phiên ${sessionResult} → THUA`
      }
    });

  } catch (error) {
    console.error('Lỗi khi test logic so sánh:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ nội bộ' },
      { status: 500 }
    );
  }
}

// API để test với dữ liệu thực từ database
export async function GET(request: NextRequest) {
  try {
    const db = await getMongoDb();
    if (!db) {
      throw new Error('Không thể kết nối cơ sở dữ liệu');
    }

    // Lấy phiên hiện tại
    const currentSession = await db.collection('trading_sessions').findOne({
      status: { $in: ['ACTIVE', 'PREDICTED'] }
    });

    // Lấy lệnh giao dịch gần đây
    const recentTrades = await db.collection('trades').find({}).sort({ createdAt: -1 }).limit(5).toArray();

    const testResults = [];

    // Test với từng lệnh
    for (const trade of recentTrades) {
      if (currentSession && currentSession.result) {
        const isWin = trade.direction === currentSession.result;
        const profit = isWin ? Math.floor(trade.amount * 0.9) : -trade.amount;

        testResults.push({
          tradeId: trade._id,
          sessionId: trade.sessionId,
          userDirection: trade.direction,
          sessionResult: currentSession.result,
          isWin,
          profit,
          result: isWin ? 'win' : 'lose',
          amount: trade.amount
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        currentSession: currentSession ? {
          sessionId: currentSession.sessionId,
          result: currentSession.result,
          status: currentSession.status
        } : null,
        testResults,
        totalTrades: recentTrades.length
      }
    });

  } catch (error) {
    console.error('Lỗi khi test với dữ liệu thực:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ nội bộ' },
      { status: 500 }
    );
  }
} 