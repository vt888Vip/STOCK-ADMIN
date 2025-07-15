import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { NextRequest } from 'next/server';
import { processExpiredSessions } from '@/lib/sessionUtils';

export async function GET(request: NextRequest) {
  try {
    const db = await getMongoDb();
    if (!db) {
      throw new Error('Không thể kết nối cơ sở dữ liệu');
    }

    // Xử lý các phiên hết hạn trước khi trả về dữ liệu
    await processExpiredSessions(db, 'TradingSessions');

    const now = new Date();
    const currentMinute = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes()));
    const nextMinute = new Date(currentMinute.getTime() + 60000);

    // Tạo sessionId cho phiên hiện tại
    const sessionId = `${currentMinute.getUTCFullYear()}${String(currentMinute.getUTCMonth() + 1).padStart(2, '0')}${String(currentMinute.getUTCDate()).padStart(2, '0')}${String(currentMinute.getUTCHours()).padStart(2, '0')}${String(currentMinute.getUTCMinutes()).padStart(2, '0')}`;

    // Tính thời gian còn lại
    const timeLeft = Math.max(0, Math.floor((nextMinute.getTime() - now.getTime()) / 1000));

    // Kiểm tra phiên hiện tại - chỉ lấy phiên ACTIVE hoặc PREDICTED
    let currentSession = await db.collection('trading_sessions').findOne({ 
      sessionId: sessionId,
      status: { $in: ['ACTIVE', 'PREDICTED'] }
    });

    console.log('🔍 Kiểm tra phiên hiện tại:', {
      sessionId,
      currentSession: currentSession?.sessionId,
      currentStatus: currentSession?.status,
      now: now.toISOString(),
      currentMinute: currentMinute.toISOString()
    });

    // Kiểm tra xem phiên hiện tại có kết thúc chưa
    if (currentSession && currentSession.endTime <= now) {
      console.log('⏰ Phiên hiện tại đã kết thúc, sẽ được xử lý bởi processExpiredSessions');
      
      // Cập nhật currentSession với dữ liệu mới (nếu đã được xử lý)
      currentSession = await db.collection('trading_sessions').findOne({ 
        sessionId: currentSession.sessionId
      });
    }

    if (!currentSession) {
      // Tạo phiên mới với trạng thái ACTIVE (chưa có kết quả)
      const newSession = {
        sessionId,
        startTime: currentMinute,
        endTime: nextMinute,
        status: 'ACTIVE', // Bắt đầu với ACTIVE
        result: null, // Chưa có kết quả
        createdAt: now,
        updatedAt: now
      };

      console.log('🆕 Tạo phiên mới với trạng thái ACTIVE:', newSession);

      // Tạo phiên mới (không xóa phiên cũ)
      await db.collection('trading_sessions').insertOne(newSession);
      currentSession = newSession as any;
    }

    // Lấy phiên tiếp theo
    const nextSessionId = `${nextMinute.getUTCFullYear()}${String(nextMinute.getUTCMonth() + 1).padStart(2, '0')}${String(nextMinute.getUTCDate()).padStart(2, '0')}${String(nextMinute.getUTCHours()).padStart(2, '0')}${String(nextMinute.getUTCMinutes()).padStart(2, '0')}`;

    return NextResponse.json({
      success: true,
      currentSession: {
        sessionId: currentSession?.sessionId || sessionId,
        startTime: currentSession?.startTime || currentMinute,
        endTime: currentSession?.endTime || nextMinute,
        timeLeft,
        status: currentSession?.status || 'ACTIVE',
        result: currentSession?.result || null
      },
      nextSession: {
        sessionId: nextSessionId,
        startTime: nextMinute,
        endTime: new Date(nextMinute.getTime() + 60000)
      },
      serverTime: now.toISOString()
    });

  } catch (error) {
    console.error('Lỗi khi lấy phiên hiện tại:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ nội bộ' },
      { status: 500 }
    );
  }
}

// API để admin tạo dự đoán cho nhiều phiên
export async function POST(request: NextRequest) {
  try {
    const { action, sessions } = await request.json();
    const db = await getMongoDb();
    
    if (!db) {
      throw new Error('Không thể kết nối cơ sở dữ liệu');
    }

    if (action === 'create_predictions') {
      // Tạo dự đoán cho 30 phiên tiếp theo
      const now = new Date();
      const predictions = [];

      for (let i = 1; i <= 30; i++) {
        const sessionTime = new Date(now.getTime() + (i * 60 * 1000));
        
        const year = sessionTime.getFullYear().toString();
        const month = (sessionTime.getMonth() + 1).toString().padStart(2, '0');
        const day = sessionTime.getDate().toString().padStart(2, '0');
        const hours = sessionTime.getHours().toString().padStart(2, '0');
        const minutes = sessionTime.getMinutes().toString().padStart(2, '0');
        const sessionId = `${year}${month}${day}${hours}${minutes}`;

        // Kiểm tra xem phiên đã tồn tại chưa
        const existingSession = await db.collection('trading_sessions').findOne({ sessionId });
        
        if (!existingSession) {
          const startTime = new Date(sessionTime);
          const endTime = new Date(sessionTime.getTime() + 60 * 1000);

          await db.collection('trading_sessions').insertOne({
            sessionId,
            result: null, // Chưa có kết quả
            startTime,
            endTime,
            status: 'ACTIVE', // Bắt đầu với ACTIVE
            createdAt: new Date(),
            updatedAt: new Date()
          });

          predictions.push({
            sessionId,
            result: null,
            startTime,
            endTime,
            status: 'ACTIVE'
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: `Đã tạo ${predictions.length} phiên mới với trạng thái ACTIVE`,
        data: predictions
      });
    }

    return NextResponse.json(
      { success: false, message: 'Hành động không hợp lệ' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Lỗi khi tạo dự đoán:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ nội bộ' },
      { status: 500 }
    );
  }
} 