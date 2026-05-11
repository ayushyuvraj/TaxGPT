import { useState, useRef, useEffect, useMemo } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion'
import {
  BarChart3, FileText, Users, Bell,
  Menu, Shield, Zap, Map,
  CheckCircle2, AlertCircle, Clock,
  ArrowLeftRight, X,
} from 'lucide-react'
import { queryClient } from './lib/queryClient'
import { useApiKeyStore } from './store/apiKeyStore'
import { useProfileSnapshotStore } from './store/profileSnapshotStore'
import { DashboardTab } from './components/DashboardTab'
import { MapperTab } from './components/MapperTab'
import { CompareTab } from './components/CompareTab'
import { QATab } from './components/QATab'
import { QAGenNextTab } from './components/QAGenNextTab'
import { ProfileTab } from './components/ProfileTab'
import { NoticeTab } from './components/NoticeTab'
import { ParticleField } from './components/ParticleField'
import { APIKeyManager } from './components/APIKeyManager'

type TabType = 'dashboard' | 'mapper' | 'qa-gennext' | 'profile' | 'notice' | 'compare'
const cn = (...c: (string | boolean | undefined)[]) => c.filter(Boolean).join(' ')

// ─── Cursor glow ──────────────────────────────────────────────────────────────
function CursorGlow() {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 80, damping: 20 })
  const sy = useSpring(y, { stiffness: 80, damping: 20 })
  useEffect(() => {
    const move = (e: MouseEvent) => { x.set(e.clientX); y.set(e.clientY) }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [x, y])
  return (
    <motion.div className="fixed pointer-events-none z-50 mix-blend-screen"
      style={{ left: sx, top: sy, width: 400, height: 400, x: '-50%', y: '-50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', borderRadius: '50%' }} />
  )
}

// ─── Aurora blobs ─────────────────────────────────────────────────────────────
function AuroraBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <motion.div className="absolute rounded-full blur-3xl opacity-20"
        style={{ width: 700, height: 700, top: '-20%', left: '-15%', background: 'radial-gradient(circle, #4f46e5, #7c3aed)' }}
        animate={{ x: [0, 60, 0], y: [0, 40, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute rounded-full blur-3xl opacity-15"
        style={{ width: 600, height: 600, bottom: '-20%', right: '-10%', background: 'radial-gradient(circle, #0ea5e9, #6366f1)' }}
        animate={{ x: [0, -50, 0], y: [0, -30, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 3 }} />
      <motion.div className="absolute rounded-full blur-3xl opacity-10"
        style={{ width: 400, height: 400, top: '40%', left: '50%', background: 'radial-gradient(circle, #8b5cf6, #06b6d4)' }}
        animate={{ x: [0, 30, -30, 0], y: [0, -40, 20, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 6 }} />
    </div>
  )
}

// ─── Notifications ────────────────────────────────────────────────────────────
type Notif = { id: string; title: string; message: string; time: string; read: boolean; type: 'warning' | 'success' | 'info' }
const INITIAL_NOTIFS: Notif[] = []

// ─── Main app ─────────────────────────────────────────────────────────────────
function AppContent() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [mapperQuery, setMapperQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showNotifications, setShowNotifications] = useState(false)
  const [providerOpen, setProviderOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notif[]>(INITIAL_NOTIFS)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const { provider, loadFromBackend } = useApiKeyStore()
  const snapshotStore = useProfileSnapshotStore()

  const urgentDeadlines = useMemo(() => {
    const seen = new Set<string>()
    return snapshotStore.snapshots
      .flatMap(s => s.taxData.deadlines ?? [])
      .filter(d => {
        if (seen.has(d.label)) return false
        seen.add(d.label)
        return d.days_away >= 0 && d.days_away <= 7
      })
      .sort((a, b) => a.days_away - b.days_away)
  }, [snapshotStore.snapshots])

  const criticalDeadlines = urgentDeadlines.filter(d => d.days_away <= 3)
  const showBanner = criticalDeadlines.length > 0 && !bannerDismissed

  // Load API keys from backend on app startup
  useEffect(() => {
    loadFromBackend()
  }, [loadFromBackend])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const unread = notifs.filter(n => !n.read).length

  const handleNavigate = (tab: TabType, query?: string) => {
    setActiveTab(tab)
    if (query) setMapperQuery(query)
  }

  const nav: { id: TabType; icon: React.ComponentType<{ className?: string }>; label: string; badge?: string }[] = [
    { id: 'dashboard', icon: BarChart3,      label: 'Dashboard' },
    { id: 'mapper',    icon: Map,            label: 'Section Mapper',   badge: 'Live' },
    { id: 'qa-gennext', icon: Zap,           label: 'AI Assistant GenNext', badge: 'Beta' },
    { id: 'profile',   icon: Users,          label: 'Profile Analysis', badge: 'Live' },
    { id: 'notice',    icon: FileText,       label: 'Notice Decoder',   badge: 'Live' },
    { id: 'compare',   icon: ArrowLeftRight, label: 'Compare Acts',     badge: 'New' },
  ]

  const pageTitle: Record<TabType, string> = {
    dashboard: 'Dashboard', mapper: 'Section Mapper',
    'qa-gennext': 'AI Assistant GenNext',
    profile: 'Profile Analysis', notice: 'Notice Decoder', compare: 'Compare Acts',
  }

  return (
    <div className="h-screen overflow-hidden text-white flex" style={{ background: '#070b14' }}>
      <AuroraBackground />
      <ParticleField />
      <CursorGlow />

      {/* ── Sidebar ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -280, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 35 }}
            className="fixed left-0 top-0 z-40 h-screen w-64"
            style={{ background: 'rgba(7,11,20,0.9)', borderRight: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(24px)' }}
          >
            <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-indigo-500/30 to-transparent" />
            <div className="flex h-full flex-col p-5">
              <motion.div className="mb-8 flex items-center gap-3" whileHover={{ x: 2 }}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl text-lg font-black text-white"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}>₹</div>
                <div>
                  <h1 className="text-lg font-black tracking-tight">TaxGPT</h1>
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">India · 2025 Act</p>
                </div>
              </motion.div>

              <nav className="flex-1 space-y-1">
                {nav.map(item => {
                  const active = activeTab === item.id
                  return (
                    <motion.button key={item.id} onClick={() => setActiveTab(item.id)}
                      whileHover={{ x: 4 }} whileTap={{ scale: 0.97 }}
                      className={cn('relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                        active ? 'text-white' : 'text-gray-500 hover:text-gray-300')}
                    >
                      {active && (
                        <motion.div layoutId="activeNav" className="absolute inset-0 rounded-xl"
                          style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.15))', border: '1px solid rgba(99,102,241,0.3)' }}
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
                      )}
                      <item.icon className={cn('relative z-10 h-4 w-4 shrink-0', active ? 'text-indigo-400' : '')} />
                      <span className="relative z-10 flex-1 text-left">{item.label}</span>
                      {item.id === 'profile' && urgentDeadlines.length > 0 ? (
                        <motion.span
                          animate={{ scale: [1, 1.15, 1] }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                          className="relative z-10 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
                        >
                          {urgentDeadlines.length}
                        </motion.span>
                      ) : item.badge ? (
                        <span className={cn('relative z-10 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                          item.badge === 'Live' ? 'bg-emerald-500/15 text-emerald-400' :
                          item.badge === 'New'  ? 'bg-indigo-500/20 text-indigo-400' :
                          item.badge === 'Beta' ? 'bg-amber-500/15 text-amber-400' : 'bg-white/5 text-gray-500'
                        )}>{item.badge}</span>
                      ) : null}
                    </motion.button>
                  )
                })}
              </nav>

              <motion.div whileHover={{ scale: 1.02 }} onClick={() => setActiveTab('qa-gennext')}
                className="rounded-xl p-4 border border-indigo-500/20 cursor-pointer"
                style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(139,92,246,0.08))' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-semibold">AI Assistant GenNext</span>
                </div>
                <p className="text-xs text-gray-500 mb-3 leading-relaxed">Instant answers on new Income Tax Act 2025</p>
                <div className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 16px rgba(99,102,241,0.3)' }}>
                  Ask TaxGPT ›
                </div>
              </motion.div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main column ── */}
      <motion.div
        animate={{ marginLeft: sidebarOpen ? 256 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 35 }}
        className="flex flex-col flex-1 h-screen min-w-0"
      >
        {/* Header */}
        <header className="shrink-0 z-30 px-6 py-4" style={{ background: 'rgba(7,11,20,0.85)', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(24px)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white transition-all">
                <Menu className="h-5 w-5" />
              </motion.button>
              <div>
                <h2 className="text-lg font-bold">{pageTitle[activeTab]}</h2>
                <p className="text-[11px] text-gray-500">Income Tax Act 2025 · India</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative" ref={notifRef}>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative rounded-xl border border-white/8 bg-white/[0.03] p-2.5 hover:bg-white/8 transition-all">
                  <Bell className="h-4 w-4 text-gray-400" />
                  {unread > 0 && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold">
                      {unread}
                    </motion.span>
                  )}
                </motion.button>
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-white/8 z-50 overflow-hidden"
                      style={{ background: 'rgba(10,14,26,0.98)', backdropFilter: 'blur(24px)' }}>
                      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm">Notifications</h3>
                          {unread > 0 && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold">{unread}</span>}
                        </div>
                        {notifs.length > 0 && (
                          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => setNotifs([])}
                            className="text-[11px] font-medium text-gray-500 hover:text-red-400 transition-colors">
                            Clear all
                          </motion.button>
                        )}
                      </div>
                      <div className="p-3 space-y-2">
                        <AnimatePresence>
                          {notifs.length === 0 ? (
                            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                              className="flex flex-col items-center justify-center py-8 gap-2">
                              <Bell className="h-8 w-8 text-gray-700" />
                              <p className="text-xs text-gray-600">No notifications</p>
                            </motion.div>
                          ) : notifs.map(n => (
                            <motion.div key={n.id} layout initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20, transition: { duration: 0.15 } }} whileHover={{ x: 2 }}
                              className={cn('rounded-xl border p-3 cursor-pointer',
                                n.read ? 'border-white/5 bg-white/[0.02]' : 'border-indigo-500/20 bg-indigo-500/5')}>
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <p className="text-sm font-medium">{n.title}</p>
                                {n.type === 'warning' && <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                                {n.type === 'success' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                                {n.type === 'info'    && <Clock className="h-3.5 w-3.5 text-sky-400 shrink-0" />}
                              </div>
                              <p className="text-xs text-gray-500">{n.message}</p>
                              <p className="text-[10px] text-gray-600 mt-1">{n.time}</p>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => setProviderOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-gray-400 hover:text-gray-200 hover:bg-white/8 transition-all capitalize">
                {provider}
              </motion.button>

              <div className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-gray-500">
                <Shield className="h-3.5 w-3.5 text-indigo-400" />
                Secured
              </div>
            </div>
          </div>
        </header>

        {/* Deadline urgency banner */}
        <AnimatePresence>
          {showBanner && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="shrink-0 overflow-hidden"
            >
              <div className="flex items-center justify-between gap-3 border-b border-amber-500/20 bg-amber-500/8 px-6 py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <motion.div
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                  </motion.div>
                  <span className="text-xs font-semibold text-amber-300">
                    {criticalDeadlines[0].days_away === 0
                      ? `${criticalDeadlines[0].label} is due today`
                      : `${criticalDeadlines[0].label} — ${criticalDeadlines[0].days_away} day${criticalDeadlines[0].days_away > 1 ? 's' : ''} left`}
                    {criticalDeadlines.length > 1 && (
                      <span className="text-amber-400/70"> · +{criticalDeadlines.length - 1} more</span>
                    )}
                  </span>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className="shrink-0 text-[11px] font-semibold text-amber-400 underline underline-offset-2 hover:text-amber-300 transition-colors"
                  >
                    View Profile →
                  </button>
                </div>
                <button
                  onClick={() => setBannerDismissed(true)}
                  className="shrink-0 rounded-lg p-1 text-amber-500 hover:bg-amber-500/15 hover:text-amber-300 transition-all"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab content */}
        <main className={`flex-1 overflow-hidden ${activeTab === 'qa-gennext' ? '' : 'p-6'}`}>
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div key="dashboard" className="h-full overflow-y-auto"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}>
                <DashboardTab onNavigate={handleNavigate} onOpenProvider={() => setProviderOpen(true)} />
              </motion.div>
            )}
            {activeTab === 'mapper' && (
              <motion.div key="mapper" className="h-full"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}>
                <MapperTab initialQuery={mapperQuery} />
              </motion.div>
            )}
            {activeTab === 'qa-gennext' && (
              <motion.div key="qa-gennext" className="h-full"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}>
                <QAGenNextTab onOpenSettings={() => setProviderOpen(true)} />
              </motion.div>
            )}
            {activeTab === 'profile' && (
              <motion.div key="profile" className="h-full overflow-y-auto"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}>
                <ProfileTab onOpenSettings={() => setProviderOpen(true)} />
              </motion.div>
            )}
            {activeTab === 'notice' && (
              <motion.div key="notice" className="h-full"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}>
                <NoticeTab onOpenSettings={() => setProviderOpen(true)} />
              </motion.div>
            )}
            {activeTab === 'compare' && (
              <motion.div key="compare" className="h-full"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}>
                <CompareTab />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </motion.div>

      <APIKeyManager open={providerOpen} onClose={() => setProviderOpen(false)} />
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}
