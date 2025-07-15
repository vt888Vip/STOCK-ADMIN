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

    // Tính thời gian còn lại
    const timeLeft = Math.max(0, Math.floor((nextMinute.getTime() - now.getTime()) / 1000));

    // Kiểm tra phiên hiện tại
    let currentSession = await db.collection('trading_sessions').findOne({ sessionId });

    // Lấy tất cả phiên gần đây
    const recentSessions = await db.collection('trading_sessions')
      .find()
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    // Đếm tổng số phiên
    const totalSessions = await db.collection('trading_sessions').countDocuments();

    return NextResponse.json({
      success: true,
      message: 'Debug session thành công',
      data: {
        currentTime: now.toISOString(),
        currentMinute: currentMinute.toISOString(),
        nextMinute: nextMinute.toISOString(),
        sessionId,
        timeLeft,
        currentSession: currentSession ? {
          sessionId: currentSession.sessionId,
          status: currentSession.status,
          startTime: currentSession.startTime,
          endTime: currentSession.endTime,
          result: currentSession.result
        } : null,
        recentSessions: recentSessions.map(s => ({
          sessionId: s.sessionId,
          status: s.status,
          startTime: s.startTime,
          endTime: s.endTime,
          result: s.result
        })),
        totalSessions
      }
    });

  } catch (error) {
    console.error('Lỗi khi debug session:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ nội bộ', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 