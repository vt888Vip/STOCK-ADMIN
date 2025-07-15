"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/lib/useAuth';
import { RefreshCw, TrendingUp, TrendingDown, Users, Calendar, DollarSign, Trophy, BarChart3 } from 'lucide-react';

interface TradingStats {
  overview: {
    totalSessions: number;
    completedSessions: number;
    activeSessions: number;
    totalTrades: number;
    pendingTrades: number;
    completedTrades: number;
    winTrades: number;
    loseTrades: number;
    winRate: string;
  };
  recentSessions: Array<{
    sessionId: string;
    status: string;
    result: string;
    startTime: string;
    endTime: string;
    totalTrades: number;
    totalWins: number;
    totalLosses: number;
    totalWinAmount: number;
    totalLossAmount: number;
    createdAt: string;
  }>;
  userStats: {
    totalTrades: number;
    wins: number;
    losses: number;
    pending: number;
    winRate: string;
    totalWinAmount: number;
    totalLossAmount: number;
    netProfit: number;
  } | null;
  topPlayers: Array<{
    _id: string;
    email: string;
    balance: number;
    totalTrades: number;
    wins: number;
    totalWinAmount: number;
    totalLossAmount: number;
    netProfit: number;
    winRate: number;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString('vi-VN');
};

export default function TradingStatsPage() {
  const [stats, setStats] = useState<TradingStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchStats = async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });

      if (user?.id) {
        params.append('userId', user.id);
      }

      const response = await fetch(`/api/trading-sessions/stats?${params}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data);
          setCurrentPage(page);
        }
      }
    } catch (error) {
      console.error('Lỗi khi fetch stats:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải thống kê',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Đang tải thống kê...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">📊 Thống kê Giao dịch</h1>
          <Button onClick={() => fetchStats(currentPage)} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng phiên</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overview.totalSessions}</div>
              <p className="text-xs text-muted-foreground">
                {stats.overview.completedSessions} đã hoàn thành
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng giao dịch</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overview.totalTrades}</div>
              <p className="text-xs text-muted-foreground">
                {stats.overview.pendingTrades} đang chờ
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tỷ lệ thắng</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overview.winRate}%</div>
              <p className="text-xs text-muted-foreground">
                {stats.overview.winTrades} thắng / {stats.overview.loseTrades} thua
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Người chơi</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.topPlayers.length}</div>
              <p className="text-xs text-muted-foreground">
                Top người chơi
              </p>
            </CardContent>
          </Card>
        </div>

        {/* User Stats */}
        {stats.userStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="h-5 w-5 mr-2" />
                Thống kê của bạn
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.userStats.totalTrades}</div>
                  <div className="text-sm text-gray-600">Tổng lệnh</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.userStats.wins}</div>
                  <div className="text-sm text-gray-600">Thắng</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.userStats.losses}</div>
                  <div className="text-sm text-gray-600">Thua</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{stats.userStats.winRate}%</div>
                  <div className="text-sm text-gray-600">Tỷ lệ thắng</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-lg font-bold text-green-600">
                    +{formatCurrency(stats.userStats.totalWinAmount)}
                  </div>
                  <div className="text-sm text-gray-600">Tổng thắng</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-lg font-bold text-red-600">
                    -{formatCurrency(stats.userStats.totalLossAmount)}
                  </div>
                  <div className="text-sm text-gray-600">Tổng thua</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className={`text-lg font-bold ${stats.userStats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.userStats.netProfit >= 0 ? '+' : ''}{formatCurrency(stats.userStats.netProfit)}
                  </div>
                  <div className="text-sm text-gray-600">Lợi nhuận ròng</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Players */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trophy className="h-5 w-5 mr-2" />
              Top Người Chơi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tổng lệnh</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thắng</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tỷ lệ thắng</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lợi nhuận</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số dư</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.topPlayers.map((player, index) => (
                    <tr key={player._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        #{index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {player.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {player.totalTrades}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-bold">
                        {player.wins}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {player.winRate.toFixed(1)}%
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${player.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {player.netProfit >= 0 ? '+' : ''}{formatCurrency(player.netProfit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(player.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Phiên Giao dịch Gần đây
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phiên</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kết quả</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tổng lệnh</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thắng/Thua</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tổng thắng</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tổng thua</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.recentSessions.map((session) => (
                    <tr key={session.sessionId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                        {session.sessionId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          session.result === 'UP' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {session.result === 'UP' ? '📈 LÊN' : '📉 XUỐNG'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {session.totalTrades}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="text-green-600 font-bold">{session.totalWins}</span>
                        {' / '}
                        <span className="text-red-600 font-bold">{session.totalLosses}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-bold">
                        +{formatCurrency(session.totalWinAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-bold">
                        -{formatCurrency(session.totalLossAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(session.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {stats.pagination.pages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Trang {stats.pagination.page} của {stats.pagination.pages}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchStats(currentPage - 1)}
                    disabled={currentPage <= 1}
                  >
                    Trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchStats(currentPage + 1)}
                    disabled={currentPage >= stats.pagination.pages}
                  >
                    Sau
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 