// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useState, useEffect, useRef } from 'react'

const STATE_CONFIG = {
  idle: {
    message: 'Hi there!',
    color: 'bg-blue-100',
    eyeScale: 1,
    mouthD: "M 14,20 Q 20,24 26,20",
    bounce: [0, -3, 0],
    hands: 'idle'
  },
  loading: {
    message: 'Loading…',
    color: 'bg-amber-100',
    eyeScale: 1,
    mouthD: "M 16,22 Q 20,22 24,22",
    bounce: [0, -4, 0],
    hands: 'writing' // Show writing animation while loading
  },
  'canvas-loading': {
    message: 'Setting up…',
    color: 'bg-emerald-100',
    eyeScale: 1,
    mouthD: "M 16,22 Q 20,22 24,22",
    bounce: [0, -4, 0],
    hands: 'working' // pencil
  },
  listening: {
    message: 'I am all ears!',
    color: 'bg-purple-100',
    eyeScale: 1.2,
    mouthD: "M 18,24 Q 20,26 22,24",
    bounce: [0, -5, 0],
    hands: 'listening'
  },
  thinking: {
    message: 'Let me think…',
    color: 'bg-cyan-100',
    eyeScale: 1,
    mouthD: "M 14,22 Q 20,18 26,22",
    bounce: [0, -5, 0],
    hands: 'writing' // pencil
  },
  celebrate: {
    message: 'Yay!',
    color: 'bg-pink-100',
    eyeScale: 1,
    mouthD: "M 14,18 Q 20,28 26,18",
    bounce: [0, -10, 0],
    hands: 'up'
  },
  error: {
    message: 'Uh oh…',
    color: 'bg-red-100',
    eyeScale: 1,
    mouthD: "M 16,24 Q 20,20 24,24",
    bounce: [0, -2, 0],
    hands: 'facepalm' // or simple down
  }
}

export default function AnimatedCharacter({ mood, className }) {
  const [isHovered, setIsHovered] = useState(false)
  const [animationKey, setAnimationKey] = useState(0)
  const [easterEgg, setEasterEgg] = useState(null) // e.g. sunglasses
  const eggTimeoutRef = useRef(null)
  const stateKey = mood?.state && STATE_CONFIG[mood.state] ? mood.state : 'idle'
  const config = STATE_CONFIG[stateKey]
  const isListening = config.hands === 'listening'
  const isThinking = stateKey === 'thinking' || stateKey === 'loading'
  const isCelebrating = stateKey === 'celebrate'
  const isError = stateKey === 'error'
  
  // Force re-animation whenever mood changes
  const moodString = JSON.stringify(mood)
  useEffect(() => {
    // Always increment to force re-animation, even if same state
    setAnimationKey(prev => prev + 1)
    // Light-weight easter egg: 8% chance to show sunglasses for 2.5s
    if (eggTimeoutRef.current) clearTimeout(eggTimeoutRef.current)
    if (Math.random() < 0.08) {
      setEasterEgg('sunglasses')
      eggTimeoutRef.current = setTimeout(() => setEasterEgg(null), 2500)
    } else {
      setEasterEgg(null)
    }
    return () => {
      if (eggTimeoutRef.current) clearTimeout(eggTimeoutRef.current)
    }
  }, [moodString])
  
  // Smile path for hover - bigger smile, positioned correctly
  const smilePath = "M 12,18 Q 20,26 28,18"

  // Head motion variants per state for richer animation
  const headVariants = {
    idle: { y: [0, -2, 0], rotate: 0, transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' } },
    listening: { y: [0, -4, 0], rotate: [-2, -4, -2], transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } },
    thinking: { y: [0, -3, 0], rotate: [0, 2, 0], transition: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } },
    loading: { y: [0, -3, 0], rotate: [0, 1, 0], transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } },
    'canvas-loading': { y: [0, -3, 0], rotate: [0, 1, 0], transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } },
    celebrate: { y: [0, -8, 0], rotate: [0, -3, 3, 0], transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } },
    error: { y: [0, -2, 0], rotate: [0, 3, -3, 0], transition: { duration: 0.9, repeat: Infinity, ease: 'easeInOut' } },
    up: { y: [0, -6, 0], rotate: 0, transition: { duration: 1.4, repeat: Infinity, ease: 'easeInOut' } }
  }

  const confettiPieces = [
    { x: -10, y: -4, color: '#f472b6' },
    { x: 6, y: -6, color: '#60a5fa' },
    { x: -2, y: -10, color: '#22c55e' },
    { x: 12, y: -2, color: '#facc15' }
  ]

  // Variants for hands
  const leftHandVariants = {
    idle: { x: 0, y: 0, rotate: 0 },
    listening: { x: -2, y: -5, rotate: -15 }, // Cupping ear
    writing: { x: 5, y: 5, rotate: 0 }, // Stabilizing paper (imaginary)
    up: { x: -5, y: -15, rotate: -20 },
    facepalm: { x: 10, y: -10, rotate: 45 }
  }

  const rightHandVariants = {
    idle: { x: 0, y: 0, rotate: 0 },
    listening: { x: 2, y: 0, rotate: 0 },
    writing: { x: -5, y: -5, rotate: 15 }, // Holding pencil
    up: { x: 5, y: -15, rotate: 20 },
    facepalm: { x: 0, y: 0, rotate: 0 }
  }

  return (
    <div 
      key={`${stateKey}-${animationKey}`}
      className={cn("flex flex-col items-center justify-end w-32 h-32", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        key={`head-${stateKey}-${animationKey}`}
        className="relative w-20 h-20"
        variants={headVariants}
        initial="idle"
        animate={stateKey in headVariants ? stateKey : 'idle'}
      >
        {/* Body/Head Container */}
        <div className={cn(
            "absolute inset-0 rounded-full shadow-lg border-2 border-white/40 overflow-visible transition-colors duration-500",
            config.color
          )}
        >
            {/* Skin Base */}
            <div className="absolute inset-1 rounded-full bg-[#FFE0BD] overflow-hidden">
                {/* Detailed Realistic Hair - Maroon with Red Tints */}
                {/* Single hair layer with proper clipping - no rectangles */}
                <div className="absolute top-0 left-0 w-full h-[55%] rounded-t-full overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-[#6B2C3E] via-[#7A2F45] to-[#8B344D]">
                        {/* Hair texture using SVG paths for natural strands */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <path d="M 10,5 Q 12,15 10,25" stroke="#8B344D" strokeWidth="1.5" fill="none" opacity="0.6" />
                            <path d="M 20,8 Q 22,18 20,26" stroke="#A03D5A" strokeWidth="1.2" fill="none" opacity="0.5" />
                            <path d="M 30,6 Q 32,16 30,28" stroke="#7A2F45" strokeWidth="1.5" fill="none" opacity="0.6" />
                            <path d="M 40,10 Q 42,20 40,24" stroke="#C94A6B" strokeWidth="1.2" fill="none" opacity="0.5" />
                            <path d="M 50,7 Q 52,17 50,25" stroke="#8B344D" strokeWidth="1.5" fill="none" opacity="0.6" />
                            <path d="M 60,9 Q 62,19 60,27" stroke="#A03D5A" strokeWidth="1.2" fill="none" opacity="0.5" />
                            <path d="M 70,6 Q 72,16 70,29" stroke="#7A2F45" strokeWidth="1.5" fill="none" opacity="0.6" />
                            <path d="M 80,8 Q 82,18 80,26" stroke="#C94A6B" strokeWidth="1.2" fill="none" opacity="0.5" />
                            <path d="M 90,5 Q 92,15 90,25" stroke="#8B344D" strokeWidth="1.5" fill="none" opacity="0.6" />
                        </svg>
                    </div>
                </div>
                
                {/* Hair Middle Layer - adds volume */}
                <div className="absolute top-0 left-[10%] w-[80%] h-[50%] rounded-t-full overflow-hidden opacity-90">
                    <div className="absolute inset-0 bg-gradient-to-b from-[#7A2F45] to-[#8B344D]">
                        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <path d="M 15,12 Q 17,22 15,27" stroke="#A03D5A" strokeWidth="1" fill="none" opacity="0.5" />
                            <path d="M 25,14 Q 27,24 25,28" stroke="#C94A6B" strokeWidth="0.8" fill="none" opacity="0.4" />
                            <path d="M 35,11 Q 37,21 35,29" stroke="#8B344D" strokeWidth="1" fill="none" opacity="0.5" />
                            <path d="M 45,13 Q 47,23 45,28" stroke="#A03D5A" strokeWidth="0.8" fill="none" opacity="0.4" />
                            <path d="M 55,12 Q 57,22 55,27" stroke="#C94A6B" strokeWidth="1" fill="none" opacity="0.5" />
                            <path d="M 65,14 Q 67,24 65,29" stroke="#7A2F45" strokeWidth="0.8" fill="none" opacity="0.4" />
                        </svg>
                    </div>
                </div>
                
                {/* Hair Front Layer - detailed bangs */}
                <div className="absolute -top-1 left-[5%] w-[90%] h-[40%] rounded-b-[25px] shadow-lg overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-[#6B2C3E] to-[#7A2F45]">
                        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <path d="M 10,20 Q 12,30 10,32" stroke="#A03D5A" strokeWidth="1" fill="none" opacity="0.4" />
                            <path d="M 20,18 Q 22,28 20,34" stroke="#C94A6B" strokeWidth="1.2" fill="none" opacity="0.45" />
                            <path d="M 30,22 Q 32,32 30,31" stroke="#8B344D" strokeWidth="1" fill="none" opacity="0.4" />
                            <path d="M 40,19 Q 42,29 40,33" stroke="#A03D5A" strokeWidth="1.2" fill="none" opacity="0.45" />
                            <path d="M 50,21 Q 52,31 50,32" stroke="#C94A6B" strokeWidth="1" fill="none" opacity="0.4" />
                            <path d="M 60,18 Q 62,28 60,34" stroke="#7A2F45" strokeWidth="1.2" fill="none" opacity="0.45" />
                            <path d="M 70,20 Q 72,30 70,33" stroke="#A03D5A" strokeWidth="1" fill="none" opacity="0.4" />
                            <path d="M 80,22 Q 82,32 80,31" stroke="#C94A6B" strokeWidth="1.2" fill="none" opacity="0.45" />
                        </svg>
                    </div>
                </div>
                
                {/* Hair Highlights - red tint streaks */}
                <div className="absolute top-[8%] left-[20%] w-[60%] h-[25%] rounded-full overflow-hidden opacity-40">
                    <div className="absolute inset-0 bg-gradient-to-b from-[#C94A6B] via-[#A03D5A] to-transparent" />
                </div>
                
                {/* Red tint streaks */}
                <div className="absolute top-[10%] left-[25%] w-[15%] h-[20%] rounded-full overflow-hidden opacity-30">
                    <div className="absolute inset-0 bg-gradient-to-b from-[#D45A7A] to-transparent" />
                </div>
                <div className="absolute top-[12%] right-[25%] w-[15%] h-[18%] rounded-full overflow-hidden opacity-30">
                    <div className="absolute inset-0 bg-gradient-to-b from-[#D45A7A] to-transparent" />
                </div>
                
                {/* Face */}
                <div className="absolute top-[28%] left-0 w-full h-full z-10">
                    {/* Ears */}
                    <div className="absolute -left-3 top-[38%] w-4 h-4 bg-[#FFE0BD] rounded-full shadow-inner border border-white/20" />
                    <div className="absolute -right-3 top-[38%] w-4 h-4 bg-[#FFE0BD] rounded-full shadow-inner border border-white/20" />
                    
                    {/* Eyebrows */}
                    <div className="flex justify-center gap-4 mb-0.5">
                        <div className="w-4 h-1 bg-amber-900 rounded-full transform -rotate-6" />
                        <div className="w-4 h-1 bg-amber-900 rounded-full transform rotate-6" />
                    </div>
                    
                    {/* Cute Eyes */}
                    <div className="flex justify-center gap-3 mb-1.5">
                        {/* Left Eye */}
                        <motion.div 
                            className="relative w-5 h-4 bg-white rounded-full shadow-md overflow-hidden"
                            animate={{ 
                                scaleY: [1, 1, 0.15, 0.15, 1, 1]
                            }}
                            transition={{ 
                                duration: 3.5,
                                times: [0, 0.85, 0.88, 0.92, 0.95, 1],
                                ease: [0.4, 0, 0.2, 1],
                                repeat: Infinity,
                                repeatDelay: 0.5
                            }}
                        >
                            {/* Eye Iris */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full">
                                {/* Pupil */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 rounded-full" />
                                {/* Eye Highlight */}
                                <div className="absolute top-[20%] left-[30%] w-1 h-1 bg-white rounded-full opacity-90" />
                            </div>
                        </motion.div>
                        
                        {/* Right Eye */}
                        <motion.div 
                            className="relative w-5 h-4 bg-white rounded-full shadow-md overflow-hidden"
                            animate={{ 
                                scaleY: [1, 1, 0.15, 0.15, 1, 1]
                            }}
                            transition={{ 
                                duration: 3.5,
                                times: [0, 0.85, 0.88, 0.92, 0.95, 1],
                                ease: [0.4, 0, 0.2, 1],
                                repeat: Infinity,
                                repeatDelay: 0.5,
                                delay: 0.05
                            }}
                        >
                            {/* Eye Iris */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full">
                                {/* Pupil */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 rounded-full" />
                                {/* Eye Highlight */}
                                <div className="absolute top-[20%] left-[30%] w-1 h-1 bg-white rounded-full opacity-90" />
                            </div>
                        </motion.div>
                    </div>

                    {/* Easter egg sunglasses */}
                    <AnimatePresence>
                      {easterEgg === 'sunglasses' && (
                        <motion.div
                          key={`sunglasses-${animationKey}`}
                          className="absolute left-1/2 -translate-x-1/2 top-[46%] flex items-center gap-1"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                        >
                          <div className="w-6 h-3 bg-black rounded-md shadow-sm border border-slate-800" />
                          <div className="w-6 h-3 bg-black rounded-md shadow-sm border border-slate-800" />
                          <div className="w-2 h-[2px] bg-black rounded-full -ml-1 -mr-1" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {/* Cheeks - reduced blush */}
                    <div className="flex justify-between px-2 mb-1">
                         <motion.div 
                            className="w-2.5 h-1.5 bg-rose-200 rounded-full blur-[1.5px] opacity-30"
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 3, repeat: Infinity, delay: 0 }}
                         />
                         <motion.div 
                            className="w-2.5 h-1.5 bg-rose-200 rounded-full blur-[1.5px] opacity-30"
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 3, repeat: Infinity, delay: 0.2 }}
                         />
                    </div>

                    {/* Nose */}
                    <div className="relative w-full flex justify-center mb-1">
                        <div className="w-2 h-2 bg-[#e2a86f] rounded-full shadow-sm" />
                    </div>

                    {/* Mouth - natural and pink tinted */}
                    <div className="relative w-full h-8 flex items-center justify-center -mt-4 z-20">
                        <svg 
                            width="40" 
                            height="40" 
                            viewBox="0 0 40 40" 
                            className="pointer-events-none"
                            style={{ 
                                display: 'block',
                                position: 'relative',
                                zIndex: 20
                            }}
                        >
                            {/* Soft pink base */}
                            <motion.path
                            d={isHovered ? smilePath : config.mouthD}
                            fill="none"
                            stroke="#FFB6C1"
                            strokeWidth="5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity="0.6"
                            initial={false}
                            animate={{ d: isHovered ? smilePath : config.mouthD }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            />
                            {/* Main mouth - natural pink-brown */}
                            <motion.path
                            d={isHovered ? smilePath : config.mouthD}
                            fill="none"
                            stroke="#D97794"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeOpacity="0.9"
                            initial={false}
                            animate={{ d: isHovered ? smilePath : config.mouthD }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            />
                            {/* Subtle darker outline for definition */}
                            <motion.path
                            d={isHovered ? smilePath : config.mouthD}
                            fill="none"
                            stroke="#B85C7A"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeOpacity="0.7"
                            initial={false}
                            animate={{ d: isHovered ? smilePath : config.mouthD }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            />
                        </svg>
                    </div>

                    {/* Chin shading */}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-[18%] w-10 h-3 bg-gradient-to-b from-transparent via-[#f5cfa2] to-transparent rounded-full opacity-70" />
                    
                    {/* Listening ear waves */}
                    <AnimatePresence>
                      {isListening && (
                        <motion.div
                          key={`earwave-${animationKey}`}
                          className="absolute right-0 top-[40%] w-6 h-6"
                          initial={{ opacity: 0, scale: 0.6, x: 4 }}
                          animate={{ opacity: [0.2, 0.8, 0], scale: [0.8, 1.2, 1.5], x: [4, 8, 12] }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
                        >
                          <div className="absolute inset-0 rounded-full border border-purple-300 opacity-60" />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Thinking bubble */}
                    <AnimatePresence>
                      {isThinking && (
                        <motion.div
                          key={`bubble-${animationKey}`}
                          className="absolute -top-3 left-[70%] w-8 h-6"
                          initial={{ opacity: 0, y: 4, scale: 0.8 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -2 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="absolute -bottom-2 left-1 w-2 h-2 bg-white rounded-full shadow-sm" />
                          <div className="absolute -bottom-4 left-0.5 w-1.5 h-1.5 bg-white rounded-full shadow-sm" />
                          <div className="w-full h-full bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-[10px] text-slate-500 font-semibold">
                            ...
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Celebrate confetti */}
                    <AnimatePresence>
                      {isCelebrating && (
                        <div className="absolute inset-0 pointer-events-none">
                          {confettiPieces.map((c, idx) => (
                            <motion.div
                              key={`confetti-${idx}-${animationKey}`}
                              className="absolute w-2 h-2 rounded-sm"
                              style={{ backgroundColor: c.color, top: `calc(45% + ${c.y}px)`, left: `calc(50% + ${c.x}px)` }}
                              initial={{ opacity: 0, y: -6, rotate: 0 }}
                              animate={{ opacity: [0.8, 0], y: [-6, -18], rotate: [0, 180] }}
                              transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.2 }}
                            />
                          ))}
                        </div>
                      )}
                    </AnimatePresence>

                    {/* Error indicator */}
                    <AnimatePresence>
                      {isError && (
                        <motion.div
                          key={`error-${animationKey}`}
                          className="absolute top-[30%] left-1/2 -translate-x-1/2 text-red-500"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: [1, 1.1, 1] }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.4 }}
                        >
                          <div className="w-4 h-4 relative">
                            <span className="absolute inset-0 block border-2 border-red-500 rounded-full opacity-70" />
                            <span className="absolute left-1/2 top-[2px] -translate-x-1/2 w-[2px] h-2 bg-red-500 rounded-full" />
                            <span className="absolute left-1/2 bottom-[2px] -translate-x-1/2 w-[2px] h-1 bg-red-500 rounded-full" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                </div>
            </div>
            
            {/* Hands */}
            {/* Left Hand */}
            <motion.div
                key={`left-hand-${stateKey}-${config.hands}-${animationKey}`}
                className="absolute -left-2 top-[68%] w-5 h-5 bg-[#FFE0BD] rounded-full border-2 border-white/20 shadow-sm z-10"
                variants={leftHandVariants}
                initial="idle"
                animate={
                    config.hands === 'writing' ? 'writing' : 
                    (config.hands === 'working' ? 'writing' : 
                    (config.hands === 'listening' ? 'listening' : 
                    (config.hands === 'up' ? 'up' : 'idle')))
                }
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
            />
            
            {/* Right Hand (maybe holding pencil) */}
            <motion.div
                key={`right-hand-${stateKey}-${config.hands}-${animationKey}`}
                className="absolute -right-2 top-[68%] w-5 h-5 bg-[#FFE0BD] rounded-full border-2 border-white/20 shadow-sm z-10 flex items-center justify-center"
                variants={rightHandVariants}
                initial="idle"
                animate={
                    config.hands === 'writing' ? 'writing' : 
                    (config.hands === 'working' ? 'writing' : 
                    (config.hands === 'listening' ? 'listening' : 
                    (config.hands === 'up' ? 'up' : 'idle')))
                }
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
                {/* Pencil */}
                <AnimatePresence mode="wait">
                    {(config.hands === 'writing' || config.hands === 'working') && (
                        <motion.div
                            key={`pencil-${animationKey}`}
                            initial={{ scale: 0, rotate: -45 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, rotate: -45 }}
                            className="absolute -top-4 -right-1 w-2 h-8 bg-yellow-400 border border-orange-500 rounded-sm origin-bottom"
                        >
                            <div className="absolute top-0 w-full h-2 bg-pink-300 rounded-t-sm" /> {/* Eraser */}
                            <div className="absolute bottom-0 w-full h-0 border-l-[3px] border-r-[3px] border-t-[8px] border-l-transparent border-r-transparent border-t-yellow-400" /> {/* Tip connection */}
                             <div className="absolute -bottom-2 left-[3px] w-0 h-0 border-l-[2px] border-r-[2px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-800" /> {/* Lead */}
                             
                             {/* Scribble animation */}
                             <motion.div 
                                key={`scribble-${animationKey}`}
                                animate={{ rotate: [-5, 5, -5] }}
                                transition={{ duration: 0.2, repeat: Infinity }}
                                className="w-full h-full"
                             />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
