import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectToDatabase, query, queryOneAsync, update, ObjectId } from '@/lib/db';
import { getPlanPricing, resolvePlanShape } from '@/lib/subscription';

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

async function resolvePlanByIdentifier(identifier: string | undefined) {
  if (!identifier) return null;

  let plan = await queryOneAsync('subscriptionPlans', { _id: identifier });
  if (!plan && ObjectId.isValid(identifier)) {
    plan = await queryOneAsync('subscriptionPlans', { _id: new ObjectId(identifier) });
  }
  if (!plan) {
    plan = await queryOneAsync('subscriptionPlans', { name: identifier });
  }

  return plan;
}

function buildPlanResponse(plan: any) {
  const planShape = resolvePlanShape(plan);
  const pricing = getPlanPricing(plan);

  return {
    id: plan._id,
    name: planShape.name,
    displayName: planShape.displayName,
    priceMonthly: pricing.basePriceMonthly,
    priceYearly: pricing.basePriceYearly,
    effectivePriceMonthly: pricing.effectivePriceMonthly,
    effectivePriceYearly: pricing.effectivePriceYearly,
    discount: pricing.discount
  };
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const plans = await query('subscriptionPlans', { isActive: true }, { sort: { priceMonthly: 1 } });
    return NextResponse.json({ plans: plans.map(buildPlanResponse) });
  } catch (error) {
    console.error('Error fetching pricing controls:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();

    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const planId = body.planId || body.plan_id;
    const priceMonthly = Number(body.priceMonthly);
    const priceYearly = Number(body.priceYearly);
    const discountPercent = Number(body.discountPercent || 0);
    const discountActive = Boolean(body.discountActive);
    const discountCode = String(body.discountCode || '').trim();
    const discountEndsAtRaw = body.discountEndsAt ? String(body.discountEndsAt) : '';

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    if (!Number.isFinite(priceMonthly) || priceMonthly < 0 || !Number.isFinite(priceYearly) || priceYearly < 0) {
      return NextResponse.json({ error: 'Prices must be valid non-negative numbers' }, { status: 400 });
    }

    if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      return NextResponse.json({ error: 'Discount percent must be between 0 and 100' }, { status: 400 });
    }

    let discountEndsAt: Date | null = null;
    if (discountEndsAtRaw) {
      const parsed = new Date(discountEndsAtRaw);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'Invalid discount end date' }, { status: 400 });
      }
      discountEndsAt = parsed;
    }

    const plan = await resolvePlanByIdentifier(planId);
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const updateData = {
      priceMonthly,
      priceYearly,
      discountPercent: discountActive ? discountPercent : 0,
      discountActive: discountActive && discountPercent > 0,
      discountCode: discountActive ? discountCode : '',
      discountEndsAt: discountActive ? discountEndsAt : null,
      updatedAt: new Date()
    };

    let updated = await update('subscriptionPlans', { _id: plan._id }, updateData);
    if (!updated && ObjectId.isValid(String(plan._id))) {
      updated = await update('subscriptionPlans', { _id: new ObjectId(String(plan._id)) }, updateData);
    }

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update plan pricing' }, { status: 400 });
    }

    const updatedPlan = await resolvePlanByIdentifier(String(plan._id));
    return NextResponse.json({
      plan: updatedPlan ? buildPlanResponse(updatedPlan) : null
    });
  } catch (error) {
    console.error('Error updating pricing controls:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
