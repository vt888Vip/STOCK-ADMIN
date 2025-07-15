import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { BarChart2, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export interface TradeHistoryRecord {
  id: string;
  sessionId: string;
  direction: "UP" | "DOWN";
  amount: number;
  status: "success" | "completed" | "pending";
  result: "win" | "lose" | null;
  profit: number;
  createdAt: string;
}

interface TradeHistoryProps {
  tradeHistory: TradeHistoryRecord[];
  formatCurrency: (value: number) => string;
}

const TradeHistory: React.FC<TradeHistoryProps> = ({ tradeHistory, formatCurrency }) => {
  const router = useRouter();

  const getStatusIcon = (status: string, result: string | null) => {
    if (status === 'pending') {
      return <Clock className="w-4 h-4 text-yellow-500" />;
    }
    if (result === 'win') {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (result === 'lose') {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    return <AlertCircle className="w-4 h-4 text-gray-500" />;
  };

  const getStatusText = (status: string, result: string | null) => {
    if (status === 'pending') {
      return 'Đợi kết quả';
    }
    if (result === 'win') {
      return 'Thắng';
    }
    if (result === 'lose') {
      return 'Thua';
    }
    return 'Đang xử lý';
  };

  const getStatusColor = (status: string, result: string | null) => {
    if (status === 'pending') {
      return 'text-yellow-600';
    }
    if (result === 'win') {
      return 'text-green-600';
    }
    if (result === 'lose') {
      return 'text-red-600';
    }
    return 'text-gray-500';
  };

  const getDirectionColor = (direction: string) => {
    return direction === 'UP' ? 'text-green-600' : 'text-red-600';
  };

  const getDirectionText = (direction: string) => {
    return direction === 'UP' ? 'LÊN' : 'XUỐNG';
  };

  return (
    <Card className="bg-white border-gray-300 rounded-md shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-gray-900 text-base font-medium flex items-center">
            <BarChart2 className="w-5 h-5 mr-2" />
            Lịch sử giao dịch
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/transaction-history')}
            className="text-blue-600 hover:text-blue-700 text-xs"
          >
            Xem tất cả
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {tradeHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <BarChart2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Chưa có giao dịch nào</p>
            <p className="text-xs text-gray-400 mt-1">Đặt lệnh đầu tiên để bắt đầu giao dịch</p>
          </div>
        ) : (
          <div className="overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thời gian
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phiên
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lệnh
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Số tiền
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kết quả
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lợi nhuận
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tradeHistory.slice(0, 10).map((trade) => (
                    <tr key={trade.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {new Date(trade.createdAt).toLocaleString('vi-VN', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {trade.sessionId}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDirectionColor(trade.direction)} bg-opacity-10 ${trade.direction === 'UP' ? 'bg-green-100' : 'bg-red-100'}`}>
                          {getDirectionText(trade.direction)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {formatCurrency(trade.amount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(trade.status, trade.result)}
                          <span className={`ml-2 text-sm font-medium ${getStatusColor(trade.status, trade.result)}`}>
                            {getStatusText(trade.status, trade.result)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {trade.result === 'win' ? (
                          <span className="text-green-600 font-bold">
                            +{formatCurrency(trade.profit)}
                          </span>
                        ) : trade.result === 'lose' ? (
                          <span className="text-red-600 font-bold">
                            -{formatCurrency(trade.amount)}
                          </span>
                        ) : (
                          <span className="text-gray-400">
                            --
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden">
              <div className="space-y-3 p-4">
                {tradeHistory.slice(0, 5).map((trade) => (
                  <div key={trade.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getDirectionColor(trade.direction)} bg-opacity-10 ${trade.direction === 'UP' ? 'bg-green-100' : 'bg-red-100'}`}>
                          {getDirectionText(trade.direction)}
                        </span>
                        <span className="text-xs text-gray-500 font-mono">
                          {trade.sessionId}
                        </span>
                      </div>
                      <div className="flex items-center">
                        {getStatusIcon(trade.status, trade.result)}
                        <span className={`ml-1 text-xs font-medium ${getStatusColor(trade.status, trade.result)}`}>
                          {getStatusText(trade.status, trade.result)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        {formatCurrency(trade.amount)}
                      </div>
                      <div className="text-sm">
                        {trade.result === 'win' ? (
                          <span className="text-green-600 font-bold">
                            +{formatCurrency(trade.profit)}
                          </span>
                        ) : trade.result === 'lose' ? (
                          <span className="text-red-600 font-bold">
                            -{formatCurrency(trade.amount)}
                          </span>
                        ) : (
                          <span className="text-gray-400">
                            --
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(trade.createdAt).toLocaleString('vi-VN')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TradeHistory;
