import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-utils';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  return requireAdmin(request, async (req: NextRequest, user: any) => {
    try {
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');
      const startDate = searchParams.get('startDate') || '';
      const endDate = searchParams.get('endDate') || '';
      const username = searchParams.get('username') || '';
      const sessionId = searchParams.get('sessionId') || '';
      const skip = (page - 1) * limit;

      const db = await getMongoDb();
      if (!db) {
        throw new Error('Could not connect to database');
      }

      // Build query
      const query: any = {};
      if (startDate && endDate) {
        query.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      // Get paginated results with user information and search
      const aggregationPipeline: any[] = [
        { $match: query },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            _id: 1,
            sessionId: 1,
            direction: 1,
            amount: 1,
            status: 1,
            result: 1,
            profit: 1,
            createdAt: 1,
            updatedAt: 1,
            completedAt: 1,
            'user.username': 1,
            'user.email': 1,
            'user._id': 1
          }
        }
      ];

      // Add search filters
      if (username) {
        aggregationPipeline.push({
          $match: {
            'user.username': { $regex: username, $options: 'i' }
          }
        });
      }

      if (sessionId) {
        aggregationPipeline.push({
          $match: {
            sessionId: { $regex: sessionId, $options: 'i' }
          }
        });
      }

      // Get total count for pagination
      const totalPipeline = [...aggregationPipeline, { $count: 'total' }];
      const totalResult = await db.collection('trades').aggregate(totalPipeline).toArray();
      const total = totalResult.length > 0 ? totalResult[0].total : 0;

      // Add sorting and pagination
      aggregationPipeline.push(
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit }
      );

      const trades = await db.collection('trades').aggregate(aggregationPipeline).toArray();

      // Format the data for frontend
      const formattedOrders = trades.map(trade => ({
        _id: trade._id,
        username: trade.user?.username || 'Unknown',
        email: trade.user?.email || '',
        userId: trade.user?._id,
        sessionId: trade.sessionId,
        type: trade.direction === 'UP' ? 'LÊN' : 'XUỐNG',
        direction: trade.direction,
        amount: trade.amount,
        status: trade.status,
        result: trade.result,
        profit: trade.profit || 0,
        createdAt: trade.createdAt,
        updatedAt: trade.updatedAt,
        completedAt: trade.completedAt
      }));

      return NextResponse.json({
        success: true,
        data: {
          orders: formattedOrders,
          pagination: {
            total,
            page,
            totalPages: Math.ceil(total / limit),
            limit
          }
        }
      });

    } catch (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json(
        { success: false, message: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
