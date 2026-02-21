import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { connectToDatabase, queryOneAsync, runAsync, update, ObjectId } from '@/lib/db';
import { calculatePlanPrice, getPlanCapabilities, getPlanPricing, resolvePlanShape } from '@/lib/subscription';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const HARDCODED_PAYMENT_PROVIDER = 'Hardcoded-Payment-Simulator';
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

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const planId = body.planId || body.plan_id;
    const billingCycle = body.billingCycle === 'yearly' || body.billing_cycle === 'yearly' ? 'yearly' : 'monthly';

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    // Get plan details
    const plan = await resolvePlanByIdentifier(planId);
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const planShape = resolvePlanShape(plan);
    const capabilities = getPlanCapabilities(planShape);
    const pricing = getPlanPricing(plan);
    const amount = calculatePlanPrice(planShape, billingCycle);
    const transactionId = `mock_txn_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const now = new Date();
    const endDate = new Date(now.getTime() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000);

    const existingSubscription = await queryOneAsync('subscriptions', { userId: user.userId, status: 'active' });

    const paymentRecord = {
      provider: HARDCODED_PAYMENT_PROVIDER,
      transactionId,
      status: 'succeeded',
      amount,
      currency: 'USD',
      paidAt: now,
      billingCycle
    };

    if (existingSubscription) {
      await update(
        'subscriptions',
        { _id: existingSubscription._id },
        {
          planId: plan._id,
          status: 'active',
          billingCycle,
          startDate: now,
          endDate,
          updatedAt: now,
          lastPayment: paymentRecord
        }
      );
    } else {
      await runAsync('subscriptions', {
        _id: randomUUID(),
        userId: user.userId,
        planId: plan._id,
        status: 'active',
        billingCycle,
        startDate: now,
        endDate,
        createdAt: now,
        updatedAt: now,
        lastPayment: paymentRecord
      });
    }

    const subscription = await queryOneAsync('subscriptions', { userId: user.userId, status: 'active' });

    return NextResponse.json({
      success: true,
      message:
        amount > 0
          ? `Mock payment succeeded. ${planShape.displayName} plan is now active.`
          : `${planShape.displayName} plan activated successfully.`,
      payment: paymentRecord,
      plan: {
        id: plan._id,
        name: planShape.name,
        displayName: planShape.displayName,
        price: amount,
        basePrice: billingCycle === 'yearly' ? pricing.basePriceYearly : pricing.basePriceMonthly,
        billingCycle,
        discount: pricing.discount,
        capabilities
      },
      subscription: subscription
        ? {
            id: subscription._id,
            planId: subscription.planId,
            status: subscription.status,
            billingCycle: subscription.billingCycle,
            startDate: subscription.startDate,
            endDate: subscription.endDate
          }
        : null
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's subscription with plan details
    const subscription = await queryOneAsync('subscriptions', { userId: user.userId, status: 'active' });
    
    if (!subscription) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 404 });
    }

    const plan = await resolvePlanByIdentifier(subscription.planId);
    const planShape = resolvePlanShape(plan);
    const pricing = getPlanPricing(plan);

    return NextResponse.json({
      subscription: {
        id: subscription._id,
        planId: subscription.planId,
        status: subscription.status,
        billingCycle: subscription.billingCycle,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        lastPayment: subscription.lastPayment || null
      },
      plan: {
        name: planShape.name,
        displayName: planShape.displayName,
        priceMonthly: pricing.effectivePriceMonthly,
        priceYearly: pricing.effectivePriceYearly,
        basePriceMonthly: pricing.basePriceMonthly,
        basePriceYearly: pricing.basePriceYearly,
        discount: pricing.discount,
        capabilities: getPlanCapabilities(planShape)
      }
    });
  } catch (error) {
    console.error('Error fetching payment info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
