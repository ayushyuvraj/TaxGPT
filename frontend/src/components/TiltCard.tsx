import { useRef, useState } from 'react'
import { motion } from 'framer-motion'

interface TiltCardProps {
  children: React.ReactNode
  className?: string
  glowColor?: string
  intensity?: number
}

export function TiltCard({ children, className = '', glowColor = '99, 102, 241', intensity = 15 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const x = ((e.clientY - cy) / (rect.height / 2)) * intensity
    const y = -((e.clientX - cx) / (rect.width / 2)) * intensity
    setTilt({ x, y })
  }

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 })
    setIsHovered(false)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      animate={{
        rotateX: tilt.x,
        rotateY: tilt.y,
        scale: isHovered ? 1.02 : 1,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px',
        boxShadow: isHovered
          ? `0 25px 50px -12px rgba(${glowColor}, 0.4), 0 0 0 1px rgba(${glowColor}, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)`
          : `0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)`,
      }}
      className={`relative rounded-2xl overflow-hidden cursor-default transition-shadow duration-300 ${className}`}
    >
      {/* Glass surface sheen */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-10"
        animate={{
          background: isHovered
            ? `radial-gradient(circle at ${50 + tilt.y}% ${50 - tilt.x}%, rgba(255,255,255,0.08) 0%, transparent 60%)`
            : 'none',
        }}
      />
      {children}
    </motion.div>
  )
}
