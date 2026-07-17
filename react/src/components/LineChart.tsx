import React from 'react';
import { formatCurrency } from '../engine/finance';

interface LineChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  label?: string;
}

export function LineChart({ data, width = 600, height = 160, color = '#3b82f6', label }: LineChartProps) {
  if (data.length < 2) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
        {label ? `${label}: ` : ''}Collecting data...
      </div>
    );
  }

  const padding = { top: 20, right: 60, bottom: 30, left: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range = maxVal - minVal || 1;

  const points = data.map((val, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - ((val - minVal) / range) * chartHeight;
    return { x, y, val };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Area fill
  const areaD = pathD + ` L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

  // Y-axis labels
  const yLabels = [minVal, minVal + range * 0.5, maxVal];

  const lastVal = data[data.length - 1];
  const firstVal = data[0];
  const change = lastVal - firstVal;
  const changePct = firstVal !== 0 ? ((change / firstVal) * 100).toFixed(1) : '0.0';

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'baseline' }}>
          <span style={{ fontSize: '13px', fontWeight: 600 }}>{label}</span>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '16px', fontWeight: 700 }}>{formatCurrency(lastVal)}</span>
            <span style={{ fontSize: '12px', marginLeft: '8px', color: change >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              {change >= 0 ? '+' : ''}{formatCurrency(change)} ({changePct}%)
            </span>
          </div>
        </div>
      )}
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        {/* Grid lines */}
        {yLabels.map((val, i) => {
          const y = padding.top + chartHeight - ((val - minVal) / range) * chartHeight;
          return (
            <g key={i}>
              <line x1={padding.left} y1={y} x2={padding.left + chartWidth} y2={y} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 2" />
              <text x={padding.left + chartWidth + 5} y={y + 4} fontSize="9" fill="var(--text-secondary)">
                {formatCurrency(val)}
              </text>
            </g>
          );
        })}

        {/* Area */}
        <path d={areaD} fill={color} fillOpacity="0.08" />

        {/* Line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Current value dot */}
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="4" fill={color} />

        {/* X-axis labels */}
        <text x={padding.left} y={height - 5} fontSize="9" fill="var(--text-secondary)">
          Week {Math.max(0, data.length - data.length)}
        </text>
        <text x={padding.left + chartWidth} y={height - 5} fontSize="9" fill="var(--text-secondary)" textAnchor="end">
          Week {data.length}
        </text>
      </svg>
    </div>
  );
}
