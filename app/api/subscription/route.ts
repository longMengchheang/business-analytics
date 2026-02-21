import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectToDatabase, query, queryOneAsync, runAsync, update, ObjectId } from '@/lib/db';
import { getPlanCapabilities, getPlanPricing, resolvePlanShape } from '@/lib/subscription';

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

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Get all plans
    const plans = await query('subscriptionPlans', { isActive: true }, { sort: { priceMonthly: 1 } });
    const serializedPlans = plans.map((plan: any) => {
      const planShape = resolvePlanShape(plan);
      const capabilities = getPlanCapabilities(planShape);
      const pricing = getPlanPricing(plan);
      return {
        id: plan._id,
        name: planShape.name,
        displayName: planShape.displayName,
        description: planShape.description,
        priceMonthly: pricing.effectivePriceMonthly,
        priceYearly: pricing.effectivePriceYearly,
        basePriceMonthly: pricing.basePriceMonthly,
        basePriceYearly: pricing.basePriceYearly,
        discount: pricing.discount,
        features: planShape.features,
        capabilities
      };
    });

    // Check if user is logged in
    const user = getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ 
        plans: serializedPlans
      });
    }

    // Get user's current subscription
    const subscription = await queryOneAsync('subscriptions', { userId: user.userId, status: 'active' });
    const currentPlan = subscription ? await resolvePlanByIdentifier(subscription.planId) : null;
    const currentPlanShape = currentPlan ? resolvePlanShape(currentPlan) : null;
    const currentCapabilities = currentPlan ? getPlanCapabilities(currentPlanShape) : getPlanCapabilities({ name: 'free' });

    return NextResponse.json({ 
      plans: serializedPlans,
      subscription: subscription ? {
        id: subscription._id,
        planId: subscription.planId,
        planName: currentPlanShape?.displayName || null,
        status: subscription.status,
        billingCycle: subscription.billingCycle,
        endDate: subscription.endDate,
        capabilities: currentCapabilities
      } : {
        id: null,
        planId: 'free',
        planName: 'Free',
        status: 'active',
        billingCycle: 'monthly',
        endDate: null,
        capabilities: currentCapabilities
      }
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
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

    const body = await request.json();
    const planId = body.planId || body.plan_id;
    const billingCycle = body.billingCycle === 'yearly' || body.billing_cycle === 'yearly' ? 'yearly' : 'monthly';

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    // Verify plan exists
    const plan = await resolvePlanByIdentifier(planId);
    if (plan && !plan.isActive) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Check if user already has subscription
    const existingSub = await queryOneAsync('subscriptions', { userId: user.userId, status: 'active' });

    if (existingSub) {
      // Update existing subscription
      await update('subscriptions', 
        { _id: existingSub._id }, 
        { planId: plan._id, billingCycle, updatedAt: new Date() }
      );
    } else {
      // Create new subscription
      const { v4: uuidv4 } = await import('uuid');
      const subscriptionId = uuidv4();
      const now = new Date();
      const endDate = new Date(now.getTime() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000);

      await runAsync('subscriptions', {
        _id: subscriptionId,
        userId: user.userId,
        planId: plan._id,
        status: 'active',
        billingCycle,
        startDate: now,
        endDate
      });
    }

    const subscription = await queryOneAsync('subscriptions', { userId: user.userId, status: 'active' });
    const activePlan = await resolvePlanByIdentifier(subscription?.planId);
    const activePlanShape = resolvePlanShape(activePlan);

    return NextResponse.json({ 
      subscription: {
        id: subscription._id,
        planId: subscription.planId,
        planName: activePlanShape.displayName,
        status: subscription.status,
        billingCycle: subscription.billingCycle,
        endDate: subscription.endDate,
        capabilities: getPlanCapabilities(activePlanShape)
      }
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
