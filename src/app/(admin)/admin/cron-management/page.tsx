"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Square, RefreshCw, Clock, CheckCircle, AlertCircle, Settings } from 'lucide-react';

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  lastRun: string | null;
  nextRun: string | null;
  status: 'running' | 'stopped' | 'error';
  totalRuns: number;
  successRuns: number;
  errorRuns: number;
}

interface CronResult {
  success: boolean;
  message: string;
  timestamp: string;
  results: {
    processedSessions: any[];
    totalProcessed: number;
    errors: string[];
  };
}

export default function CronManagementPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [lastResult, setLastResult] = useState<CronResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Mock data cho Cron jobs
  const mockCronJobs: CronJob[] = [
    {
      id: 'session-processor',
      name: 'Session Processor',
      schedule: '*/30 * * * * *',
      lastRun: null,
      nextRun: null,
      status: 'stopped',
      totalRuns: 0,
      successRuns: 0,
      errorRuns: 0
    }
  ];

  useEffect(() => {
    setCronJobs(mockCronJobs);
  }, []);

  const runCronJob = async () => {
    setIsLoading(true);
    setIsRunning(true);
    try {
      const response = await fetch('/api/cron/process-sessions');
      const data = await response.json();
      
      setLastResult(data);
      
      // Cập nhật trạng thái Cron job
      setCronJobs(prev => prev.map(job => ({
        ...job,
        lastRun: new Date().toISOString(),
        status: data.success ? 'running' : 'error',
        totalRuns: job.totalRuns + 1,
        successRuns: data.success ? job.successRuns + 1 : job.successRuns,
        errorRuns: data.success ? job.errorRuns : job.errorRuns + 1
      })));
      
    } catch (error) {
      console.error('Lỗi khi chạy Cron job:', error);
      setLastResult({
        success: false,
        message: 'Lỗi khi chạy Cron job',
        timestamp: new Date().toISOString(),
        results: {
          processedSessions: [],
          totalProcessed: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error']
        }
      });
    } finally {
      setIsLoading(false);
      setIsRunning(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-green-500">Running</Badge>;
      case 'stopped':
        return <Badge className="bg-gray-500">Stopped</Badge>;
      case 'error':
        return <Badge className="bg-red-500">Error</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };

  const formatSchedule = (schedule: string) => {
    // Chuyển đổi cron expression thành mô tả dễ hiểu
    if (schedule === '*/30 * * * * *') {
      return 'Mỗi 30 giây';
    }
    return schedule;
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">⏰ Quản lý Cron Jobs</h1>
          <div className="flex gap-2">
            <Button
              onClick={runCronJob}
              disabled={isLoading || isRunning}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Chạy Cron Job
            </Button>
            <Button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Cron Jobs */}
        <Card className="mb-6 bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">🔄 Cron Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {cronJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div>
                      <h3 className="text-white font-semibold">{job.name}</h3>
                      <p className="text-gray-400 text-sm">ID: {job.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-300">{formatSchedule(job.schedule)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-white font-semibold">{job.totalRuns}</div>
                      <div className="text-gray-400 text-sm">Tổng chạy</div>
                    </div>
                    <div className="text-center">
                      <div className="text-green-400 font-semibold">{job.successRuns}</div>
                      <div className="text-gray-400 text-sm">Thành công</div>
                    </div>
                    <div className="text-center">
                      <div className="text-red-400 font-semibold">{job.errorRuns}</div>
                      <div className="text-gray-400 text-sm">Lỗi</div>
                    </div>
                    <div>
                      {getStatusBadge(job.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Kết quả chạy gần nhất */}
        {lastResult && (
          <Card className="mb-6 bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">📊 Kết quả chạy gần nhất</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${lastResult.success ? 'text-green-400' : 'text-red-400'}`}>
                    {lastResult.success ? '✅' : '❌'}
                  </div>
                  <div className="text-gray-400 text-sm">Trạng thái</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {lastResult.results.totalProcessed}
                  </div>
                  <div className="text-gray-400 text-sm">Phiên đã xử lý</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-400">
                    {lastResult.results.errors.length}
                  </div>
                  <div className="text-gray-400 text-sm">Lỗi</div>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="text-gray-400 text-sm mb-2">Thông báo:</div>
                <div className="text-white">{lastResult.message}</div>
              </div>
              
              <div className="mb-4">
                <div className="text-gray-400 text-sm mb-2">Thời gian:</div>
                <div className="text-white">{new Date(lastResult.timestamp).toLocaleString('vi-VN')}</div>
              </div>

              {/* Chi tiết phiên đã xử lý */}
              {lastResult.results.processedSessions.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-white font-semibold mb-2">Chi tiết phiên đã xử lý:</h4>
                  <div className="space-y-2">
                    {lastResult.results.processedSessions.map((session, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-sm">{session.sessionId}</span>
                          <Badge className="bg-blue-500">{session.action}</Badge>
                        </div>
                        <div className="text-gray-300 text-sm">
                          {session.oldStatus && `${session.oldStatus} → ${session.newStatus}`}
                          {session.result && ` (${session.result})`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lỗi nếu có */}
              {lastResult.results.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-red-400 font-semibold mb-2">Lỗi:</h4>
                  <div className="space-y-1">
                    {lastResult.results.errors.map((error, index) => (
                      <div key={index} className="text-red-300 text-sm bg-red-900/20 p-2 rounded">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Hướng dẫn */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">📖 Hướng dẫn sử dụng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-gray-300">
              <div>
                <h4 className="text-white font-semibold mb-2">Cách sử dụng Cron Job:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Nhấn "Chạy Cron Job" để xử lý thủ công các phiên đã kết thúc</li>
                  <li>Cron job sẽ tự động chuyển phiên ACTIVE → PREDICTED → COMPLETED</li>
                  <li>Cập nhật kết quả lệnh và số dư người dùng</li>
                  <li>Tạo phiên mới nếu cần thiết</li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-white font-semibold mb-2">Để chạy Cron tự động:</h4>
                <div className="bg-gray-700 p-3 rounded text-sm font-mono">
                  npm run cron
                </div>
                <p className="text-sm mt-2">Hoặc sử dụng external cron service như Vercel Cron Jobs</p>
              </div>
              
              <div>
                <h4 className="text-white font-semibold mb-2">Lịch trình mặc định:</h4>
                <div className="bg-gray-700 p-3 rounded text-sm font-mono">
                  */30 * * * * * (Mỗi 30 giây)
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 