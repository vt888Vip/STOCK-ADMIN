"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wallet, ArrowUpRight, ArrowDownRight, User, Calendar, Shield, CheckCircle, XCircle, Clock, Building2, CreditCard, Lock, Settings, Upload, Camera } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface User {
  _id?: string;
  id?: string;
  username?: string;
  email?: string;
  phone?: string;
  fullName?: string;
  balance?: number | { available: number; frozen: number; total: number };
  createdAt?: string;
  verification?: {
    verified: boolean;
    status?: 'pending' | 'approved' | 'rejected';
    cccdFront?: string;
    cccdBack?: string;
  };
  bank?: {
    name?: string;
    accountNumber?: string;
    accountHolder?: string;
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

export default function AccountPage() {
  const { user, isLoading, refreshUser } = useAuth() as AuthContextType;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [balance, setBalance] = useState<number>(0);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Verification form states
  const [fullName, setFullName] = useState('');
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string>('');
  const [backPreview, setBackPreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  // Bank form states
  const [bankForm, setBankForm] = useState({
    accountHolder: '',
    bankName: '',
    accountNumber: ''
  });
  const [isSavingBank, setIsSavingBank] = useState(false);

  // Password form states
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const formatCurrency = (amount: number): string => {
    if (isNaN(amount) || amount === null || amount === undefined) {
      return '0 ₫';
    }
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getVerificationStatus = () => {
    if (!user?.verification) return { status: 'unverified', label: 'Chưa xác minh', color: 'bg-gray-500', icon: <XCircle className="h-4 w-4" /> };
    
    if (user.verification.verified) {
      return { status: 'verified', label: 'Đã xác minh', color: 'bg-green-500', icon: <CheckCircle className="h-4 w-4" /> };
    }
    
    switch (user.verification.status) {
      case 'pending':
        return { status: 'pending', label: 'Đang xử lý', color: 'bg-yellow-500', icon: <Clock className="h-4 w-4" /> };
      case 'rejected':
        return { status: 'rejected', label: 'Từ chối', color: 'bg-red-500', icon: <XCircle className="h-4 w-4" /> };
      default:
        return { status: 'unverified', label: 'Chưa xác minh', color: 'bg-gray-500', icon: <XCircle className="h-4 w-4" /> };
    }
  };

  // Lấy balance từ user object
  const getUserBalance = () => {
    if (!user) return 0;
    
    console.log('User balance object:', user.balance); // Debug log
    
    if (typeof user.balance === 'number') {
      return user.balance;
    }
    
    if (user.balance && typeof user.balance === 'object') {
      return user.balance.available || 0;
    }
    
    return 0;
  };

  useEffect(() => {
    if (user) {
      const userBalance = getUserBalance();
      console.log('Calculated balance:', userBalance); // Debug log
      setBalance(userBalance);
    }
  }, [user]);

  // Xử lý tab từ URL params
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/account?tab=${value}`);
  };

  const handleDeposit = () => {
    router.push('/deposit');
  };

  const handleWithdraw = () => {
    router.push('/withdraw');
  };

  // Handle file selection
  const handleFileSelect = (file: File, type: 'front' | 'back') => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Chỉ chấp nhận file ảnh (JPG, PNG)',
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Kích thước file không được vượt quá 5MB',
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
    if (type === 'front') {
        setFrontImage(file);
        setFrontPreview(result);
    } else {
        setBackImage(file);
        setBackPreview(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle file upload
  const handleUpload = async (file: File, type: 'front' | 'back') => {
    if (!file) return;

    setIsUploading(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || localStorage.getItem('authToken') : null;

    try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

      const response = await fetch('/api/upload-verification', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
      toast({
        title: 'Thành công',
          description: `Đã tải lên ${type === 'front' ? 'mặt trước' : 'mặt sau'} CCCD`,
      });
      
        // Refresh user data to get updated verification status
        await refreshUser();
      } else {
        toast({
          variant: 'destructive',
          title: 'Lỗi',
          description: result.message || 'Không thể tải lên file',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không thể tải lên file',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle form submission
  const handleSubmitVerification = async () => {
    if (!fullName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Vui lòng nhập họ tên đầy đủ',
      });
      return;
    }

    if (!frontImage || !backImage) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Vui lòng tải lên đủ 2 mặt CCCD',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Upload front image
      await handleUpload(frontImage, 'front');
      
      // Upload back image
      await handleUpload(backImage, 'back');

      toast({
        title: 'Thành công',
        description: 'Đã gửi yêu cầu xác minh. Vui lòng chờ admin duyệt.',
      });

      // Reset form
      setFullName('');
      setFrontImage(null);
      setBackImage(null);
      setFrontPreview('');
      setBackPreview('');
      
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không thể gửi yêu cầu xác minh',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle bank form submission
  const handleSubmitBank = async () => {
    if (!bankForm.accountHolder.trim()) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Vui lòng nhập tên chủ tài khoản',
      });
      return;
    }

    if (!bankForm.bankName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Vui lòng nhập tên ngân hàng',
      });
      return;
    }

    if (!bankForm.accountNumber.trim()) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Vui lòng nhập số tài khoản',
      });
      return;
    }

    setIsSavingBank(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || localStorage.getItem('authToken') : null;

    try {
      const response = await fetch('/api/users/bank-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountHolder: bankForm.accountHolder.trim(),
          name: bankForm.bankName.trim(),
          accountNumber: bankForm.accountNumber.trim()
        }),
      });

      const result = await response.json();

      if (response.ok) {
      toast({
        title: 'Thành công',
          description: 'Đã lưu thông tin ngân hàng',
        });
        
        // Reset form
        setBankForm({
          accountHolder: '',
          bankName: '',
          accountNumber: ''
        });
        
        // Refresh user data
      await refreshUser();
      } else {
      toast({
          variant: 'destructive',
        title: 'Lỗi',
          description: result.message || 'Không thể lưu thông tin ngân hàng',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không thể lưu thông tin ngân hàng',
      });
    } finally {
      setIsSavingBank(false);
    }
  };

  // Handle password change
  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword.trim()) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Vui lòng nhập mật khẩu hiện tại',
      });
      return;
    }

    if (!passwordForm.newPassword.trim()) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Vui lòng nhập mật khẩu mới',
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Mật khẩu mới phải có ít nhất 6 ký tự',
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Mật khẩu xác nhận không khớp',
      });
      return;
    }

    setIsChangingPassword(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || localStorage.getItem('authToken') : null;

    try {
      const response = await fetch('/api/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: 'Thành công',
          description: 'Đã đổi mật khẩu thành công',
        });
        
        // Reset form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      } else {
      toast({
          variant: 'destructive',
          title: 'Lỗi',
          description: result.message || 'Không thể đổi mật khẩu',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không thể đổi mật khẩu',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const verificationStatus = getVerificationStatus();
  const hasBankInfo = user?.bank?.name && user?.bank?.accountNumber && user?.bank?.accountHolder;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Vui lòng đăng nhập để xem thông tin</p>
          <Button onClick={() => router.push('/login')} className="mt-4">
            Đăng nhập
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-blue-900 flex flex-col">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <User className="h-5 w-5 text-white" />
                </div>
                <div>
                <h1 className="text-lg font-bold text-slate-800">Quản lý tài khoản</h1>
                <p className="text-xs text-slate-500">Quản lý thông tin và cài đặt</p>
                </div>
              </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800 text-xs">
                {user?.username || 'User'}
              </Badge>
            </div>
          </div>

          {/* TabList */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-slate-100/80 backdrop-blur-sm border border-slate-200">
              <TabsTrigger value="overview" className="text-slate-700 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
                <User className="h-4 w-4 mr-2" />
                    Tổng quan
              </TabsTrigger>
              <TabsTrigger value="verification" className="text-slate-700 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
                <CreditCard className="h-4 w-4 mr-2" />
                    Xác minh
              </TabsTrigger>
              <TabsTrigger value="bank" className="text-slate-700 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
                <Building2 className="h-4 w-4 mr-2" />
                Ngân hàng
              </TabsTrigger>
              <TabsTrigger value="password" className="text-slate-700 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
                <Lock className="h-4 w-4 mr-2" />
                    Mật khẩu
              </TabsTrigger>
            </TabsList>
          </Tabs>
                </div>
              </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsContent value="overview" className="space-y-6 mt-6">
              {/* Thông tin cơ bản */}
              <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-4 w-4" />
                    Thông tin tài khoản
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Tên tài khoản:</span>
                    <span className="font-medium text-sm">{user.username || 'N/A'}</span>
                    </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">ID:</span>
                    <span className="font-medium font-mono text-xs">{user._id || user.id || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Ngày đăng ký:</span>
                    <span className="font-medium text-sm">{formatDate(user.createdAt)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Trạng thái xác minh:</span>
                    <Badge className={`${verificationStatus.color} text-white flex items-center gap-1 text-xs`}>
                      {verificationStatus.icon}
                      {verificationStatus.label}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Số dư */}
              <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wallet className="h-4 w-4" />
                    Tài sản quy đổi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {formatCurrency(balance)}
                    </div>
                    <p className="text-gray-600 text-xs">Số dư khả dụng</p>
                    </div>
                </CardContent>
              </Card>

              {/* Nút hành động */}
              <div className="flex gap-3">
                <Button 
                  onClick={handleDeposit}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-sm"
                >
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  Nạp tiền
                </Button>
                
                <Button 
                  onClick={handleWithdraw}
                  variant="outline"
                  className="flex-1 text-sm"
                >
                  <ArrowDownRight className="h-4 w-4 mr-1" />
                  Rút tiền
                </Button>
                    </div>

              {/* Thông tin bổ sung */}
              <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="h-4 w-4" />
                    Lưu ý bảo mật
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>• Tài khoản chưa xác minh sẽ bị giới hạn một số chức năng</p>
                    <p>• Vui lòng cập nhật thông tin xác minh để sử dụng đầy đủ tính năng</p>
                    <p>• Mọi giao dịch đều được ghi nhận và bảo mật</p>
                    </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Xác minh */}
            <TabsContent value="verification" className="space-y-6 mt-6">
              <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CreditCard className="h-4 w-4" />
                    Xác minh danh tính
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Trạng thái hiện tại */}
                  <div className="text-center py-4">
                    <Badge className={`${verificationStatus.color} text-white mb-4`}>
                      {verificationStatus.icon}
                      {verificationStatus.label}
                    </Badge>
                    <p className="text-slate-600 text-sm">
                      {verificationStatus.status === 'verified' 
                        ? 'Tài khoản của bạn đã được xác minh thành công'
                        : verificationStatus.status === 'pending'
                        ? 'Yêu cầu xác minh đang được xử lý'
                        : 'Vui lòng cung cấp thông tin xác minh'
                      }
                    </p>
                </div>

                  {/* Hiển thị ảnh đã upload (nếu có) */}
                  {(user?.verification?.cccdFront || user?.verification?.cccdBack) && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                      <h3 className="text-lg font-semibold text-slate-800 mb-3">Ảnh đã tải lên</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {user.verification.cccdFront && (
                    <div>
                            <Label className="text-sm font-medium text-slate-600">Mặt trước</Label>
                            <img 
                              src={user.verification.cccdFront} 
                              alt="CCCD Front" 
                              className="w-full h-32 object-cover rounded-lg border mt-1"
                            />
                    </div>
                        )}
                        {user.verification.cccdBack && (
                    <div>
                            <Label className="text-sm font-medium text-slate-600">Mặt sau</Label>
                            <img 
                              src={user.verification.cccdBack} 
                              alt="CCCD Back" 
                              className="w-full h-32 object-cover rounded-lg border mt-1"
                            />
                    </div>
                        )}
                </div>
              </div>
            )}

                  {/* Thông báo chờ duyệt nếu đã upload đủ 2 ảnh */}
                  {(user?.verification?.cccdFront && user?.verification?.cccdBack) && verificationStatus.status !== 'verified' && (
                    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-6 rounded-xl border border-amber-200 text-center">
                      <div className="text-4xl mb-3">⏳</div>
                      <h3 className="text-lg font-semibold text-amber-800 mb-2">Đang chờ duyệt</h3>
                      <p className="text-amber-700 text-sm mb-3">
                        Yêu cầu xác minh của bạn đã được gửi và đang được admin xem xét.
                      </p>
                      <p className="text-amber-600 text-xs">
                        Thời gian xử lý thường từ 1-3 ngày làm việc.
                      </p>
                  </div>
                )}

                  {/* Form xác minh (chỉ hiển thị nếu chưa xác minh VÀ chưa upload đủ 2 ảnh) */}
                  {verificationStatus.status !== 'verified' && 
                   (!user?.verification?.cccdFront || !user?.verification?.cccdBack) && (
                    <div className="space-y-4">
                      {/* Họ tên */}
                    <div>
                        <Label className="text-slate-700 text-sm font-medium">Họ tên đầy đủ</Label>
                        <Input
                        type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Nhập họ tên như trên CCCD"
                          className="mt-1 border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                      {/* Upload ảnh */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Mặt trước */}
                    <div>
                          <Label className="text-slate-700 text-sm font-medium">Mặt trước CCCD</Label>
                          <div className="mt-1">
                      <input
                              type="file"
                              ref={frontInputRef}
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileSelect(file, 'front');
                              }}
                              className="hidden"
                            />
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                              {frontPreview ? (
                                <div className="space-y-2">
                                  <img 
                                    src={frontPreview} 
                                    alt="Front Preview" 
                                    className="w-full h-24 object-cover rounded"
                                  />
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setFrontImage(null);
                                      setFrontPreview('');
                                      if (frontInputRef.current) frontInputRef.current.value = '';
                                    }}
                                  >
                                    Xóa
                      </Button>
                    </div>
                              ) : (
                                <div 
                                  className="cursor-pointer"
                                  onClick={() => frontInputRef.current?.click()}
                                >
                                  <Camera className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                                  <p className="text-sm text-slate-600">Click để chọn ảnh</p>
                                  <p className="text-xs text-slate-500">JPG, PNG (tối đa 5MB)</p>
                  </div>
                )}
              </div>
                </div>
                  </div>

                        {/* Mặt sau */}
                    <div>
                          <Label className="text-slate-700 text-sm font-medium">Mặt sau CCCD</Label>
                          <div className="mt-1">
                      <input
                              type="file"
                              ref={backInputRef}
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileSelect(file, 'back');
                              }}
                              className="hidden"
                            />
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                              {backPreview ? (
                                <div className="space-y-2">
                                  <img 
                                    src={backPreview} 
                                    alt="Back Preview" 
                                    className="w-full h-24 object-cover rounded"
                                  />
                      <Button
                                    size="sm"
                        variant="outline"
                                    onClick={() => {
                                      setBackImage(null);
                                      setBackPreview('');
                                      if (backInputRef.current) backInputRef.current.value = '';
                                    }}
                                  >
                                    Xóa
                      </Button>
                    </div>
                              ) : (
                                <div 
                                  className="cursor-pointer"
                                  onClick={() => backInputRef.current?.click()}
                                >
                                  <Camera className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                                  <p className="text-sm text-slate-600">Click để chọn ảnh</p>
                                  <p className="text-xs text-slate-500">JPG, PNG (tối đa 5MB)</p>
                      </div>
                              )}
                      </div>
                      </div>
                      </div>
                      </div>

                      {/* Nút gửi */}
                      <Button
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 disabled:bg-slate-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                        onClick={handleSubmitVerification}
                        disabled={!fullName.trim() || !frontImage || !backImage || isUploading}
                      >
                        {isUploading ? (
                          <>
                            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Đang xử lý...
                          </>
                        ) : (
                          <>
                            <Upload className="h-5 w-5 mr-2" />
                            Gửi yêu cầu xác minh
                          </>
                        )}
                      </Button>
                      </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Ngân hàng */}
            <TabsContent value="bank" className="space-y-6 mt-6">
              <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-4 w-4" />
                    Thông tin ngân hàng
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {hasBankInfo ? (
                    // Hiển thị thông tin đã có (chỉ đọc)
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                      <h3 className="text-lg font-semibold text-slate-800 mb-3">Thông tin đã liên kết</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 text-sm font-medium">Tên chủ tài khoản:</span>
                          <span className="font-semibold text-sm text-slate-800">{user?.bank?.accountHolder}</span>
                    </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 text-sm font-medium">Tên ngân hàng:</span>
                          <span className="font-semibold text-sm text-slate-800">{user?.bank?.name}</span>
                      </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 text-sm font-medium">Số tài khoản:</span>
                          <span className="font-mono text-sm font-bold text-slate-800">{user?.bank?.accountNumber}</span>
                  </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 text-sm font-medium">Loại:</span>
                          <span className="font-semibold text-sm text-slate-800">Ngân hàng</span>
              </div>
                      </div>
                      <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                        <p className="text-blue-800 text-xs">
                          ℹ️ Thông tin ngân hàng đã được liên kết và không thể chỉnh sửa.
                        </p>
                      </div>
                    </div>
                  ) : (
                    // Form nhập thông tin ngân hàng
                    <div className="space-y-4">
                      <div className="text-center py-4">
                        <div className="text-4xl mb-3">🏦</div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">Liên kết tài khoản ngân hàng</h3>
                        <p className="text-slate-600 text-sm mb-4">
                          Cung cấp thông tin ngân hàng để có thể rút tiền
                        </p>
                      </div>

                      <div className="space-y-4">
                        {/* Tên chủ tài khoản */}
                <div>
                          <Label className="text-slate-700 text-sm font-medium">Tên chủ tài khoản *</Label>
                          <Input
                            type="text"
                            value={bankForm.accountHolder}
                            onChange={(e) => setBankForm({...bankForm, accountHolder: e.target.value})}
                            placeholder="Nhập tên chủ tài khoản như trên thẻ"
                            className="mt-1 border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                          />
                </div>

                        {/* Tên ngân hàng */}
                        <div>
                          <Label className="text-slate-700 text-sm font-medium">Tên ngân hàng *</Label>
                          <Input
                            type="text"
                            value={bankForm.bankName}
                            onChange={(e) => setBankForm({...bankForm, bankName: e.target.value})}
                            placeholder="VD: Vietcombank, BIDV, Agribank..."
                            className="mt-1 border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                          />
                  </div>

                        {/* Số tài khoản */}
                        <div>
                          <Label className="text-slate-700 text-sm font-medium">Số tài khoản *</Label>
                          <Input
                            type="text"
                            value={bankForm.accountNumber}
                            onChange={(e) => setBankForm({...bankForm, accountNumber: e.target.value})}
                            placeholder="Nhập số tài khoản ngân hàng"
                            className="mt-1 border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                          />
                  </div>

                        {/* Loại */}
                        <div>
                          <Label className="text-slate-700 text-sm font-medium">Loại</Label>
                          <Input
                            type="text"
                            value="Ngân hàng"
                            disabled
                            className="mt-1 border-slate-300 bg-slate-100 text-slate-500"
                          />
                          </div>

                        {/* Nút lưu */}
                          <Button
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:bg-slate-400 disabled:cursor-not-allowed"
                          onClick={handleSubmitBank}
                          disabled={isSavingBank || !bankForm.accountHolder.trim() || !bankForm.bankName.trim() || !bankForm.accountNumber.trim()}
                        >
                          {isSavingBank ? (
                            <>
                              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                              Đang lưu...
                            </>
                          ) : (
                            <>
                              <Building2 className="h-5 w-5 mr-2" />
                              Lưu thông tin ngân hàng
                            </>
                          )}
                        </Button>
                      </div>
                  </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Mật khẩu */}
            <TabsContent value="password" className="space-y-6 mt-6">
              <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lock className="h-4 w-4" />
                    Đổi mật khẩu
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-4">
                    <div className="text-4xl mb-3">🔒</div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">Bảo mật tài khoản</h3>
                    <p className="text-slate-600 text-sm mb-6">
                      Thay đổi mật khẩu để bảo vệ tài khoản của bạn
                    </p>
                </div>

                  <div className="space-y-4">
                    {/* Mật khẩu hiện tại */}
                    <div>
                      <Label className="text-slate-700 text-sm font-medium">Mật khẩu hiện tại *</Label>
                      <Input
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                        placeholder="Nhập mật khẩu hiện tại"
                        className="mt-1 border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    {/* Mật khẩu mới */}
                    <div>
                      <Label className="text-slate-700 text-sm font-medium">Mật khẩu mới *</Label>
                      <Input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                        placeholder="Nhập mật khẩu mới"
                        className="mt-1 border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                      </div>

                    {/* Xác nhận mật khẩu mới */}
                    <div>
                      <Label className="text-slate-700 text-sm font-medium">Xác nhận mật khẩu mới *</Label>
                      <Input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                        placeholder="Nhập lại mật khẩu mới"
                        className="mt-1 border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    {/* Nút đổi mật khẩu */}
                    <Button 
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:bg-slate-400 disabled:cursor-not-allowed"
                      onClick={handleChangePassword}
                      disabled={isChangingPassword || !passwordForm.currentPassword.trim() || !passwordForm.newPassword.trim() || !passwordForm.confirmPassword.trim()}
                    >
                      {isChangingPassword ? (
                        <>
                          <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Đang đổi mật khẩu...
                        </>
                      ) : (
                        <>
                          <Lock className="h-5 w-5 mr-2" />
                          Đổi mật khẩu
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}