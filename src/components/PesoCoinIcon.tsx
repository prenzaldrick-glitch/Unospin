import React from 'react';

interface PesoCoinIconProps {
  className?: string;
  size?: number;
}

export const PesoCoinIcon: React.FC<PesoCoinIconProps> = ({ className = "w-7 h-7", size }) => {
  const style = size ? { width: `${size}px`, height: `${size}px` } : {};
  return (
    <div 
      style={style} 
      className={`relative inline-flex items-center justify-center rounded-full bg-gradient-to-b from-amber-200 via-yellow-400 to-amber-600 p-[2px] shadow-[0_2px_5px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.8)] shrink-0 ${className}`}
    >
      <div className="w-full h-full rounded-full bg-gradient-to-tr from-yellow-500 via-amber-300 to-yellow-200 flex items-center justify-center border border-amber-600/60 shadow-inner">
        <span className="text-amber-950 font-black text-xs leading-none drop-shadow-[0_1px_0_rgba(255,255,255,0.6)] select-none">
          ₱
        </span>
      </div>
    </div>
  );
};
