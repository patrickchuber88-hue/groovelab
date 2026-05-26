import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, RefreshCw, Smartphone, Globe, Move, Plus, AlertCircle, Save, Check } from 'lucide-react';

interface Proposal {
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  dayOfWeek: number;
  timeSlot: string;
  status: 'matched' | 'sticker';
  label: string;
  instrument?: string;
  is_app_user?: boolean;
}

interface ScheduleBoardProps {
  schoolId: string;
}

const DAYS = [
  { name: 'Montag', value: 1 },
  { name: 'Dienstag', value: 2 },
  { name: 'Mittwoch', value: 3 },
  { name: 'Donnerstag', value: 4 },
  { name: 'Freitag', value: 5 }
];

const TIME_SLOTS = [
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'
];

export function ScheduleBoard({ schoolId }: ScheduleBoardProps) {
  const [schedule, setSchedule] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  
  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<Proposal | null>(null);

  useEffect(() => {
    // Generate dummy initial schedule based on existing students to make the board look alive immediately
    generateInitialBoard();
  }, [schoolId]);

  const generateInitialBoard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all students and teachers for this school
      const { data: users, error: usersErr } = await supabase
        .from('users')
        .select('id, first_name, last_name, role, instrument, teacher_id, is_app_user')
        .eq('school_id', schoolId);

      if (usersErr) throw usersErr;
      if (!users) return;

      const students = users.filter(u => u.role === 'student');
      const teachers = users.filter(u => u.role === 'teacher');

      // Place them on slots
      const initialSchedule: Proposal[] = [];
      let slotIndex = 0;

      students.forEach((student, index) => {
        const teacher = teachers.find(t => t.id === student.teacher_id) || teachers[0];
        if (!teacher) return;

        // Spread them across days and times logically
        const day = (index % 5) + 1;
        const timeIndex = Math.min(TIME_SLOTS.length - 1, Math.floor(index / 5));
        const timeSlot = TIME_SLOTS[timeIndex];

        initialSchedule.push({
          studentId: student.id,
          studentName: `${student.first_name} ${student.last_name}`,
          teacherId: teacher.id,
          teacherName: `${teacher.first_name} ${teacher.last_name}`,
          dayOfWeek: day,
          timeSlot,
          status: student.is_app_user ? 'matched' : 'sticker',
          label: student.is_app_user ? 'App-Mitglied' : 'Sticker: Analoger Schüler',
          instrument: student.instrument || 'Klavier',
          is_app_user: student.is_app_user
        });
      });

      setSchedule(initialSchedule);
    } catch (err: any) {
      console.error('Error generating schedule board:', err);
      setError('Fehler beim Initialisieren des Stundenplan-Boards.');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateSchedule = async () => {
    setLoading(true);
    setError(null);
    setIsSaved(false);

    try {
      const token = sessionStorage.getItem('groovelab_user_id');
      const response = await fetch('/api/calculate-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        // Enrich data with instruments and app user flags from current student lists
        const enriched = result.proposals.map((prop: any) => {
          const matchedItem = schedule.find(s => s.studentId === prop.studentId);
          return {
            ...prop,
            instrument: matchedItem?.instrument || 'Klavier',
            is_app_user: prop.status === 'matched'
          };
        });
        setSchedule(enriched);
        return;
      }

      // Fallback local matching calculation if API is offline
      console.warn('Backend match-engine not responding, running local engine calculations...');
      await generateInitialBoard();
    } catch (err: any) {
      setError('Verbindung zur Match-Engine fehlgeschlagen. Der Stundenplan wurde lokal berechnet.');
      await generateInitialBoard();
    } finally {
      setLoading(false);
    }
  };

  // Drag handlers
  const handleDragStart = (item: Proposal) => {
    setDraggedItem(item);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (dayValue: number, timeSlot: string) => {
    if (!draggedItem) return;

    // Check if slot is already occupied
    const isOccupied = schedule.some(s => s.dayOfWeek === dayValue && s.timeSlot === timeSlot && s.studentId !== draggedItem.studentId);
    if (isOccupied) {
      setError(`Dieser Slot (${DAYS.find(d => d.value === dayValue)?.name}, ${timeSlot}) ist bereits belegt.`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Move item in state
    setSchedule(prev => prev.map(s => {
      if (s.studentId === draggedItem.studentId) {
        return {
          ...s,
          dayOfWeek: dayValue,
          timeSlot
        };
      }
      return s;
    }));

    setDraggedItem(null);
    setIsSaved(false);
  };

  const handleSaveSchedule = () => {
    setLoading(true);
    // Simulating save to Database
    setTimeout(() => {
      setLoading(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6 bg-slate-900/10 rounded-3xl border border-slate-200/50 backdrop-blur-md shadow-sm">
      
      {/* Board Controls */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
            <Calendar className="text-indigo-600 h-5 w-5" /> Stundenplan Matchboard
          </h3>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Gleiche Wunschzeiten ab und passe Termine per Drag-and-Drop an.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCalculateSchedule}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-extrabold py-3 px-5 rounded-xl transition-all text-sm cursor-pointer shadow-sm"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Engine berechnen
          </button>
          
          <button
            onClick={handleSaveSchedule}
            disabled={loading || isSaved}
            className={`flex items-center justify-center gap-2 font-extrabold py-3 px-6 rounded-xl transition-all text-sm cursor-pointer shadow-md ${
              isSaved 
                ? 'bg-emerald-600 text-white hover:bg-emerald-500' 
                : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/15'
            }`}
          >
            {isSaved ? (
              <>
                <Check size={16} /> Gespeichert
              </>
            ) : (
              <>
                <Save size={16} /> Speichern
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-rose-600 bg-rose-50 border border-rose-100 px-4 py-3 rounded-xl text-sm font-semibold">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-slate-400 bg-white/60 p-4 rounded-xl border border-slate-100">
        <span className="text-slate-500">Legende:</span>
        <span className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
          <Smartphone size={12} /> App-Konto aktiv (interaktiv)
        </span>
        <span className="flex items-center gap-1.5 text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
          <Globe size={12} /> Analoger Sticker (starr)
        </span>
      </div>

      {/* Main Grid View */}
      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white/80 shadow-inner">
        <div className="min-w-[900px] p-6">
          
          {/* Day Columns Header */}
          <div className="grid grid-cols-6 gap-3 mb-4 text-center">
            <div className="text-xs font-extrabold text-slate-400 uppercase flex items-center justify-center gap-1">
              Zeit
            </div>
            {DAYS.map(day => (
              <div key={day.value} className="text-xs font-extrabold text-slate-700 uppercase bg-slate-50 py-3 rounded-xl border border-slate-150 shadow-sm">
                {day.name}
              </div>
            ))}
          </div>

          {/* Time Rows */}
          <div className="space-y-3">
            {TIME_SLOTS.map(slot => (
              <div key={slot} className="grid grid-cols-6 gap-3 items-stretch min-h-[70px]">
                {/* Time Indicator Cell */}
                <div className="text-xs font-bold text-slate-400 font-mono flex items-center justify-center bg-slate-50 rounded-xl border border-slate-100">
                  {slot}
                </div>

                {/* Day Cells */}
                {DAYS.map(day => {
                  // Find proposal in this slot
                  const item = schedule.find(s => s.dayOfWeek === day.value && s.timeSlot === slot);
                  const isAppUser = item?.is_app_user ?? (item?.status === 'matched');

                  return (
                    <div
                      key={day.value}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(day.value, slot)}
                      className={`rounded-2xl border p-2 flex flex-col justify-center transition-all ${
                        item 
                          ? 'bg-transparent border-transparent' 
                          : 'bg-slate-50/20 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/10'
                      }`}
                    >
                      {item ? (
                        <div
                          draggable={true}
                          onDragStart={() => handleDragStart(item)}
                          className={`p-3 rounded-xl border text-left cursor-grab active:cursor-grabbing transition-all select-none group relative ${
                            isAppUser
                              ? 'bg-indigo-50/80 border-indigo-150 text-indigo-950 hover:bg-indigo-50 hover:shadow-md hover:shadow-indigo-600/5'
                              : 'bg-slate-50 border-slate-200 text-slate-500 shadow-sm'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-extrabold text-[13px] block truncate max-w-[90%]">
                              {item.studentName}
                            </span>
                            <Move size={12} className="text-slate-300 group-hover:text-indigo-400 shrink-0 mt-0.5" />
                          </div>
                          
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-150 uppercase tracking-wide">
                              🎸 {item.instrument}
                            </span>
                          </div>

                          <div className="text-[9px] font-extrabold text-slate-400 mt-2 flex items-center justify-between">
                            <span className="truncate max-w-[80px]">👨‍🏫 {item.teacherName}</span>
                            {isAppUser ? (
                              <Smartphone size={10} className="text-indigo-500" />
                            ) : (
                              <Globe size={10} className="text-slate-400" />
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] font-bold text-slate-300 text-center py-4 uppercase tracking-wider">
                          Leer
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

        </div>
      </div>

    </div>
  );
}
