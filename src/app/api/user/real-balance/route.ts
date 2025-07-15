import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    // Xác thực người dùng
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ message: 'Bạn cần đăng nhập' }, { status: 401 });
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
    const user = await verifyToken(token);
    
    if (!user?.userId) {
      return NextResponse.json({ message: 'Token không hợp lệ' }, { status: 401 });
    }

    const db = await getMongoDb();
    if (!db) {
      return NextResponse.json(
        { message: 'Không thể kết nối cơ sở dữ liệu' },
        { status: 500 }
      );
    }

    // Lấy thông tin user
    const userData = await db.collection('users').findOne({ _id: new ObjectId(user.userId) });
    if (!userData) {
      return NextResponse.json({ message: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    // Tính số dư từ lịch sử nạp tiền
    const deposits = await db.collection('deposits').find({
      user: new ObjectId(user.userId),
      status: 'DA DUYET'
    }).toArray();
    
    const totalDeposits = deposits.reduce((sum, deposit) => sum + (deposit.amount || 0), 0);

    // Tính số dư từ lịch sử rút tiền
    const withdrawals = await db.collection('withdrawals').find({
      user: new ObjectId(user.userId),
      status: 'DA DUYET'
    }).toArray();
    
    const totalWithdrawals = withdrawals.reduce((sum, withdrawal) => sum + (withdrawal.amount || 0), 0);

    // Tính số dư từ lịch sử giao dịch
    const trades = await db.collection('trades').find({
      userId: new ObjectId(user.userId),
      status: 'completed'
    }).toArray();
    
    const totalTradeProfit = trades.reduce((sum, trade) => {
      if (trade.result === 'win') {
        return sum + (trade.profit || 0);
      } else if (trade.result === 'lose') {
        return sum - (trade.amount || 0);
      }
      return sum;
    }, 0);

    // Số dư thực tế = Tổng nạp - Tổng rút + Lợi nhuận giao dịch
    const realBalance = totalDeposits - totalWithdrawals + totalTradeProfit;

    // Lấy balance hiện tại từ field balance (cho frozen amount)
    const currentBalance = userData.balance || { available: 0, frozen: 0 };
    const currentFrozen = typeof currentBalance === 'number' ? 0 : currentBalance.frozen || 0;

    return NextResponse.json({
      success: true,
      balance: {
        available: Math.max(0, realBalance),
        frozen: currentFrozen,
        total: Math.max(0, realBalance) + currentFrozen
      },
      breakdown: {
        totalDeposits,
        totalWithdrawals,
        totalTradeProfit,
        realBalance
      },
      currentBalance: {
        available: typeof currentBalance === 'number' ? currentBalance : currentBalance.available || 0,
        frozen: currentFrozen,
        total: (typeof currentBalance === 'number' ? currentBalance : currentBalance.available || 0) + currentFrozen
      }
    });

  } catch (error) {
    console.error('Lỗi khi tính số dư thực tế:', error);
    return NextResponse.json(
      { message: 'Đã xảy ra lỗi khi tính số dư' },
      { status: 500 }
    );
  }
} 