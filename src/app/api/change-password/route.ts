import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { hash, compare } from 'bcryptjs';
import { getMongoDb } from '@/lib/db';

// Tạo một Map đơn giản để theo dõi các yêu cầu đổi mật khẩu
const rateLimitMap = new Map<string, { count: number, timestamp: number }>();

// Hàm kiểm tra giới hạn tỷ lệ request
const checkRateLimit = (key: string, limit: number, interval: number): boolean => {
  const now = Date.now();
  const record = rateLimitMap.get(key);
  
  if (!record) {
    rateLimitMap.set(key, { count: 1, timestamp: now });
    return true;
  }
  
  if (now - record.timestamp > interval) {
    // Reset nếu đã quá khoảng thời gian
    rateLimitMap.set(key, { count: 1, timestamp: now });
    return true;
  }
  
  if (record.count >= limit) {
    return false; // Vượt quá giới hạn
  }
  
  // Tăng bộ đếm
  record.count += 1;
  rateLimitMap.set(key, record);
  return true;
};

// Xóa các bản ghi cũ mỗi giờ
setInterval(() => {
  const now = Date.now();
  // Sử dụng Array.from để tương thích với các phiên bản TypeScript cũ hơn
  Array.from(rateLimitMap.keys()).forEach(key => {
    const record = rateLimitMap.get(key);
    if (record && now - record.timestamp > 3600000) { // 1 giờ
      rateLimitMap.delete(key);
    }
  });
}, 3600000); // Kiểm tra mỗi giờ

export async function POST(req: NextRequest) {
  try {
    // Lấy IP để giới hạn tỷ lệ request
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    
    // Kiểm tra giới hạn tỷ lệ request: 5 lần/phút
    const isWithinLimit = checkRateLimit(`change-password-${ip}`, 5, 60000);
    if (!isWithinLimit) {
      return NextResponse.json(
        { success: false, message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' },
        { status: 429 }
      );
    }
    
    // Lấy token từ header Authorization hoặc cookie
    let token = req.headers.get('authorization')?.split(' ')[1];
    
    // Nếu không có token trong header, thử lấy từ cookie
    if (!token) {
      const cookieHeader = req.headers.get('cookie');
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const [name, value] = cookie.trim().split('=');
          acc[name] = value;
          return acc;
        }, {} as Record<string, string>);
        
        token = cookies['token'] || cookies['authToken'];
      }
    }
    
    if (!token) {
      return NextResponse.json({ success: false, message: 'Bạn cần đăng nhập' }, { status: 401 });
    }

    const tokenData = await verifyToken(token);
    if (!tokenData?.isValid) {
      return NextResponse.json({ success: false, message: 'Phiên đăng nhập hết hạn' }, { status: 401 });
    }

    const { currentPassword, newPassword, confirmPassword } = await req.json();

    // Validate required fields
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới' },
        { status: 400 }
      );
    }
    
    // Kiểm tra mật khẩu mới và xác nhận mật khẩu nếu có gửi confirmPassword
    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'Mật khẩu mới và xác nhận mật khẩu không khớp' },
        { status: 400 }
      );
    }

    // Kiểm tra độ mạnh của mật khẩu
    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, message: 'Mật khẩu phải có ít nhất 8 ký tự' },
        { status: 400 }
      );
    }
    
    // Kiểm tra mật khẩu có chứa ít nhất một chữ cái và một số
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).+$/;
    if (!passwordRegex.test(newPassword)) {
      return NextResponse.json(
        { success: false, message: 'Mật khẩu phải chứa ít nhất một chữ cái và một số' },
        { status: 400 }
      );
    }

    // Kết nối database
    const db = await getMongoDb();

    // Lấy thông tin người dùng với mật khẩu đã hash
    const userData = await db.collection('users').findOne({
      _id: new ObjectId(tokenData.userId)
    });

    if (!userData) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy thông tin người dùng' },
        { status: 404 }
      );
    }

    // Xác thực mật khẩu hiện tại
    const isPasswordValid = await compare(currentPassword, userData.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: 'Mật khẩu hiện tại không đúng' },
        { status: 400 }
      );
    }
    
    // Kiểm tra mật khẩu mới không được trùng với mật khẩu cũ
    const isSameAsOld = await compare(newPassword, userData.password);
    if (isSameAsOld) {
      return NextResponse.json(
        { success: false, message: 'Mật khẩu mới không được trùng với mật khẩu cũ' },
        { status: 400 }
      );
    }

    // Hash mật khẩu mới
    const hashedPassword = await hash(newPassword, 12);

    // Cập nhật mật khẩu trong database
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(tokenData.userId) },
      {
        $set: {
          password: hashedPassword,
          updatedAt: new Date(),
          passwordChangedAt: new Date()
        }
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Không thể cập nhật mật khẩu' },
        { status: 500 }
      );
    }

    // Ghi log hoạt động đổi mật khẩu
    await db.collection('user_activities').insertOne({
      userId: tokenData.userId,
      action: 'change_password',
      timestamp: new Date(),
      ip: ip,
      userAgent: req.headers.get('user-agent') || 'unknown',
      success: true
    });

    return NextResponse.json({
      success: true,
      message: 'Đổi mật khẩu thành công'
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Có lỗi xảy ra khi đổi mật khẩu. Vui lòng thử lại sau.' 
      },
      { status: 500 }
    );
  }
}
