import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

interface StudentRadarChartProps {
  studentRadarData: any[];
}

export default function StudentRadarChart({ studentRadarData }: StudentRadarChartProps) {
  return (
    <div style={{ width: '100%', height: '300px' }}>
      <ResponsiveContainer>
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={studentRadarData}>
          <PolarGrid stroke="#f1f5f9" />
          <PolarAngleAxis dataKey="instrument" tick={({ x, y, payload }) => (
            <text x={x} y={y} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }}>
              {payload.value}
            </text>
          )} />
          <Radar name="XP" dataKey="xp" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
