import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Xác thực admin
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
    const user = await verifyToken(token);
    
    if (!user?.userId) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    // Kiểm tra quyền admin
    const db = await getMongoDb();
    if (!db) {
      return NextResponse.json({ message: 'Database connection failed' }, { status: 500 });
    }

    const userData = await db.collection('users').findOne({ _id: user.userId });
    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    // Lấy dữ liệu từ request
    const { predictions } = await request.json();
    
    if (!predictions || !Array.isArray(predictions)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Predictions array is required' 
      }, { status: 400 });
    }

    // Validate predictions
    for (const prediction of predictions) {
      if (!prediction.sessionId || !prediction.result) {
        return NextResponse.json({ 
          success: false, 
          message: 'Each prediction must have sessionId and result' 
        }, { status: 400 });
      }

      if (!['UP', 'DOWN'].includes(prediction.result)) {
        return NextResponse.json({ 
          success: false, 
          message: 'Result must be UP or DOWN' 
        }, { status: 400 });
      }
    }

    const now = new Date();
    const results = {
      updated: [] as any[],
      errors: [] as string[]
    };

    // Cập nhật từng prediction
    for (const prediction of predictions) {
      try {
        // Kiểm tra phiên có tồn tại không
        const session = await db.collection('trading_sessions').findOne({ 
          sessionId: prediction.sessionId 
        });

        if (!session) {
          results.errors.push(`Session ${prediction.sessionId} not found`);
          continue;
        }

        // Chỉ cho phép sửa kết quả phiên chưa diễn ra
        if (session.status === 'COMPLETED') {
          results.errors.push(`Session ${prediction.sessionId} already completed`);
          continue;
        }

        // Cập nhật kết quả
        await db.collection('trading_sessions').updateOne(
          { sessionId: prediction.sessionId },
          {
            $set: {
              result: prediction.result,
              createdBy: 'admin',
              updatedAt: now
            }
          }
        );

        results.updated.push({
          sessionId: prediction.sessionId,
          result: prediction.result,
          status: session.status
        });

        console.log(`✅ Updated prediction for session ${prediction.sessionId}: ${prediction.result}`);

      } catch (error) {
        const errorMsg = `Error updating session ${prediction.sessionId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${results.updated.length} predictions`,
      data: {
        updated: results.updated,
        errors: results.errors,
        total: predictions.length
      }
    });

  } catch (error) {
    console.error('Error updating predictions:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      success: false,
      message: errorMessage
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Xác thực admin
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
    const user = await verifyToken(token);
    
    if (!user?.userId) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    // Kiểm tra quyền admin
    const db = await getMongoDb();
    if (!db) {
      return NextResponse.json({ message: 'Database connection failed' }, { status: 500 });
    }

    const userData = await db.collection('users').findOne({ _id: user.userId });
    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    // Lấy danh sách phiên giao dịch
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');

    let query: any = {};
    if (status) {
      query.status = status;
    }

    const sessions = await db.collection('trading_sessions')
      .find(query)
      .sort({ startTime: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      data: {
        sessions: sessions.map(session => ({
          sessionId: session.sessionId,
          startTime: session.startTime,
          endTime: session.endTime,
          status: session.status,
          result: session.result,
          actualResult: session.actualResult,
          createdBy: session.createdBy,
          totalTrades: session.totalTrades || 0,
          totalWins: session.totalWins || 0,
          totalLosses: session.totalLosses || 0,
          completedAt: session.completedAt,
          createdAt: session.createdAt
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching predictions:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      success: false,
      message: errorMessage
    }, { status: 500 });
  }
} 