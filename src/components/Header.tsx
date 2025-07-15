"use client"

import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/useAuth"
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { User as UserIcon, LogOut, Wallet, CreditCard, ArrowUpRight, ArrowDownLeft, 
  Clock, ChevronDown, Phone, Menu, X } from "lucide-react"
import loading from "@/app/(auth)/login/loading"

export default function Header() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState(false)
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)

  // Handle scrolling effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }
  
  // Track pathname for route changes
  const pathname = usePathname()
  
  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
    setIsWalletDropdownOpen(false)
    setIsUserDropdownOpen(false)
  }, [pathname])

  return (
    <header className={`bg-white border-b border-gray-100 sticky top-0 z-50 ${scrolled ? 'shadow-md' : 'shadow-sm'}`}>
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Left side: Logo and Navigation */}
        <div className="flex items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center mr-4">
            <Image 
              src="/logo.png" 
              alt="London HSC" 
              width={120} 
              height={100} 
              className="h-10 w-auto"
              priority
            />
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            <Link href="/">
              <Button
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-600 bg-white hover:bg-blue-50"
              >
                Trang chủ
              </Button>
            </Link>
            <Link href="/trade">
              <Button
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-600 bg-white hover:bg-blue-50"
              >
                Giao dịch
              </Button>
            </Link>
            <Link href="/">
              <Button
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-600 bg-white hover:bg-blue-50"
              >
                Tin tức
              </Button>
            </Link>
            
            {/* Wallet dropdown for all users */}
            <DropdownMenu open={isWalletDropdownOpen} onOpenChange={setIsWalletDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-blue-600 border-blue-600 bg-white hover:bg-blue-50 font-semibold underline"
                  style={{ textDecoration: 'underline', fontWeight: 600, color: 'rgb(17, 125, 187)' }}
                >
                  <ChevronDown className="h-4 w-4 mr-1" />
                  <span>Ví</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {user ? (
                  <>
                    <DropdownMenuItem onClick={() => setIsWalletDropdownOpen(false)}>
                      <Link href="/deposit" className="flex items-center w-full">
                        <ArrowDownLeft className="mr-2 h-4 w-4" />
                        <span>Nạp tiền</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsWalletDropdownOpen(false)}>
                      <Link href="/withdraw" className="flex items-center w-full">
                        <ArrowUpRight className="mr-2 h-4 w-4" />
                        <span>Rút tiền</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsWalletDropdownOpen(false)}>
                      <Link href="/transaction-history" className="flex items-center w-full">
                        <Clock className="mr-2 h-4 w-4" />
                        <span>Lịch sử giao dịch</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => setIsWalletDropdownOpen(false)}>
                      <Link href="/login" className="flex items-center w-full">
                        <ArrowDownLeft className="mr-2 h-4 w-4" />
                        <span>Đăng nhập để nạp tiền</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsWalletDropdownOpen(false)}>
                      <Link href="/register" className="flex items-center w-full">
                        <ArrowUpRight className="mr-2 h-4 w-4" />
                        <span>Đăng ký tài khoản</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* CSKH button - hidden on mobile */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="hidden sm:flex text-blue-600 hover:bg-blue-50"
            onClick={() => window.open("https://t.me/londonhsc", "_blank")}
          >
            CSKH
          </Button>
          
          {/* Mobile menu button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          
          {/* User Account dropdown */}
          <DropdownMenu open={isUserDropdownOpen} onOpenChange={setIsUserDropdownOpen}>
            <DropdownMenuTrigger asChild>
              {user ? (
                <Button variant="ghost" size="icon" className="rounded-full overflow-hidden h-8 w-8">
                  <Image 
                    src={user.avatar || "/avatars/default.png"} 
                    alt={user.username || "User"} 
                    width={32} 
                    height={32} 
                    className="h-full w-full object-cover"
                  />
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="gap-2">
                  <UserIcon className="h-4 w-4" />
                  <span>Tài khoản</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {user ? (
                <>
                  {/* Username display */}
                  <div className="px-4 py-2 text-sm font-medium">{user.username || 'tdnm'}</div>
                  
                  <DropdownMenuItem onClick={() => setIsUserDropdownOpen(false)}>
                    <Link href="/account" className="flex items-center w-full">
                      <span>Tổng quan tài khoản</span>
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => setIsUserDropdownOpen(false)}>
                    <Link href="/account?tab=password" className="flex items-center w-full">
                      <span>Cài đặt bảo mật</span>
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => setIsUserDropdownOpen(false)}>
                    <Link href="/account?tab=verification" className="flex items-center w-full">
                      <span>Xác minh danh tính</span>
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={() => {
                    setIsUserDropdownOpen(false)
                    handleLogout()
                  }}>
                    <span>Đăng xuất</span>
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => setIsUserDropdownOpen(false)}>
                    <Link href="/login" className="flex items-center w-full">
                      <span>Đăng nhập</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsUserDropdownOpen(false)}>
                    <Link href="/register" className="flex items-center w-full">
                      <span>Mở tài khoản</span>
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex flex-col bg-[#f7faff]">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center">
              <Image 
                src="/logo.png" 
                alt="London LLEG EXCHANGE" 
                width={180} 
                height={60} 
                className="h-12 w-auto"
              />
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-gray-500"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          
          <div className="flex-1 overflow-auto">
            <nav className="flex flex-col w-full">
              <Link 
                href="/" 
                className="py-4 px-5 border-b border-gray-200 text-base"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Trang chủ
              </Link>
              <Link 
                href="/trade" 
                className="py-4 px-5 border-b border-gray-200 text-base"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Giao dịch
              </Link>
              <Link 
                href="/transaction-history" 
                className="py-4 px-5 border-b border-gray-200 text-base"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Lịch sử giao dịch
              </Link>
              <Link 
                href="/account" 
                className="py-4 px-5 border-b border-gray-200 text-base"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Tổng quan tài khoản
              </Link>
              <Link 
                href="/account?tab=password" 
                className="py-4 px-5 border-b border-gray-200 text-base"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Đổi mật khẩu
              </Link>
              <Link 
                href="/account?tab=verification" 
                className="py-4 px-5 border-b border-gray-200 text-base"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Xác minh danh tính
              </Link>
            </nav>
            
            <div className="grid grid-cols-2 gap-4 p-5 mt-4">
              <Link 
                href="/deposit" 
                className="bg-green-600 text-white py-3 px-4 rounded-md flex justify-center items-center font-medium text-base"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Nạp tiền
              </Link>
              <Link 
                href="/withdraw" 
                className="bg-green-600 text-white py-3 px-4 rounded-md flex justify-center items-center font-medium text-base"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Rút tiền
              </Link>
            </div>
            
            <div className="px-5 pb-6">
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  handleLogout()
                }}
                className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-md flex justify-center items-center font-medium text-base"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}