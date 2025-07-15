/**
 * Model cho cài đặt trang web
 */
import { ObjectId } from 'mongodb';
import { getMongoDb } from '@/lib/db';

export interface SiteSettings {
  _id?: ObjectId | string;
  maintenance: {
    enabled: boolean;
    message: string;
  };
  trading: {
    enabled: boolean;
    message: string;
  };
  withdrawals: {
    enabled: boolean;
    message: string;
    minAmount: number;
    maxAmount: number;
    fee: number;
  };
  deposits: {
    enabled: boolean;
    message: string;
    minAmount: number;
    maxAmount: number;
  };
  notifications: {
    global: string;
    login: string;
  };
  updatedAt: Date;
}

/**
 * Lấy cài đặt trang web
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  const db = await getMongoDb();
  const settings = await db.collection('sitesettings').findOne({});
  
  // Trả về cài đặt mặc định nếu không tìm thấy
  if (!settings) {
    return {
      maintenance: {
        enabled: false,
        message: 'Hệ thống đang bảo trì, vui lòng quay lại sau.'
      },
      trading: {
        enabled: true,
        message: 'Giao dịch đang tạm dừng, vui lòng quay lại sau.'
      },
      withdrawals: {
        enabled: true,
        message: 'Rút tiền đang tạm dừng, vui lòng quay lại sau.',
        minAmount: 100000,
        maxAmount: 100000000,
        fee: 0
      },
      deposits: {
        enabled: true,
        message: 'Nạp tiền đang tạm dừng, vui lòng quay lại sau.',
        minAmount: 100000,
        maxAmount: 100000000
      },
      notifications: {
        global: '',
        login: 'Chào mừng bạn đến với hệ thống!'
      },
      updatedAt: new Date()
    };
  }
  
  return settings as SiteSettings;
}

/**
 * Cập nhật cài đặt trang web
 */
export async function updateSiteSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
  const db = await getMongoDb();
  
  // Thêm thời gian cập nhật
  const updatedSettings = {
    ...settings,
    updatedAt: new Date()
  };
  
  // Tìm và cập nhật, hoặc tạo mới nếu không tồn tại
  const result = await db.collection('sitesettings').findOneAndUpdate(
    {}, 
    { $set: updatedSettings },
    { upsert: true, returnDocument: 'after' }
  );
  
  return (result?.value || updatedSettings) as SiteSettings;
}
