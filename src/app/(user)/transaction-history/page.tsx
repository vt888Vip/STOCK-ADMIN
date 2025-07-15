'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/lib/useAuth';
import { formatCurrency } from '@/lib/utils';

interface Transaction {
  _id: string;
  type: 'deposit' | 'withdrawal' | 'trade';
  amount: number;
  profit?: number;
  status: string;
  result?: 'win' | 'lose' | null;
  direction?: string;
  asset?: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  proofImage?: string;
  bankInfo?: any;
  adminNote?: string;
}

export default function TransactionHistoryPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showBankModal, setShowBankModal] = useState(false);

  // Helper function to get token
  const getToken = () => {
    return localStorage.getItem('token') || localStorage.getItem('authToken');
  };

  const fetchTransactions = async (type = 'all', pageNum = 1) => {
    try {
      const token = getToken();
      console.log('🔍 [FRONTEND] Bắt đầu fetchTransactions');
      console.log('🔑 [FRONTEND] Token:', token ? token.substring(0, 20) + '...' : 'Không có token');
      console.log('👤 [FRONTEND] User:', user);
      console.log('📋 [FRONTEND] Params:', { type, pageNum });
      
      setLoading(true);
      const url = `/api/user/transaction-history?type=${type}&page=${pageNum}`;
      console.log('🌐 [FRONTEND] API URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📡 [FRONTEND] Response status:', response.status);
      console.log('📡 [FRONTEND] Response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('📊 [FRONTEND] Response data:', data);
        setTransactions(data.transactions);
        setTotalPages(data.pagination.totalPages);
      } else {
        const errorData = await response.json();
        console.error('❌ [FRONTEND] API Error:', errorData);
      }
    } catch (error) {
      console.error('❌ [FRONTEND] Lỗi khi lấy lịch sử giao dịch:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = getToken();
    console.log('🔄 [FRONTEND] useEffect triggered');
    console.log('🔑 [FRONTEND] Token in useEffect:', token ? 'Có token' : 'Không có token');
    console.log('👤 [FRONTEND] User in useEffect:', user);
    
    if (token && user) {
      console.log('✅ [FRONTEND] Có token và user, gọi fetchTransactions');
      fetchTransactions(activeTab, page);
    } else {
      console.log('❌ [FRONTEND] Không có token hoặc user, không gọi API');
    }
  }, [user, activeTab, page]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setPage(1);
  };

  // Handle transaction click to show bank details
  const handleTransactionClick = (transaction: Transaction) => {
    if (transaction.type === 'withdrawal' || transaction.type === 'deposit') {
      setSelectedTransaction(transaction);
      setShowBankModal(true);
    }
  };

  const getStatusBadge = (status: string, result?: string) => {
    if (result === 'win') {
      return <Badge className="bg-green-500">THẮNG</Badge>;
    } else if (result === 'lose') {
      return <Badge className="bg-red-500">THUA</Badge>;
    }

    switch (status) {
      case 'DA DUYET':
        return <Badge className="bg-green-500">Đã duyệt</Badge>;
      case 'CHO XU LY':
        return <Badge className="bg-yellow-500">Chờ xử lý</Badge>;
      case 'TU CHOI':
        return <Badge className="bg-red-500">Từ chối</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500">Hoàn thành</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Đang xử lý</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return '💰';
      case 'withdrawal':
        return '💸';
      case 'trade':
        return '📈';
      default:
        return '📊';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderTransaction = (transaction: Transaction) => (
    <Card 
      key={transaction._id} 
      className={`mb-4 ${(transaction.type === 'withdrawal' || transaction.type === 'deposit') ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={() => handleTransactionClick(transaction)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getTypeIcon(transaction.type)}</span>
            <div>
              <h3 className="font-semibold">{transaction.description}</h3>
              <p className="text-sm text-gray-500">{formatDate(transaction.createdAt)}</p>
              {transaction.adminNote && (
                <p className="text-sm text-gray-600 mt-1">Ghi chú: {transaction.adminNote}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-2">
              {transaction.type === 'trade' && transaction.result === 'win' && (
                <span className="text-green-600 font-semibold">
                  +{formatCurrency(transaction.amount + (transaction.profit || 0))}
                </span>
              )}
              {transaction.type === 'trade' && transaction.result === 'lose' && (
                <span className="text-red-600 font-semibold">
                  -{formatCurrency(transaction.amount)}
                </span>
              )}
              {transaction.type !== 'trade' && (
                <span className={`font-semibold ${
                  transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.type === 'deposit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </span>
              )}
              {getStatusBadge(transaction.status, transaction.result || undefined)}
            </div>
            {transaction.type === 'trade' && transaction.result === 'win' && (
              <p className="text-sm text-green-600">
                Lợi nhuận: +{formatCurrency(transaction.profit || 0)}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Lịch sử giao dịch</h1>
        <p className="text-gray-600">Xem lại tất cả các giao dịch của bạn</p>
        <p className="text-sm text-blue-600 mt-2">💡 Click vào giao dịch nạp/rút tiền để xem tài khoản ngân hàng của bạn</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">Tất cả</TabsTrigger>
          <TabsTrigger value="deposits">Nạp tiền</TabsTrigger>
          <TabsTrigger value="withdrawals">Rút tiền</TabsTrigger>
          <TabsTrigger value="trades">Giao dịch</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2">Đang tải...</p>
            </div>
          ) : transactions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">Chưa có giao dịch nào</p>
              </CardContent>
            </Card>
          ) : (
            <div>
              {transactions.map(renderTransaction)}
              
              {/* Phân trang */}
              {totalPages > 1 && (
                <div className="flex justify-center space-x-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    Trước
                  </Button>
                  <span className="flex items-center px-4">
                    Trang {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                  >
                    Sau
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Bank Details Modal */}
      <Dialog open={showBankModal} onOpenChange={setShowBankModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Thông tin tài khoản ngân hàng</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Loại giao dịch:</label>
                  <p className="text-sm text-gray-900 capitalize">
                    {selectedTransaction.type === 'deposit' ? 'Nạp tiền' : 'Rút tiền'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Ngày tạo:</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedTransaction.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Số tiền:</label>
                  <p className={`text-sm font-semibold ${
                    selectedTransaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {selectedTransaction.type === 'deposit' ? '+' : '-'}{formatCurrency(selectedTransaction.amount)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Trạng thái:</label>
                  <div className="mt-1">
                    {getStatusBadge(selectedTransaction.status)}
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Tài khoản ngân hàng của bạn:</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Tên ngân hàng:</label>
                    <p className="text-sm text-gray-900">{selectedTransaction.bankInfo?.bankName || 'Chưa cập nhật'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Số tài khoản:</label>
                    <p className="text-sm text-gray-900 font-mono">{selectedTransaction.bankInfo?.accountNumber || 'Chưa cập nhật'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Chủ tài khoản:</label>
                    <p className="text-sm text-gray-900">{selectedTransaction.bankInfo?.accountName || selectedTransaction.bankInfo?.accountHolder || 'Chưa cập nhật'}</p>
                  </div>
                </div>
                {(!selectedTransaction.bankInfo?.bankName || !selectedTransaction.bankInfo?.accountNumber) && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      💡 Bạn chưa cập nhật thông tin ngân hàng. Vui lòng cập nhật trong trang cá nhân để sử dụng tính năng rút tiền.
                    </p>
                  </div>
                )}
              </div>

              {selectedTransaction.adminNote && (
                <div className="border-t pt-4">
                  <label className="text-sm font-medium text-gray-700">Ghi chú:</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedTransaction.adminNote}</p>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button onClick={() => setShowBankModal(false)}>
                  Đóng
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 