import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { NextRequest } from 'next/server';

// API để lấy thống kê phiên giao dịch
export async function GET(request: NextRequest) {
  try {
    const db = await getMongoDb();
    if (!db) {
      throw new Error('Không thể kết nối cơ sở dữ liệu');
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    // Lấy thống kê tổng quan
    const totalSessions = await db.collection('trading_sessions').countDocuments();
    const completedSessions = await db.collection('trading_sessions').countDocuments({ status: 'COMPLETED' });
    const activeSessions = await db.collection('trading_sessions').countDocuments({ status: { $in: ['ACTIVE', 'PREDICTED'] } });

    // Lấy thống kê giao dịch
    const totalTrades = await db.collection('trades').countDocuments();
    const pendingTrades = await db.collection('trades').countDocuments({ status: 'pending' });
    const completedTrades = await db.collection('trades').countDocuments({ status: 'completed' });
    const winTrades = await db.collection('trades').countDocuments({ status: 'completed', result: 'win' });
    const loseTrades = await db.collection('trades').countDocuments({ status: 'completed', result: 'lose' });

    // Lấy danh sách phiên gần đây
    const recentSessions = await db.collection('trading_sessions')
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();

    // Lấy thống kê theo người dùng nếu có userId
    let userStats = null;
    if (userId) {
      const userTrades = await db.collection('trades').find({ userId }).toArray();
      const userWins = userTrades.filter(trade => trade.result === 'win').length;
      const userLosses = userTrades.filter(trade => trade.result === 'lose').length;
      const userPending = userTrades.filter(trade => trade.status === 'pending').length;
      const totalWinAmount = userTrades
        .filter(trade => trade.result === 'win')
        .reduce((sum, trade) => sum + (trade.profit || 0), 0);
      const totalLossAmount = userTrades
        .filter(trade => trade.result === 'lose')
        .reduce((sum, trade) => sum + trade.amount, 0);

      userStats = {
        totalTrades: userTrades.length,
        wins: userWins,
        losses: userLosses,
        pending: userPending,
        winRate: userTrades.length > 0 ? (userWins / (userWins + userLosses) * 100).toFixed(2) : 0,
        totalWinAmount,
        totalLossAmount,
        netProfit: totalWinAmount - totalLossAmount
      };
    }

    // Lấy top người chơi
    const topPlayers = await db.collection('trades')
      .aggregate([
        { $match: { status: 'completed' } },
        { $group: {
          _id: '$userId',
          totalTrades: { $sum: 1 },
          wins: { $sum: { $cond: [{ $eq: ['$result', 'win'] }, 1, 0] } },
          totalWinAmount: { $sum: { $cond: [{ $eq: ['$result', 'win'] }, '$profit', 0] } },
          totalLossAmount: { $sum: { $cond: [{ $eq: ['$result', 'lose'] }, '$amount', 0] } }
        }},
        { $addFields: {
          netProfit: { $subtract: ['$totalWinAmount', '$totalLossAmount'] },
          winRate: { $multiply: [{ $divide: ['$wins', '$totalTrades'] }, 100] }
        }},
        { $sort: { netProfit: -1 } },
        { $limit: 10 }
      ]).toArray();

    // Lấy thông tin user cho top players
    const topPlayersWithInfo = await Promise.all(
      topPlayers.map(async (player) => {
        const user = await db.collection('users').findOne({ _id: player._id });
        return {
          ...player,
          email: user?.email || 'Unknown',
          balance: user?.balance || 0
        };
      })
    );

    return NextResponse.json({
      success: true,
      overview: {
        totalSessions,
        completedSessions,
        activeSessions,
        totalTrades,
        pendingTrades,
        completedTrades,
        winTrades,
        loseTrades,
        winRate: completedTrades > 0 ? (winTrades / completedTrades * 100).toFixed(2) : 0
      },
      recentSessions: recentSessions.map(session => ({
        sessionId: session.sessionId,
        status: session.status,
        result: session.result,
        startTime: session.startTime,
        endTime: session.endTime,
        totalTrades: session.totalTrades || 0,
        totalWins: session.totalWins || 0,
        totalLosses: session.totalLosses || 0,
        totalWinAmount: session.totalWinAmount || 0,
        totalLossAmount: session.totalLossAmount || 0,
        createdAt: session.createdAt
      })),
      userStats,
      topPlayers: topPlayersWithInfo,
      pagination: {
        page,
        limit,
        total: totalSessions,
        pages: Math.ceil(totalSessions / limit)
      }
    });

  } catch (error) {
    console.error('Lỗi khi lấy thống kê phiên:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ nội bộ' },
      { status: 500 }
    );
  }
} 