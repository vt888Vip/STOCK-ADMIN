import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { NextRequest } from 'next/server';

// API test để kiểm tra luồng phiên mới
export async function GET(request: NextRequest) {
  try {
    const db = await getMongoDb();
    if (!db) {
      throw new Error('Không thể kết nối cơ sở dữ liệu');
    }

    const now = new Date();
    
    // Lấy thông tin phiên hiện tại
    const currentSession = await db.collection('trading_sessions').findOne({ 
      status: { $in: ['ACTIVE', 'PREDICTED'] }
    });

    // Lấy tất cả phiên để phân tích
    const allSessions = await db.collection('trading_sessions')
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    // Lấy thống kê theo trạng thái
    const activeSessions = await db.collection('trading_sessions').countDocuments({ status: 'ACTIVE' });
    const predictedSessions = await db.collection('trading_sessions').countDocuments({ status: 'PREDICTED' });
    const completedSessions = await db.collection('trading_sessions').countDocuments({ status: 'COMPLETED' });

    // Lấy lệnh theo trạng thái
    const pendingTrades = await db.collection('trades').find({ status: 'pending' }).toArray();
    const completedTrades = await db.collection('trades').find({ status: 'completed' }).toArray();

    return NextResponse.json({
      success: true,
      currentTime: now.toISOString(),
      currentSession: currentSession ? {
        sessionId: currentSession.sessionId,
        status: currentSession.status,
        result: currentSession.result,
        startTime: currentSession.startTime,
        endTime: currentSession.endTime,
        timeLeft: Math.max(0, Math.floor((new Date(currentSession.endTime).getTime() - now.getTime()) / 1000))
      } : null,
      sessionStats: {
        active: activeSessions,
        predicted: predictedSessions,
        completed: completedSessions
      },
      tradeStats: {
        pending: pendingTrades.length,
        completed: completedTrades.length
      },
      recentSessions: allSessions.map(session => ({
        sessionId: session.sessionId,
        status: session.status,
        result: session.result,
        startTime: session.startTime,
        endTime: session.endTime,
        createdAt: session.createdAt
      })),
      flow: {
        description: "ACTIVE -> PREDICTED -> COMPLETED",
        steps: [
          "1. Phiên mới bắt đầu với trạng thái ACTIVE (cho phép đặt lệnh)",
          "2. Khi phiên kết thúc, chuyển sang PREDICTED (có kết quả)",
          "3. Sau khi xử lý kết quả, chuyển sang COMPLETED"
        ]
      }
    });

  } catch (error) {
    console.error('Lỗi khi test session flow:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ nội bộ' },
      { status: 500 }
    );
  }
}

// API để test thay đổi trạng thái phiên thủ công
export async function POST(request: NextRequest) {
  try {
    const { action, sessionId } = await request.json();
    const db = await getMongoDb();
    
    if (!db) {
      throw new Error('Không thể kết nối cơ sở dữ liệu');
    }

    const now = new Date();

    if (action === 'force_active_to_predicted') {
      // Force chuyển phiên từ ACTIVE sang PREDICTED
      const random = Math.random();
      const predictedResult = random < 0.6 ? 'UP' : 'DOWN';
      
      await db.collection('trading_sessions').updateOne(
        { sessionId: sessionId || 'current', status: 'ACTIVE' },
        { 
          $set: { 
            status: 'PREDICTED',
            result: predictedResult,
            updatedAt: now
          }
        }
      );

      return NextResponse.json({
        success: true,
        message: 'Đã chuyển phiên từ ACTIVE sang PREDICTED',
        result: predictedResult
      });
    }

    if (action === 'force_predicted_to_completed') {
      // Force chuyển phiên từ PREDICTED sang COMPLETED
      await db.collection('trading_sessions').updateOne(
        { sessionId: sessionId || 'current', status: 'PREDICTED' },
        { 
          $set: { 
            status: 'COMPLETED',
            completedAt: now,
            updatedAt: now
          }
        }
      );

      return NextResponse.json({
        success: true,
        message: 'Đã chuyển phiên từ PREDICTED sang COMPLETED'
      });
    }

    if (action === 'create_test_session') {
      // Tạo phiên test với trạng thái ACTIVE
      const testSessionId = `TEST${Date.now()}`;
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 60000);
      
      await db.collection('trading_sessions').insertOne({
        sessionId: testSessionId,
        startTime,
        endTime,
        status: 'ACTIVE',
        result: null,
        createdAt: now,
        updatedAt: now
      });

      return NextResponse.json({
        success: true,
        message: 'Đã tạo phiên test với trạng thái ACTIVE',
        sessionId: testSessionId
      });
    }

    return NextResponse.json(
      { success: false, message: 'Hành động không hợp lệ' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Lỗi khi test session flow:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ nội bộ' },
      { status: 500 }
    );
  }
} 