import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Lấy token từ header
    let token = request.headers.get('authorization')?.split(' ')[1];
    
    if (!token) {
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const [name, value] = cookie.trim().split('=');
          acc[name] = value;
          return acc;
        }, {} as Record<string, string>);
        
        token = cookies['token'] || cookies['authToken'];
      }
    }
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Chưa đăng nhập hoặc phiên đăng nhập đã hết hạn' },
        { status: 401 }
      );
    }

    const tokenData = await verifyToken(token);
    if (!tokenData?.isValid) {
      return NextResponse.json(
        { success: false, message: 'Token không hợp lệ' },
        { status: 401 }
      );
    }

    const db = await getMongoDb();
    if (!db) {
      throw new Error('Không thể kết nối cơ sở dữ liệu');
    }

    // Lấy phiên vừa kết thúc (dòng duy nhất trong collection)
    const completedSession = await db.collection('trading_sessions').findOne({
      status: 'COMPLETED'
    });

    if (!completedSession) {
      return NextResponse.json({
        success: true,
        message: 'Chưa có phiên nào kết thúc',
        data: null
      });
    }

    // Lấy lệnh giao dịch của user cho phiên này
    const userTrade = await db.collection('trades').findOne({
      userId: tokenData.userId,
      sessionId: completedSession.sessionId
    });

    let tradeResult = null;
    if (userTrade) {
      // Tính toán kết quả dựa trên lệnh của user và kết quả thực tế
      const userDirection = userTrade.direction; // UP hoặc DOWN
      const sessionResult = completedSession.actualResult || completedSession.result; // UP hoặc DOWN
      
      if (userDirection === sessionResult) {
        tradeResult = 'win';
      } else {
        tradeResult = 'lose';
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        sessionId: completedSession.sessionId,
        startTime: completedSession.startTime,
        endTime: completedSession.endTime,
        actualResult: completedSession.actualResult || completedSession.result,
        status: completedSession.status,
        completedAt: completedSession.completedAt,
        userTrade: userTrade ? {
          id: userTrade._id,
          direction: userTrade.direction,
          amount: userTrade.amount,
          result: tradeResult
        } : null
      }
    });

  } catch (error) {
    console.error('Lỗi khi lấy kết quả phiên:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ nội bộ' },
      { status: 500 }
    );
  }
} 