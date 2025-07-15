"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function AuthCheckPage() {
  const [authState, setAuthState] = useState<{
    isLoggedIn: boolean;
    token: string | null;
    loginTimestamp: string | null;
    redirectAfterLogin: string | null;
    isAuthenticatedResult: boolean;
  }>({
    isLoggedIn: false,
    token: null,
    loginTimestamp: null,
    redirectAfterLogin: null,
    isAuthenticatedResult: false
  });

  const { isAuthenticated, user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Chỉ chạy ở phía client
    if (typeof window !== 'undefined') {
      try {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
        const loginTimestamp = localStorage.getItem('loginTimestamp');
        const redirectAfterLogin = localStorage.getItem('redirectAfterLogin');
        const isAuthenticatedResult = isAuthenticated();

        setAuthState({
          isLoggedIn,
          token,
          loginTimestamp,
          redirectAfterLogin,
          isAuthenticatedResult
        });
      } catch (error) {
        console.error('Error reading from localStorage:', error);
      }
    }
  }, [isAuthenticated]);

  const handleLogout = async () => {
    await logout();
    // Xóa dữ liệu trong localStorage
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('authToken');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('loginTimestamp');
    localStorage.removeItem('redirectAfterLogin');
    
    // Cập nhật trạng thái
    setAuthState({
      isLoggedIn: false,
      token: null,
      loginTimestamp: null,
      redirectAfterLogin: null,
      isAuthenticatedResult: false
    });
    
    // Chuyển hướng về trang đăng nhập
    router.push('/login');
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(parseInt(timestamp));
      return date.toLocaleString();
    } catch (e) {
      return 'Invalid date';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Kiểm tra trạng thái đăng nhập</CardTitle>
          <CardDescription className="text-center">Thông tin về trạng thái đăng nhập hiện tại</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-gray-100 p-4 rounded-md">
              <h3 className="font-semibold mb-2">Trạng thái từ localStorage:</h3>
              <p><strong>Đã đăng nhập:</strong> {authState.isLoggedIn ? 'Có' : 'Không'}</p>
              <p><strong>Token:</strong> {authState.token ? `${authState.token.substring(0, 10)}...` : 'Không có'}</p>
              <p><strong>Thời gian đăng nhập:</strong> {formatTimestamp(authState.loginTimestamp)}</p>
              <p><strong>URL chuyển hướng:</strong> {authState.redirectAfterLogin || 'Không có'}</p>
            </div>
            
            <div className="bg-gray-100 p-4 rounded-md">
              <h3 className="font-semibold mb-2">Trạng thái từ useAuth:</h3>
              <p><strong>isAuthenticated():</strong> {authState.isAuthenticatedResult ? 'Đã xác thực' : 'Chưa xác thực'}</p>
              <p><strong>User:</strong> {user ? user.username : 'Không có'}</p>
              <p><strong>Vai trò:</strong> {user ? user.role : 'Không có'}</p>
            </div>
            
            <div className="flex space-x-4 mt-6">
              <Button 
                onClick={() => router.push('/')} 
                variant="outline" 
                className="flex-1"
              >
                Trang chủ
              </Button>
              <Button 
                onClick={handleLogout} 
                variant="destructive" 
                className="flex-1"
              >
                Đăng xuất
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
