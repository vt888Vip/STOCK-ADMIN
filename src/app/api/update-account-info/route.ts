import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    // Xác thực người dùng
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'Bạn cần đăng nhập' }, { status: 401 });
    }

    const tokenData = await verifyToken(token);
    if (!tokenData?.isValid) {
      return NextResponse.json({ message: 'Token không hợp lệ' }, { status: 401 });
    }

    const db = await getMongoDb();
    const userId = new ObjectId(tokenData.userId);

    // Kiểm tra xem người dùng đã cập nhật thông tin chưa
    const existingUser = await db.collection('users').findOne({ _id: userId });
    if (!existingUser) {
      return NextResponse.json({ message: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    // Nếu đã có thông tin cơ bản, không cho phép cập nhật
    if (existingUser.fullName || existingUser.phone || existingUser.address || existingUser.dateOfBirth || existingUser.gender) {
      return NextResponse.json({ 
        message: 'Thông tin tài khoản đã được cập nhật và không thể chỉnh sửa' 
      }, { status: 400 });
    }

    const updateData = await req.json();
    const { fullName, phone, address, dateOfBirth, gender } = updateData;

    // Validate dữ liệu
    if (!fullName || !phone) {
      return NextResponse.json({ 
        message: 'Họ tên và số điện thoại là bắt buộc' 
      }, { status: 400 });
    }

    // Cập nhật thông tin tài khoản
    const result = await db.collection('users').updateOne(
      { _id: userId },
      {
        $set: {
          fullName,
          phone,
          address: address || '',
          dateOfBirth: dateOfBirth || '',
          gender: gender || '',
          accountInfoLocked: true,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    // Lấy thông tin user mới nhất
    const updatedUser = await db.collection('users').findOne({ _id: userId });

    if (!updatedUser) {
      return NextResponse.json({ message: 'Không tìm thấy người dùng sau khi cập nhật' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Cập nhật thông tin tài khoản thành công',
      user: {
        id: updatedUser._id,
        username: updatedUser.username || '',
        email: updatedUser.email || '',
        fullName: updatedUser.fullName,
        phone: updatedUser.phone,
        address: updatedUser.address,
        dateOfBirth: updatedUser.dateOfBirth,
        gender: updatedUser.gender,
        accountInfoLocked: updatedUser.accountInfoLocked,
        bankInfoLocked: updatedUser.bankInfoLocked,
        bank: updatedUser.bank || updatedUser.bankInfo,
        bankInfo: updatedUser.bankInfo || updatedUser.bank,
        balance: updatedUser.balance,
        verification: updatedUser.verification,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating account info:', error);
    return NextResponse.json({ 
      message: 'Đã xảy ra lỗi khi cập nhật thông tin tài khoản' 
    }, { status: 500 });
  }
} 