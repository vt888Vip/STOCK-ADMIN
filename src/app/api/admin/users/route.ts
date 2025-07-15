import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    // Xác thực admin
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'Bạn cần đăng nhập' }, { status: 401 });
    }

    const { userId, isValid } = await verifyToken(token);
    if (!isValid || !userId) {
      return NextResponse.json({ message: 'Token không hợp lệ' }, { status: 401 });
    }

    // Kiểm tra quyền admin
    const db = await getMongoDb();
    const admin = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ message: 'Không có quyền truy cập' }, { status: 403 });
    }

    // Lấy danh sách người dùng
    const users = await db.collection('users')
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    // Lấy thông tin số dư từ field balance
    const usersWithBalance = users.map(user => {
      const userBalance = user.balance || { available: 0, frozen: 0 };
      const availableBalance = typeof userBalance === 'number' ? userBalance : userBalance.available || 0;
      const frozenBalance = typeof userBalance === 'number' ? 0 : userBalance.frozen || 0;

      return {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role || 'user',
        balance: {
          available: availableBalance,
          frozen: frozenBalance,
          total: availableBalance + frozenBalance
        },
        status: user.status || { active: true, betLocked: false, withdrawLocked: false },
        verification: user.verification || { verified: false },
        bank: user.bank || { name: '', accountNumber: '', accountHolder: '' },
        cccd: user.cccd || { front: '', back: '', verified: false },
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      };
    });

    return NextResponse.json({
      success: true,
      users: usersWithBalance
    });
    
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi lấy danh sách người dùng' },
      { status: 500 }
    );
  }
}

// Xóa user
export async function DELETE(request: NextRequest) {
  try {
    // Xác thực admin
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'Bạn cần đăng nhập' }, { status: 401 });
    }

    const { userId, isValid } = await verifyToken(token);
    if (!isValid || !userId) {
      return NextResponse.json({ message: 'Token không hợp lệ' }, { status: 401 });
    }

    // Kiểm tra quyền admin
    const db = await getMongoDb();
    const admin = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ message: 'Không có quyền truy cập' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');

    if (!targetUserId) {
      return NextResponse.json({ message: 'Thiếu ID người dùng' }, { status: 400 });
    }

    // Không cho phép xóa admin khác
    const targetUser = await db.collection('users').findOne({ _id: new ObjectId(targetUserId) });
    if (!targetUser) {
      return NextResponse.json({ message: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    if (targetUser.role === 'admin') {
      return NextResponse.json({ message: 'Không thể xóa tài khoản admin' }, { status: 403 });
    }

    // Xóa user
    await db.collection('users').deleteOne({ _id: new ObjectId(targetUserId) });

    // Xóa các dữ liệu liên quan (trades, withdrawals, etc.)
    await db.collection('trades').deleteMany({ userId: new ObjectId(targetUserId) });
    await db.collection('withdrawals').deleteMany({ user: new ObjectId(targetUserId) });

    return NextResponse.json({
      success: true,
      message: 'Đã xóa người dùng thành công'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi xóa người dùng' },
      { status: 500 }
    );
  }
}

// Cập nhật thông tin CCCD
export async function PATCH(request: NextRequest) {
  try {
    // Xác thực admin
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'Bạn cần đăng nhập' }, { status: 401 });
    }

    const { userId, isValid } = await verifyToken(token);
    if (!isValid || !userId) {
      return NextResponse.json({ message: 'Token không hợp lệ' }, { status: 401 });
    }

    // Kiểm tra quyền admin
    const db = await getMongoDb();
    const admin = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ message: 'Không có quyền truy cập' }, { status: 403 });
    }

    const { targetUserId, cccdFront, cccdBack, verified } = await request.json();

    if (!targetUserId) {
      return NextResponse.json({ message: 'Thiếu ID người dùng' }, { status: 400 });
    }

    // Kiểm tra user tồn tại
    const targetUser = await db.collection('users').findOne({ _id: new ObjectId(targetUserId) });
    if (!targetUser) {
      return NextResponse.json({ message: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    // Cập nhật thông tin CCCD
    const updateData: any = {
      updatedAt: new Date()
    };

    if (cccdFront !== undefined) {
      updateData['cccd.front'] = cccdFront;
    }
    if (cccdBack !== undefined) {
      updateData['cccd.back'] = cccdBack;
    }
    if (verified !== undefined) {
      updateData['cccd.verified'] = verified;
    }

    await db.collection('users').updateOne(
      { _id: new ObjectId(targetUserId) },
      { $set: updateData }
    );

    return NextResponse.json({
      success: true,
      message: 'Đã cập nhật thông tin CCCD thành công'
    });

  } catch (error) {
    console.error('Error updating CCCD:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi cập nhật thông tin CCCD' },
      { status: 500 }
    );
  }
} 