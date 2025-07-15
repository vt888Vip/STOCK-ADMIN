'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast, useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/useAuth';
import { useRouter } from 'next/navigation';
import { Clock, TrendingUp, TrendingDown, CheckCircle, Settings, RefreshCw, Zap, Target, Calendar, AlertTriangle } from 'lucide-react';

interface FutureSession {
  _id: string;
  sessionId: string;
  startTime: string;
  endTime: string;
  status: 'ACTIVE' | 'PREDICTED';
  result?: 'UP' | 'DOWN';
  createdBy?: 'admin' | 'system';
  createdAt: string;
  updatedAt: string;
}

export default function FutureSessionsPage() {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  // States
  const [sessions, setSessions] = useState<FutureSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<FutureSession | null>(null);
  const [showSetResultDialog, setShowSetResultDialog] = useState(false);
  const [selectedResult, setSelectedResult] = useState<'UP' | 'DOWN'>('UP');
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkResults, setBulkResults] = useState<('UP' | 'DOWN')[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);

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

  // Load future sessions
  useEffect(() => {
    if (isAuthenticated() && isAdmin()) {
      loadFutureSessions();
    }
  }, [currentPage]);

  const loadFutureSessions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', '30');

      const response = await fetch(`/api/admin/session-results/future?${params.toString()}`, {
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
      console.error('Error loading future sessions:', error);
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
      const response = await fetch('/api/admin/session-results/future', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'set_future_result',
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
        loadFutureSessions();
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

  const handleBulkSetResults = async () => {
    if (bulkResults.length === 0) return;

    try {
      const sessionIds = sessions.map(s => s.sessionId);
      const response = await fetch('/api/admin/session-results/future', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'bulk_set_future_results',
          sessionIds: sessionIds,
          results: bulkResults
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Thành công',
          description: data.message,
        });
        setShowBulkDialog(false);
        setBulkResults([]);
        loadFutureSessions();
      } else {
        toast({
          title: 'Lỗi',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error bulk setting results:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể cập nhật kết quả hàng loạt',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateFutureSessions = async () => {
    try {
      const response = await fetch('/api/admin/session-results/future', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'generate_future_sessions'
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Thành công',
          description: data.message,
        });
        loadFutureSessions();
      } else {
        toast({
          title: 'Lỗi',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error generating future sessions:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tạo phiên tương lai',
        variant: 'destructive',
      });
    }
  };

  const handleBulkRandomResults = async () => {
    const activeSessions = sessions.filter(s => s.status === 'ACTIVE');
    if (activeSessions.length === 0) {
      toast({
        title: 'Thông báo',
        description: 'Không có phiên nào cần random kết quả',
      });
      return;
    }

    // Hiển thị thông báo xác nhận
    if (!confirm(`Bạn có chắc muốn random kết quả cho ${activeSessions.length} phiên giao dịch tương lai?`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/session-results/future', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'bulk_random_results',
          sessionIds: activeSessions.map(s => s.sessionId)
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Thành công',
          description: `Đã random kết quả cho ${data.data.results.length} phiên giao dịch tương lai`,
        });
        loadFutureSessions();
      } else {
        toast({
          title: 'Lỗi',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error bulk random results:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể random kết quả hàng loạt',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Chưa có kết quả</Badge>;
      case 'PREDICTED':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Đã đặt kết quả</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getResultBadge = (result?: string) => {
    if (!result) return <Badge variant="outline">Chưa đặt</Badge>;
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

  const getTimeUntilStart = (startTime: string) => {
    const now = new Date();
    const start = new Date(startTime);
    const diff = start.getTime() - now.getTime();
    
    if (diff <= 0) return 'Đã bắt đầu';
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} ngày ${hours % 24} giờ`;
    if (hours > 0) return `${hours} giờ ${minutes % 60} phút`;
    return `${minutes} phút`;
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
          <h1 className="text-3xl font-bold text-gray-900">Quản lý 30 phiên giao dịch tương lai</h1>
          <p className="text-gray-600 mt-2">Đặt kết quả chính xác 100% cho 30 phiên giao dịch sắp tới</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleGenerateFutureSessions} className="bg-blue-600 hover:bg-blue-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            Tạo lại 30 phiên
          </Button>
          <Button onClick={handleBulkRandomResults} className="bg-orange-600 hover:bg-orange-700">
            <Zap className="w-4 h-4 mr-2" />
            Random kết quả hàng loạt
          </Button>
          <Button onClick={() => setShowBulkDialog(true)} className="bg-green-600 hover:bg-green-700">
            <Settings className="w-4 h-4 mr-2" />
            Đặt kết quả thủ công
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-blue-600" />
            Thông tin quan trọng
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>• <strong>Độ chính xác 100%:</strong> Kết quả bạn đặt sẽ được sử dụng chính xác khi phiên kết thúc</p>
            <p>• <strong>30 phiên tương lai:</strong> Hệ thống tự động tạo 30 phiên giao dịch sắp tới</p>
            <p>• <strong>Thời gian thực:</strong> Hiển thị thời gian còn lại đến khi phiên bắt đầu</p>
            <p>• <strong>Quản lý hàng loạt:</strong> Có thể đặt kết quả cho nhiều phiên cùng lúc</p>
          </div>
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Danh sách 30 phiên giao dịch tương lai</CardTitle>
          <CardDescription>
            Tổng cộng {totalSessions} phiên giao dịch sắp tới
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã phiên</TableHead>
                  <TableHead>Thời gian bắt đầu</TableHead>
                  <TableHead>Thời gian kết thúc</TableHead>
                  <TableHead>Còn lại</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Kết quả đã đặt</TableHead>
                  <TableHead>Người đặt</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session._id}>
                    <TableCell className="font-mono text-sm">{session.sessionId}</TableCell>
                    <TableCell>{new Date(session.startTime).toLocaleString('vi-VN')}</TableCell>
                    <TableCell>{new Date(session.endTime).toLocaleString('vi-VN')}</TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-blue-600">
                        {getTimeUntilStart(session.startTime)}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(session.status)}</TableCell>
                    <TableCell>{getResultBadge(session.result)}</TableCell>
                    <TableCell>{getCreatedByBadge(session.createdBy)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {session.status === 'ACTIVE' && (
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
                        )}
                        {session.status === 'PREDICTED' && (
                          <Badge variant="outline" className="text-xs">
                            Đã có kết quả
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
              Kết quả này sẽ được sử dụng chính xác 100% khi phiên kết thúc.
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

      {/* Bulk Set Results Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Đặt kết quả hàng loạt cho {sessions.length} phiên</DialogTitle>
            <DialogDescription>
              Chọn kết quả cho từng phiên. Kết quả sẽ được sử dụng chính xác 100%.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map((session, index) => (
                <div key={session._id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-mono text-sm">{session.sessionId}</span>
                    <span className="text-xs text-gray-500">
                      {getTimeUntilStart(session.startTime)}
                    </span>
                  </div>
                  <Select 
                    value={bulkResults[index] || ''} 
                    onValueChange={(value: 'UP' | 'DOWN') => {
                      const newResults = [...bulkResults];
                      newResults[index] = value;
                      setBulkResults(newResults);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn kết quả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UP">LÊN (UP)</SelectItem>
                      <SelectItem value="DOWN">XUỐNG (DOWN)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowBulkDialog(false);
              setBulkResults([]);
            }}>
              Hủy
            </Button>
            <Button onClick={handleBulkSetResults}>
              Đặt kết quả hàng loạt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 