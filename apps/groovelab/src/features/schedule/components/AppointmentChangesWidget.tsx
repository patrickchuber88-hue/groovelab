import React from 'react';
import { AppointmentOccurrence } from '@groovelab/shared';
import { AppointmentChangesHeader } from './AppointmentChangesHeader';
import { AppointmentChangeItem } from './AppointmentChangeItem';

export interface AppointmentChangesWidgetProps {
  title?: string;
  myChangedAppointments: AppointmentOccurrence[];
  visibleChangedAppointments?: AppointmentOccurrence[];
  timeWindow?: '7days' | 'all';
  onTimeWindowChange?: (window: '7days' | 'all') => void;
  showAll?: boolean;
  onToggleShowAll?: () => void;
  onNavigateToSchedule?: (dateStr?: string) => void;
  onAcknowledge?: (occId: string) => void;
  onAcceptReschedule?: (occId: string) => void;
  onDeclineReschedule?: (occId: string) => void;
  isTeacher?: boolean;
}

export const AppointmentChangesWidget: React.FC<AppointmentChangesWidgetProps> = ({
  title = 'Terminänderungen',
  myChangedAppointments = [],
  visibleChangedAppointments = myChangedAppointments,
  timeWindow = 'all',
  onTimeWindowChange,
  showAll = false,
  onToggleShowAll,
  onNavigateToSchedule,
  onAcknowledge,
  onAcceptReschedule,
  onDeclineReschedule,
  isTeacher = false,
}) => {
  // Rule: Dynamic visibility - hide completely when 0 changes
  if (!myChangedAppointments || myChangedAppointments.length === 0) {
    return null;
  }

  const listToRender = showAll ? visibleChangedAppointments : visibleChangedAppointments.slice(0, 3);

  return (
    <div style={{ background: '#ffffff', borderRadius: '24px', padding: '16px 18px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1.5px dashed #f59e0b', marginBottom: '20px' }}>
      <AppointmentChangesHeader
        title={title}
        changeCount={myChangedAppointments.length}
        isTeacher={isTeacher}
        timeWindow={timeWindow}
        onTimeWindowChange={onTimeWindowChange}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {listToRender.map((occ) => (
          <AppointmentChangeItem
            key={occ.id}
            occ={occ}
            onNavigateToSchedule={onNavigateToSchedule}
            onAcknowledge={onAcknowledge}
            onAcceptReschedule={onAcceptReschedule}
            onDeclineReschedule={onDeclineReschedule}
          />
        ))}

        {visibleChangedAppointments.length > 3 && onToggleShowAll && (
          <button onClick={onToggleShowAll} style={{ width: '100%', padding: '6px', border: 'none', background: 'transparent', color: '#64748b', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}>
            {showAll ? 'Weniger anzeigen' : `Alle ${visibleChangedAppointments.length} Terminänderungen anzeigen`}
          </button>
        )}
      </div>
    </div>
  );
};
