import React from 'react';

interface SpeedometerGaugeProps {
  value: number; // 0 to 100
  target: number; // e.g. 85
  title: string;
  size?: 'sm' | 'md' | 'lg';
  status?: 'on-target' | 'action-required';
  showTarget?: boolean;
}

export const SpeedometerGauge: React.FC<SpeedometerGaugeProps> = ({
  value,
  target,
  title,
  size = 'md',
  status,
  showTarget = true,
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));
  
  // Angle: -90 degrees is 0%, 0 degrees is 50%, +90 degrees is 100%
  const needleAngle = -90 + (clampedValue / 100) * 180;
  const isSuccess = status ? status === 'on-target' : value >= target;

  const dimensions = {
    sm: { width: 120, height: 75, r: 42, stroke: 10, fontSize: 'text-base' },
    md: { width: 160, height: 95, r: 58, stroke: 13, fontSize: 'text-xl' },
    lg: { width: 220, height: 135, r: 82, stroke: 18, fontSize: 'text-3xl' },
  }[size];

  const cx = dimensions.width / 2;
  const cy = dimensions.height - 10;
  const r = dimensions.r;

  // Arc path for semi-circle
  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  return (
    <div className="flex flex-col items-center justify-center text-center select-none">
      <div className="text-[11px] font-bold tracking-wider text-slate-300 uppercase mb-1 font-mono">
        {title}
      </div>

      <div className="relative" style={{ width: dimensions.width, height: dimensions.height }}>
        <svg
          width={dimensions.width}
          height={dimensions.height}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          className="overflow-visible"
        >
          <defs>
            {/* Speedometer Track Gradient */}
            <linearGradient id={`gauge-grad-${title}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="80%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            {/* Needle shadow */}
            <filter id="needle-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Background Track */}
          <path
            d={arcPath}
            fill="none"
            stroke="#1e293b"
            strokeWidth={dimensions.stroke}
            strokeLinecap="round"
          />

          {/* Colored Gradient Track */}
          <path
            d={arcPath}
            fill="none"
            stroke={`url(#gauge-grad-${title})`}
            strokeWidth={dimensions.stroke}
            strokeLinecap="round"
            opacity="0.85"
          />

          {/* Threshold Tick for Target */}
          {showTarget && (
            <line
              x1={cx + (r - dimensions.stroke / 2) * Math.cos(((-90 + (target / 100) * 180) * Math.PI) / 180)}
              y1={cy + (r - dimensions.stroke / 2) * Math.sin(((-90 + (target / 100) * 180) * Math.PI) / 180)}
              x2={cx + (r + dimensions.stroke / 2) * Math.cos(((-90 + (target / 100) * 180) * Math.PI) / 180)}
              y2={cy + (r + dimensions.stroke / 2) * Math.sin(((-90 + (target / 100) * 180) * Math.PI) / 180)}
              stroke="#ffffff"
              strokeWidth="2.5"
            />
          )}

          {/* Needle Pointer */}
          <g
            transform={`translate(${cx}, ${cy}) rotate(${needleAngle})`}
            className="transition-transform duration-700 ease-out"
            filter="url(#needle-shadow)"
          >
            {/* Needle body */}
            <path
              d={`M -2.5 0 L -0.5 -${r - 5} L 0.5 -${r - 5} L 2.5 0 Z`}
              fill="#fbbf24"
              stroke="#b45309"
              strokeWidth="0.8"
            />
            {/* Center Pivot */}
            <circle cx="0" cy="0" r={dimensions.stroke * 0.55} fill="#0f172a" stroke="#fbbf24" strokeWidth="2.5" />
          </g>
        </svg>
      </div>

      {/* Numerical Display & Status Badge */}
      <div className="flex items-center justify-center gap-1.5 mt-1 font-mono">
        <span
          className={`font-black ${dimensions.fontSize} tracking-tight ${
            isSuccess ? 'text-emerald-400' : 'text-amber-400'
          }`}
        >
          {value}%
        </span>
        <span className="text-sm">
          {isSuccess ? '✅' : '⚠️'}
        </span>
      </div>

      {showTarget && (
        <span className="text-[10px] text-slate-400 font-mono">
          الهدف: ≥{target}%
        </span>
      )}
    </div>
  );
};
