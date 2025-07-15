'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast, useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/useAuth';
import { useRouter } from 'next/navigation';
import { Clock, TrendingUp, TrendingDown, CheckCircle, XCircle, AlertCircle, Settings, RefreshCw, Zap, AlertTriangle } from 'lucide-react';

interface SessionResult {
  _id: string;
  sessionId: string;
  startTime: string;
  endTime: string;
  status: 'ACTIVE' | 'PREDICTED' | 'COMPLETED';
  result?: 'UP' | 'DOWN';
  actualResult?: 'UP' | 'DOWN';
  createdBy?: 'admin' | 'system';
  totalTrades?: number;
  totalWins?: number;
  totalLosses?: number;
  totalWinAmount?: number;
  totalLossAmount?: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function SessionResultsPage() {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  // States
  const [sessions, setSessions] = useState<SessionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionResult | null>(null);
  const [showSetResultDialog, setShowSetResultDialog] = useState(false);
  const [selectedResult, setSelectedResult] = useState<'UP' | 'DOWN'>('UP');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);
  const [searchSessionId, setSearchSessionId] = useState('');
  const [searchStatus, setSearchStatus] = useState('all');
  const [searchDateFrom, setSearchDateFrom] = useState('');
  const [searchDateTo, setSearchDateTo] = useState('');

  // Check authentication and admin access
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated()) {
        toast({
          title: 'Lỗi',
          description: 'Vui lòng đăng nhập để truy cập trang quản trị',
          variant: 'destructive',
        });
        router.push('/login');
        return;
      }

      if (!isAdmin()) {
        toast({
          title: 'Lỗi',
          description: 'Bạn không có quyền truy cập trang này',
          variant: 'destructive',
        });
        router.push('/');
        return;
      }
    }
  }, [isLoading, isAuthenticated, isAdmin, router, toast]);

  // Load sessions
  useEffect(() => {
    if (isAuthenticated() && isAdmin()) {
      loadSessions();
    }
  }, [currentPage, searchSessionId, searchStatus, searchDateFrom, searchDateTo]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', '10');
      if (searchSessionId) params.append('sessionId', searchSessionId);
      if (searchStatus && searchStatus !== 'all') params.append('status', searchStatus);
      if (searchDateFrom) params.append('startDate', searchDateFrom);
      if (searchDateTo) params.append('endDate', searchDateTo);

      const response = await fetch(`/api/admin/session-results?${params.toString()}`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSessions(data.data.sessions);
          setTotalPages(data.data.pagination.totalPages);
          setTotalSessions(data.data.pagination.total);
        } else {
          setSessions([]);
          setTotalPages(1);
          setTotalSessions(0);
        }
      } else {
        setSessions([]);
        setTotalPages(1);
        setTotalSessions(0);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      setSessions([]);
      setTotalPages(1);
      setTotalSessions(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSetResult = async () => {
    if (!selectedSession || !selectedResult) return;

    try {
      const response = await fetch('/api/admin/session-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'set_result',
          sessionId: selectedSession.sessionId,
          result: selectedResult
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Thành công',
          description: data.message,
        });
        setShowSetResultDialog(false);
        loadSessions();
      } else {
        toast({
          title: 'Lỗi',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error setting result:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể cập nhật kết quả',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateRandom = async (sessionId: string) => {
    try {
      const response = await fetch('/api/admin/session-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'generate_random',
          sessionId: sessionId
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Thành công',
          description: data.message,
        });
        loadSessions();
      } else {
        toast({
          title: 'Lỗi',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error generating random result:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tạo kết quả ngẫu nhiên',
        variant: 'destructive',
      });
    }
  };

  const handleBulkGenerate = async () => {
    const activeSessions = sessions.filter(s => s.status === 'ACTIVE');
    if (activeSessions.length === 0) {
      toast({
        title: 'Thông báo',
        description: 'Không có phiên nào cần tạo kết quả',
      });
      return;
    }

    // Hiển thị thông báo xác nhận
    if (!confirm(`Bạn có chắc muốn random kết quả cho ${activeSessions.length} phiên giao dịch?`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/session-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'bulk_generate',
          sessionIds: activeSessions.map(s => s.sessionId)
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Thành công',
          description: `Đã random kết quả cho ${data.data.results.length} phiên giao dịch`,
        });
        loadSessions();
      } else {
        toast({
          title: 'Lỗi',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error bulk generating results:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tạo kết quả hàng loạt',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Đang hoạt động</Badge>;
      case 'PREDICTED':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Settings className="w-3 h-3 mr-1" />Đã dự đoán</Badge>;
      case 'COMPLETED':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Đã hoàn thành</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getResultBadge = (result?: string) => {
    if (!result) return <Badge variant="outline">Chưa có</Badge>;
    return result === 'UP' ? 
      <Badge className="bg-green-500 text-white"><TrendingUp className="w-3 h-3 mr-1" />LÊN</Badge> :
      <Badge className="bg-red-500 text-white"><TrendingDown className="w-3 h-3 mr-1" />XUỐNG</Badge>;
  };

  const getCreatedByBadge = (createdBy?: string) => {
    if (!createdBy) return <Badge variant="outline">Hệ thống</Badge>;
    return createdBy === 'admin' ? 
      <Badge className="bg-purple-500 text-white">Admin</Badge> :
      <Badge className="bg-gray-500 text-white">Hệ thống</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý kết quả phiên giao dịch</h1>
          <p className="text-gray-600 mt-2">Quản lý và thiết lập kết quả cho các phiên giao dịch</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleBulkGenerate} className="bg-blue-600 hover:bg-blue-700">
            <Zap className="w-4 h-4 mr-2" />
            Random kết quả hàng loạt
          </Button>
          <Button 
            onClick={() => router.push('/admin/session-results/future')}
            className="bg-green-600 hover:bg-green-700"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            30 phiên tương lai (100%)
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tìm kiếm và lọc</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Mã phiên:</label>
              <input
                type="text"
                placeholder="Nhập mã phiên..."
                value={searchSessionId}
                onChange={(e) => setSearchSessionId(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Trạng thái:</label>
              <Select value={searchStatus} onValueChange={setSearchStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Tất cả trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="ACTIVE">Đang hoạt động</SelectItem>
                  <SelectItem value="PREDICTED">Đã dự đoán</SelectItem>
                  <SelectItem value="COMPLETED">Đã hoàn thành</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Từ ngày:</label>
              <input
                type="date"
                value={searchDateFrom}
                onChange={(e) => setSearchDateFrom(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Đến ngày:</label>
              <input
                type="date"
                value={searchDateTo}
                onChange={(e) => setSearchDateTo(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-600">
              Tìm thấy {totalSessions} phiên giao dịch
            </div>
            <div className="text-sm text-gray-600">
              Trang {currentPage} / {totalPages}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Danh sách phiên giao dịch</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã phiên</TableHead>
                  <TableHead>Thời gian bắt đầu</TableHead>
                  <TableHead>Thời gian kết thúc</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Kết quả dự đoán</TableHead>
                  <TableHead>Kết quả thực tế</TableHead>
                  <TableHead>Người tạo</TableHead>
                  <TableHead>Thống kê</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session._id}>
                    <TableCell className="font-mono text-sm">{session.sessionId}</TableCell>
                    <TableCell>{new Date(session.startTime).toLocaleString('vi-VN')}</TableCell>
                    <TableCell>{new Date(session.endTime).toLocaleString('vi-VN')}</TableCell>
                    <TableCell>{getStatusBadge(session.status)}</TableCell>
                    <TableCell>{getResultBadge(session.result)}</TableCell>
                    <TableCell>{getResultBadge(session.actualResult)}</TableCell>
                    <TableCell>{getCreatedByBadge(session.createdBy)}</TableCell>
                    <TableCell>
                      <div className="text-xs space-y-1">
                        <div>Tổng lệnh: {session.totalTrades || 0}</div>
                        <div>Thắng: {session.totalWins || 0}</div>
                        <div>Thua: {session.totalLosses || 0}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {session.status === 'ACTIVE' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedSession(session);
                                setShowSetResultDialog(true);
                              }}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Settings className="w-3 h-3 mr-1" />
                              Đặt kết quả
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleGenerateRandom(session.sessionId)}
                            >
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Random
                            </Button>
                          </>
                        )}
                        {session.status === 'PREDICTED' && (
                          <Badge variant="outline" className="text-xs">
                            Đã có kết quả
                          </Badge>
                        )}
                        {session.status === 'COMPLETED' && (
                          <Badge variant="outline" className="text-xs">
                            Đã hoàn thành
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex justify-center">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Trước
                </Button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  if (pageNum > totalPages) return null;
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === currentPage ? "default" : "outline"}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Set Result Dialog */}
      <Dialog open={showSetResultDialog} onOpenChange={setShowSetResultDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đặt kết quả cho phiên {selectedSession?.sessionId}</DialogTitle>
            <DialogDescription>
              Chọn kết quả cho phiên giao dịch này. Kết quả này sẽ được sử dụng khi phiên kết thúc.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Kết quả:</label>
              <Select value={selectedResult} onValueChange={(value: 'UP' | 'DOWN') => setSelectedResult(value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UP">LÊN (UP)</SelectItem>
                  <SelectItem value="DOWN">XUỐNG (DOWN)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSetResultDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleSetResult}>
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Future Sessions Link */}
      <Card className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <AlertTriangle className="h-5 w-5" />
            Quản lý 30 phiên giao dịch tương lai
          </CardTitle>
          <CardDescription className="text-green-700">
            Đặt kết quả chính xác 100% cho 30 phiên giao dịch sắp tới
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-green-700">
              • <strong>Độ chính xác 100%:</strong> Kết quả bạn đặt sẽ được sử dụng chính xác khi phiên kết thúc
            </p>
            <p className="text-sm text-green-700">
              • <strong>30 phiên tương lai:</strong> Hệ thống tự động tạo 30 phiên giao dịch sắp tới
            </p>
            <p className="text-sm text-green-700">
              • <strong>Quản lý hàng loạt:</strong> Có thể đặt kết quả cho nhiều phiên cùng lúc
            </p>
            <Button 
              onClick={() => window.open('/admin/session-results/future', '_blank')}
              className="bg-green-600 hover:bg-green-700 w-full"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Mở trang quản lý 30 phiên tương lai
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 