"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Play, Square, CheckCircle, AlertCircle } from 'lucide-react';

interface SessionData {
  sessionId: string;
  status: 'ACTIVE' | 'PREDICTED' | 'COMPLETED';
  result: string | null;
  startTime: string;
  endTime: string;
  timeLeft: number;
}

interface TradeData {
  id: string;
  sessionId: string;
  userId: string;
  direction: string;
  amount: number;
  status: string;
  result: string | null;
  profit: number;
  createdAt: string;
}

interface UserData {
  id: string;
  username: string;
  email: string;
  balance: number;
  balanceType: string;
}

interface CompleteFlowData {
  timestamp: string;
  sessionId: string;
  statistics: {
    totalSessions: number;
    totalTrades: number;
    totalUsers: number;
    pendingTrades: number;
    completedTrades: number;
  };
  sessionLogic: {
    currentSessionExists: boolean;
    currentSessionStatus: string;
    currentSessionResult: string;
    sessionEnded: boolean;
    shouldCreateNewSession: boolean;
  };
  tradeLogic: {
    pendingTradesCount: number;
    completedTradesCount: number;
    pendingTradesBySession: any;
    completedTradesBySession: any;
  };
  balanceLogic: {
    usersWithBalance: UserData[];
  };
  currentSession: SessionData | null;
  samplePendingTrades: TradeData[];
  sampleCompletedTrades: TradeData[];
  sampleUsers: UserData[];
}

export default function DebugSessionPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [completeFlowData, setCompleteFlowData] = useState<CompleteFlowData | null>(null);
  const [fixExpiredData, setFixExpiredData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCompleteFlow = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/test-complete-flow');
      if (response.ok) {
        const data = await response.json();
        setCompleteFlowData(data);
      } else {
        throw new Error('Lỗi khi lấy dữ liệu');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Lỗi không xác định');
    } finally {
      setIsLoading(false);
    }
  };

  const fixExpiredSessions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/trading-sessions/fix-expired');
      if (response.ok) {
        const data = await response.json();
        setFixExpiredData(data);
        // Refresh complete flow data
        await fetchCompleteFlow();
      } else {
        throw new Error('Lỗi khi sửa phiên đã kết thúc');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Lỗi không xác định');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-500">ACTIVE</Badge>;
      case 'PREDICTED':
        return <Badge className="bg-yellow-500">PREDICTED</Badge>;
      case 'COMPLETED':
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
      default:
        return <Badge className="bg-gray-500">{result}</Badge>;
    }
  };

  const getTradeStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500">PENDING</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500">COMPLETED</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };

  const getTradeResultBadge = (result: string | null) => {
    if (!result) return <Badge className="bg-gray-500">N/A</Badge>;
    switch (result) {
      case 'win':
        return <Badge className="bg-green-500">WIN</Badge>;
      case 'lose':
        return <Badge className="bg-red-500">LOSE</Badge>;
      default:
        return <Badge className="bg-gray-500">{result}</Badge>;
    }
  };

  useEffect(() => {
    fetchCompleteFlow();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">🔧 Debug Session & Trading Flow</h1>
          <div className="flex gap-2">
            <Button
              onClick={fetchCompleteFlow}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
            <Button
              onClick={fixExpiredSessions}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Fix Expired Sessions
            </Button>
          </div>
        </div>

        {error && (
          <Card className="mb-6 bg-red-50 border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {fixExpiredData && (
          <Card className="mb-6 bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-800">✅ Fix Expired Sessions Result</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-green-700">
                <p><strong>Message:</strong> {fixExpiredData.message}</p>
                <p><strong>Total Fixed:</strong> {fixExpiredData.results?.totalFixed || 0}</p>
                <p><strong>Timestamp:</strong> {fixExpiredData.timestamp}</p>
                {fixExpiredData.results?.errors?.length > 0 && (
                  <div className="mt-2">
                    <p><strong>Errors:</strong></p>
                    <ul className="list-disc list-inside">
                      {fixExpiredData.results.errors.map((error: string, index: number) => (
                        <li key={index} className="text-red-600">{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {completeFlowData && (
          <>
            {/* Thống kê tổng quan */}
            <Card className="mb-6 bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">📊 Thống kê tổng quan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{completeFlowData.statistics.totalSessions}</div>
                    <div className="text-gray-400 text-sm">Tổng phiên</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{completeFlowData.statistics.totalTrades}</div>
                    <div className="text-gray-400 text-sm">Tổng lệnh</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">{completeFlowData.statistics.totalUsers}</div>
                    <div className="text-gray-400 text-sm">Tổng user</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-400">{completeFlowData.statistics.pendingTrades}</div>
                    <div className="text-gray-400 text-sm">Lệnh pending</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">{completeFlowData.statistics.completedTrades}</div>
                    <div className="text-gray-400 text-sm">Lệnh completed</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Logic phiên */}
            <Card className="mb-6 bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">🔄 Logic phiên</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-gray-400 text-sm">Phiên hiện tại tồn tại</div>
                    <div className="text-white font-semibold">
                      {completeFlowData.sessionLogic.currentSessionExists ? '✅ Có' : '❌ Không'}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">Trạng thái phiên</div>
                    <div className="text-white font-semibold">
                      {getStatusBadge(completeFlowData.sessionLogic.currentSessionStatus)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">Kết quả phiên</div>
                    <div className="text-white font-semibold">
                      {getResultBadge(completeFlowData.sessionLogic.currentSessionResult)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">Phiên đã kết thúc</div>
                    <div className="text-white font-semibold">
                      {completeFlowData.sessionLogic.sessionEnded ? '✅ Có' : '❌ Không'}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">Cần tạo phiên mới</div>
                    <div className="text-white font-semibold">
                      {completeFlowData.sessionLogic.shouldCreateNewSession ? '✅ Có' : '❌ Không'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Logic lệnh */}
            <Card className="mb-6 bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">📈 Logic lệnh</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-gray-400 text-sm">Lệnh pending</div>
                    <div className="text-2xl font-bold text-yellow-400">{completeFlowData.tradeLogic.pendingTradesCount}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">Lệnh completed</div>
                    <div className="text-2xl font-bold text-blue-400">{completeFlowData.tradeLogic.completedTradesCount}</div>
                  </div>
                </div>
                
                {/* Lệnh pending theo phiên */}
                {Object.keys(completeFlowData.tradeLogic.pendingTradesBySession).length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-white font-semibold mb-2">Lệnh pending theo phiên:</h4>
                    {Object.entries(completeFlowData.tradeLogic.pendingTradesBySession).map(([sessionId, trades]: [string, any]) => (
                      <div key={sessionId} className="mb-2 p-2 bg-gray-700 rounded">
                        <div className="text-yellow-400 font-semibold">Phiên {sessionId}: {trades.length} lệnh</div>
                        <div className="text-gray-300 text-sm">
                          {trades.map((trade: any, index: number) => (
                            <span key={index} className="mr-2">
                              {trade.direction} - {trade.amount.toLocaleString()}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Phiên hiện tại */}
            {completeFlowData.currentSession && (
              <Card className="mb-6 bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">🎯 Phiên hiện tại</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-gray-400 text-sm">Session ID</div>
                      <div className="text-white font-mono">{completeFlowData.currentSession.sessionId}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm">Trạng thái</div>
                      <div>{getStatusBadge(completeFlowData.currentSession.status)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm">Kết quả</div>
                      <div>{getResultBadge(completeFlowData.currentSession.result)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm">Thời gian còn lại</div>
                      <div className="text-white font-semibold">{completeFlowData.currentSession.timeLeft}s</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Mẫu lệnh pending */}
            {completeFlowData.samplePendingTrades.length > 0 && (
              <Card className="mb-6 bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">⏳ Mẫu lệnh pending</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {completeFlowData.samplePendingTrades.map((trade) => (
                      <div key={trade.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-sm">{trade.sessionId}</span>
                          <span className="text-white">{trade.direction}</span>
                          <span className="text-yellow-400">{trade.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getTradeStatusBadge(trade.status)}
                          {getTradeResultBadge(trade.result)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Mẫu lệnh completed */}
            {completeFlowData.sampleCompletedTrades.length > 0 && (
              <Card className="mb-6 bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">✅ Mẫu lệnh completed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {completeFlowData.sampleCompletedTrades.map((trade) => (
                      <div key={trade.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-sm">{trade.sessionId}</span>
                          <span className="text-white">{trade.direction}</span>
                          <span className="text-blue-400">{trade.amount.toLocaleString()}</span>
                          <span className={`font-semibold ${trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {trade.profit >= 0 ? '+' : ''}{trade.profit.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getTradeStatusBadge(trade.status)}
                          {getTradeResultBadge(trade.result)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Mẫu users */}
            {completeFlowData.sampleUsers.length > 0 && (
              <Card className="mb-6 bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">👥 Mẫu users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {completeFlowData.sampleUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                        <div className="flex items-center gap-2">
                          <span className="text-white">{user.username}</span>
                          <span className="text-gray-400 text-sm">{user.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-400 font-semibold">{user.balance?.toLocaleString()}</span>
                          <Badge className="bg-gray-500">{user.balanceType}</Badge>
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