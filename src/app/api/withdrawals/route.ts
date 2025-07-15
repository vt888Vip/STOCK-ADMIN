import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { verifyToken } from '@/lib/auth';

// API để tạo yêu cầu rút tiền mới
export async function POST(req: NextRequest) {
  try {
    console.log('Withdrawal request received');
    
    // Xác thực người dùng
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      console.log('No authorization token found');
      return NextResponse.json({ message: 'Bạn cần đăng nhập' }, { status: 401 });
    }

    console.log('Verifying token...');
    const { userId, isValid } = await verifyToken(token);
    if (!isValid || !userId) {
      console.log('Invalid token:', { userId, isValid });
      return NextResponse.json({ message: 'Token không hợp lệ' }, { status: 401 });
    }
    
    console.log('Token verified for user:', userId);

    // Parse request body
    const body = await req.json();
    console.log('Withdrawal request body:', body);
    
    const { amount, bankName, accountNumber, accountHolder } = body;

    if (!amount || !bankName || !accountNumber || !accountHolder) {
      console.log('Missing required fields:', { amount: !!amount, bankName: !!bankName, accountNumber: !!accountNumber, accountHolder: !!accountHolder });
      return NextResponse.json({ message: 'Thiếu thông tin cần thiết' }, { status: 400 });
    }

    // Kết nối DB
    console.log('Connecting to database...');
    const db = await getMongoDb();
    console.log('Database connected');

    // Lấy thông tin người dùng
    console.log('Finding user with ID:', userId);
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) {
      console.log('User not found');
      return NextResponse.json({ message: 'Không tìm thấy người dùng' }, { status: 404 });
    }
    console.log('User found:', { username: user.username, balance: user.balance });

    // Lấy cài đặt hệ thống để kiểm tra giới hạn rút tiền
    let settings = null;
    try {
      settings = await db.collection('settings').findOne({});
    } catch (error) {
      console.log('Settings collection not found, using default limits');
    }
    
    // Default limits if settings not found
    const minWithdrawal = settings?.withdrawalLimits?.min || 100000; // 100k VND
    const maxWithdrawal = settings?.withdrawalLimits?.max || 100000000; // 100M VND
    
    if (amount < minWithdrawal) {
      return NextResponse.json({ 
        message: `Số tiền rút tối thiểu là ${minWithdrawal.toLocaleString()} đ` 
      }, { status: 400 });
    }

    if (amount > maxWithdrawal) {
      return NextResponse.json({ 
        message: `Số tiền rút tối đa là ${maxWithdrawal.toLocaleString()} đ` 
      }, { status: 400 });
    }

    // Kiểm tra số dư
    if (user.balance < amount) {
      return NextResponse.json({ message: 'Số dư không đủ' }, { status: 400 });
    }

    // Tạo yêu cầu rút tiền mới với ID theo định dạng RUT-username-timestamp
    const timestamp = new Date().getTime();
    const username = user.username || 'user';
    const withdrawalId = `RUT-${username}-${timestamp}`;

    const withdrawal = {
      withdrawalId,
      user: new ObjectId(userId),
      username: user.username,
      amount,
      bankName,
      bankAccountNumber: accountNumber,
      accountHolder: accountHolder,
      status: 'Chờ duyệt',
      notes: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('Creating withdrawal record...');
    const result = await db.collection('withdrawals').insertOne(withdrawal);
    console.log('Withdrawal record created with ID:', result.insertedId);

    // Gửi thông báo cho admin (có thể triển khai sau)
    // TODO: Gửi thông báo cho admin qua socket hoặc email

    return NextResponse.json({
      message: 'Yêu cầu rút tiền đã được gửi',
      withdrawalId: result.insertedId
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating withdrawal request:', error);
    return NextResponse.json({ message: 'Đã xảy ra lỗi khi tạo yêu cầu rút tiền' }, { status: 500 });
  }
}
