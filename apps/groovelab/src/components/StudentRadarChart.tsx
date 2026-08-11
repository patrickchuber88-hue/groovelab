import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

interface StudentRadarChartProps {
  studentRadarData: any[];
}

export default function StudentRadarChart({ studentRadarData }: StudentRadarChartProps) {
  return (
    <div style={{ width: '100%', height: '300px', minHeight: '280px', position: 'relative' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="68%" margin={{ top: 20, right: 35, bottom: 20, left: 35 }} data={studentRadarData}>
          <PolarGrid stroke="#cbd5e1" strokeWidth={1} strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="instrument"
            tick={(props: any) => {
              const { x, y, cx, cy, payload } = props;
              const dx = Number(x || 0) - Number(cx || 0);
              const textAnchor = dx > 15 ? 'start' : dx < -15 ? 'end' : 'middle';
              return (
                <text
                  x={x}
                  y={y}
                  textAnchor={textAnchor}
                  dominantBaseline="central"
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    fill: '#334155',
                    letterSpacing: '0.01em'
                  }}
                >
                  {payload?.value}
                </text>
              );
            }}
          />
          <Radar
            name="XP"
            dataKey="xp"
            stroke="#f59e0b"
            fill="#f59e0b"
            fillOpacity={0.5}
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#d97706', stroke: '#ffffff', strokeWidth: 2 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

