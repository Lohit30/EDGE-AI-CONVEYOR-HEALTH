// =============================================================================
// TrendChart — engineering-style time-series line chart
// =============================================================================

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import type { TrendPoint } from '../../types/telemetry';
import './TrendChart.css';

interface TrendChartProps {
  data: TrendPoint[];
  label: string;
  unit: string;
  color?: string;
  /** Warning threshold line */
  warnAt?: number;
  /** Critical threshold line */
  critAt?: number;
  /** Y-axis domain — auto if omitted */
  yMin?: number;
  yMax?: number;
  /** Decimal places for Y axis tick formatting */
  decimals?: number;
  height?: number;
  showHeader?: boolean;
}

const CustomTooltip = ({
  active,
  payload,
  label: tLabel,
  unit,
  decimals,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  unit: string;
  decimals: number;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="tc__tooltip">
      <div className="tc__tooltip-time">{tLabel}</div>
      <div className="tc__tooltip-val">
        {payload[0].value.toFixed(decimals)} {unit}
      </div>
    </div>
  );
};

export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  label,
  unit,
  color = 'var(--chart-line-1)',
  warnAt,
  critAt,
  yMin,
  yMax,
  decimals = 2,
  height = 100,
  showHeader = false,
}) => {
  const domain: [number | 'auto', number | 'auto'] = [
    yMin !== undefined ? yMin : 'auto',
    yMax !== undefined ? yMax : 'auto',
  ];

  // Show only every Nth label to avoid crowding
  const tickEvery = Math.max(1, Math.floor(data.length / 6));

  return (
    <div className="tc">
      {showHeader && (
        <div className="tc__header">
          <span className="tc__label">{label}</span>
          <span className="tc__unit">[{unit}]</span>
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid
            strokeDasharray="2 4"
            stroke="var(--chart-grid)"
            vertical={false}
          />
          <XAxis
            dataKey="t"
            tick={{ fontSize: 9, fill: 'var(--chart-axis)', fontFamily: 'var(--font-mono)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            interval={tickEvery - 1}
          />
          <YAxis
            domain={domain}
            tick={{ fontSize: 9, fill: 'var(--chart-axis)', fontFamily: 'var(--font-mono)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            width={32}
            tickFormatter={(v: number) => v.toFixed(decimals)}
          />
          <Tooltip
            content={<CustomTooltip unit={unit} decimals={decimals} />}
            cursor={{ stroke: 'var(--border-focus)', strokeWidth: 1 }}
          />
          {warnAt !== undefined && (
            <ReferenceLine
              y={warnAt}
              stroke="var(--state-warning)"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          )}
          {critAt !== undefined && (
            <ReferenceLine
              y={critAt}
              stroke="var(--state-critical)"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
