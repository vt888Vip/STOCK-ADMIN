import { NextResponse, NextRequest } from 'next/server';
import { getUserFromRequest, verifyToken } from '@/lib/auth';
import { getMongoDb } from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    // Xác thực người dùng từ token
    // Thử lấy token từ nhiều nguồn khác nhau
    let token = request.headers.get('authorization')?.split(' ')[1];
    
    // Nếu không có token trong header, thử lấy từ cookie
    if (!token) {
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const [name, value] = cookie.trim().split('=');
          acc[name] = value;
          return acc;
        }, {} as Record<string, string>);
        
        token = cookies['token'] || cookies['authToken'];
      }
    }
    
    console.log('Token found in /api/auth/me:', token ? 'Yes' : 'No');
    
    if (!token) {
      return NextResponse.json({ success: false, message: 'Bạn cần đăng nhập' }, { status: 401 });
    }

    const tokenData = await verifyToken(token);
    if (!tokenData?.isValid) {
      return NextResponse.json({ success: false, message: 'Token không hợp lệ' }, { status: 401 });
    }
    
    // Lấy thông tin người dùng từ database
    const db = await getMongoDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(tokenData.userId) });
    
    if (!user) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    // Lấy số dư từ field balance của user
    const userBalance = user.balance || { available: 0, frozen: 0 };
    const availableBalance = typeof userBalance === 'number' ? userBalance : userBalance.available || 0;
    const frozenBalance = typeof userBalance === 'number' ? 0 : userBalance.frozen || 0;

    // Prepare user response with default values
    const userResponse = {
      id: user._id,
      username: user.username || '',
      email: user.email || '',
      name: user.name || user.username || '',
      role: user.role || 'user',
      // Thông tin cá nhân
      fullName: user.fullName || null,
      phone: user.phone || null,
      address: user.address || null,
      dateOfBirth: user.dateOfBirth || null,
      gender: user.gender || null,
      // Thông tin ngân hàng
      bank: user.bank || user.bankInfo || { 
        name: '', 
        accountNumber: '', 
        accountHolder: '',
        bankType: '',
        verified: false
      },
      bankInfo: user.bankInfo || user.bank || {
        name: '', 
        accountNumber: '', 
        accountHolder: '',
        bankType: '',
        verified: false
      },
      // Trạng thái khóa thông tin
      accountInfoLocked: user.accountInfoLocked || false,
      bankInfoLocked: user.bankInfoLocked || false,
      // Thông tin khác
      balance: {
        available: availableBalance,
        frozen: frozenBalance,
        total: availableBalance + frozenBalance
      },
      verification: user.verification || { 
        verified: false, 
        cccdFront: '', 
        cccdBack: '',
        status: undefined,
        submittedAt: undefined,
        reviewedAt: undefined,
        reviewedBy: undefined,
        rejectionReason: undefined
      },
      status: user.status || { 
        active: true, 
        betLocked: false, 
        withdrawLocked: false 
      },
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: user.updatedAt || new Date().toISOString(),
      lastLogin: user.lastLogin || new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      user: userResponse
    });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Lỗi hệ thống',
        _debug: process.env.NODE_ENV !== 'production' ? {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        } : undefined
      },
      { status: 500 }
    );
  }
}
