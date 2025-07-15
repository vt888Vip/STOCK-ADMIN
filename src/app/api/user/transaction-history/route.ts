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

    // Parse query parameters
    const url = new URL(request.url);
    const type = url.searchParams.get('type'); // 'all', 'deposits', 'withdrawals', 'trades'
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;



    const userId = new ObjectId(user.userId);

    // Lấy thông tin ngân hàng của user
    const userInfo = await db.collection('users').findOne({ _id: userId });
    const userBankInfo = userInfo?.bank || {};

    let allTransactions = [];

    // Lấy lịch sử nạp tiền
    if (!type || type === 'all' || type === 'deposits') {

      const deposits = await db.collection('deposits')
        .find({ user: userId })
        .sort({ createdAt: -1 })
        .toArray();


      const depositTransactions = deposits.map(deposit => ({
        _id: deposit._id,
        type: 'deposit',
        amount: deposit.amount,
        status: deposit.status,
        description: `Nạp tiền - ${userBankInfo.name || 'Ngân hàng'}`,
        createdAt: deposit.createdAt,
        updatedAt: deposit.updatedAt,
        proofImage: deposit.proofImage,
        bankInfo: {
          bankName: userBankInfo.name || '',
          accountNumber: userBankInfo.accountNumber || '',
          accountName: userBankInfo.accountHolder || ''
        },
        adminNote: deposit.adminNote
      }));

      allTransactions.push(...depositTransactions);
      console.log('✅ [DEBUG] Đã thêm', depositTransactions.length, 'deposit transactions');
    }

    // Lấy lịch sử rút tiền
    if (!type || type === 'all' || type === 'withdrawals') {

      const withdrawals = await db.collection('withdrawals')
        .find({ user: userId })
        .sort({ createdAt: -1 })
        .toArray();


      const withdrawalTransactions = withdrawals.map(withdrawal => {
        return {
          _id: withdrawal._id,
          type: 'withdrawal',
          amount: withdrawal.amount,
          status: withdrawal.status,
          description: `Rút tiền - ${userBankInfo.name || 'Ngân hàng'}`,
          createdAt: withdrawal.createdAt,
          updatedAt: withdrawal.updatedAt,
          bankInfo: {
            bankName: userBankInfo.name || '',
            accountNumber: userBankInfo.accountNumber || '',
            accountName: userBankInfo.accountHolder || ''
          },
          adminNote: withdrawal.adminNote
        };
      });

      allTransactions.push(...withdrawalTransactions);

    }

    // Lấy lịch sử giao dịch
    if (!type || type === 'all' || type === 'trades') {
      console.log('📈 [DEBUG] Đang lấy trades...');
      const trades = await db.collection('trades')
        .find({ userId: userId })
        .sort({ createdAt: -1 })
        .toArray();


      const tradeTransactions = trades.map(trade => ({
        _id: trade._id,
        type: 'trade',
        amount: trade.amount,
        profit: trade.profit || 0,
        status: trade.status,
        result: trade.result,
        direction: trade.direction,
        asset: trade.asset,
        sessionId: trade.sessionId,
        description: `Giao dịch ${trade.direction?.toUpperCase()} ${trade.asset} - ${trade.result === 'win' ? 'THẮNG' : trade.result === 'lose' ? 'THUA' : 'ĐANG XỬ LÝ'}`,
        createdAt: trade.createdAt,
        updatedAt: trade.updatedAt
      }));

      allTransactions.push(...tradeTransactions);
    }


    // Sắp xếp tất cả giao dịch theo thời gian
    allTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Phân trang
    const total = allTransactions.length;
    const paginatedTransactions = allTransactions.slice(skip, skip + limit);
    const totalPages = Math.ceil(total / (limit as number));

    const response = {
      success: true,
      transactions: paginatedTransactions,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };


    return NextResponse.json(response);

  } catch (error) {
    return NextResponse.json(
      { message: 'Đã xảy ra lỗi khi lấy lịch sử giao dịch' },
      { status: 500 }
    );
  }
} 