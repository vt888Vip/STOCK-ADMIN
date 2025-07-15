"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Separator } from '../../../../components/ui/separator';
import { Wallet, ArrowDownRight, Building2, AlertCircle } from 'lucide-react';
import useSWR from 'swr';

export default function WithdrawPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') || localStorage.getItem('authToken') : null;
  const router = useRouter();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lấy thông tin balance
  const { data: balanceData, error: balanceError, mutate: refreshBalance } = useSWR(
    token ? '/api/user/balance' : null,
    url => fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json())
  );

  // Lấy thông tin cài đặt
  const { data: settings, error: settingsError } = useSWR(
    token ? '/api/admin/settings' : null,
    url => fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json())
  );

  const availableBalance = balanceData?.balance?.available || 0;
  const WITHDRAWAL_FEE = 0.04; // 4% phí rút tiền

  useEffect(() => {
    if (!isLoading && !isAuthenticated()) {
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Vui lòng đăng nhập' });
      router.push('/login');
    }
  }, [user, isLoading, isAuthenticated, router, toast]);

  // Kiểm tra xem user đã liên kết ngân hàng chưa
  const hasBankInfo = user?.bank?.name && user?.bank?.accountNumber && user?.bank?.accountHolder;

  // Tính toán số tiền thực nhận sau khi trừ phí
  const calculateActualAmount = (withdrawAmount: number) => {
    const fee = withdrawAmount * WITHDRAWAL_FEE;
    return withdrawAmount - fee;
  };

  // Tính toán phí rút tiền
  const calculateFee = (withdrawAmount: number) => {
    return withdrawAmount * WITHDRAWAL_FEE;
  };

  const handleLinkBank = () => {
    router.push('/account?tab=bank');
  };

  const handleSubmit = async () => {
    if (!amount) {
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Vui lòng nhập số tiền rút' });
      return;
    }

    const withdrawAmount = Number(amount);
    
    // Kiểm tra số tiền tối thiểu và tối đa
    if (settings && settings.minWithdrawal && settings.maxWithdrawal) {
      if (withdrawAmount < settings.minWithdrawal) {
        toast({
          variant: 'destructive',
          title: 'Lỗi',
          description: `Số tiền rút tối thiểu là ${settings.minWithdrawal.toLocaleString()} VND`,
        });
        return;
      }
      
      if (withdrawAmount > settings.maxWithdrawal) {
        toast({
          variant: 'destructive',
          title: 'Lỗi',
          description: `Số tiền rút tối đa là ${settings.maxWithdrawal.toLocaleString()} VND`,
        });
        return;
      }
    }

    // Kiểm tra số dư
    if (withdrawAmount > availableBalance) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Số dư không đủ để thực hiện giao dịch này',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          amount: withdrawAmount,
          bankName: user?.bank?.name || '',
          accountNumber: user?.bank?.accountNumber || '',
          accountHolder: user?.bank?.accountHolder || ''
        }),
      });
      
      const result = await res.json();
      
      if (res.ok) {
        toast({ 
          title: 'Thành công', 
          description: `Đã gửi yêu cầu rút tiền thành công. Yêu cầu của bạn đang chờ admin duyệt.` 
        });
        setAmount('');
        
        // Refresh balance data
        refreshBalance();
      } else {
        toast({ variant: 'destructive', title: 'Lỗi', description: result.message || 'Không thể gửi yêu cầu rút tiền' });
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể gửi yêu cầu rút tiền' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !user) {
    return <div className="flex justify-center items-center h-screen text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-blue-900 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-2">Rút tiền</h1>
            <p className="text-slate-300 text-sm">Thực hiện rút tiền về tài khoản ngân hàng</p>
          </div>

          {/* Số dư */}
          <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4 text-green-600" />
                Số dư khả dụng
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {availableBalance.toLocaleString()} VND
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                  Phí rút: 4%
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Kiểm tra tài khoản ngân hàng */}
          {!hasBankInfo ? (
            <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  Liên kết ngân hàng
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center space-y-3">
                  <div className="text-amber-600 text-lg font-medium">
                    ⚠️ Bạn chưa liên kết tài khoản ngân hàng
                  </div>
                  <p className="text-slate-600 text-sm">
                    Vui lòng liên kết tài khoản ngân hàng để có thể rút tiền
                  </p>
                  <Button 
                    onClick={handleLinkBank}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    Liên kết ngân hàng
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Thông tin ngân hàng */}
              <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    Thông tin tài khoản ngân hàng
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 text-sm font-medium">Tên ngân hàng:</span>
                        <span className="font-semibold text-sm text-slate-800">{user?.bank?.name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 text-sm font-medium">Số tài khoản:</span>
                        <span className="font-mono text-sm font-bold text-slate-800">{user?.bank?.accountNumber || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 text-sm font-medium">Chủ tài khoản:</span>
                        <span className="font-semibold text-sm text-slate-800">{user?.bank?.accountHolder || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Form rút tiền */}
              <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                    Rút tiền
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-slate-700 text-sm font-medium">Số tiền rút (VND)</Label>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Nhập số tiền muốn rút"
                      className="mt-1 border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                      min={settings?.minWithdrawal || 100000}
                      max={Math.min(availableBalance, settings?.maxWithdrawal || 100000000)}
                    />
                    {settings && settings.minWithdrawal && settings.maxWithdrawal && (
                      <p className="text-xs text-slate-500 mt-1">
                        Từ {settings.minWithdrawal.toLocaleString()} - {settings.maxWithdrawal.toLocaleString()} VND
                      </p>
                    )}
                  </div>

                  {/* Thông tin chi tiết */}
                  {amount && Number(amount) > 0 && (
                    <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-4 rounded-xl border border-slate-200">
                      <h4 className="text-slate-800 font-semibold mb-3">Chi tiết giao dịch:</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Số tiền rút:</span>
                          <span className="font-semibold text-slate-800">{Number(amount).toLocaleString()} VND</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Phí rút (4%):</span>
                          <span className="text-red-600 font-semibold">-{calculateFee(Number(amount)).toLocaleString()} VND</span>
                        </div>
                        <Separator className="bg-slate-300 my-2" />
                        <div className="flex justify-between font-bold">
                          <span className="text-slate-700">Số tiền thực nhận:</span>
                          <span className="text-green-600">{calculateActualAmount(Number(amount)).toLocaleString()} VND</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 disabled:bg-slate-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                    onClick={handleSubmit}
                    disabled={!amount || isSubmitting || Number(amount) <= 0 || Number(amount) > availableBalance}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        <ArrowDownRight className="h-5 w-5 mr-2" />
                        Gửi yêu cầu rút tiền
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
