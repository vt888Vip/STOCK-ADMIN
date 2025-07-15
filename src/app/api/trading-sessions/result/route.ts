import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    const db = await getMongoDb();
    if (!db) {
      throw new Error('Không thể kết nối cơ sở dữ liệu');
    }

    let query = {};
    if (sessionId) {
      // Tìm phiên theo sessionId
      query = { sessionId };
    } else {
      // Tìm phiên hiện tại (ACTIVE hoặc PREDICTED)
      query = { 
        status: { $in: ['ACTIVE', 'PREDICTED'] }
      };
    }

    const session = await db.collection('trading_sessions').findOne(query, {
      sort: { createdAt: -1 }
    });

    if (!session) {
      return NextResponse.json({
        success: false,
        message: 'Không tìm thấy phiên',
        data: null
      });
    }

    console.log('🔍 Lấy kết quả phiên:', {
      sessionId: session.sessionId,
      status: session.status,
      result: session.result,
      actualResult: session.actualResult
    });

    // Trả về kết quả từ trường result (dự đoán) hoặc actualResult (kết quả thực tế)
    const finalResult = session.actualResult || session.result;

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status,
        result: finalResult,
        predictedResult: session.result,
        actualResult: session.actualResult,
        completedAt: session.completedAt
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