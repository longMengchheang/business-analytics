// Stripe integration for payment processing
// Note: This requires STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY environment variables

import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
}) : null;

export interface CreateCheckoutParams {
  customerId?: string;
  customerEmail?: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}

export async function createCheckoutSession(params: CreateCheckoutParams): Promise<string | null> {
  if (!stripe) {
    console.warn('Stripe is not configured. Payment features disabled.');
    return null;
  }

  const { customerId, customerEmail, priceId, successUrl, cancelUrl } = params;

  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : customerEmail,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return session.url;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return null;
  }
}

export async function createCustomer(email: string, name: string): Promise<string | null> {
  if (!stripe) {
    return null;
  }

  try {
    const customer = await stripe.customers.create({
      email,
      name,
    });
    return customer.id;
  } catch (error) {
    console.error('Error creating customer:', error);
    return null;
  }
}

export async function cancelSubscription(subscriptionId: string): Promise<boolean> {
  if (!stripe) {
    return false;
  }

  try {
    await stripe.subscriptions.cancel(subscriptionId);
    return true;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return false;
  }
}

export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
  if (!stripe) {
    return null;
  }

  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    console.error('Error retrieving subscription:', error);
    return null;
  }
}

export async function createPortalSession(customerId: string, returnUrl: string): Promise<string | null> {
  if (!stripe) {
    return null;
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return session.url;
  } catch (error) {
    console.error('Error creating portal session:', error);
    return null;
  }
}

// Map internal plan IDs to Stripe price IDs
export const stripePriceIds: Record<string, { monthly: string; yearly: string }> = {
  plan_pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly',
    yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID || 'price_pro_yearly',
  },
  plan_business: {
    monthly: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID || 'price_business_monthly',
    yearly: process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID || 'price_business_yearly',
  },
};
