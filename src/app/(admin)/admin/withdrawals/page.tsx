"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface Withdrawal {
  _id: string;
  withdrawalId: string;
  user: string;
  username: string;
  amount: number;
  bankName: string;
  bankAccountNumber: string;
  accountHolder: string;
  status: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  processedBy?: string;
  processedAt?: string;
  userBalance?: number; // Số dư hiện tại của user
}

export default function WithdrawalsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchWithdrawals();
    }
  }, [user]);

  const fetchWithdrawals = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const response = await fetch('/api/admin/withdrawals', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setWithdrawals(data.withdrawals || []);
      } else {
        toast({
          title: 'Lỗi',
          description: 'Không thể tải danh sách yêu cầu rút tiền',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách yêu cầu rút tiền',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (withdrawal: Withdrawal, actionType: 'approve' | 'reject') => {
    setSelectedWithdrawal(withdrawal);
    setAction(actionType);
    setNotes('');
    setShowDialog(true);
  };

  const processWithdrawal = async () => {
    if (!selectedWithdrawal || !action) return;

    setProcessing(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const response = await fetch('/api/admin/withdrawals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          withdrawalId: selectedWithdrawal.withdrawalId,
          action,
          notes
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Thành công',
          description: data.message
        });
        setShowDialog(false);
        fetchWithdrawals(); // Refresh list
      } else {
        toast({
          title: 'Lỗi',
          description: data.message || 'Không thể xử lý yêu cầu rút tiền',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể xử lý yêu cầu rút tiền',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Chờ duyệt':
        return <Badge variant="secondary" className="bg-yellow-600">Chờ duyệt</Badge>;
      case 'Đã duyệt':
        return <Badge variant="secondary" className="bg-green-600">Đã duyệt</Badge>;
      case 'Từ chối':
        return <Badge variant="secondary" className="bg-red-600">Từ chối</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  if (isLoading || loading) {
    return <div className="flex justify-center items-center h-screen text-white">Loading...</div>;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="p-6">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            💰 Quản lý yêu cầu rút tiền
            <Badge variant="secondary" className="bg-blue-600">
              {withdrawals.filter(w => w.status === 'Chờ duyệt').length} chờ duyệt
            </Badge>
            <Badge variant="secondary" className="bg-green-600">
              {withdrawals.filter(w => w.status === 'Đã duyệt').length} đã duyệt
            </Badge>
            <Badge variant="secondary" className="bg-red-600">
              {withdrawals.filter(w => w.status === 'Từ chối').length} từ chối
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filter controls */}
          <div className="mb-4 flex gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              Tất cả ({withdrawals.length})
            </Button>
            <Button
              variant={statusFilter === 'Chờ duyệt' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('Chờ duyệt')}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Chờ duyệt ({withdrawals.filter(w => w.status === 'Chờ duyệt').length})
            </Button>
            <Button
              variant={statusFilter === 'Đã duyệt' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('Đã duyệt')}
              className="bg-green-600 hover:bg-green-700"
            >
              Đã duyệt ({withdrawals.filter(w => w.status === 'Đã duyệt').length})
            </Button>
            <Button
              variant={statusFilter === 'Từ chối' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('Từ chối')}
              className="bg-red-600 hover:bg-red-700"
            >
              Từ chối ({withdrawals.filter(w => w.status === 'Từ chối').length})
            </Button>
          </div>

          {withdrawals.filter(w => statusFilter === 'all' || w.status === statusFilter).length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              Không có yêu cầu rút tiền nào {statusFilter !== 'all' && `với trạng thái "${statusFilter}"`}
            </div>
          ) : (
            <div className="space-y-4">
              {withdrawals
                .filter(w => statusFilter === 'all' || w.status === statusFilter)
                .map((withdrawal) => (
                <Card key={withdrawal._id} className="bg-gray-700 border-gray-600">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-white font-medium">
                          {withdrawal.username} - {withdrawal.withdrawalId}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          {formatDate(withdrawal.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(withdrawal.status)}
                        <span className="text-green-400 font-bold">
                          {withdrawal.amount.toLocaleString()} VND
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <Label className="text-gray-400 text-sm">Ngân hàng</Label>
                        <p className="text-white">{withdrawal.bankName}</p>
                      </div>
                      <div>
                        <Label className="text-gray-400 text-sm">Số tài khoản</Label>
                        <p className="text-white">{withdrawal.bankAccountNumber}</p>
                      </div>
                      <div>
                        <Label className="text-gray-400 text-sm">Chủ tài khoản</Label>
                        <p className="text-white">{withdrawal.accountHolder}</p>
                      </div>
                    </div>

                    {withdrawal.notes && (
                      <div className="mb-4">
                        <Label className="text-gray-400 text-sm">Ghi chú</Label>
                        <p className="text-white text-sm">{withdrawal.notes}</p>
                      </div>
                    )}

                    {withdrawal.status === 'Chờ duyệt' && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleAction(withdrawal, 'approve')}
                          className="bg-green-600 hover:bg-green-700"
                          size="sm"
                        >
                          ✅ Duyệt
                        </Button>
                        <Button
                          onClick={() => handleAction(withdrawal, 'reject')}
                          className="bg-red-600 hover:bg-red-700"
                          size="sm"
                        >
                          ❌ Từ chối
                        </Button>
                      </div>
                    )}

                    {withdrawal.status !== 'Chờ duyệt' && withdrawal.processedBy && (
                      <div className="text-sm text-gray-400">
                        Xử lý bởi: {withdrawal.processedBy} - {formatDate(withdrawal.processedAt || '')}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog xử lý yêu cầu */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {action === 'approve' ? 'Duyệt yêu cầu rút tiền' : 'Từ chối yêu cầu rút tiền'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedWithdrawal && (
                <div className="space-y-2">
                  <p><strong>Người dùng:</strong> {selectedWithdrawal.username}</p>
                  <p><strong>Số tiền:</strong> {selectedWithdrawal.amount.toLocaleString()} VND</p>
                  <p><strong>Ngân hàng:</strong> {selectedWithdrawal.bankName}</p>
                  <p><strong>Số tài khoản:</strong> {selectedWithdrawal.bankAccountNumber}</p>
                  <p><strong>Chủ tài khoản:</strong> {selectedWithdrawal.accountHolder}</p>
                  {action === 'approve' && (
                    <div className="mt-2 p-2 bg-blue-900/20 border border-blue-600 rounded">
                      <p className="text-blue-400 text-sm">
                        💰 Số dư hiện tại: {selectedWithdrawal.userBalance?.toLocaleString() || 'Đang kiểm tra...'} VND
                      </p>
                    </div>
                  )}
                  {action === 'approve' && (
                    <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-600 rounded">
                      <p className="text-yellow-400 text-sm">
                        ⚠️ Khi duyệt, số tiền sẽ được trừ khỏi tài khoản người dùng
                      </p>
                    </div>
                  )}
                  {action === 'reject' && (
                    <div className="mt-3 p-2 bg-red-900/20 border border-red-600 rounded">
                      <p className="text-red-400 text-sm">
                        ❌ Yêu cầu sẽ bị từ chối và người dùng sẽ được thông báo
                      </p>
                    </div>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-white">Ghi chú (tùy chọn)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Nhập ghi chú..."
                className="bg-gray-700 text-white border-gray-600"
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
                disabled={processing}
              >
                Hủy
              </Button>
              <Button
                onClick={processWithdrawal}
                disabled={processing}
                className={
                  action === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }
              >
                {processing ? 'Đang xử lý...' : (action === 'approve' ? 'Duyệt' : 'Từ chối')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 