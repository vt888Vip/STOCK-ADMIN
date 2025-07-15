'use client';

// Ensure React is loaded first
import React, { useState, useEffect } from 'react';

// Import other dependencies
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff } from 'lucide-react';

// Import the React global initializer
import '@/lib/ensure-react';

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isAuthenticated, isAdmin } = useAuth()

  const callbackUrl = searchParams.get("callbackUrl") || "/"

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      if (isAdmin()) {
        router.push("/admin")
      } else {
        router.push(callbackUrl)
      }
    }
  }, [isAuthenticated, isAdmin, router, callbackUrl])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clear previous errors and set loading state
    setError("")
    setIsLoading(true)
    
    // Basic client-side validation
    if (!username.trim()) {
      setError("Vui lòng nhập tên đăng nhập")
      setIsLoading(false)
      return
    }
    
    if (!password) {
      setError("Vui lòng nhập mật khẩu")
      setIsLoading(false)
      return
    }

    console.log('Form submitted, attempting login...')
    
    try {
      const result = await login(username.trim(), password)
      console.log('Login result:', result)

      if (result?.success) {
        // Lưu trạng thái đăng nhập vào localStorage
        try {
          localStorage.setItem('loginTimestamp', Date.now().toString());
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('redirectAfterLogin', callbackUrl);
          const loginResult = result as { success: boolean; message?: string; token?: string };
          if (loginResult.token) {
            localStorage.setItem('token', loginResult.token);
            localStorage.setItem('authToken', loginResult.token);
            document.cookie = `token=${loginResult.token}; path=/; max-age=604800`;
          }
          setError("Đăng nhập thành công! Đang chuyển hướng...");

          // Auto-dismiss success message after 1 second
          setTimeout(() => {
            setError("");
          }, 1000);

          // Lấy lại thông tin user để kiểm tra role
          setTimeout(async () => {
            try {
              const res = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
              });
              if (res.ok) {
                const data = await res.json();
                if (data?.user?.role === 'admin') {
                  window.location.replace('/admin');
                } else {
                  window.location.replace(callbackUrl);
                }
              } else {
                window.location.replace(callbackUrl);
              }
            } catch (e) {
              window.location.replace(callbackUrl);
            }
          }, 1000);
        } catch (err) {
          console.error('Error saving to localStorage:', err);
        }
      } else {
        console.error('Login failed:', result?.message || 'No error message')
        setError(result?.message || "Đăng nhập thất bại. Vui lòng thử lại.")
      }
    } catch (err) {
      console.error('Unexpected error during login:', err)
      setError("Có lỗi xảy ra khi đăng nhập. Vui lòng thử lại sau.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-2">
      <Card className="w-full max-w-md sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl relative z-10 bg-white/95 backdrop-blur-sm border-0 shadow-2xl flex flex-col items-center p-0">
        {/* Logo-london.jpg ở trên cùng card */}
        <div className="w-full h-28 sm:h-24 md:h-32 rounded-t-xl overflow-hidden flex items-center justify-center bg-gray-200">
          <img
            src="/logo-london.jpg"
            alt="Banner"
            className="w-full h-full object-cover"
            style={{ minHeight: 80, maxHeight: 140 }}
          />
        </div>
        <CardHeader className="space-y-1 w-full px-4 pt-4 pb-2">
          <CardTitle className="text-xl md:text-2xl font-bold text-center">Đăng nhập</CardTitle>
          <CardDescription className="text-center text-sm md:text-base">Nhập thông tin đăng nhập của bạn</CardDescription>
        </CardHeader>
        <CardContent className="w-full px-4 pb-4">
          {error && (
            <Alert variant={error.includes('Đăng nhập thành công') ? "default" : "destructive"} className="mb-4">
              <AlertDescription className="flex items-center">
                {error}
                {error.includes('Đăng nhập thành công') && (
                  <div className="ml-2">
                    <Loader2 className="h-4 w-4 animate-spin inline-block" />
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Tên đăng nhập</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                placeholder="Nhập tên đăng nhập"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Nhập mật khẩu"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang đăng nhập...
                </>
              ) : (
                "Đăng nhập"
              )}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <span className="text-gray-600">Chưa có tài khoản? </span>
            <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
              Đăng ký ngay
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}