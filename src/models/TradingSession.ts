import mongoose, { Document, Schema, Model } from 'mongoose';

// Định nghĩa interface cho document TradingSession
export interface ITradingSession extends Document {
  sessionId: string;
  startTime: Date;
  endTime: Date;
  status: 'ACTIVE' | 'PREDICTED' | 'COMPLETED';
  result?: 'UP' | 'DOWN' | null; // Kết quả do admin nhập trước
  actualResult?: 'UP' | 'DOWN' | null; // Kết quả thực tế khi phiên kết thúc
  createdBy?: 'admin' | 'system'; // Ai tạo kết quả
  totalTrades?: number; // Tổng số lệnh trong phiên
  totalWins?: number; // Tổng số lệnh thắng
  totalLosses?: number; // Tổng số lệnh thua
  totalWinAmount?: number; // Tổng tiền thắng
  totalLossAmount?: number; // Tổng tiền thua
  completedAt?: Date; // Thời gian hoàn thành
  createdAt: Date;
  updatedAt: Date;
}

// Định nghĩa schema cho TradingSession
const tradingSessionSchema = new Schema<ITradingSession>({
  sessionId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  startTime: { 
    type: Date, 
    required: true,
    index: true 
  },
  endTime: { 
    type: Date, 
    required: true,
    index: true 
  },
  status: { 
    type: String, 
    enum: ['ACTIVE', 'PREDICTED', 'COMPLETED'], 
    default: 'ACTIVE',
    index: true 
  },
  result: { 
    type: String, 
    enum: ['UP', 'DOWN'],
    default: null 
  },
  actualResult: { 
    type: String, 
    enum: ['UP', 'DOWN'],
    default: null 
  },
  createdBy: { 
    type: String, 
    enum: ['admin', 'system'],
    default: 'system' 
  },
  totalTrades: { 
    type: Number, 
    default: 0 
  },
  totalWins: { 
    type: Number, 
    default: 0 
  },
  totalLosses: { 
    type: Number, 
    default: 0 
  },
  totalWinAmount: { 
    type: Number, 
    default: 0 
  },
  totalLossAmount: { 
    type: Number, 
    default: 0 
  },
  completedAt: { 
    type: Date 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true,
});

// Tạo index cho các trường thường xuyên được query
tradingSessionSchema.index({ sessionId: 1 });
tradingSessionSchema.index({ status: 1 });
tradingSessionSchema.index({ startTime: 1, endTime: 1 });
tradingSessionSchema.index({ createdAt: -1 });

// Kiểm tra xem model đã tồn tại chưa để tránh lỗi khi hot reload
let TradingSessionModel: Model<ITradingSession>;
try {
  // Nếu model đã tồn tại, sử dụng lại
  TradingSessionModel = mongoose.model<ITradingSession>('TradingSession');
} catch {
  // Nếu chưa có model, tạo mới
  TradingSessionModel = mongoose.model<ITradingSession>('TradingSession', tradingSessionSchema);
}

export default TradingSessionModel; 