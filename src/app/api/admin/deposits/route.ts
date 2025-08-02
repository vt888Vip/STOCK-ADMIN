import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-utils';
import { getMongoDb } from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  return requireAdmin(request, async (req, adminUser) => {
    try {
      const db = await getMongoDb();
      
      // Lấy danh sách deposits với pagination
      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const skip = (page - 1) * limit;

      // Lấy tổng số deposits
      const totalDeposits = await db.collection('deposits').countDocuments();

      // Lấy danh sách deposits
      const deposits = await db.collection('deposits')
        .find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      return NextResponse.json({
        success: true,
        deposits: deposits,
        pagination: {
          page,
          limit,
          total: totalDeposits,
          pages: Math.ceil(totalDeposits / limit)
        }
      });

    } catch (error) {
      console.error('Error loading deposits:', error);
      return NextResponse.json(
        { success: false, message: 'Lỗi hệ thống' },
        { status: 500 }
      );
    }
  });
}

export async function PATCH(request: NextRequest) {
  return requireAdmin(request, async (req, adminUser) => {
    try {
      const body = await req.json();
      const { depositId, action } = body;

      if (!depositId || !action) {
        return NextResponse.json(
          { success: false, message: 'Thiếu thông tin' },
          { status: 400 }
        );
      }

      const db = await getMongoDb();

      // Tìm deposit
      const deposit = await db.collection('deposits').findOne({ _id: new ObjectId(depositId) });
      if (!deposit) {
        return NextResponse.json(
          { success: false, message: 'Không tìm thấy giao dịch' },
          { status: 404 }
        );
      }

      if (action === 'approve') {
        // Cập nhật trạng thái deposit
        await db.collection('deposits').updateOne(
          { _id: new ObjectId(depositId) },
          { $set: { status: 'completed', updatedAt: new Date() } }
        );

        // Cập nhật số dư user
        const user = await db.collection('users').findOne({ _id: deposit.userId });
        if (user) {
          const currentBalance = user.balance?.available || 0;
          const newBalance = currentBalance + deposit.amount;
          
          await db.collection('users').updateOne(
            { _id: deposit.userId },
            { 
              $set: { 
                'balance.available': newBalance,
                updatedAt: new Date()
              } 
            }
          );
        }

        // Log hoạt động admin
        await db.collection('admin_activities').insertOne({
          adminId: new ObjectId(adminUser._id),
          adminUsername: adminUser.username,
          action: 'approve_deposit',
          targetUserId: deposit.userId,
          targetUsername: deposit.username,
          amount: deposit.amount,
          timestamp: new Date(),
          details: `Admin duyệt nạp tiền ${deposit.amount.toLocaleString()} VND cho ${deposit.username}`
        });

        return NextResponse.json({
          success: true,
          message: 'Đã duyệt nạp tiền thành công'
        });

      } else if (action === 'reject') {
        // Cập nhật trạng thái deposit
        await db.collection('deposits').updateOne(
          { _id: new ObjectId(depositId) },
          { $set: { status: 'rejected', updatedAt: new Date() } }
        );

        // Log hoạt động admin
        await db.collection('admin_activities').insertOne({
          adminId: new ObjectId(adminUser._id),
          adminUsername: adminUser.username,
          action: 'reject_deposit',
          targetUserId: deposit.userId,
          targetUsername: deposit.username,
          amount: deposit.amount,
          timestamp: new Date(),
          details: `Admin từ chối nạp tiền ${deposit.amount.toLocaleString()} VND cho ${deposit.username}`
        });

        return NextResponse.json({
          success: true,
          message: 'Đã từ chối nạp tiền'
        });

      } else {
        return NextResponse.json(
          { success: false, message: 'Hành động không hợp lệ' },
          { status: 400 }
        );
      }

    } catch (error) {
      console.error('Error processing deposit:', error);
      return NextResponse.json(
        { success: false, message: 'Lỗi hệ thống' },
        { status: 500 }
      );
    }
  });
}
