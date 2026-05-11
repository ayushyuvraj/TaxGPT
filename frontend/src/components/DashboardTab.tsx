import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion'
import {
  Map, Users, FileText, ArrowLeftRight,
  Wallet, BookOpen, Layers, Calendar,
  Activity, Sparkles, ChevronRight, Database,
  Shield, TrendingUp, Brain, ArrowRight,
} from 'lucide-react'
import { useHealth } from '../hooks/useHealth'
import { useApiKeyStore } from '../store/apiKeyStore'

type TabType = 'dashboard' | 'mapper' | 'qa-gennext' | 'profile' | 'notice' | 'compare'

interface DashboardTabProps {
  onNavigate: (tab: TabType, query?: string) => void
  onOpenProvider: () => void
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function AnimatedCounter({ to, duration = 1.8, suffix = '' }: { to: number; duration?: number; suffix?: string }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let current = 0
    const steps = 55
    const increment = to / steps
    const intervalMs = (duration * 1000) / steps
    const timer = setInterval(() => {
      current += increment
      if (current >= to) { setVal(to); clearInterval(timer) }
      else setVal(Math.floor(current))
    }, intervalMs)
    return () => clearInterval(timer)
  }, [to, duration])
  return <>{val.toLocaleString('en-IN')}{suffix}</>
}

// ─── Particle field ───────────────────────────────────────────────────────────
function ParticleField() {
  const particles = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2.5 + 0.5,
    opacity: Math.random() * 0.25 + 0.05,
    dur: Math.random() * 10 + 8,
    delay: Math.random() * 5,
  }))
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-indigo-300"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, opacity: p.opacity }}
          animate={{ y: [0, -40, 0], opacity: [p.opacity, p.opacity * 2.5, p.opacity] }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

// ─── Ambient orbs ─────────────────────────────────────────────────────────────
function FloatingOrbs() {
  const orbs = [
    { x: '6%',  y: '12%', size: 380, color: '99,102,241',  opacity: 0.10, dur: 9,  delay: 0 },
    { x: '78%', y: '8%',  size: 280, color: '139,92,246',  opacity: 0.09, dur: 11, delay: 1.5 },
    { x: '88%', y: '65%', size: 320, color: '56,189,248',  opacity: 0.07, dur: 8,  delay: 0.7 },
    { x: '4%',  y: '72%', size: 220, color: '52,211,153',  opacity: 0.06, dur: 13, delay: 2 },
    { x: '52%', y: '88%', size: 200, color: '251,146,60',  opacity: 0.05, dur: 10, delay: 1 },
    { x: '32%', y: '45%', size: 160, color: '167,139,250', opacity: 0.04, dur: 14, delay: 3 },
  ]
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {orbs.map((o, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: o.x, top: o.y,
            width: o.size, height: o.size,
            transform: 'translate(-50%,-50%)',
            background: `radial-gradient(circle, rgba(${o.color},${o.opacity}) 0%, transparent 68%)`,
            filter: 'blur(40px)',
          }}
          animate={{ y: [0, -28, 0], x: [0, 10, 0], scale: [1, 1.07, 1] }}
          transition={{ duration: o.dur, delay: o.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

// ─── 3D Crystal centerpiece ───────────────────────────────────────────────────
function Crystal3D() {
  const [rot, setRot] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let frame: number
    let angle = 0
    const spin = () => {
      angle += 0.4
      setRot({ x: Math.sin(angle * 0.013 * Math.PI) * 14, y: angle % 360 })
      frame = requestAnimationFrame(spin)
    }
    frame = requestAnimationFrame(spin)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div ref={containerRef} className="relative flex items-center justify-center w-48 h-48 shrink-0" style={{ perspective: '600px' }}>
      {/* Outer glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 65%)' }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* 3D rotating cube using CSS preserve-3d */}
      <motion.div
        className="relative"
        style={{ transformStyle: 'preserve-3d', width: 72, height: 72 }}
        animate={{ rotateX: rot.x, rotateY: rot.y }}
        transition={{ type: 'tween', duration: 0.05 }}
      >
        {/* 6 faces of the cube */}
        {[
          { transform: 'translateZ(36px)',                      bg: 'rgba(99,102,241,0.65)' },
          { transform: 'translateZ(-36px) rotateY(180deg)',     bg: 'rgba(139,92,246,0.55)' },
          { transform: 'translateX(36px) rotateY(90deg)',       bg: 'rgba(79,70,229,0.60)' },
          { transform: 'translateX(-36px) rotateY(-90deg)',     bg: 'rgba(109,40,217,0.55)' },
          { transform: 'translateY(-36px) rotateX(90deg)',      bg: 'rgba(129,140,248,0.70)' },
          { transform: 'translateY(36px) rotateX(-90deg)',      bg: 'rgba(167,139,250,0.50)' },
        ].map((face, i) => (
          <div
            key={i}
            style={{
              position: 'absolute', inset: 0, transform: face.transform,
              background: face.bg, border: '1px solid rgba(167,139,250,0.35)',
              borderRadius: 6, backdropFilter: 'blur(2px)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
            }}
          />
        ))}

        {/* Center glow */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 6,
          background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.2) 0%, transparent 60%)',
          transform: 'translateZ(37px)',
        }} />
      </motion.div>

      {/* Orbit ring */}
      <motion.div
        className="absolute rounded-full border border-indigo-500/20"
        style={{ width: 120, height: 120, borderStyle: 'dashed' }}
        animate={{ rotateZ: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
      />

      {/* Satellite dots */}
      {[0, 120, 240].map((deg, i) => (
        <motion.div
          key={i}
          className="absolute w-2.5 h-2.5 rounded-full"
          style={{
            background: ['#818cf8', '#a78bfa', '#38bdf8'][i],
            boxShadow: `0 0 8px ${['rgba(129,140,248,0.8)', 'rgba(167,139,250,0.8)', 'rgba(56,189,248,0.8)'][i]}`,
          }}
          animate={{ rotate: [deg, deg + 360] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear', delay: i * 0 }}
          transformOrigin="60px 60px"
          initial={{ x: Math.cos((deg * Math.PI) / 180) * 60 - 5, y: Math.sin((deg * Math.PI) / 180) * 60 - 5 }}
        />
      ))}
    </div>
  )
}

// ─── Mouse parallax ───────────────────────────────────────────────────────────
function useParallax() {
  const mx = useMotionValue(0.5)
  const my = useMotionValue(0.5)
  const sx = useSpring(mx, { stiffness: 45, damping: 18 })
  const sy = useSpring(my, { stiffness: 45, damping: 18 })
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    mx.set(e.clientX / window.innerWidth)
    my.set(e.clientY / window.innerHeight)
  }, [mx, my])
  return { sx, sy, onMouseMove }
}

// ─── Provider meta ────────────────────────────────────────────────────────────
const PROVIDER_META: Record<string, { displayName: string; color: string; glow: string; defaultModel: string }> = {
  gemini:     { displayName: 'Google Gemini',  color: '#60a5fa', glow: '59,130,246',   defaultModel: 'gemini-2.5-flash' },
  openai:     { displayName: 'OpenAI GPT',     color: '#34d399', glow: '52,211,153',   defaultModel: 'gpt-4o' },
  anthropic:  { displayName: 'Anthropic',      color: '#fb923c', glow: '251,146,60',   defaultModel: 'claude-opus-4-6' },
  openrouter: { displayName: 'OpenRouter',     color: '#a78bfa', glow: '167,139,250',  defaultModel: 'openai/gpt-4o' },
  ollama:     { displayName: 'Ollama (Local)', color: '#94a3b8', glow: '148,163,184',  defaultModel: 'llama3.1' },
}

// ─── 3D Status card ───────────────────────────────────────────────────────────
function StatusCard3D({ label, value, sub, glow, icon, dot, delay, onClick }: {
  label: string; value: string; sub: string; glow: string
  icon: React.ReactNode; dot: string; delay: number; onClick?: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32, scale: 0.88 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 220, damping: 26 }}
      onMouseMove={(e) => {
        if (!ref.current) return
        const r = ref.current.getBoundingClientRect()
        setTilt({
          x: ((e.clientY - r.top  - r.height / 2) / (r.height / 2)) * 13,
          y: -((e.clientX - r.left - r.width  / 2) / (r.width  / 2)) * 13,
        })
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setTilt({ x: 0, y: 0 }); setHovered(false) }}
      onClick={onClick}
      style={{
        perspective: '1200px',
        transformStyle: 'preserve-3d',
        cursor: onClick ? 'pointer' : 'default',
      }}
      whileHover={{ scale: 1.035 }}
      className="relative"
    >
      <motion.div animate={{ rotateX: tilt.x, rotateY: tilt.y }} style={{ transformStyle: 'preserve-3d' }} transition={{ type: 'spring', stiffness: 280, damping: 30 }}>
        {/* Glow shadow */}
        <motion.div
          className="absolute inset-x-4 -bottom-3 h-12 rounded-full blur-2xl"
          animate={{ opacity: hovered ? 0.8 : 0.2 }}
          style={{ background: `rgba(${glow},0.5)` }}
        />
        {/* Card */}
        <div style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
          border: `1px solid ${hovered ? `rgba(${glow},0.45)` : 'rgba(255,255,255,0.08)'}`,
          backdropFilter: 'blur(28px)',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: hovered
            ? `0 32px 64px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(${glow},0.2), inset 0 1px 0 rgba(255,255,255,0.13)`
            : '0 8px 28px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
          transition: 'border-color 0.3s, box-shadow 0.3s',
        }}>
          {/* Top glow stripe */}
          <div style={{ height: 1, background: `linear-gradient(90deg, transparent, rgba(${glow},0.7), transparent)` }} />
          {/* Grid */}
          <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.9) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.9) 1px,transparent 1px)', backgroundSize: '20px 20px' }} />
          {/* Blob */}
          <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: `rgba(${glow},0.18)`, filter: 'blur(20px)' }} />

          <div className="relative z-10 p-6">
            <div className="flex items-start justify-between mb-5">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 14, background: `rgba(${glow},0.16)`, boxShadow: `0 0 20px rgba(${glow},0.22), inset 0 1px 0 rgba(255,255,255,0.12)` }}>
                {icon}
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`block w-2 h-2 rounded-full ${dot}`} />
                <span className="text-[10px] font-bold text-white/25 uppercase tracking-[0.18em]">Live</span>
              </div>
            </div>
            <p className="text-[10px] font-bold text-white/35 uppercase tracking-[0.18em] mb-1.5">{label}</p>
            <p className="text-3xl font-black tracking-tight mb-1.5" style={{ color: `rgb(${glow})`, textShadow: `0 0 28px rgba(${glow},0.45)` }}>{value}</p>
            <p className="text-xs text-white/30 font-mono leading-relaxed">{sub}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Stats banner ─────────────────────────────────────────────────────────────
function StatsBanner({ vectorCount }: { vectorCount?: number }) {
  const stats = [
    { icon: Database,    to: vectorCount ?? 7905, suffix: '',  label: 'Vectors indexed',   glow: '99,102,241' },
    { icon: FileText,    to: 6,                   suffix: '',  label: 'Source PDFs',        glow: '56,189,248' },
    { icon: Shield,      to: 8507,                suffix: 'K+',label: 'Chars parsed (K)',   glow: '52,211,153' },
    { icon: TrendingUp,  to: 80,                  suffix: 'M', label: 'Taxpayers affected', glow: '251,146,60' },
    { icon: Sparkles,    to: 1391,                suffix: '',  label: 'Parent chunks',      glow: '167,139,250' },
  ]
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(24px)',
        borderRadius: 20,
        overflow: 'hidden',
      }}
    >
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.5), rgba(139,92,246,0.5), transparent)' }} />
      <div className="grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-white/[0.05]">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.08, type: 'spring', stiffness: 220, damping: 22 }}
            className="flex flex-col items-center justify-center py-5 px-3 text-center"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 10, background: `rgba(${s.glow},0.13)`, marginBottom: 8 }}>
              <s.icon className="h-3.5 w-3.5" style={{ color: `rgb(${s.glow})` }} />
            </div>
            <p className="text-2xl md:text-3xl font-black tabular-nums tracking-tight" style={{ color: `rgb(${s.glow})`, textShadow: `0 0 24px rgba(${s.glow},0.4)` }}>
              <AnimatedCounter to={s.to} duration={1.7} suffix={s.suffix} />
            </p>
            <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.18em] mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

// ─── 3D Feature card ──────────────────────────────────────────────────────────
function FeatureCard3D({ icon: Icon, color, glow, label, desc, badge, delay, onClick }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  color: string; glow: string; label: string; desc: string; badge?: string; delay: number; onClick: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28, scale: 0.88 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 180, damping: 22 }}
      onMouseMove={(e) => {
        if (!ref.current) return
        const r = ref.current.getBoundingClientRect()
        setTilt({
          x: ((e.clientY - r.top  - r.height / 2) / (r.height / 2)) * 15,
          y: -((e.clientX - r.left - r.width  / 2) / (r.width  / 2)) * 15,
        })
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setTilt({ x: 0, y: 0 }); setHovered(false) }}
      onClick={onClick}
      style={{ perspective: '900px', transformStyle: 'preserve-3d', cursor: 'pointer' }}
      whileTap={{ scale: 0.97 }}
      className="relative h-full"
    >
      <motion.div
        animate={{ rotateX: tilt.x, rotateY: tilt.y }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        style={{ transformStyle: 'preserve-3d', height: '100%' }}
      >
        {/* Drop shadow */}
        <motion.div
          className="absolute inset-x-6 -bottom-4 h-8 rounded-full blur-xl"
          animate={{ opacity: hovered ? 0.65 : 0.12 }}
          style={{ background: `rgba(${glow},0.55)` }}
        />

        <div style={{
          background: hovered
            ? `linear-gradient(145deg, rgba(${glow},0.11) 0%, rgba(255,255,255,0.03) 100%)`
            : 'linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
          border: `1px solid ${hovered ? `rgba(${glow},0.5)` : 'rgba(255,255,255,0.07)'}`,
          backdropFilter: 'blur(22px)',
          borderRadius: 20,
          height: '100%',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: hovered
            ? `0 28px 56px -8px rgba(0,0,0,0.55), 0 0 0 1px rgba(${glow},0.18), inset 0 1px 0 rgba(255,255,255,0.11)`
            : '0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
          transition: 'background 0.25s, border-color 0.25s, box-shadow 0.25s',
        }}>
          {/* Top edge */}
          <motion.div
            style={{ height: 1, background: `linear-gradient(90deg, transparent, rgba(${glow},0.9), transparent)` }}
            animate={{ opacity: hovered ? 1 : 0.25 }}
          />
          {/* Blob */}
          <div style={{ position: 'absolute', top: -12, right: -12, width: 80, height: 80, borderRadius: '50%', background: `rgba(${glow},0.13)`, filter: 'blur(18px)' }} />

          <div className="relative z-10 p-5 flex flex-col flex-1">
            {/* 3D floating icon */}
            <motion.div
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 14, background: `rgba(${glow},0.16)`, boxShadow: `0 0 18px rgba(${glow},0.18), inset 0 1px 0 rgba(255,255,255,0.12)`, marginBottom: 16, translateZ: 20 }}
              animate={{ y: hovered ? -3 : 0, translateZ: hovered ? 30 : 10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <Icon className="h-5 w-5" style={{ color }} />
            </motion.div>

            <p className="text-sm font-bold text-white/90 mb-1.5 leading-snug">{label}</p>
            <p className="text-xs text-white/32 leading-relaxed flex-1">{desc}</p>

            {badge && (
              <div className="mt-3">
                <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: `rgba(${glow},0.18)`, color }}>
                  {badge}
                </span>
              </div>
            )}

            <motion.div
              className="mt-4 flex items-center gap-1 text-xs font-bold"
              style={{ color: `rgba(${glow},0.7)` }}
              animate={{ x: hovered ? 5 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              Open <ArrowRight className="h-3 w-3" />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Key changes ──────────────────────────────────────────────────────────────
const CHANGES = [
  { icon: Wallet,         glow: '167,139,250', color: '#a78bfa', label: 'Section 80C → Section 123',   sub: 'Deductions now under Chapter VI-A',        query: '80C' },
  { icon: BookOpen,       glow: '148,163,184', color: '#94a3b8', label: 'Assessment Year → Tax Year',   sub: 'Unified year terminology (Section 3)',      query: 'Assessment Year' },
  { icon: Layers,         glow: '56,189,248',  color: '#38bdf8', label: 'Sections 192-194T → §393',     sub: 'All TDS consolidated into one table',       query: 'TDS' },
  { icon: FileText,       glow: '99,102,241',  color: '#6366f1', label: 'Section 139 → Section 263',    sub: 'Return filing deadlines preserved',         query: '139' },
  { icon: Calendar,       glow: '129,140,248', color: '#818cf8', label: 'Section 87A → Section 156',    sub: 'Tax rebate up to ₹12L income',             query: '87A' },
]

// ─── Features ─────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: Brain,          color: '#fbbf24', glow: '251,191,36',  label: 'AI Assistant GenNext', desc: 'Zero-hallucination streaming AI grounded in the Act. Multi-conversation, intent-aware, doc upload.', tab: 'qa-gennext' as TabType, badge: 'RAG · Streaming' },
  { icon: Map,            color: '#a78bfa', glow: '167,139,250', label: 'Section Mapper',       desc: 'Map any old 1961 section to its 2025 equivalent — offline, instant.', tab: 'mapper' as TabType },
  { icon: Users,          color: '#34d399', glow: '52,211,153',  label: 'Profile Analysis',     desc: 'Personalised tax impact: salaried, NRI, investor, freelancer, business.', tab: 'profile' as TabType },
  { icon: FileText,       color: '#f87171', glow: '248,113,113', label: 'Notice Decoder',       desc: 'Decode any tax notice or demand with severity rating.', tab: 'notice' as TabType },
  { icon: ArrowLeftRight, color: '#38bdf8', glow: '56,189,248',  label: 'Compare Acts',         desc: 'Side-by-side clause comparison: 1961 vs 2025 Acts.', tab: 'compare' as TabType },
]

// ─── Main ─────────────────────────────────────────────────────────────────────
export function DashboardTab({ onNavigate, onOpenProvider }: DashboardTabProps) {
  const { data: health } = useHealth()
  const { provider, openrouterModel, ollamaModel } = useApiKeyStore()
  const meta = PROVIDER_META[provider] ?? PROVIDER_META.gemini
  const activeModel = provider === 'openrouter' ? openrouterModel : provider === 'ollama' ? ollamaModel : meta.defaultModel
  const { sx, sy, onMouseMove } = useParallax()

  const heroOrbX  = useTransform(sx, [0, 1], ['-16px', '16px'])
  const heroOrbY  = useTransform(sy, [0, 1], ['-10px', '10px'])
  const heroOrbX2 = useTransform(sx, [0, 1], ['10px',  '-10px'])
  const heroOrbY2 = useTransform(sy, [0, 1], ['7px',   '-7px'])

  const statusCards = [
    {
      label: 'API Status',
      value: health?.status === 'healthy' ? 'Healthy' : 'Offline',
      sub: health?.status === 'healthy' ? 'All systems operational' : 'Check backend',
      dot: health?.status === 'healthy' ? 'bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.9)]' : 'bg-red-400',
      glow: health?.status === 'healthy' ? '52,211,153' : '248,113,113',
      icon: <Activity className="h-5 w-5" style={{ color: health?.status === 'healthy' ? '#34d399' : '#f87171' }} />,
      onClick: undefined as (() => void) | undefined,
    },
    {
      label: 'Knowledge Index',
      value: health?.index_ready ? 'Ready' : (health?.vector_count === 0 ? 'Empty' : 'Building'),
      sub: health?.index_ready ? `${(health.vector_count ?? 0).toLocaleString('en-IN')} vectors · 6 PDFs` : 'Run ingestion',
      dot: health?.index_ready ? 'bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.9)]' : 'bg-amber-400 animate-pulse',
      glow: health?.index_ready ? '56,189,248' : '251,191,36',
      icon: <Sparkles className="h-5 w-5" style={{ color: health?.index_ready ? '#38bdf8' : '#fbbf24' }} />,
      onClick: undefined as (() => void) | undefined,
    },
    {
      label: 'AI Provider',
      value: meta.displayName,
      sub: activeModel,
      dot: 'bg-violet-400 animate-pulse shadow-[0_0_10px_rgba(167,139,250,0.9)]',
      glow: meta.glow,
      icon: <Brain className="h-5 w-5" style={{ color: meta.color }} />,
      onClick: onOpenProvider,
    },
  ]

  return (
    <div className="relative pb-8 space-y-6" onMouseMove={onMouseMove}>
      <FloatingOrbs />
      <ParticleField />

      {/* Status cards */}
      <div className="relative z-10 grid grid-cols-1 gap-4 md:grid-cols-3">
        {statusCards.map((c, i) => <StatusCard3D key={c.label} {...c} delay={i * 0.09} />)}
      </div>

      {/* Stats banner */}
      <div className="relative z-10">
        <StatsBanner vectorCount={health?.vector_count} />
      </div>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.55 }}
        className="relative z-10 overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(99,102,241,0.09) 0%, rgba(139,92,246,0.05) 50%, rgba(0,0,0,0) 100%)',
          border: '1px solid rgba(99,102,241,0.2)',
          backdropFilter: 'blur(36px)',
          borderRadius: 24,
          boxShadow: '0 48px 96px -24px rgba(0,0,0,0.65), 0 0 0 1px rgba(99,102,241,0.12), inset 0 1px 0 rgba(255,255,255,0.09)',
        }}
      >
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.6) 1px,transparent 1px)', backgroundSize: '36px 36px' }} />
        {/* Top edge */}
        <div style={{ position: 'absolute', top: 0, insetInline: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.9), rgba(139,92,246,0.9), transparent)' }} />

        {/* Parallax depth orbs */}
        <motion.div
          style={{ x: heroOrbX, y: heroOrbY, position: 'absolute', top: -60, right: -40, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.16) 0%, transparent 68%)', filter: 'blur(48px)', pointerEvents: 'none' }}
        />
        <motion.div
          style={{ x: heroOrbX2, y: heroOrbY2, position: 'absolute', bottom: -40, left: '25%', width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.11) 0%, transparent 68%)', filter: 'blur(40px)', pointerEvents: 'none' }}
        />

        <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center gap-10">
          {/* Left */}
          <div className="flex-1 min-w-0">
            <motion.div
              initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-2 mb-5"
            >
              <span className="block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" style={{ boxShadow: '0 0 10px rgba(52,211,153,0.9)' }} />
              <span className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-[0.22em]">Income Tax Act 2025 · Effective 1 April 2026</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[1.08] tracking-tight mb-4"
            >
              India's Tax Law<br />
              <span style={{ backgroundImage: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 45%, #c084fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Rebuilt From Scratch.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
              className="text-[15px] text-white/42 max-w-lg leading-relaxed mb-8"
            >
              Every section, form, and term changed in 2025. TaxGPT navigates the new Act with zero-hallucination AI, grounded in real law.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.52 }}
              className="flex flex-wrap gap-3"
            >
              <motion.button
                whileHover={{ scale: 1.05, y: -3 }} whileTap={{ scale: 0.97 }}
                onClick={() => onNavigate('qa-gennext')}
                className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-extrabold text-white"
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 0 36px rgba(99,102,241,0.5), 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)' }}
              >
                <Brain className="h-4 w-4" />
                Ask GenNext AI
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, y: -3 }} whileTap={{ scale: 0.97 }}
                onClick={() => onNavigate('mapper')}
                className="flex items-center gap-2 rounded-xl border px-6 py-3 text-sm font-extrabold text-white/80 transition-all"
                style={{ border: '1px solid rgba(255,255,255,0.13)', background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.11)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)' }}
              >
                <Map className="h-4 w-4" />
                Section Mapper
              </motion.button>
            </motion.div>
          </div>

          {/* 3D Crystal + quick facts */}
          <div className="shrink-0 flex flex-col items-center gap-6">
            <Crystal3D />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45, type: 'spring', stiffness: 180, damping: 22 }}
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)', borderRadius: 16, padding: '16px 20px', width: 220 }}
            >
              <p className="text-[9px] font-extrabold text-white/25 uppercase tracking-[0.2em] mb-3">Quick Facts · 2025</p>
              {[
                { k: 'Total Sections', v: '536+',      c: '#818cf8' },
                { k: 'TDS Table',      v: '§393',      c: '#38bdf8' },
                { k: 'Tax Rebate',     v: '₹12L',      c: '#34d399' },
                { k: 'Std. Deduction', v: '₹75,000',   c: '#fbbf24' },
                { k: 'From',           v: '1 Apr 2026', c: '#f87171' },
              ].map(row => (
                <div key={row.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBlock: 6, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="text-[11px] text-white/30">{row.k}</span>
                  <span className="text-[11px] font-extrabold tabular-nums" style={{ color: row.c }}>{row.v}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* ── Key Changes ───────────────────────────────────────────────────── */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[15px] font-extrabold text-white/85">Key Changes at a Glance</h2>
            <p className="text-[11px] text-white/28 mt-0.5">Click any row to explore in Section Mapper</p>
          </div>
          <motion.button whileHover={{ x: 3 }} onClick={() => onNavigate('mapper')}
            className="flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
            All mappings <ChevronRight className="h-3.5 w-3.5" />
          </motion.button>
        </div>
        <div className="space-y-2">
          {CHANGES.map((c, i) => (
            <motion.button
              key={c.label}
              initial={{ opacity: 0, x: -22 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.06, type: 'spring', stiffness: 200, damping: 22 }}
              whileHover={{ x: 7, scale: 1.012 }} whileTap={{ scale: 0.99 }}
              onClick={() => onNavigate('mapper', c.query)}
              className="w-full flex items-center gap-4 text-left group"
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(18px)', borderRadius: 14, padding: '13px 15px', transition: 'background 0.2s, border-color 0.2s' }}
              onMouseEnter={e => { const t = e.currentTarget as HTMLButtonElement; t.style.background = `rgba(${c.glow},0.09)`; t.style.borderColor = `rgba(${c.glow},0.28)` }}
              onMouseLeave={e => { const t = e.currentTarget as HTMLButtonElement; t.style.background = 'rgba(255,255,255,0.025)'; t.style.borderColor = 'rgba(255,255,255,0.06)' }}
            >
              <span className="w-7 h-7 rounded-lg border border-white/8 flex items-center justify-center text-[10px] font-black text-white/20 shrink-0">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `rgba(${c.glow},0.13)` }}>
                <c.icon className="h-4 w-4" style={{ color: c.color }} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-bold text-white/85 truncate">{c.label}</span>
                <span className="block text-[11px] text-white/28 truncate mt-0.5">{c.sub}</span>
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity shrink-0" style={{ color: c.color }}>
                Explore <ChevronRight className="h-3 w-3" />
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <div className="relative z-10">
        <div className="mb-4">
          <h2 className="text-[15px] font-extrabold text-white/85">What TaxGPT Can Do</h2>
          <p className="text-[11px] text-white/28 mt-0.5">Six powerful tools for the new tax era</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <FeatureCard3D key={f.label} icon={f.icon} color={f.color} glow={f.glow}
              label={f.label} desc={f.desc} badge={f.badge}
              delay={0.12 + i * 0.07} onClick={() => onNavigate(f.tab)} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
        className="relative z-10 text-center text-[10px] text-white/18 pt-2">
        Built by Ayush Yuvraj · Knowledge base: Income Tax Act 2025, Rules 1962 & 2026, FAQs & Transitions
      </motion.p>
    </div>
  )
}
