import { useEffect, useRef, useState } from 'react'

interface AnimatedCounterProps {
  value: number
  prefix?: string
  suffix?: string
  duration?: number
  className?: string
  masked?: boolean
}

export function AnimatedCounter({
  value, prefix = '', suffix = '', duration = 1500, className = '', masked = false,
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0)
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (masked) { setDisplay(value); return }
    startRef.current = null
    const animate = (ts: number) => {
      if (startRef.current === null) startRef.current = ts
      const elapsed = ts - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * value))
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration, masked])

  if (masked) return <span className={className}>₹••••••</span>

  const formatted = display.toLocaleString('en-IN')
  return <span className={className}>{prefix}{formatted}{suffix}</span>
}
