import React from 'react';
import { formatCurrency } from '../engine/finance';

export interface AreaSeries {
  label: string;
  color: string;
  data: number[]; // one value per time step; all series share the same length/x-axis
}

interface StackedAreaChartProps {
  series: AreaSeries[];
  width?: number;
  height?: number;
  label?: string;
}

// A stacked area chart: each series is drawn on top of the cumulative total below
// it, so the top edge tracks the combined total. Mirrors LineChart's SVG layout.
export function StackedAreaChart({ series, width = 600, height = 180, label }: StackedAreaChartProps) {
  const len = series.length > 0 ? Math.max(...series.map(s => s.data.length)) : 0;
  if (len < 2 || series.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
        {label ? `${label}: ` : ''}Collecting data...
      </div>
    );
  }

  const padding = { top: 20, right: 60, bottom: 30, left: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Cumulative totals at each x determine the y-axis max.
  const totalsAtX: number[] = [];
  for (let i = 0; i < len; i++) {
    let sum = 0;
    for (const s of series) sum += s.data[i] ?? 0;
    totalsAtX.push(sum);
  }
  const maxVal = Math.max(1, ...totalsAtX);

  const xAt = (i: number) => padding.left + (i / (len - 1)) * chartWidth;
  const yAt = (v: number) => padding.top + chartHeight - (v / maxVal) * chartHeight;

  // Build stacked polygons from bottom to top.
  const cumulative = new Array(len).fill(0);
  const layers = series.map((s) => {
    const lower = [...cumulative];
    const upper = cumulative.map((c, i) => c + (s.data[i] ?? 0));
    // advance the running total
    for (let i = 0; i < len; i++) cumulative[i] = upper[i];

    const topEdge = upper.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)} ${yAt(v)}`).join(' ');
    const bottomEdge = lower
      .map((v, i) => ({ v, i }))
      .reverse()
      .map(({ v, i }) => `L ${xAt(i)} ${yAt(v)}`)
      .join(' ');
    const areaD = `${topEdge} ${bottomEdge} Z`;
    const lineD = upper.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)} ${yAt(v)}`).join(' ');
    return { series: s, areaD, lineD, latest: s.data[len - 1] ?? 0 };
  });

  const yLabels = [0, maxVal * 0.5, maxVal];
  const grandTotal = totalsAtX[len - 1];

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'baseline' }}>
          <span style={{ fontSize: '13px', fontWeight: 600 }}>{label}</span>
          <span style={{ fontSize: '16px', fontWeight: 700 }}>{formatCurrency(grandTotal)}</span>
        </div>
      )}
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        {/* Grid lines */}
        {yLabels.map((val, i) => {
          const y = yAt(val);
          return (
            <g key={i}>
              <line x1={padding.left} y1={y} x2={padding.left + chartWidth} y2={y} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 2" />
              <text x={padding.left + chartWidth + 5} y={y + 4} fontSize="9" fill="var(--text-secondary)">
                {formatCurrency(val)}
              </text>
            </g>
          );
        })}

        {/* Stacked areas (bottom to top) */}
        {layers.map((layer, i) => (
          <g key={i}>
            <path d={layer.areaD} fill={layer.series.color} fillOpacity="0.55" />
            <path d={layer.lineD} fill="none" stroke={layer.series.color} strokeWidth="1.5" />
          </g>
        ))}

        {/* X-axis labels */}
        <text x={padding.left} y={height - 5} fontSize="9" fill="var(--text-secondary)">Start</text>
        <text x={padding.left + chartWidth} y={height - 5} fontSize="9" fill="var(--text-secondary)" textAnchor="end">
          Week {len}
        </text>
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '10px' }}>
        {layers.map((layer, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: layer.series.color, display: 'inline-block' }} />
            <span style={{ color: 'var(--text-secondary)' }}>{layer.series.label}</span>
            <span style={{ fontWeight: 600 }}>{formatCurrency(layer.latest)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
