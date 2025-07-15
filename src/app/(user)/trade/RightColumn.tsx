import React from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TradingViewTickerTape from '@/components/TradingViewTickerTape';
import TradingViewAdvancedChart from '@/components/TradingViewAdvancedChart';
import LiquidityTable from '@/components/LiquidityTable';

// Define props for the component
import { TradeHistoryRecord } from './page';

interface RightColumnProps {
  isLoading: boolean;
  tradeHistory: TradeHistoryRecord[];
  formatCurrency: (value: number) => string;
}

const RightColumn: React.FC<RightColumnProps> = ({ isLoading, tradeHistory, formatCurrency }) => {
  return (
    <div className="space-y-6 lg:col-span-8">
      {/* Market Data Ticker */}
      <Card className="bg-white border-gray-300 rounded-md shadow">
        <CardContent className="p-0">
          <TradingViewTickerTape />
        </CardContent>
      </Card>

      <Card className="bg-white border-gray-500 rounded-md shadow h-[600px]">
        <CardContent className="p-2 h-full">
          <TradingViewAdvancedChart />
        </CardContent>
      </Card>

      {/* Liquidity / Market Overview */}
      <Card className="bg-white border-gray-300 rounded-md shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-900">Thanh khoản</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <LiquidityTable />
        </CardContent>
      </Card>
    </div>
  );
};

export default RightColumn;