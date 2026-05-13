import Link from 'next/link';
import {
  Building2, Shield, Calendar, Users, FileText, TrendingUp,
  Globe, ChevronRight, CheckCircle, ArrowRight, BarChart3,
  Lock, Zap, GitBranch,
} from 'lucide-react';

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Building2,
    title: 'Entity Registry',
    desc: 'Maintain a single source of truth for every legal entity across every jurisdiction — incorporation details, status, hierarchy, and history.',
  },
  {
    icon: GitBranch,
    title: 'Corporate Structure',
    desc: 'Visualise your full group structure as an interactive org chart. Ownership percentages, subsidiary chains, and cross-holdings at a glance.',
  },
  {
    icon: Shield,
    title: 'Compliance Tracker',
    desc: 'Never miss a filing deadline. Track obligations by regulator, assign owners, and mark completions with a full audit trail.',
  },
  {
    icon: Calendar,
    title: 'Key Dates Calendar',
    desc: 'One unified calendar for compliance deadlines, license renewals, board meetings, and custom filing windows — across all entities.',
  },
  {
    icon: Users,
    title: 'Board Meetings',
    desc: 'Schedule meetings, manage attendees, track quorum, upload packs, and record resolutions — all linked to the right entity.',
  },
  {
    icon: FileText,
    title: 'Document Vault',
    desc: 'Store constitutional documents, filings, and board packs against the right entity. Versioned, categorised, and always accessible.',
  },
  {
    icon: TrendingUp,
    title: 'Regulatory Capital',
    desc: 'Monitor capital adequacy in real time. Get alerts before your buffer drops below threshold — before your regulator notices.',
  },
  {
    icon: Lock,
    title: 'Role-Based Access',
    desc: 'Legal sees what legal needs. Finance sees what finance needs. Super admins control everything. Permissions enforced at every layer.',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Create your organisation',
    desc: 'Sign up in under two minutes. Add your org name and your first account. No credit card required to start.',
  },
  {
    num: '02',
    title: 'Import your entities',
    desc: 'Add entities one by one or bulk-import from a spreadsheet. Set up parent–subsidiary relationships instantly.',
  },
  {
    num: '03',
    title: 'Invite your team',
    desc: 'Add legal, finance, and compliance colleagues with the right role. Everyone sees only what they need.',
  },
];

const PLANS = [
  {
    name: 'Starter',
    price: 'Free',
    sub: 'forever',
    desc: 'For small groups getting organised.',
    features: ['Up to 5 entities', '3 team members', 'Compliance tracker', 'Board meetings', 'Key dates calendar'],
    cta: 'Get started free',
    href: '/signup',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$199',
    sub: 'per month',
    desc: 'For growing groups with real complexity.',
    features: ['Up to 50 entities', 'Unlimited members', 'Document vault', 'Regulatory capital', 'Shareholding register', 'Audit log', 'Slack alerts'],
    cta: 'Start free trial',
    href: '/signup?plan=pro',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    sub: 'contact us',
    desc: 'For regulated institutions and fund groups.',
    features: ['Unlimited entities', 'SSO / SAML', 'Dedicated support', 'Custom data retention', 'SLA guarantee', 'On-prem option'],
    cta: 'Talk to us',
    href: 'mailto:hello@governanceos.app',
    highlight: false,
  },
];

const STATS = [
  { value: '150+', label: 'Jurisdictions supported' },
  { value: '35+', label: 'Entity types' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: 'SOC 2', label: 'Compliant infrastructure' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Globe className="w-[18px] h-[18px] text-white" />
            </div>
            <span className="font-semibold text-gray-900 text-sm">GovernanceOS</span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm text-gray-500">
            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium">
              Sign in
            </Link>
            <Link href="/signup"
              className="text-sm font-medium px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 to-slate-900 text-white">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-28 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-8">
            <Zap className="w-3.5 h-3.5" />
            Corporate governance — finally under control
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6 max-w-3xl mx-auto">
            One platform for your{' '}
            <span className="text-indigo-400">entire group structure</span>
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            GovernanceOS centralises entity management, compliance tracking, board meetings,
            and regulatory filings across every subsidiary — in every jurisdiction.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors shadow-lg shadow-indigo-900/40 text-sm">
              Start for free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl transition-colors text-sm">
              Sign in to your account
            </Link>
          </div>

          <p className="mt-6 text-xs text-slate-500">No credit card required · 5 entities free forever</p>
        </div>

        {/* product mockup */}
        <div className="relative max-w-5xl mx-auto px-6 pb-0">
          <div className="bg-slate-800 rounded-t-2xl border border-slate-700 border-b-0 shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700 bg-slate-900/60">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-slate-600" />
                <div className="w-3 h-3 rounded-full bg-slate-600" />
                <div className="w-3 h-3 rounded-full bg-slate-600" />
              </div>
              <div className="flex-1 mx-4 bg-slate-700/60 rounded-md h-6 flex items-center px-3">
                <span className="text-xs text-slate-400">app.governanceos.com/dashboard</span>
              </div>
            </div>
            <div className="flex" style={{ minHeight: 300 }}>
              <div className="w-48 bg-slate-900 p-4 shrink-0 space-y-1">
                {['Dashboard','Entities','Org Chart','Directors','Board Meetings','Key Dates','Compliance','Licenses'].map((item, i) => (
                  <div key={item}
                    className={`px-3 py-1.5 rounded-lg text-xs ${i === 0 ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>
                    {item}
                  </div>
                ))}
              </div>
              <div className="flex-1 p-6 space-y-4">
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Total Entities', val: '34', color: 'border-indigo-500/20 bg-indigo-500/10' },
                    { label: 'Active',          val: '28', color: 'border-emerald-500/20 bg-emerald-500/10' },
                    { label: 'Due this month',  val: '7',  color: 'border-orange-500/20 bg-orange-500/10' },
                    { label: 'Alerts',          val: '3',  color: 'border-red-500/20 bg-red-500/10' },
                  ].map(c => (
                    <div key={c.label} className={`rounded-xl border p-3 ${c.color}`}>
                      <p className="text-lg font-bold text-white">{c.val}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{c.label}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-700/30 rounded-xl border border-slate-700 p-4">
                    <p className="text-xs font-semibold text-slate-400 mb-3">Upcoming deadlines</p>
                    {['VAT Return — Malta','Annual Report — UK','AML Filing — Cyprus'].map(d => (
                      <div key={d} className="flex items-center gap-2 py-1.5 border-b border-slate-700/50 last:border-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                        <span className="text-xs text-slate-300">{d}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-slate-700/30 rounded-xl border border-slate-700 p-4">
                    <p className="text-xs font-semibold text-slate-400 mb-3">Entity health</p>
                    {[
                      { name: 'ML Holdings UK',     score: 94, color: 'bg-emerald-500' },
                      { name: 'ML Finance Ltd',     score: 71, color: 'bg-yellow-500' },
                      { name: 'ML Cyprus Holding',  score: 88, color: 'bg-emerald-500' },
                    ].map(e => (
                      <div key={e.name} className="mb-2 last:mb-0">
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-slate-300">{e.name}</span>
                          <span className="text-xs text-slate-400">{e.score}</span>
                        </div>
                        <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${e.color}`} style={{ width: `${e.score}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <section className="bg-slate-950 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(s => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-bold text-white">{s.value}</p>
              <p className="text-sm text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3">Platform</p>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything your governance team needs</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Built for in-house legal, compliance, and finance teams managing
              multi-entity structures in regulated industries.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(f => (
              <div key={f.title}
                className="group p-6 rounded-2xl border border-gray-100 hover:border-indigo-100 hover:shadow-md hover:shadow-indigo-50 transition-all bg-white">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center mb-4 transition-colors">
                  <f.icon className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3">Getting started</p>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Up and running in minutes</h2>
            <p className="text-lg text-gray-500">No lengthy onboarding. No implementation project. Just sign up and go.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map(step => (
              <div key={step.num} className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
                <div className="text-5xl font-black text-gray-100 mb-4 leading-none">{step.num}</div>
                <h3 className="font-semibold text-gray-900 mb-2 text-lg">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-gray-500">Start free. Scale as your group grows.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-start max-w-5xl mx-auto">
            {PLANS.map(plan => (
              <div key={plan.name}
                className={`rounded-2xl p-8 border transition-all ${plan.highlight
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xl shadow-indigo-100 scale-105'
                  : 'bg-white border-gray-100 shadow-sm hover:shadow-md'}`}>
                <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${plan.highlight ? 'text-indigo-200' : 'text-indigo-600'}`}>
                  {plan.name}
                </p>
                <div className="flex items-end gap-1 mb-1">
                  <span className={`text-4xl font-black ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                    {plan.price}
                  </span>
                  {plan.sub !== 'forever' && plan.sub !== 'contact us' && (
                    <span className={`text-sm mb-2 ${plan.highlight ? 'text-indigo-200' : 'text-gray-400'}`}>
                      /{plan.sub}
                    </span>
                  )}
                </div>
                <p className={`text-sm mb-6 ${plan.highlight ? 'text-indigo-200' : 'text-gray-500'}`}>{plan.desc}</p>

                <ul className="space-y-3 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <CheckCircle className={`w-4 h-4 shrink-0 ${plan.highlight ? 'text-indigo-200' : 'text-emerald-500'}`} />
                      <span className={plan.highlight ? 'text-indigo-100' : 'text-gray-600'}>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link href={plan.href}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-colors ${plan.highlight
                    ? 'bg-white text-indigo-600 hover:bg-indigo-50'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                  {plan.cta} <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-slate-950">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Take control of your group structure
          </h2>
          <p className="text-lg text-slate-400 mb-10">
            Join governance and compliance teams who use GovernanceOS to stay ahead of filings,
            regulators, and board deadlines — across every entity, every jurisdiction.
          </p>
          <Link href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-900/30 text-sm">
            Get started for free <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="mt-4 text-xs text-slate-600">No credit card · 5 entities free forever · Cancel anytime</p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-950 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <Globe className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-white text-sm">GovernanceOS</span>
              </div>
              <p className="text-xs text-slate-500 max-w-xs">
                Corporate entity governance for regulated financial institutions and complex group structures.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm text-slate-500">
              <Link href="/login"    className="hover:text-slate-300 transition-colors">Sign in</Link>
              <Link href="/signup"   className="hover:text-slate-300 transition-colors">Sign up</Link>
              <a href="#features"    className="hover:text-slate-300 transition-colors">Features</a>
              <a href="#pricing"     className="hover:text-slate-300 transition-colors">Pricing</a>
              <a href="mailto:hello@governanceos.app" className="hover:text-slate-300 transition-colors">Contact</a>
              <Link href="/dashboard" className="hover:text-slate-300 transition-colors">Dashboard</Link>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-600">© {new Date().getFullYear()} GovernanceOS. All rights reserved.</p>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>99.9% uptime · SOC 2 compliant infrastructure</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
