'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';

interface TradingSession {
  sessionId: string;
  startTime: string;
  endTime: string;
  status: 'ACTIVE' | 'PREDICTED' | 'COMPLETED';
  result?: string;
  actualResult?: string;
  completedAt?: string;
}

export default function AutoTradingPage() {
  const [currentSession, setCurrentSession] = useState<TradingSession | null>(null);
  const [completedSession, setCompletedSession] = useState<TradingSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);

  // Lấy phiên hiện tại
  const fetchCurrentSession = async () => {
    try {
      const response = await fetch('/api/trading-sessions');
      const data = await response.json();
      
      if (data.success && data.currentSession) {
        setCurrentSession(data.currentSession);
      }
    } catch (error) {
      console.error('Lỗi khi lấy phiên hiện tại:', error);
    }
  };

  // Lấy phiên vừa kết thúc
  const fetchCompletedSession = async () => {
    try {
      const response = await fetch('/api/trading-sessions/auto-save-result');
      const data = await response.json();
      
      if (data.success && data.data) {
        setCompletedSession(data.data);
      } else {
        setCompletedSession(null);
      }
    } catch (error) {
      console.error('Lỗi khi lấy phiên vừa kết thúc:', error);
    }
  };

  // Tự động lưu kết quả phiên
  const autoSaveSessionResult = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/trading-sessions/auto-save-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Thành công',
          description: data.message,
        });
        await fetchCompletedSession();
        await fetchCurrentSession();
      } else {
        toast({
          title: 'Lỗi',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Lỗi khi tự động lưu kết quả:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tự động lưu kết quả phiên',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Tạo dự đoán cho phiên tiếp theo
  const createPredictions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/trading-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_predictions',
          sessions: []
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Thành công',
          description: data.message,
        });
        await fetchCurrentSession();
      } else {
        toast({
          title: 'Lỗi',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Lỗi khi tạo dự đoán:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tạo dự đoán',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Bật/tắt tự động lưu
  const toggleAutoSave = () => {
    setAutoSaveEnabled(!autoSaveEnabled);
    if (!autoSaveEnabled) {
      toast({
        title: 'Thông báo',
        description: 'Đã bật chế độ tự động lưu. Hệ thống sẽ tự động lưu kết quả phiên mỗi phút.',
      });
    } else {
      toast({
        title: 'Thông báo',
        description: 'Đã tắt chế độ tự động lưu.',
      });
    }
  };

  // Tự động lưu mỗi phút
  useEffect(() => {
    if (autoSaveEnabled) {
      const interval = setInterval(() => {
        autoSaveSessionResult();
      }, 60000); // 60 giây

      return () => clearInterval(interval);
    }
  }, [autoSaveEnabled]);

  // Cập nhật dữ liệu mỗi 10 giây
  useEffect(() => {
    fetchCurrentSession();
    fetchCompletedSession();

    const interval = setInterval(() => {
      fetchCurrentSession();
      fetchCompletedSession();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-500">Đang hoạt động</Badge>;
      case 'PREDICTED':
        return <Badge className="bg-blue-500">Đã dự đoán</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-gray-500">Đã kết thúc</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Quản lý Hệ thống Tự động</h1>
        <Button
          onClick={toggleAutoSave}
          variant={autoSaveEnabled ? "destructive" : "default"}
        >
          {autoSaveEnabled ? 'Tắt tự động lưu' : 'Bật tự động lưu'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Phiên hiện tại */}
        <Card>
          <CardHeader>
            <CardTitle>Phiên hiện tại</CardTitle>
            <CardDescription>
              Thông tin phiên giao dịch đang diễn ra
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentSession ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium">Session ID:</span>
                  <span className="font-mono">{currentSession.sessionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Trạng thái:</span>
                  {getStatusBadge(currentSession.status)}
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Thời gian bắt đầu:</span>
                  <span>{new Date(currentSession.startTime).toLocaleString('vi-VN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Thời gian kết thúc:</span>
                  <span>{new Date(currentSession.endTime).toLocaleString('vi-VN')}</span>
                </div>
                {currentSession.result && (
                  <div className="flex justify-between">
                    <span className="font-medium">Dự đoán:</span>
                    <Badge variant="outline">{currentSession.result}</Badge>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">Không có phiên nào đang hoạt động</p>
            )}
          </CardContent>
        </Card>

        {/* Phiên vừa kết thúc */}
        <Card>
          <CardHeader>
            <CardTitle>Phiên vừa kết thúc</CardTitle>
            <CardDescription>
              Kết quả phiên giao dịch vừa hoàn thành
            </CardDescription>
          </CardHeader>
          <CardContent>
            {completedSession ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium">Session ID:</span>
                  <span className="font-mono">{completedSession.sessionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Trạng thái:</span>
                  {getStatusBadge(completedSession.status)}
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Kết quả thực tế:</span>
                  <Badge variant="outline" className={completedSession.actualResult === 'UP' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {completedSession.actualResult}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Thời gian hoàn thành:</span>
                  <span>{new Date(completedSession.completedAt!).toLocaleString('vi-VN')}</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Chưa có phiên nào kết thúc</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Các nút điều khiển */}
      <Card>
        <CardHeader>
          <CardTitle>Điều khiển hệ thống</CardTitle>
          <CardDescription>
            Các chức năng quản lý hệ thống giao dịch tự động
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              onClick={createPredictions}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Đang tạo...' : 'Tạo dự đoán cho 30 phiên tiếp theo'}
            </Button>
            
            <Button
              onClick={autoSaveSessionResult}
              disabled={loading}
              variant="outline"
            >
              {loading ? 'Đang lưu...' : 'Lưu kết quả phiên vừa kết thúc'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Thông tin hệ thống */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin hệ thống</CardTitle>
          <CardDescription>
            Cấu hình và trạng thái hệ thống
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="font-medium">Chế độ tự động lưu:</span>
              <Badge variant={autoSaveEnabled ? "default" : "secondary"}>
                {autoSaveEnabled ? 'Đang bật' : 'Đang tắt'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Collection trading_sessions:</span>
              <Badge variant="outline">Chỉ lưu 1 dòng duy nhất</Badge>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Tần suất cập nhật:</span>
              <span>10 giây/lần</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Tần suất tự động lưu:</span>
              <span>{autoSaveEnabled ? '60 giây/lần' : 'Không hoạt động'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 