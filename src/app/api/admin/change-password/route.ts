
import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-utils';
import { hashPassword, comparePassword } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  return requireAdmin(request, async (req, user) => {
    try {
      const { currentPassword, newPassword, confirmPassword } = await req.json();

      if (!currentPassword || !newPassword || !confirmPassword) {
        return NextResponse.json(
          { success: false, message: 'Vui lòng nhập đầy đủ thông tin' },
          { status: 400 }
        );
      }

      if (newPassword !== confirmPassword) {
        return NextResponse.json(
          { success: false, message: 'Mật khẩu mới không khớp' },
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
      const adminUser = await db.collection('users').findOne({ _id: new ObjectId(user._id) });

      if (!adminUser) {
        return NextResponse.json(
          { success: false, message: 'Không tìm thấy tài khoản admin' },
          { status: 404 }
        );
      }

      const isPasswordValid = await comparePassword(currentPassword, adminUser.password);
      if (!isPasswordValid) {
        return NextResponse.json(
          { success: false, message: 'Mật khẩu hiện tại không đúng' },
          { status: 401 }
        );
      }

      const hashedNewPassword = await hashPassword(newPassword);

      await db.collection('users').updateOne(
        { _id: new ObjectId(user._id) },
        { $set: { password: hashedNewPassword, updatedAt: new Date() } }
      );

      return NextResponse.json({
        success: true,
        message: 'Đổi mật khẩu thành công',
      });
    } catch (error) {
      console.error('Error changing password:', error);
      return NextResponse.json(
        { success: false, message: 'Lỗi hệ thống' },
        { status: 500 }
      );
    }
  });
} 