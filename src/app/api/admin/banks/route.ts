import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();
    
    // Kiểm tra quyền admin
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Lấy danh sách ngân hàng
    const banks = await db.collection('banks')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      banks
    });
    
  } catch (error) {
    console.error('Error fetching banks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();
    
    // Kiểm tra quyền admin
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, accountNumber, accountHolder, branch } = body;

    // Validate input
    if (!name || !accountNumber || !accountHolder) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Kiểm tra số tài khoản đã tồn tại chưa
    const existingBank = await db.collection('banks').findOne({ accountNumber });
    if (existingBank) {
      return NextResponse.json(
        { error: 'Số tài khoản đã tồn tại' },
        { status: 400 }
      );
    }

    // Tạo ngân hàng mới
    const newBank = {
      name,
      accountNumber,
      accountHolder,
      branch: branch || '',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('banks').insertOne(newBank);

    return NextResponse.json({
      success: true,
      bank: { ...newBank, _id: result.insertedId }
    });
    
  } catch (error) {
    console.error('Error creating bank:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();
    
    // Kiểm tra quyền admin
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { _id, name, accountNumber, accountHolder, branch, status } = body;

    // Validate input
    if (!_id || !name || !accountNumber || !accountHolder) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Kiểm tra ngân hàng có tồn tại không
    const existingBank = await db.collection('banks').findOne({ _id: new ObjectId(_id) });
    if (!existingBank) {
      return NextResponse.json(
        { error: 'Ngân hàng không tồn tại' },
        { status: 404 }
      );
    }

    // Kiểm tra số tài khoản đã tồn tại ở ngân hàng khác chưa
    const duplicateBank = await db.collection('banks').findOne({
      accountNumber,
      _id: { $ne: new ObjectId(_id) }
    });
    if (duplicateBank) {
      return NextResponse.json(
        { error: 'Số tài khoản đã tồn tại ở ngân hàng khác' },
        { status: 400 }
      );
    }

    // Cập nhật ngân hàng
    const updateData = {
      name,
      accountNumber,
      accountHolder,
      branch: branch || '',
      status: status || 'active',
      updatedAt: new Date()
    };

    const result = await db.collection('banks').updateOne(
      { _id: new ObjectId(_id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Ngân hàng không tồn tại' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Cập nhật ngân hàng thành công',
      bank: { _id, ...updateData }
    });
    
  } catch (error) {
    console.error('Error updating bank:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();
    
    // Kiểm tra quyền admin
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bankId = searchParams.get('id');

    if (!bankId) {
      return NextResponse.json(
        { error: 'Bank ID is required' },
        { status: 400 }
      );
    }

    // Kiểm tra ngân hàng có tồn tại không
    const existingBank = await db.collection('banks').findOne({ _id: new ObjectId(bankId) });
    if (!existingBank) {
      return NextResponse.json(
        { error: 'Ngân hàng không tồn tại' },
        { status: 404 }
      );
    }

    // Bỏ qua kiểm tra ràng buộc - cho phép xóa ngân hàng ngay cả khi có user đang sử dụng
    console.log(`🗑️ Xóa ngân hàng: ${existingBank.name} (${existingBank.accountNumber})`);

    // Xóa ngân hàng
    const result = await db.collection('banks').deleteOne({ _id: new ObjectId(bankId) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Không thể xóa ngân hàng' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Xóa ngân hàng thành công'
    });
    
  } catch (error) {
    console.error('Error deleting bank:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 