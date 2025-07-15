import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { NextRequest } from 'next/server';

// API test để kiểm tra việc lưu kết quả phiên
export async function POST(request: NextRequest) {
  try {
    const db = await getMongoDb();
    if (!db) {
      throw new Error('Không thể kết nối cơ sở dữ liệu');
    }

    const now = new Date();
    
    console.log('🔍 Kiểm tra phiên hiện tại trong database...');
    
    // Kiểm tra tất cả phiên trong collection
    const allSessions = await db.collection('trading_sessions').find({}).toArray();
    console.log('📊 Tất cả phiên trong database:', allSessions);
    
    // Tìm phiên vừa kết thúc
    const justEndedSession = await db.collection('trading_sessions').findOne({
      endTime: { $lte: now },
      status: { $in: ['ACTIVE', 'PREDICTED'] }
    }, {
      sort: { endTime: -1 }
    });

    console.log('🎯 Phiên vừa kết thúc:', justEndedSession);

    if (!justEndedSession) {
      console.log('❌ Không có phiên nào vừa kết thúc');
      
      // Tạo một phiên test để demo
      const testSession = {
        sessionId: `TEST${Date.now()}`,
        startTime: new Date(now.getTime() - 60000), // 1 phút trước
        endTime: new Date(now.getTime() - 1000), // 1 giây trước
        status: 'ACTIVE',
        result: null,
        createdAt: now,
        updatedAt: now
      };
      
      console.log('🧪 Tạo phiên test:', testSession);
      await db.collection('trading_sessions').insertOne(testSession);
      
      return NextResponse.json({
        success: true,
        message: 'Đã tạo phiên test để demo',
        data: {
          testSession,
          allSessions
        }
      });
    }

    // Tạo kết quả random
    const random = Math.random();
    const actualResult = random < 0.6 ? 'UP' : 'DOWN';

    console.log('🎲 Kết quả random:', actualResult);

    // Cập nhật phiên vừa kết thúc
    const updateResult = await db.collection('trading_sessions').updateOne(
      { _id: justEndedSession._id },
      {
        $set: {
          status: 'COMPLETED',
          actualResult: actualResult,
          completedAt: now,
          updatedAt: now
        }
      }
    );

    console.log('✅ Kết quả cập nhật:', updateResult);

    // Xóa các phiên cũ khác
    const deleteResult = await db.collection('trading_sessions').deleteMany({
      _id: { $ne: justEndedSession._id }
    });

    console.log('🗑️ Kết quả xóa phiên cũ:', deleteResult);

    // Kiểm tra phiên sau khi cập nhật
    const updatedSession = await db.collection('trading_sessions').findOne({
      _id: justEndedSession._id
    });

    console.log('📊 Phiên sau khi cập nhật:', updatedSession);

    return NextResponse.json({
      success: true,
      message: `Đã lưu kết quả phiên ${justEndedSession.sessionId}: ${actualResult}`,
      data: {
        sessionId: justEndedSession.sessionId,
        actualResult: actualResult,
        status: 'COMPLETED',
        completedAt: now,
        updatedSession,
        allSessionsBefore: allSessions
      }
    });

  } catch (error) {
    console.error('❌ Lỗi khi test lưu kết quả phiên:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ nội bộ', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// API để xem trạng thái hiện tại của collection
export async function GET(request: NextRequest) {
  try {
    const db = await getMongoDb();
    if (!db) {
      throw new Error('Không thể kết nối cơ sở dữ liệu');
    }

    const now = new Date();
    
    // Lấy tất cả phiên
    const allSessions = await db.collection('trading_sessions').find({}).toArray();
    
    // Lấy phiên đang hoạt động
    const activeSession = await db.collection('trading_sessions').findOne({
      status: { $in: ['ACTIVE', 'PREDICTED'] }
    });
    
    // Lấy phiên đã hoàn thành
    const completedSession = await db.collection('trading_sessions').findOne({
      status: 'COMPLETED'
    });

    return NextResponse.json({
      success: true,
      data: {
        currentTime: now,
        totalSessions: allSessions.length,
        allSessions,
        activeSession,
        completedSession
      }
    });

  } catch (error) {
    console.error('Lỗi khi lấy trạng thái collection:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ nội bộ' },
      { status: 500 }
    );
  }
} 