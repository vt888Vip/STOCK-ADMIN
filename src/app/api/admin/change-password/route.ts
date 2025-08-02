
import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-utils';
import { hashPassword } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  return requireAdmin(request, async (req, adminUser) => {
    try {
      const { userId, newPassword } = await req.json();

      // Validate input
      if (!userId || !newPassword) {
        return NextResponse.json(
          { success: false, message: 'Thiếu thông tin userId hoặc newPassword' },
          { status: 400 }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự' },
          { status: 400 }
        );
      }

      const db = await getMongoDb();
      
      // Kiểm tra user có tồn tại không
      const targetUser = await db.collection('users').findOne({ _id: new ObjectId(userId) });
      if (!targetUser) {
        return NextResponse.json(
          { success: false, message: 'Không tìm thấy người dùng' },
          { status: 404 }
        );
      }

      // Hash mật khẩu mới
      const hashedNewPassword = await hashPassword(newPassword);

      // Cập nhật mật khẩu cho user
      await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { $set: { password: hashedNewPassword, updatedAt: new Date() } }
      );

      // Log hoạt động đổi mật khẩu
      await db.collection('admin_activities').insertOne({
        adminId: new ObjectId(adminUser._id),
        adminUsername: adminUser.username,
        action: 'change_user_password',
        targetUserId: new ObjectId(userId),
        targetUsername: targetUser.username,
        timestamp: new Date(),
        details: 'Admin đã đổi mật khẩu cho người dùng'
      });

      return NextResponse.json({
        success: true,
        message: `Đã đổi mật khẩu thành công cho ${targetUser.username}`,
        userId: userId
      });
    } catch (error) {
      console.error('Error changing user password:', error);
      return NextResponse.json(
        { success: false, message: 'Lỗi hệ thống' },
        { status: 500 }
      );
    }
  });
} 