import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { connectToDatabase, query, queryOneAsync, runAsync, update, remove } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
export const dynamic = 'force-dynamic';

function getUserFromRequest(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) return null;
  
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    return payload;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's business
    const business = await queryOneAsync('businesses', { userId: user.userId });
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const productId = url.searchParams.get('productId');
    const search = url.searchParams.get('search');
    const category = url.searchParams.get('category');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    let filter: any = { businessId: business._id };
    if (productId) filter.productId = productId;
    if (search) {
      filter.productName = { $regex: search, $options: 'i' };
    }
    if (category) {
      filter.category = category;
    }
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const sales = await query('sales', filter, { sort: { date: -1 }, skip: (page - 1) * limit, limit });
    const allSales = await query('sales', filter);

    return NextResponse.json({ 
      sales: sales.map((s: any) => ({
        id: s._id,
        productId: s.productId,
        productName: s.productName || 'Unknown',
        product_name: s.productName || 'Unknown',
        quantity: s.quantity,
        unitPrice: s.unitPrice || 0,
        unit_price: s.unitPrice || 0,
        total: s.total,
        total_amount: s.total,
        category: s.category || '',
        date: s.date,
        sale_date: s.date
      })),
      pagination: {
        page,
        limit,
        total: allSales.length,
        pages: Math.ceil(allSales.length / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching sales:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's business
    const business = await queryOneAsync('businesses', { userId: user.userId });
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const body = await request.json();
    const productId = body.productId || body.product_id;
    const parsedQuantity = Number(body.quantity);
    const date = body.date || body.sale_date;

    if (!productId || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      return NextResponse.json({ error: 'Product ID and quantity are required' }, { status: 400 });
    }

    // Get product details
    const product = await queryOneAsync('products', { _id: productId, businessId: business._id });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const parsedUnitPrice = Number(body.unitPrice ?? body.unit_price);
    const unitPrice = Number.isFinite(parsedUnitPrice) && parsedUnitPrice > 0 ? parsedUnitPrice : Number(product.price);
    const total = unitPrice * parsedQuantity;
    const saleDate = date ? new Date(date) : new Date();

    const saleId = uuidv4();
    await runAsync('sales', {
      _id: saleId,
      businessId: business._id,
      productId,
      productName: product.name,
      category: product.category || 'General',
      quantity: parsedQuantity,
      unitPrice,
      total,
      date: saleDate,
      customerName: body.customerName || body.customer_name || '',
    });

    return NextResponse.json({ 
      sale: {
        id: saleId,
        productId,
        productName: product.name,
        product_name: product.name,
        quantity: parsedQuantity,
        unitPrice,
        unit_price: unitPrice,
        total,
        total_amount: total,
        category: product.category || 'General',
        date: saleDate
      }
    });
  } catch (error) {
    console.error('Error creating sale:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const business = await queryOneAsync('businesses', { userId: user.userId });
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const body = await request.json();
    const id = body.id;
    const productId = body.productId || body.product_id;
    const quantity = body.quantity;
    const date = body.date || body.sale_date;

    if (!id) {
      return NextResponse.json({ error: 'Sale ID is required' }, { status: 400 });
    }

    const existingSale = await queryOneAsync('sales', { _id: id, businessId: business._id });
    if (!existingSale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    const updateData: any = {};

    const nextProductId = productId || existingSale.productId;
    const nextQuantity = quantity !== undefined ? Number(quantity) : Number(existingSale.quantity);
    if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
      return NextResponse.json({ error: 'Quantity must be greater than 0' }, { status: 400 });
    }

    const product = await queryOneAsync('products', { _id: nextProductId, businessId: business._id });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const parsedUnitPrice = Number(body.unitPrice ?? body.unit_price);
    const nextUnitPrice = Number.isFinite(parsedUnitPrice) && parsedUnitPrice > 0
      ? parsedUnitPrice
      : Number(existingSale.unitPrice || product.price);

    updateData.productId = nextProductId;
    updateData.productName = product.name;
    updateData.category = product.category || 'General';
    updateData.quantity = nextQuantity;
    updateData.unitPrice = nextUnitPrice;
    updateData.total = nextQuantity * nextUnitPrice;

    if (date) {
      updateData.date = new Date(date);
    }

    const success = await update('sales', { _id: id, businessId: business._id }, updateData);
    if (!success) {
      return NextResponse.json({ error: 'Failed to update sale' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating sale:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Sale ID is required' }, { status: 400 });
    }

    const business = await queryOneAsync('businesses', { userId: user.userId });
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const success = await remove('sales', { _id: id, businessId: business._id });

    if (!success) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting sale:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
