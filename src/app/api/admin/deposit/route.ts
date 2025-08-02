import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-utils';
import { getMongoDb } from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  return requireAdmin(request, async (req, adminUser) => {
    try {
      const body = await req.json();
      const { userId, amount, note } = body;

      // Validate input
      if (!userId || !amount || amount <= 0) {
        return NextResponse.json(
          { success: false, message: 'Thông tin không hợp lệ' },
          { status: 400 }
        );
      }

      const db = await getMongoDb();

      // Tìm user
      const targetUser = await db.collection('users').findOne({ _id: new ObjectId(userId) });
      if (!targetUser) {
        return NextResponse.json(
          { success: false, message: 'Không tìm thấy người dùng' },
          { status: 404 }
        );
      }

      // Cập nhật số dư user
      const currentBalance = targetUser.balance?.available || 0;
      const newBalance = currentBalance + amount;
      
      await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { 
          $set: { 
            'balance.available': newBalance,
            updatedAt: new Date()
          } 
        }
      );

      // Tạo record giao dịch
      const transaction = {
        userId: new ObjectId(userId),
        username: targetUser.username,
        type: 'deposit',
        amount: amount,
        note: note || 'Admin nạp tiền',
        status: 'completed',
        adminId: new ObjectId(adminUser._id),
        adminUsername: adminUser.username,
        createdAt: new Date()
      };

      await db.collection('deposits').insertOne(transaction);

      // Log hoạt động admin
      await db.collection('admin_activities').insertOne({
        adminId: new ObjectId(adminUser._id),
        adminUsername: adminUser.username,
        action: 'deposit_money',
        targetUserId: new ObjectId(userId),
        targetUsername: targetUser.username,
        amount: amount,
        timestamp: new Date(),
        details: `Admin nạp ${amount.toLocaleString()} VND cho ${targetUser.username}`
      });

      return NextResponse.json({
        success: true,
        message: `Đã nạp ${amount.toLocaleString()} VND cho ${targetUser.username}`,
        newBalance: newBalance
      });
      
    } catch (error) {
      console.error('Error depositing money:', error);
      return NextResponse.json(
        { success: false, message: 'Lỗi hệ thống' },
        { status: 500 }
      );
    }
  });
} 