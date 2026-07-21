import React, { useState, useRef } from 'react';
import { formatCurrency } from '../engine/finance';

interface DataPoint {
  week: number;
  total: number;
  pay: number;
  investments: number;
  realEstate: number;
  car: number;
  fourOhOneK: number;
  traditionalIra: number;
  rothIra: number;
}

const SERIES = [
  { key: 'pay', label: 'Cash (Pay)', color: '#3b82f6' },
  { key: 'investments', label: 'Investments', color: '#8b5cf6' },
  { key: 'realEstate', label: 'Real Estate', color: '#f59e0b' },
  { key: 'car', label: 'Car', color: '#6b7280' },
  { key: 'fourOhOneK', label: '401(k)', color: '#10b981' },
  { key: 'traditionalIra', label: 'Traditional IRA', color: '#14b8a6' },
  { key: 'rothIra', label: 'Roth IRA', color: '#ec4899' },
] as const;

interface Props {
  data: DataPoint[];
}

export function NetWorthChart({ data }: Props) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (data.length < 2) {
    return (
      <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
        Collecting data...
      </div>
    );
  }

  const width = 640;
  const height = 220;
  const padding = { top: 20, right: 70, bottom: 30, left: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map(d => d.total), 1);
  const minVal = Math.min(...data.map(d => Math.min(d.total, 0)), 0);
  const range = maxVal - minVal || 1;

  const getY = (val: number) => padding.top + chartHeight - ((val - minVal) / range) * chartHeight;
  const getX = (i: number) => padding.left + (i / (data.length - 1)) * chartWidth;

  const buildPath = (key: string) => {
    return data.map((d, i) => {
      const x = getX(i);
      const y = getY((d as any)[key]);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  const getGameDate = (week: number): string => {
    const startDate = new Date(2025, 0, 6);
    const gameDate = new Date(startDate.getTime() + week * 7 * 24 * 60 * 60 * 1000);
    return gameDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;
    const idx = Math.round(((mouseX - padding.left) / chartWidth) * (data.length - 1));
    setHoverIndex(Math.max(0, Math.min(data.length - 1, idx)));
  };

  const hoverData = hoverIndex !== null ? data[hoverIndex] : null;
  const lastData = data[data.length - 1];

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'baseline' }}>
        <span style={{ fontSize: '13px', fontWeight: 600 }}>Net Worth Over Time</span>
        <span style={{ fontSize: '16px', fontWeight: 700 }}>{formatCurrency(lastData.total)}</span>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
        {SERIES.map(s => {
          const val = lastData[s.key as keyof DataPoint] as number;
          if (val === 0 && s.key !== 'pay') return null;
          return (
            <span key={s.key} style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: s.color, display: 'inline-block' }} />
              {s.label}
            </span>
          );
        })}
      </div>

      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ display: 'block', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const val = minVal + range * pct;
          const y = getY(val);
          return (
            <g key={pct}>
              <line x1={padding.left} y1={y} x2={padding.left + chartWidth} y2={y} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 2" />
              <text x={padding.left + chartWidth + 4} y={y + 3} fontSize="8" fill="var(--text-secondary)">{formatCurrency(val)}</text>
            </g>
          );
        })}

        {/* Total line (thick) */}
        <path d={buildPath('total')} fill="none" stroke="#1a1d2e" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />

        {/* Series lines */}
        {SERIES.map(s => {
          const hasData = data.some(d => (d as any)[s.key] > 0);
          if (!hasData) return null;
          return <path key={s.key} d={buildPath(s.key)} fill="none" stroke={s.color} strokeWidth="1.5" strokeLinecap="round" />;
        })}

        {/* Hover line */}
        {hoverIndex !== null && (
          <line x1={getX(hoverIndex)} y1={padding.top} x2={getX(hoverIndex)} y2={padding.top + chartHeight} stroke="var(--text-secondary)" strokeWidth="1" strokeDasharray="3 2" />
        )}

        {/* X labels */}
        <text x={padding.left} y={height - 5} fontSize="8" fill="var(--text-secondary)">Wk {data[0].week}</text>
        <text x={padding.left + chartWidth} y={height - 5} fontSize="8" fill="var(--text-secondary)" textAnchor="end">Wk {data[data.length - 1].week}</text>
      </svg>

      {/* Hover Tooltip */}
      {hoverData && hoverIndex !== null && (
        <div style={{
          position: 'absolute',
          top: '40px',
          left: hoverIndex < data.length / 2 ? `${(hoverIndex / data.length) * 80 + 10}%` : undefined,
          right: hoverIndex >= data.length / 2 ? `${((data.length - hoverIndex) / data.length) * 80 + 5}%` : undefined,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '10px 14px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontSize: '11px',
          zIndex: 10,
          minWidth: '150px',
        }}>
          <div style={{ fontWeight: 700, marginBottom: '6px', fontSize: '12px' }}>
            {getGameDate(hoverData.week)} (Wk {hoverData.week})
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: '4px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
            <span>Total</span>
            <span>{formatCurrency(hoverData.total)}</span>
          </div>
          {SERIES.map(s => {
            const val = (hoverData as any)[s.key] as number;
            if (val === 0) return null;
            return (
              <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '2px', background: s.color, display: 'inline-block' }} />
                  {s.label}
                </span>
                <span>{formatCurrency(val)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
