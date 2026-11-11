import React, { useState, useRef } from 'react';
import { Ticket, Package } from 'lucide-react';
import { WheelSegment, ModalType } from '../types';
import { soundFx } from '../utils/sound';
import { getNextSpinOutcome } from '../utils/progression';

export const WHEEL_SEGMENTS: WheelSegment[] = [
  {
    id: 0,
    label: '500',
    type: 'cash_500',
    valueText: '₱500',
    color: 'from-amber-400 via-yellow-500 to-amber-600',
    textColor: 'text-yellow-100',
    iconType: 'peso',
  },
  {
    id: 1,
    label: 'Mini',
    type: 'mini',
    valueText: '₱1.50',
    color: 'from-rose-500 via-red-600 to-rose-800',
    textColor: 'text-white',
    iconType: 'coins',
  },
  {
    id: 2,
    label: 'Mega',
    type: 'mega',
    valueText: '₱25.00',
    color: 'from-cyan-400 via-blue-600 to-indigo-800',
    textColor: 'text-cyan-100',
    iconType: 'bag',
  },
  {
    id: 3,
    label: 'Double',
    type: 'double',
    valueText: '2x Next Spin',
    color: 'from-fuchsia-500 via-purple-600 to-purple-900',
    textColor: 'text-fuchsia-100',
    iconType: 'double',
  },
  {
    id: 4,
    label: 'Random (?)',
    type: 'random',
    valueText: 'Surprise Reward',
    color: 'from-emerald-400 via-teal-600 to-emerald-900',
    textColor: 'text-emerald-100',
    iconType: 'question',
  },
  {
    id: 5,
    label: 'iPhone 17 Pro Max',
    type: 'iphone',
    valueText: 'iPhone 17 Pro Max Prize',
    color: 'from-slate-900 via-purple-950 to-slate-900',
    textColor: 'text-pink-200',
    iconType: 'iphone',
  },
  {
    id: 6,
    label: 'Mini',
    type: 'mini',
    valueText: '₱2.00',
    color: 'from-amber-500 via-orange-600 to-red-700',
    textColor: 'text-amber-100',
    iconType: 'coins',
  },
  {
    id: 7,
    label: 'Medium',
    type: 'medium',
    valueText: '₱5.00',
    color: 'from-blue-600 via-slate-800 to-blue-950',
    textColor: 'text-blue-100',
    iconType: 'stack',
  },
];

interface SpinWheelProps {
  spins: number;
  cycleSpinCount: number;
  balance: number;
  isSpinning: boolean;
  noAnimation: boolean;
  onSpinStart: () => void;
  onSpinComplete: (segment: WheelSegment, rewardAmount: number) => void;
  onOpenModal: (modal: ModalType) => void;
}

export const SpinWheel: React.FC<SpinWheelProps> = ({
  spins,
  cycleSpinCount,
  balance,
  isSpinning,
  noAnimation,
  onSpinStart,
  onSpinComplete,
  onOpenModal,
}) => {
  const [rotation, setRotation] = useState(0);
  const rotationRef = useRef(0);
  const lastTickSegmentRef = useRef(-1);

  // Wheel SVG coordinate system
  const size = 380;
  const center = size / 2;
  const radius = 175;
  const numSegments = 8;
  const anglePerSegment = 360 / numSegments;

  // Spin Trigger
  const handleCenterClick = () => {
    if (isSpinning) return;

    // Redirect to OFFERS when spins reach 0
    if (spins <= 0) {
      soundFx.playClick();
      onOpenModal('buy_spins'); // Opens OFFERS
      return;
    }

    soundFx.playClick();
    onSpinStart();

    // Get deterministic outcome from progression rules
    const outcome = getNextSpinOutcome(cycleSpinCount, balance);
    const targetIndex = outcome.segmentIndex;
    const selectedSegment = outcome.segment;
    const rewardAmount = outcome.rewardAmount;

    if (noAnimation) {
      const instantAngle = 360 - targetIndex * anglePerSegment;
      setRotation(instantAngle);
      rotationRef.current = instantAngle;
      soundFx.playCoin();
      onSpinComplete(selectedSegment, rewardAmount);
      return;
    }

    const fullSpins = 6 + Math.floor(Math.random() * 3);
    const sliceOffset = (Math.random() - 0.5) * 26;
    const targetModAngle = (360 - targetIndex * anglePerSegment + sliceOffset + 360) % 360;

    const currentRot = rotationRef.current;
    const currentMod = currentRot % 360;
    let addAngle = targetModAngle - currentMod;
    if (addAngle <= 0) addAngle += 360;

    const finalRotation = currentRot + fullSpins * 360 + addAngle;

    setRotation(finalRotation);
    rotationRef.current = finalRotation;

    const startTime = Date.now();
    const duration = 4500;

    const checkTick = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      if (elapsed < duration) {
        const progress = elapsed / duration;
        const easeOut = 1 - Math.pow(1 - progress, 3.5);
        const curAngle = currentRot + (finalRotation - currentRot) * easeOut;
        const activeSegmentIndex = Math.floor(((360 - (curAngle % 360)) % 360) / anglePerSegment);

        if (activeSegmentIndex !== lastTickSegmentRef.current) {
          lastTickSegmentRef.current = activeSegmentIndex;
          soundFx.playTick();
        }
        requestAnimationFrame(checkTick);
      } else {
        soundFx.playWin();
        onSpinComplete(selectedSegment, rewardAmount);
      }
    };

    requestAnimationFrame(checkTick);
  };

  const createArcPath = (index: number) => {
    const startAngle = (index * anglePerSegment - 90) * (Math.PI / 180);
    const endAngle = ((index + 1) * anglePerSegment - 90) * (Math.PI / 180);

    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);

    return `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
  };

  return (
    <div className="relative w-full max-w-[370px] mx-auto px-1 my-0.5 flex flex-col items-center justify-center select-none z-10 shrink-0">
      


      {/* WHEEL CONTAINER */}
      <div className="relative w-[275px] h-[275px] sm:w-[310px] sm:h-[310px] flex items-center justify-center">

        {/* TOP POINTER */}
        <div className="absolute -top-3.5 z-30 flex flex-col items-center drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]">
          <div className="w-7 h-9 bg-gradient-to-b from-amber-200 via-yellow-400 to-pink-600 rounded-t-md border-2 border-yellow-100 p-0.5 flex flex-col items-center justify-end shadow-xl">
            <div className="w-4 h-4 bg-gradient-to-b from-pink-400 to-fuchsia-700 rounded-full border border-white/90 shadow-inner" />
          </div>
          <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[16px] border-t-pink-600 -mt-0.5" />
        </div>

        {/* 3D METALLIC GOLD & BLUE OUTER RIM WITH LED BULBS */}
        <div className="w-full h-full rounded-full bg-gradient-to-b from-amber-600 via-yellow-500 to-amber-800 p-2 shadow-[0_0_30px_rgba(14,165,233,0.7),0_12px_30px_rgba(0,0,0,0.9)] border-4 border-amber-300 relative flex items-center justify-center">
          
          {/* Outer Black Inner Ring */}
          <div className="w-full h-full rounded-full bg-gradient-to-b from-slate-950 via-slate-900 to-black p-1.5 relative flex items-center justify-center">
            
            {/* LED Bulbs */}
            <div className="absolute inset-0 rounded-full pointer-events-none p-1">
              {Array.from({ length: 16 }).map((_, i) => {
                const angle = (i * (360 / 16)) * (Math.PI / 180);
                const r = 138;
                const cx = 142 + r * Math.cos(angle);
                const cy = 142 + r * Math.sin(angle);
                const isEven = i % 2 === 0;
                return (
                  <div
                    key={i}
                    className={`absolute w-2.5 h-2.5 rounded-full border border-yellow-100 ${
                      isEven ? 'bg-yellow-300 animate-bulb-odd' : 'bg-amber-400 animate-bulb-even'
                    }`}
                    style={{
                      left: `${cx - 5}px`,
                      top: `${cy - 5}px`,
                    }}
                  />
                );
              })}
            </div>

            {/* Cyan Metallic Inner Border & Rotatable Wheel */}
            <div className="w-full h-full rounded-full border-2 border-cyan-400/90 shadow-inner overflow-hidden relative flex items-center justify-center bg-slate-950">
              
              {/* ROTATING SVG WHEEL */}
              <svg
                viewBox={`0 0 ${size} ${size}`}
                className="w-full h-full transition-transform"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transitionDuration: noAnimation ? '0ms' : isSpinning ? '4500ms' : '0ms',
                  transitionTimingFunction: 'cubic-bezier(0.15, 0.85, 0.15, 1)',
                }}
              >
                <defs>
                  {/* Realistic Metallic Gradients for 8 Segments */}
                  <linearGradient id="grad-500" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="40%" stopColor="#eab308" />
                    <stop offset="100%" stopColor="#b45309" />
                  </linearGradient>
                  <linearGradient id="grad-mini" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fb7185" />
                    <stop offset="50%" stopColor="#e11d48" />
                    <stop offset="100%" stopColor="#881337" />
                  </linearGradient>
                  <linearGradient id="grad-mega" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="50%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#1e3a8a" />
                  </linearGradient>
                  <linearGradient id="grad-double" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#e879f9" />
                    <stop offset="50%" stopColor="#a21caf" />
                    <stop offset="100%" stopColor="#581c87" />
                  </linearGradient>
                  <linearGradient id="grad-random" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="50%" stopColor="#059669" />
                    <stop offset="100%" stopColor="#064e3b" />
                  </linearGradient>
                  <linearGradient id="grad-iphone" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#475569" />
                    <stop offset="40%" stopColor="#1e1b4b" />
                    <stop offset="100%" stopColor="#020617" />
                  </linearGradient>
                  <linearGradient id="grad-medium" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#64748b" />
                    <stop offset="50%" stopColor="#334155" />
                    <stop offset="100%" stopColor="#0f172a" />
                  </linearGradient>

                  {/* Glass Gloss Overlay Gradient */}
                  <linearGradient id="glass-shine" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                    <stop offset="30%" stopColor="#ffffff" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Render Slices */}
                {WHEEL_SEGMENTS.map((seg, idx) => {
                  const path = createArcPath(idx);
                  const midAngle = (idx * anglePerSegment + anglePerSegment / 2 - 90) * (Math.PI / 180);
                  const textDistance = radius * 0.62;
                  const tx = center + textDistance * Math.cos(midAngle);
                  const ty = center + textDistance * Math.sin(midAngle);
                  const textRotation = idx * anglePerSegment + anglePerSegment / 2;

                  const getGradId = (type: string) => {
                    switch (type) {
                      case 'cash_500': return 'url(#grad-500)';
                      case 'mini': return 'url(#grad-mini)';
                      case 'mega': return 'url(#grad-mega)';
                      case 'double': return 'url(#grad-double)';
                      case 'random': return 'url(#grad-random)';
                      case 'iphone': return 'url(#grad-iphone)';
                      default: return 'url(#grad-medium)';
                    }
                  };

                  return (
                    <g key={seg.id}>
                      {/* Segment Arc */}
                      <path
                        d={path}
                        fill={getGradId(seg.type)}
                        stroke="#fef08a"
                        strokeWidth="2"
                      />

                      {/* Gloss Overlay */}
                      <path
                        d={path}
                        fill="url(#glass-shine)"
                        pointerEvents="none"
                      />

                      {/* Content inside slice */}
                      <g transform={`translate(${tx}, ${ty}) rotate(${textRotation})`}>
                        
                        {/* 1. Slice Label */}
                        <text
                          x="0"
                          y={seg.type === 'iphone' ? '-14' : '-6'}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#ffffff"
                          fontSize={seg.type === 'iphone' ? '10' : seg.label.length > 5 ? '13' : '16'}
                          fontWeight="900"
                          style={{
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                            filter: 'drop-shadow(0px 2px 3px rgba(0,0,0,0.95))',
                            letterSpacing: '0.02em',
                          }}
                        >
                          {seg.label}
                        </text>

                        {/* 2. Realistic 3D Slice Graphics */}

                        {/* ₱500 Jackpot: 3D Cash Stacks & Coins */}
                        {seg.type === 'cash_500' && (
                          <g transform="translate(0, 10)">
                            {/* Peso Cash Bill */}
                            <rect x="-16" y="-6" width="32" height="16" rx="2" fill="#059669" stroke="#ecfdf5" strokeWidth="0.8" />
                            <rect x="-13" y="-4" width="26" height="12" rx="1" fill="#10b981" />
                            <circle cx="0" cy="2" r="3.5" fill="#fef08a" stroke="#047857" strokeWidth="0.5" />
                            <text x="0" y="3.5" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#047857">₱500</text>
                            {/* Gold Coins */}
                            <circle cx="-10" cy="8" r="5" fill="#f59e0b" stroke="#78350f" strokeWidth="0.8" />
                            <circle cx="-10" cy="8" r="3.5" fill="#fef08a" />
                            <circle cx="10" cy="8" r="5" fill="#f59e0b" stroke="#78350f" strokeWidth="0.8" />
                            <circle cx="10" cy="8" r="3.5" fill="#fef08a" />
                          </g>
                        )}

                        {/* Mini (₱1.50 / ₱2.00): 3D Shiny Peso Coin */}
                        {seg.type === 'mini' && (
                          <g transform="translate(0, 10)">
                            <circle cx="0" cy="0" r="9" fill="#f59e0b" stroke="#78350f" strokeWidth="1" />
                            <circle cx="0" cy="0" r="7" fill="#fef08a" stroke="#d97706" strokeWidth="0.5" />
                            <text x="0" y="2" textAnchor="middle" fontSize="7" fontWeight="black" fill="#78350f">₱</text>
                          </g>
                        )}

                        {/* Mega: 3D Money Bag / Cash Sack */}
                        {seg.type === 'mega' && (
                          <g transform="translate(0, 10)">
                            <path d="M -9 8 C -12 2, -10 -4, -4 -6 L 4 -6 C 10 -4, 12 2, 9 8 Z" fill="#0284c7" stroke="#38bdf8" strokeWidth="1" />
                            <path d="M -4 -6 L -6 -10 L 6 -10 L 4 -6 Z" fill="#38bdf8" />
                            <rect x="-5" y="-6" width="10" height="2" rx="1" fill="#fef08a" />
                            <text x="0" y="4" textAnchor="middle" fontSize="8" fontWeight="black" fill="#ffffff">₱25</text>
                          </g>
                        )}

                        {/* Double: 3D Metallic 2X Badge */}
                        {seg.type === 'double' && (
                          <g transform="translate(0, 10)">
                            <circle cx="0" cy="0" r="10" fill="#a21caf" stroke="#fef08a" strokeWidth="1.2" />
                            <text x="0" y="3" textAnchor="middle" fontSize="9" fontWeight="900" fill="#fef08a" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}>2X</text>
                          </g>
                        )}

                        {/* Random (?): 3D Mystery Reward Box */}
                        {seg.type === 'random' && (
                          <g transform="translate(0, 10)">
                            <rect x="-10" y="-8" width="20" height="16" rx="3" fill="#047857" stroke="#a7f3d0" strokeWidth="1" />
                            <path d="M -10 -2 L 10 -2" stroke="#fef08a" strokeWidth="2" />
                            <path d="M 0 -8 L 0 8" stroke="#fef08a" strokeWidth="2" />
                            <circle cx="0" cy="-2" r="4" fill="#fef08a" stroke="#047857" strokeWidth="0.8" />
                            <text x="0" y="0.5" textAnchor="middle" fontSize="6" fontWeight="black" fill="#047857">?</text>
                          </g>
                        )}

                        {/* iPhone 17 Pro Max: Ultra-Realistic Vector Smartphone Render */}
                        {seg.type === 'iphone' && (
                          <g transform="translate(0, 10)">
                            {/* Metallic Titanium Outer Phone Body Frame */}
                            <rect x="-11" y="-12" width="22" height="34" rx="4" fill="#94a3b8" stroke="#cbd5e1" strokeWidth="1" />
                            {/* Inner Glass Display Screen */}
                            <rect x="-9.5" y="-10.5" width="19" height="31" rx="2.5" fill="#020617" />
                            {/* Dynamic Island Notch */}
                            <rect x="-3" y="-9" width="6" height="2" rx="1" fill="#000000" stroke="#1e293b" strokeWidth="0.3" />
                            {/* Triple Camera Module System Bump */}
                            <g transform="translate(2, -5)">
                              <rect x="-4.5" y="-4.5" width="9" height="9" rx="2" fill="#1e293b" stroke="#64748b" strokeWidth="0.5" />
                              {/* 3 Camera Lenses */}
                              <circle cx="-2" cy="-2" r="1.5" fill="#090d16" stroke="#cbd5e1" strokeWidth="0.4" />
                              <circle cx="-2" cy="2" r="1.5" fill="#090d16" stroke="#cbd5e1" strokeWidth="0.4" />
                              <circle cx="2" cy="0" r="1.5" fill="#090d16" stroke="#cbd5e1" strokeWidth="0.4" />
                              {/* Flash */}
                              <circle cx="2" cy="-2.5" r="0.6" fill="#fef08a" />
                            </g>
                            {/* Screen Glow Lines */}
                            <path d="M -7 12 L 7 12" stroke="#ec4899" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
                            <path d="M -5 15 L 5 15" stroke="#38bdf8" strokeWidth="0.8" strokeLinecap="round" opacity="0.8" />
                          </g>
                        )}

                        {/* Medium: 3D Cash & Coin */}
                        {seg.type === 'medium' && (
                          <g transform="translate(0, 10)">
                            <rect x="-12" y="-5" width="24" height="12" rx="1.5" fill="#1e40af" stroke="#93c5fd" strokeWidth="0.8" />
                            <text x="0" y="2" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#ffffff">₱5</text>
                            <circle cx="8" cy="4" r="4.5" fill="#f59e0b" stroke="#78350f" strokeWidth="0.6" />
                            <circle cx="8" cy="4" r="3" fill="#fef08a" />
                          </g>
                        )}

                      </g>
                    </g>
                  );
                })}

                {/* Divider Pins */}
                {Array.from({ length: numSegments }).map((_, i) => {
                  const pinAngle = (i * anglePerSegment - 90) * (Math.PI / 180);
                  const px = center + (radius - 4) * Math.cos(pinAngle);
                  const py = center + (radius - 4) * Math.sin(pinAngle);
                  return (
                    <circle
                      key={i}
                      cx={px}
                      cy={py}
                      r="3.5"
                      fill="#fef08a"
                      stroke="#78350f"
                      strokeWidth="1.2"
                    />
                  );
                })}
              </svg>
            </div>

            {/* CENTER SPIN BUTTON */}
            <button
              onClick={handleCenterClick}
              disabled={isSpinning}
              className="absolute z-20 w-[92px] h-[92px] rounded-full bg-gradient-to-b from-slate-900 via-black to-slate-950 p-1 shadow-[0_0_20px_rgba(236,72,153,0.9),0_0_30px_rgba(6,182,212,0.8)] border-2 border-cyan-300 hover:scale-105 active:scale-95 transition-all cursor-pointer group disabled:opacity-90"
              aria-label="Spin Wheel"
            >
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-pink-600 via-purple-600 to-cyan-400 p-0.5 flex flex-col items-center justify-center shadow-inner relative overflow-hidden">
                <div className="w-full h-full rounded-full bg-gradient-to-b from-slate-950 via-black to-slate-900 flex flex-col items-center justify-center p-1 border border-white/20">
                  <span className="text-2xl sm:text-3xl font-black text-white leading-none tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                    {spins}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase text-cyan-300 tracking-wider leading-none mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                    Spins
                  </span>
                </div>
              </div>
            </button>



          </div>
        </div>

      </div>
    </div>
  );
};
