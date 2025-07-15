import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-utils';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  return requireAdmin(request, async (req: NextRequest, user: any) => {
    try {
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');
      const status = searchParams.get('status') || '';
      const startDate = searchParams.get('startDate') || '';
      const endDate = searchParams.get('endDate') || '';
      const sessionId = searchParams.get('sessionId') || '';
      const skip = (page - 1) * limit;

      const db = await getMongoDb();
      if (!db) {
        throw new Error('Could not connect to database');
      }

      // Build query
      const query: any = {};
      if (status) {
        query.status = status;
      }
      if (sessionId) {
        query.sessionId = { $regex: sessionId, $options: 'i' };
      }
      if (startDate && endDate) {
        query.startTime = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      // Get total count
      const total = await db.collection('trading_sessions').countDocuments(query);

      // Get paginated results
      const sessions = await db.collection('trading_sessions')
        .find(query)
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      // Format sessions for frontend
      const formattedSessions = sessions.map(session => ({
        _id: session._id,
        sessionId: session.sessionId,
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status,
        result: session.result,
        actualResult: session.actualResult,
        createdBy: session.createdBy || 'system',
        totalTrades: session.totalTrades || 0,
        totalWins: session.totalWins || 0,
        totalLosses: session.totalLosses || 0,
        totalWinAmount: session.totalWinAmount || 0,
        totalLossAmount: session.totalLossAmount || 0,
        completedAt: session.completedAt,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      }));

      return NextResponse.json({
        success: true,
        data: {
          sessions: formattedSessions,
          pagination: {
            total,
            page,
            totalPages: Math.ceil(total / limit),
            limit
          }
        }
      });

    } catch (error) {
      console.error('Error fetching session results:', error);
      return NextResponse.json(
        { success: false, message: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return requireAdmin(request, async (req: NextRequest, user: any) => {
    try {
      const body = await request.json();
      const { sessionId, result, action } = body;

      const db = await getMongoDb();
      if (!db) {
        throw new Error('Could not connect to database');
      }

      if (action === 'set_result') {
        // Set manual result for a session
        if (!sessionId || !result) {
          return NextResponse.json(
            { success: false, message: 'Session ID and result are required' },
            { status: 400 }
          );
        }

        if (!['UP', 'DOWN'].includes(result)) {
          return NextResponse.json(
            { success: false, message: 'Result must be UP or DOWN' },
            { status: 400 }
          );
        }

        const session = await db.collection('trading_sessions').findOne({ sessionId });
        if (!session) {
          return NextResponse.json(
            { success: false, message: 'Session not found' },
            { status: 404 }
          );
        }

        if (session.status === 'COMPLETED') {
          return NextResponse.json(
            { success: false, message: 'Cannot modify completed session' },
            { status: 400 }
          );
        }

        // Update session with manual result
        await db.collection('trading_sessions').updateOne(
          { sessionId },
          {
            $set: {
              result: result,
              status: 'PREDICTED',
              createdBy: 'admin',
              updatedAt: new Date()
            }
          }
        );

        return NextResponse.json({
          success: true,
          message: `Session ${sessionId} result set to ${result}`,
          data: { sessionId, result, status: 'PREDICTED' }
        });

      } else if (action === 'generate_random') {
        // Generate random result for a session
        if (!sessionId) {
          return NextResponse.json(
            { success: false, message: 'Session ID is required' },
            { status: 400 }
          );
        }

        const session = await db.collection('trading_sessions').findOne({ sessionId });
        if (!session) {
          return NextResponse.json(
            { success: false, message: 'Session not found' },
            { status: 404 }
          );
        }

        if (session.status === 'COMPLETED') {
          return NextResponse.json(
            { success: false, message: 'Cannot modify completed session' },
            { status: 400 }
          );
        }

        // Generate random result (60% UP, 40% DOWN)
        const random = Math.random();
        const randomResult = random < 0.6 ? 'UP' : 'DOWN';

        await db.collection('trading_sessions').updateOne(
          { sessionId },
          {
            $set: {
              result: randomResult,
              status: 'PREDICTED',
              createdBy: 'system',
              updatedAt: new Date()
            }
          }
        );

        return NextResponse.json({
          success: true,
          message: `Session ${sessionId} random result generated: ${randomResult}`,
          data: { sessionId, result: randomResult, status: 'PREDICTED' }
        });

      } else if (action === 'bulk_generate') {
        // Generate random results for multiple sessions
        const { sessionIds } = body;
        
        if (!sessionIds || !Array.isArray(sessionIds)) {
          return NextResponse.json(
            { success: false, message: 'Session IDs array is required' },
            { status: 400 }
          );
        }

        const results = [];
        for (const sessionId of sessionIds) {
          const session = await db.collection('trading_sessions').findOne({ sessionId });
          if (session && session.status !== 'COMPLETED') {
            const random = Math.random();
            const randomResult = random < 0.6 ? 'UP' : 'DOWN';

            await db.collection('trading_sessions').updateOne(
              { sessionId },
              {
                $set: {
                  result: randomResult,
                  status: 'PREDICTED',
                  createdBy: 'system',
                  updatedAt: new Date()
                }
              }
            );

            results.push({ sessionId, result: randomResult });
          }
        }

        return NextResponse.json({
          success: true,
          message: `Generated random results for ${results.length} sessions`,
          data: { results }
        });

      } else {
        return NextResponse.json(
          { success: false, message: 'Invalid action' },
          { status: 400 }
        );
      }

    } catch (error) {
      console.error('Error managing session results:', error);
      return NextResponse.json(
        { success: false, message: 'Internal server error' },
        { status: 500 }
      );
    }
  });
} 