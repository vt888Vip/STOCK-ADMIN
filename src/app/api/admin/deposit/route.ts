import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();
    
    // Kiểm tra quyền admin
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, amount, note } = body;

    // Validate input
    if (!userId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      );
    }

    // Tìm user
    const user = await db.collection('users').findOne({ _id: userId });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Cập nhật số dư user
    const newBalance = (user.balance?.available || 0) + amount;
    await db.collection('users').updateOne(
      { _id: userId },
      { 
        $set: { 
          'balance.available': newBalance,
          updatedAt: new Date()
        } 
      }
    );

    // Tạo record giao dịch
    const transaction = {
      userId,
      username: user.username,
      type: 'deposit',
      amount,
      note: note || 'Admin nạp tiền',
      status: 'completed',
      createdAt: new Date()
    };

    await db.collection('deposits').insertOne(transaction);

    return NextResponse.json({
      success: true,
      message: 'Nạp tiền thành công',
      newBalance
    });
    
  } catch (error) {
    console.error('Error depositing money:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 