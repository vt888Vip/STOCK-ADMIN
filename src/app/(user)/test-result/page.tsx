"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Play, CheckCircle } from 'lucide-react';

interface TestData {
  timestamp: string;
  stats: {
    totalSessions: number;
    totalTrades: number;
    totalUsers: number;
    pendingTrades: number;
    completedTrades: number;
    activeSessions: number;
    predictedSessions: number;
    completedSessions: number;
  };
  results: {
    sessions: any[];
    trades: any[];
    users: any[];
  };
}

export default function TestResultPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [testData, setTestData] = useState<TestData | null>(null);
  const [processingResult, setProcessingResult] = useState<any>(null);

  const fetchTestData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/test-session-result');
      if (response.ok) {
        const data = await response.json();
        setTestData(data);
      }
    } catch (error) {
      console.error('Lỗi khi fetch test data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const processSession = async (sessionId?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/test-session-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'process_session',
          sessionId: sessionId || '202507130933'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setProcessingResult(data);
        // Refresh data
        await fetchTestData();
      }
    } catch (error) {
      console.error('Lỗi khi process session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTestData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-500">ACTIVE</Badge>;
      case 'PREDICTED':
        return <Badge className="bg-yellow-500">PREDICTED</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-blue-500">COMPLETED</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">PENDING</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500">COMPLETED</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };

  const getResultBadge = (result: string | null) => {
    if (!result) return <Badge className="bg-gray-500">N/A</Badge>;
    switch (result) {
      case 'UP':
        return <Badge className="bg-green-500">UP</Badge>;
      case 'DOWN':
        return <Badge className="bg-red-500">DOWN</Badge>;
      case 'win':
        return <Badge className="bg-green-500">WIN</Badge>;
      case 'lose':
        return <Badge className="bg-red-500">LOSE</Badge>;
      default:
        return <Badge className="bg-gray-500">{result}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">🧪 Test Session Result</h1>
          <div className="flex gap-2">
            <Button
              onClick={fetchTestData}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
            <Button
              onClick={() => processSession()}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Process Session
            </Button>
          </div>
        </div>

        {processingResult && (
          <Card className="mb-6 bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-800">✅ Processing Result</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-green-700">
                <p><strong>Message:</strong> {processingResult.message}</p>
                {processingResult.data && (
                  <>
                    <p><strong>Session ID:</strong> {processingResult.data.sessionId}</p>
                    <p><strong>Result:</strong> {processingResult.data.result}</p>
                    <p><strong>Trades Processed:</strong> {processingResult.data.tradesProcessed}</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {testData && (
          <>
            {/* Thống kê */}
            <Card className="mb-6 bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">📊 Thống kê</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{testData.stats.totalSessions}</div>
                    <div className="text-gray-400 text-sm">Tổng phiên</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{testData.stats.totalTrades}</div>
                    <div className="text-gray-400 text-sm">Tổng lệnh</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">{testData.stats.pendingTrades}</div>
                    <div className="text-gray-400 text-sm">Lệnh pending</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">{testData.stats.completedTrades}</div>
                    <div className="text-gray-400 text-sm">Lệnh completed</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-400">{testData.stats.activeSessions}</div>
                    <div className="text-gray-400 text-sm">ACTIVE</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-yellow-400">{testData.stats.predictedSessions}</div>
                    <div className="text-gray-400 text-sm">PREDICTED</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-400">{testData.stats.completedSessions}</div>
                    <div className="text-gray-400 text-sm">COMPLETED</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Phiên gần đây */}
            {testData.results.sessions.length > 0 && (
              <Card className="mb-6 bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">🕐 Phiên gần đây</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {testData.results.sessions.map((session, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-sm">{session.sessionId}</span>
                          {getStatusBadge(session.status)}
                          {getResultBadge(session.result)}
                        </div>
                        <div className="text-gray-300 text-sm">
                          {session.timeLeft > 0 ? `${session.timeLeft}s` : 'Đã kết thúc'}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lệnh gần đây */}
            {testData.results.trades.length > 0 && (
              <Card className="mb-6 bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">📈 Lệnh gần đây</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {testData.results.trades.map((trade, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-sm">{trade.sessionId}</span>
                          <span className="text-white">{trade.direction}</span>
                          <span className="text-blue-400">{trade.amount?.toLocaleString()}</span>
                          {getStatusBadge(trade.status)}
                          {getResultBadge(trade.result)}
                        </div>
                        <div className="text-gray-300 text-sm">
                          {trade.profit ? (trade.profit >= 0 ? '+' : '') + trade.profit.toLocaleString() : 'N/A'}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Users */}
            {testData.results.users.length > 0 && (
              <Card className="mb-6 bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">👥 Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {testData.results.users.map((user, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                        <div className="flex items-center gap-2">
                          <span className="text-white">{user.username}</span>
                          <Badge className="bg-gray-500">{user.balanceType}</Badge>
                        </div>
                        <div className="text-green-400 font-semibold">
                          {user.balance?.toLocaleString() || 'N/A'}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-white">Đang tải dữ liệu...</span>
          </div>
        )}
      </div>
    </div>
  );
} 