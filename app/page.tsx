import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ArrowRight, BarChart3, Brain, CreditCard, ShieldCheck, CheckCircle2 } from 'lucide-react';

const FEATURE_ITEMS = [
  {
    title: 'Revenue Overview',
    description: 'Track total revenue, growth, and performance trends in one place with crystal clarity.',
    icon: BarChart3
  },
  {
    title: 'Role-Based Access',
    description: 'Separate admin and business owner capabilities with enterprise-grade secure controls.',
    icon: ShieldCheck
  },
  {
    title: 'AI Insights',
    description: 'Get automatic, intelligent alerts for revenue drops and proactive pricing recommendations.',
    icon: Brain
  },
  {
    title: 'Subscription Billing',
    description: 'Upgrade plans instantly with a seamless checkout experience built for modern businesses.',
    icon: CreditCard
  }
];

const PLAN_ITEMS = [
  {
    name: 'Free',
    price: '$0',
    frequency: '/mo',
    description: 'Essential analytics and dashboard access for individuals.',
    features: ['Basic dashboard', 'Limited analytics', 'Community support'],
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$29',
    frequency: '/mo',
    description: 'Full analytics including detailed trends and growth comparison.',
    features: ['Real-time trends', 'Growth comparison', 'Priority email support', 'Export tools'],
    highlight: true,
  },
  {
    name: 'Business',
    price: '$79',
    frequency: '/mo',
    description: 'Everything in Pro plus AI insights and advanced recommendations.',
    features: ['AI predictions', 'Custom reporting', '24/7 phone support', 'Unlimited team members'],
    highlight: false,
  }
];

export default function HomePage() {
  const token = cookies().get('token')?.value;
  if (token) {
    redirect('/analytics');
  }

  return (
    <main className="min-h-screen bg-[#fafafa] text-slate-900 selection:bg-primary-200 selection:text-primary-900 overflow-hidden">
      {/* Decorative background blur */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-primary-50 to-transparent -z-10" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-200/40 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute top-20 -left-40 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl -z-10 pointer-events-none" />

      <section className="mx-auto max-w-6xl px-6 py-20 lg:py-32">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          <div className="space-y-8 animate-slide-up">
            <div className="inline-flex items-center rounded-full border border-primary-200 bg-white/50 px-4 py-1.5 text-sm font-medium text-primary-700 backdrop-blur-sm shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-primary-600 mr-2 animate-pulse" />
              Smart Business Analytics
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl sm:leading-[1.1]">
              Data-driven <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-indigo-500">clarity</span> for your business
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-slate-600 sm:text-xl">
              Monitor growth, unlock administrative controls, and optionally enable AI-powered insights—all within an interface designed for speed and simplicity.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                href="/register"
                className="group relative inline-flex items-center justify-center rounded-full bg-slate-900 px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-slate-900/50"
              >
                Get Started
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 transition-all hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                Sign In
              </Link>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 w-full max-w-lg mx-auto lg:max-w-none animate-fade-in" style={{ animationDelay: '0.2s' }}>
            {FEATURE_ITEMS.map((item, i) => {
              const Icon = item.icon;
              return (
                <article 
                  key={item.title} 
                  className="group relative rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition-all hover:-translate-y-1 hover:shadow-xl overflow-hidden"
                >
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary-500 to-indigo-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
                  <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-primary-50/80 p-3 text-primary-600 ring-1 ring-inset ring-primary-100 transition-colors group-hover:bg-primary-100">
                    <Icon className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative px-6 py-24 sm:py-32 bg-white border-t border-slate-100">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl mx-auto text-center mb-16 animate-slide-up">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Pricing that scales with you</h2>
            <p className="mt-4 text-lg text-slate-600">
              Simple, transparent pricing for teams of all sizes. Upgrade or downgrade at any time.
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3 items-center">
            {PLAN_ITEMS.map((plan) => (
              <article 
                key={plan.name} 
                className={`relative flex flex-col rounded-3xl p-8 transition-all duration-300 hover:shadow-2xl ${
                  plan.highlight 
                    ? 'bg-slate-900 text-white shadow-xl ring-1 ring-slate-900 scale-100 md:scale-105 z-10' 
                    : 'bg-white text-slate-900 ring-1 ring-slate-200 shadow-sm hover:-translate-y-1'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary-400 to-indigo-400 px-4 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-sm">
                    Most Popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className={`text-lg font-semibold ${plan.highlight ? 'text-indigo-200' : 'text-primary-600'}`}>{plan.name}</h3>
                  <div className="mt-4 flex items-baseline text-5xl font-extrabold tracking-tight">
                    {plan.price}
                    <span className={`ml-1 text-xl font-medium ${plan.highlight ? 'text-slate-400' : 'text-slate-500'}`}>{plan.frequency}</span>
                  </div>
                  <p className={`mt-4 text-sm leading-relaxed ${plan.highlight ? 'text-slate-300' : 'text-slate-600'}`}>{plan.description}</p>
                </div>
                
                <ul className="mt-2 mb-8 flex-1 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <CheckCircle2 className={`h-5 w-5 flex-shrink-0 mr-3 ${plan.highlight ? 'text-indigo-400' : 'text-primary-600'}`} />
                      <span className={`text-sm ${plan.highlight ? 'text-slate-300' : 'text-slate-600'}`}>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Link
                  href="/register"
                  className={`mt-auto block w-full rounded-full py-3 text-center text-sm font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 w-full ${
                    plan.highlight
                      ? 'bg-white text-slate-900 hover:bg-slate-50 focus-visible:outline-white'
                      : 'bg-primary-50 text-primary-700 hover:bg-primary-100 ring-1 ring-inset ring-primary-200/50'
                  }`}
                >
                  Get started
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
