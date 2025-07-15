import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { verifyToken } from '@/lib/auth';

// API để admin lấy danh sách yêu cầu rút tiền
export async function GET(req: NextRequest) {
  try {
    // Xác thực admin
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'Bạn cần đăng nhập' }, { status: 401 });
    }

    const { userId, isValid } = await verifyToken(token);
    if (!isValid || !userId) {
      return NextResponse.json({ message: 'Token không hợp lệ' }, { status: 401 });
    }

    // Kiểm tra quyền admin
    const db = await getMongoDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ message: 'Không có quyền truy cập' }, { status: 403 });
    }

    // Lấy danh sách yêu cầu rút tiền
    const withdrawals = await db.collection('withdrawals')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // Thêm thông tin số dư user cho mỗi withdrawal
    const withdrawalsWithBalance = await Promise.all(
      withdrawals.map(async (withdrawal) => {
        const user = await db.collection('users').findOne({ _id: withdrawal.user });
        if (user) {
          const userBalance = user.balance || { available: 0, frozen: 0 };
          const availableBalance = typeof userBalance === 'number' ? userBalance : userBalance.available || 0;
          return { ...withdrawal, userBalance: availableBalance };
        }
        return withdrawal;
      })
    );

    return NextResponse.json({
      success: true,
      withdrawals: withdrawalsWithBalance
    });

  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    return NextResponse.json({ message: 'Đã xảy ra lỗi khi lấy danh sách yêu cầu rút tiền' }, { status: 500 });
  }
}

// API để admin xử lý yêu cầu rút tiền
export async function POST(req: NextRequest) {
  try {
    // Xác thực admin
    const token = req.headers.get('authorization')?.split(' ')[1];
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

    // Parse request body
    const { withdrawalId, action, notes } = await req.json();
    console.log('[ADMIN WITHDRAWALS] Nhận request:', { withdrawalId, action, notes });

    if (!withdrawalId || !action) {
      console.log('[ADMIN WITHDRAWALS] Thiếu thông tin:', { withdrawalId, action });
      return NextResponse.json({ message: 'Thiếu thông tin cần thiết' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      console.log('[ADMIN WITHDRAWALS] Hành động không hợp lệ:', action);
      return NextResponse.json({ message: 'Hành động không hợp lệ' }, { status: 400 });
    }

    // Lấy thông tin yêu cầu rút tiền
    const withdrawal = await db.collection('withdrawals').findOne({ withdrawalId });
    console.log('[ADMIN WITHDRAWALS] Kết quả truy vấn withdrawal:', withdrawal);
    if (!withdrawal) {
      return NextResponse.json({ message: 'Không tìm thấy yêu cầu rút tiền', debug: { withdrawalId } }, { status: 404 });
    }

    if (withdrawal.status !== 'Chờ duyệt') {
      return NextResponse.json({ message: 'Yêu cầu rút tiền đã được xử lý' }, { status: 400 });
    }

    if (action === 'approve') {
      // Kiểm tra lại số dư user trước khi duyệt
      const user = await db.collection('users').findOne({ _id: withdrawal.user });
      if (!user) {
        return NextResponse.json({ message: 'Không tìm thấy người dùng' }, { status: 404 });
      }
      
      // Kiểm tra balance (có thể là object hoặc number)
      const userBalance = user.balance || { available: 0, frozen: 0 };
      const availableBalance = typeof userBalance === 'number' ? userBalance : userBalance.available || 0;
      
      if (availableBalance < withdrawal.amount) {
        return NextResponse.json({ 
          message: `Số dư người dùng không đủ. Hiện tại: ${availableBalance.toLocaleString()} VND, Yêu cầu: ${withdrawal.amount.toLocaleString()} VND` 
        }, { status: 400 });
      }
      
      // Trừ tiền khỏi tài khoản user
      const newBalance = availableBalance - withdrawal.amount;
      await db.collection('users').updateOne(
        { _id: withdrawal.user },
        { 
          $set: { 
            balance: typeof userBalance === 'number' ? newBalance : { ...userBalance, available: newBalance },
            updatedAt: new Date()
          } 
        }
      );
      
      console.log(`[ADMIN WITHDRAWALS] Đã trừ ${withdrawal.amount} VND từ user ${user.username}. Số dư mới: ${newBalance} VND`);
    }

    // Cập nhật trạng thái yêu cầu rút tiền
    const updateData = {
      status: action === 'approve' ? 'Đã duyệt' : 'Từ chối',
      notes: notes || '',
      updatedAt: new Date(),
      processedBy: admin.username,
      processedAt: new Date()
    };

    await db.collection('withdrawals').updateOne(
      { withdrawalId },
      { $set: updateData }
    );

    // Nếu từ chối, không cần làm gì vì tiền chưa bị trừ
    if (action === 'reject') {
      console.log(`[ADMIN WITHDRAWALS] Đã từ chối yêu cầu rút tiền ${withdrawal.amount} VND của user ${withdrawal.username}`);
    }

    return NextResponse.json({
      success: true,
      message: action === 'approve' ? 'Đã duyệt yêu cầu rút tiền' : 'Đã từ chối yêu cầu rút tiền'
    });

  } catch (error) {
    console.error('Error processing withdrawal:', error);
    return NextResponse.json({ message: 'Đã xảy ra lỗi khi xử lý yêu cầu rút tiền' }, { status: 500 });
  }
}
