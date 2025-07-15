/**
 * Các tiện ích xác thực cho API admin
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './auth';
import { getMongoDb } from './db';
import { ObjectId } from 'mongodb';

// Re-export verifyToken để các module khác có thể import từ auth-utils
export { verifyToken };

/**
 * Middleware để bảo vệ các route admin
 */
export async function requireAdmin(
  request: NextRequest,
  handler: (req: NextRequest, user: any) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Lấy token từ header Authorization hoặc cookie
    let token = request.headers.get('authorization')?.split(' ')[1];
    
    if (!token) {
      // Thử lấy từ cookie
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
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Bạn cần đăng nhập' },
        { status: 401 }
      );
    }

    // Xác thực token
    const tokenData = await verifyToken(token);
    if (!tokenData?.isValid) {
      return NextResponse.json(
        { success: false, message: 'Token không hợp lệ' },
        { status: 401 }
      );
    }

    // Lấy thông tin người dùng từ database
    const db = await getMongoDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(tokenData.userId) });
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy người dùng' },
        { status: 404 }
      );
    }

    // Kiểm tra quyền admin
    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Bạn không có quyền truy cập' },
        { status: 403 }
      );
    }

    // Gọi handler với thông tin người dùng
    return handler(request, user);
  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi xác thực' },
      { status: 500 }
    );
  }
}

/**
 * Middleware để bảo vệ các route yêu cầu đăng nhập
 */
export async function requireAuth(
  request: NextRequest,
  handler: (req: NextRequest, user: any) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Lấy token từ header Authorization hoặc cookie
    let token = request.headers.get('authorization')?.split(' ')[1];
    
    if (!token) {
      // Thử lấy từ cookie
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
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Bạn cần đăng nhập' },
        { status: 401 }
      );
    }

    // Xác thực token
    const tokenData = await verifyToken(token);
    if (!tokenData?.isValid) {
      return NextResponse.json(
        { success: false, message: 'Token không hợp lệ' },
        { status: 401 }
      );
    }

    // Lấy thông tin người dùng từ database
    const db = await getMongoDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(tokenData.userId) });
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy người dùng' },
        { status: 404 }
      );
    }

    // Gọi handler với thông tin người dùng
    return handler(request, user);
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi xác thực' },
      { status: 500 }
    );
  }
}
