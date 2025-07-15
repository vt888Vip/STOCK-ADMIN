import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { verifyToken } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Xác thực admin
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'Bạn cần đăng nhập' }, { status: 401 });
    }

    const tokenData = await verifyToken(token);
    if (!tokenData?.isValid) {
      return NextResponse.json({ message: 'Token không hợp lệ' }, { status: 401 });
    }
    
    const db = await getMongoDb();
    
    // Kiểm tra quyền admin
    const admin = await db.collection('users').findOne({ _id: new ObjectId(tokenData.userId) });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ message: 'Không có quyền truy cập' }, { status: 403 });
    }

    const userId = params.id;

    // Lấy thông tin user với số dư thực tế
    const user = await db.collection('users')
      .aggregate([
        {
          $match: { _id: new ObjectId(userId) }
        },
        {
          $lookup: {
            from: 'deposits',
            localField: '_id',
            foreignField: 'user',
            as: 'deposits'
          }
        },
        {
          $lookup: {
            from: 'transactions',
            localField: '_id',
            foreignField: 'userId',
            as: 'transactions'
          }
        },
        {
          $project: {
            password: 0,
            __v: 0
          }
        }
      ]).toArray();

    if (user.length === 0) {
      return NextResponse.json({ message: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    const userData = user[0];

    // Tính toán số dư thực tế
    const totalDeposited = userData.deposits
      .filter((deposit: any) => deposit.status === 'DA DUYET')
      .reduce((sum: number, deposit: any) => sum + (deposit.amount || 0), 0);

    const totalWithdrawn = userData.transactions
      .filter((tx: any) => tx.type === 'withdraw' && tx.status === 'completed')
      .reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0);

    const realBalance = totalDeposited - totalWithdrawn;

    // Lấy lịch sử giao dịch gần đây
    const recentTransactions = userData.transactions
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    // Lấy lịch sử nạp tiền gần đây
    const recentDeposits = userData.deposits
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    return NextResponse.json({
      user: {
        _id: userData._id,
        username: userData.username,
        email: userData.email,
        role: userData.role,
        balance: {
          available: Math.max(0, realBalance),
          frozen: 0
        },
        totalDeposited,
        totalWithdrawn,
        status: userData.status,
        verification: userData.verification,
        bank: userData.bank,
        createdAt: userData.createdAt,
        lastLogin: userData.lastLogin
      },
      recentTransactions,
      recentDeposits
    });

  } catch (error) {
    console.error('Error fetching user details:', error);
    return NextResponse.json({ message: 'Đã xảy ra lỗi khi lấy thông tin người dùng' }, { status: 500 });
  }
} 

// PUT: Cập nhật thông tin người dùng
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Xác thực admin
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'Bạn cần đăng nhập' }, { status: 401 });
    }

    const tokenData = await verifyToken(token);
    if (!tokenData?.isValid) {
      return NextResponse.json({ message: 'Token không hợp lệ' }, { status: 401 });
    }
    
    const db = await getMongoDb();
    
    // Kiểm tra quyền admin
    const admin = await db.collection('users').findOne({ _id: new ObjectId(tokenData.userId) });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ message: 'Không có quyền truy cập' }, { status: 403 });
    }

    const userId = params.id;
    const updateData = await req.json();

    // Loại bỏ các trường không được phép cập nhật
    const { password, _id, createdAt, ...allowedUpdates } = updateData;

    // Cập nhật thông tin người dùng
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: {
          ...allowedUpdates,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Đã cập nhật thông tin người dùng thành công',
      userId: userId
    });

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ message: 'Đã xảy ra lỗi khi cập nhật người dùng' }, { status: 500 });
  }
}

// DELETE: Xóa người dùng
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const targetUserId = params.id;

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