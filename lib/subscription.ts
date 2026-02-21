export interface PlanCapabilities {
  analyticsLevel: 'limited' | 'full';
  maxAnalyticsPeriodDays: number;
  aiInsightsEnabled: boolean;
  reportExportEnabled: boolean;
}

export interface PlanDiscount {
  active: boolean;
  percent: number;
  code: string | null;
  endsAt: string | null;
}

export interface ResolvedPlanShape {
  name: string;
  displayName: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
}

const DEFAULT_FREE_FEATURES = [
  'Limited analytics (up to 30 days)',
  'Revenue overview',
  'Basic performance charts',
  'Top products'
];

const DEFAULT_PRO_FEATURES = [
  'Full analytics (daily and monthly)',
  'Revenue summaries and growth comparison',
  'Advanced sales trend analysis',
  'Top-performing products insights'
];

const DEFAULT_BUSINESS_FEATURES = [
  'Everything in Pro',
  'AI-generated insights',
  'Revenue drop and pricing recommendations',
  'Executive performance summaries'
];

function parseJsonFeatures(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item));
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item));
      }
    } catch {
      return [];
    }
  }
  return [];
}

export function normalizePlanName(plan: any): string {
  return String(plan?.name || 'free').toLowerCase();
}

export function getPlanCapabilities(plan: any): PlanCapabilities {
  const planName = normalizePlanName(plan);

  if (planName === 'business') {
    return {
      analyticsLevel: 'full',
      maxAnalyticsPeriodDays: 365,
      aiInsightsEnabled: true,
      reportExportEnabled: false
    };
  }

  if (planName === 'pro') {
    return {
      analyticsLevel: 'full',
      maxAnalyticsPeriodDays: 365,
      aiInsightsEnabled: false,
      reportExportEnabled: false
    };
  }

  return {
    analyticsLevel: 'limited',
    maxAnalyticsPeriodDays: 30,
    aiInsightsEnabled: false,
    reportExportEnabled: false
  };
}

export function getPlanFeatures(plan: any): string[] {
  const planName = normalizePlanName(plan);
  if (planName === 'business') return DEFAULT_BUSINESS_FEATURES;
  if (planName === 'pro') return DEFAULT_PRO_FEATURES;
  if (planName === 'free') return DEFAULT_FREE_FEATURES;

  const parsed = parseJsonFeatures(plan?.features);
  return parsed.length > 0 ? parsed : DEFAULT_FREE_FEATURES;
}

export function resolvePlanShape(plan: any): ResolvedPlanShape {
  const planName = normalizePlanName(plan);
  const fallbackDisplayName =
    planName === 'business' ? 'Business' : planName === 'pro' ? 'Pro' : 'Free';
  const fallbackDescription =
    planName === 'business'
      ? 'Business plan with AI insights and advanced recommendations'
      : planName === 'pro'
        ? 'Pro plan with full analytics'
        : 'Free plan with limited analytics';

  return {
    name: planName,
    displayName: String(plan?.displayName || fallbackDisplayName),
    description: String(plan?.description || fallbackDescription),
    priceMonthly: Number(plan?.priceMonthly || 0),
    priceYearly: Number(plan?.priceYearly || 0),
    features: getPlanFeatures(plan)
  };
}

export function getPlanDiscount(plan: any): PlanDiscount {
  const active = Boolean(plan?.discountActive);
  const rawPercent = Number(plan?.discountPercent || 0);
  const percent = Number.isFinite(rawPercent) ? Math.min(Math.max(rawPercent, 0), 100) : 0;
  const code = plan?.discountCode ? String(plan.discountCode) : null;
  const endsAtRaw = plan?.discountEndsAt;
  const endsAt = endsAtRaw ? new Date(endsAtRaw).toISOString() : null;

  return {
    active: active && percent > 0,
    percent,
    code,
    endsAt
  };
}

export function calculateDiscountedPrice(basePrice: number, discount: PlanDiscount): number {
  const safeBase = Number.isFinite(basePrice) ? Math.max(basePrice, 0) : 0;
  if (!discount.active || discount.percent <= 0) {
    return safeBase;
  }
  const discounted = safeBase * (1 - discount.percent / 100);
  return Number(discounted.toFixed(2));
}

export function getPlanPricing(plan: any) {
  const basePriceMonthly = Number(plan?.priceMonthly || 0);
  const basePriceYearly = Number(plan?.priceYearly || 0);
  const discount = getPlanDiscount(plan);

  return {
    basePriceMonthly,
    basePriceYearly,
    effectivePriceMonthly: calculateDiscountedPrice(basePriceMonthly, discount),
    effectivePriceYearly: calculateDiscountedPrice(basePriceYearly, discount),
    discount
  };
}

export function calculatePlanPrice(plan: any, billingCycle: 'monthly' | 'yearly'): number {
  const pricing = getPlanPricing(plan);
  if (billingCycle === 'yearly') {
    return pricing.effectivePriceYearly;
  }
  return pricing.effectivePriceMonthly;
}
