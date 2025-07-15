import mongoose, { Document, Schema } from 'mongoose';

export interface ITrade extends Document {
  sessionId: string;
  userId: string;
  direction: 'UP' | 'DOWN';
  amount: number;
  status: 'pending' | 'completed';
  result?: 'win' | 'lose';
  profit?: number;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const tradeSchema = new Schema<ITrade>({
  sessionId: { 
    type: String, 
    required: true, 
    index: true 
  },
  userId: { 
    type: String, 
    required: true, 
    index: true 
  },
  direction: { 
    type: String, 
    enum: ['UP', 'DOWN'], 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true,
    min: 0 
  },
  status: { 
    type: String, 
    enum: ['pending', 'completed'], 
    default: 'pending',
    index: true 
  },
  result: { 
    type: String, 
    enum: ['win', 'lose'],
    required: false 
  },
  profit: { 
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
tradeSchema.index({ sessionId: 1, userId: 1 });
tradeSchema.index({ status: 1 });
tradeSchema.index({ createdAt: -1 });
tradeSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Trade || mongoose.model<ITrade>('Trade', tradeSchema);
