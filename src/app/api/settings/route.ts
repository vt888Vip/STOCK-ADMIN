import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-utils';
import { getMongoDb } from '@/lib/db';
import { getSiteSettings, updateSiteSettings, SiteSettings } from '@/models/SiteSettings';
import { ObjectId } from 'mongodb';
import { NextRequest } from 'next/server';

export async function GET() {
  try {
    const settings = await getSiteSettings();
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Error fetching site settings:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  return requireAdmin(request, async (req: NextRequest, user: any) => {
    try {
      const settingsData = await request.json();
      
      if (!settingsData) {
        return NextResponse.json(
          { success: false, message: 'Không có dữ liệu cài đặt' },
          { status: 400 }
        );
      }
      
      // Cập nhật cài đặt
      const updatedSettings = await updateSiteSettings({
        ...settingsData,
        updatedBy: user._id
      });
      
      return NextResponse.json({ 
        success: true,
        message: 'Cập nhật cài đặt thành công',
        settings: updatedSettings
      });
      
    } catch (error) {
      console.error('Error updating site settings:', error);
      return NextResponse.json(
        { success: false, message: 'Lỗi máy chủ nội bộ' },
        { status: 500 }
      );
    }
  });
}
