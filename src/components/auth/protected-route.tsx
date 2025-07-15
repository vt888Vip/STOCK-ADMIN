"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/useAuth"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: "admin" | "user"
  redirectTo?: string
}

export function ProtectedRoute({ children, requiredRole = "user", redirectTo }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated, isAdmin, refreshUser } = useAuth()
  const router = useRouter()
  
  // Thực hiện kiểm tra xác thực khi component được tải
  useEffect(() => {
    // Gọi refreshUser để đảm bảo trạng thái xác thực được cập nhật
    refreshUser()
  }, [])

  useEffect(() => {
    // Kiểm tra xem có token trong localStorage không
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    console.log('ProtectedRoute: Token in localStorage:', token ? 'Found' : 'Not found');
    
    if (!isLoading) {
      // Kiểm tra xác thực
      const authenticated = isAuthenticated();
      console.log('ProtectedRoute: isAuthenticated result:', authenticated);
      
      if (!authenticated) {
        // Nếu có token nhưng isAuthenticated() trả về false, thử kiểm tra lại
        if (token) {
          console.log('ProtectedRoute: Token exists but not authenticated, forcing auth check');
          // Có token nhưng chưa xác thực, có thể do trạng thái chưa được cập nhật
          // Đặt một timeout ngắn để đảm bảo trạng thái xác thực được cập nhật
          setTimeout(() => {
            if (!isAuthenticated()) {
              console.log('ProtectedRoute: Still not authenticated after delay, redirecting to login');
              const loginUrl = redirectTo ? `/login?callbackUrl=${encodeURIComponent(redirectTo)}` : "/login";
              window.location.href = loginUrl; // Sử dụng window.location thay vì router để tải lại trang hoàn toàn
            }
          }, 500);
          return;
        } else {
          // Không có token, chuyển hướng đến trang đăng nhập
          console.log('ProtectedRoute: No token found, redirecting to login');
          const loginUrl = redirectTo ? `/login?callbackUrl=${encodeURIComponent(redirectTo)}` : "/login";
          window.location.href = loginUrl; // Sử dụng window.location thay vì router để tải lại trang hoàn toàn
          return;
        }
      }

      // Kiểm tra quyền admin
      if (requiredRole === "admin" && !isAdmin()) {
        console.log('ProtectedRoute: User is not admin, redirecting to home');
        window.location.href = "/"; // Sử dụng window.location thay vì router
        return;
      }

      if (requiredRole === "user" && isAdmin()) {
        console.log('ProtectedRoute: Admin accessing user route, redirecting to admin');
        window.location.href = "/admin"; // Sử dụng window.location thay vì router
        return;
      }
      
      console.log('ProtectedRoute: Authentication successful, rendering protected content');
    }
  }, [isLoading, isAuthenticated, isAdmin, requiredRole, router, redirectTo])

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // Don't render anything if not authenticated or wrong role
  if (!isAuthenticated() || (requiredRole === "admin" && !isAdmin()) || (requiredRole === "user" && isAdmin())) {
    return null
  }

  return <>{children}</>
}
