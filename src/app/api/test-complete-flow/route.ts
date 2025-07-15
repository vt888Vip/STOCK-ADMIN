import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { NextRequest } from 'next/server';

// API test để kiểm tra toàn bộ luồng hoạt động
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

    // 1. Kiểm tra phiên hiện tại
    let currentSession = await db.collection('trading_sessions').findOne({ 
      sessionId: sessionId,
      status: { $in: ['ACTIVE', 'PREDICTED'] }
    });

    // 2. Kiểm tra lệnh pending
    const pendingTrades = await db.collection('trades').find({
      status: 'pending'
    }).toArray();

    // 3. Kiểm tra lệnh completed
    const completedTrades = await db.collection('trades').find({
      status: 'completed'
    }).toArray();

    // 4. Kiểm tra users và balance
    const users = await db.collection('users').find({}).limit(5).toArray();

    // 5. Thống kê tổng quan
    const totalSessions = await db.collection('trading_sessions').countDocuments();
    const totalTrades = await db.collection('trades').countDocuments();
    const totalUsers = await db.collection('users').countDocuments();

    // 6. Kiểm tra logic phiên
    let sessionLogic = {
      currentSessionExists: !!currentSession,
      currentSessionStatus: currentSession?.status || 'N/A',
      currentSessionResult: currentSession?.result || 'N/A',
      sessionEnded: currentSession ? currentSession.endTime <= now : false,
      shouldCreateNewSession: !currentSession || (currentSession && currentSession.endTime <= now)
    };

    // 7. Kiểm tra logic lệnh
    let tradeLogic = {
      pendingTradesCount: pendingTrades.length,
      completedTradesCount: completedTrades.length,
      pendingTradesBySession: {} as any,
      completedTradesBySession: {} as any
    };

    // Nhóm lệnh theo phiên
    pendingTrades.forEach(trade => {
      if (!tradeLogic.pendingTradesBySession[trade.sessionId]) {
        tradeLogic.pendingTradesBySession[trade.sessionId] = [];
      }
      tradeLogic.pendingTradesBySession[trade.sessionId].push({
        userId: trade.userId,
        direction: trade.direction,
        amount: trade.amount,
        status: trade.status
      });
    });

    completedTrades.forEach(trade => {
      if (!tradeLogic.completedTradesBySession[trade.sessionId]) {
        tradeLogic.completedTradesBySession[trade.sessionId] = [];
      }
      tradeLogic.completedTradesBySession[trade.sessionId].push({
        userId: trade.userId,
        direction: trade.direction,
        amount: trade.amount,
        status: trade.status,
        result: trade.result,
        profit: trade.profit
      });
    });

    // 8. Kiểm tra balance logic
    let balanceLogic = {
      usersWithBalance: users.map(user => ({
        userId: user._id,
        username: user.username,
        balance: user.balance,
        balanceType: typeof user.balance
      }))
    };

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      sessionId: sessionId,
      
      // Thống kê tổng quan
      statistics: {
        totalSessions,
        totalTrades,
        totalUsers,
        pendingTrades: pendingTrades.length,
        completedTrades: completedTrades.length
      },

      // Logic phiên
      sessionLogic,

      // Logic lệnh
      tradeLogic,

      // Logic balance
      balanceLogic,

      // Dữ liệu chi tiết
      currentSession: currentSession ? {
        sessionId: currentSession.sessionId,
        status: currentSession.status,
        result: currentSession.result,
        startTime: currentSession.startTime,
        endTime: currentSession.endTime,
        timeLeft: Math.max(0, Math.floor((currentSession.endTime.getTime() - now.getTime()) / 1000))
      } : null,

      // Mẫu lệnh pending (5 lệnh đầu)
      samplePendingTrades: pendingTrades.slice(0, 5).map(trade => ({
        id: trade._id,
        sessionId: trade.sessionId,
        userId: trade.userId,
        direction: trade.direction,
        amount: trade.amount,
        status: trade.status,
        createdAt: trade.createdAt
      })),

      // Mẫu lệnh completed (5 lệnh đầu)
      sampleCompletedTrades: completedTrades.slice(0, 5).map(trade => ({
        id: trade._id,
        sessionId: trade.sessionId,
        userId: trade.userId,
        direction: trade.direction,
        amount: trade.amount,
        status: trade.status,
        result: trade.result,
        profit: trade.profit,
        completedAt: trade.completedAt
      })),

      // Mẫu users (5 users đầu)
      sampleUsers: users.map(user => ({
        id: user._id,
        username: user.username,
        email: user.email,
        balance: user.balance,
        balanceType: typeof user.balance
      }))
    });

  } catch (error) {
    console.error('Lỗi khi test luồng hoạt động:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ nội bộ', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 