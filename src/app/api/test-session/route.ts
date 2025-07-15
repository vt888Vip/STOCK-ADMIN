import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { NextRequest } from 'next/server';

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

    // Kiểm tra phiên hiện tại
    let currentSession = await db.collection('trading_sessions').findOne({ sessionId });

    if (!currentSession) {
      // Tạo phiên mới nếu chưa có
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
      currentSession = newSession as any;
    }

    // Đếm tổng số phiên
    const totalSessions = await db.collection('trading_sessions').countDocuments();

    return NextResponse.json({
      success: true,
      message: 'Test session thành công',
      data: {
        currentSession: {
          sessionId: currentSession?.sessionId || sessionId,
          status: currentSession?.status || 'ACTIVE',
          startTime: currentSession?.startTime || currentMinute,
          endTime: currentSession?.endTime || nextMinute
        },
        totalSessions,
        serverTime: now.toISOString()
      }
    });

  } catch (error) {
    console.error('Lỗi khi test session:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ nội bộ', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 