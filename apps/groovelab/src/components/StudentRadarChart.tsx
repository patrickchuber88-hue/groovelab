import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface StudentRadarChartProps {
  studentRadarData: any[];
}

function StudentRadarChartComponent({ studentRadarData }: StudentRadarChartProps) {
  return (
    <div style={{ 
      width: '100%', 
      height: '420px', 
      minHeight: '400px', 
      position: 'relative',
      transform: 'translateZ(0)',
      WebkitTransform: 'translateZ(0)',
      backfaceVisibility: 'hidden',
      WebkitBackfaceVisibility: 'hidden'
    }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="82%" margin={{ top: 24, right: 40, bottom: 24, left: 40 }} data={studentRadarData}>
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
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]} 
            tick={false} 
            axisLine={false} 
          />
          <Tooltip
            content={({ active, payload }: any) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div style={{
                    background: '#1e293b',
                    color: '#ffffff',
                    padding: '6px 12px',
                    borderRadius: '10px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span>{data.instrument}:</span>
                    <span style={{ color: '#fbbf24' }}>{data.realProgress !== undefined ? data.realProgress : (data.xp || 0)}%</span>
                  </div>
                );
              }
              return null;
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
            isAnimationActive={true}
            animationDuration={400}
            animationEasing="ease-out"
            animationBegin={80}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function arePropsEqual(prev: StudentRadarChartProps, next: StudentRadarChartProps) {
  if (!prev.studentRadarData || !next.studentRadarData) return prev.studentRadarData === next.studentRadarData;
  if (prev.studentRadarData.length !== next.studentRadarData.length) return false;
  return prev.studentRadarData.every((item, i) => {
    const nextItem = next.studentRadarData[i];
    return nextItem && 
           item.instrument === nextItem.instrument && 
           item.xp === nextItem.xp && 
           item.realProgress === nextItem.realProgress;
  });
}

export default React.memo(StudentRadarChartComponent, arePropsEqual);

