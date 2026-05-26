import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, AlertCircle, Clock, Calendar, Music, Sparkles } from 'lucide-react';

interface ParentScheduleInputProps {
  onSuccess?: () => void;
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

export function ParentScheduleInput({ onSuccess }: ParentScheduleInputProps) {
  const [token, setToken] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string>('');
  const [instrument, setInstrument] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Selected availability structure: Record<day_of_week, Set<time_slot>>
  const [selectedSlots, setSelectedSlots] = useState<Record<number, Set<string>>>({
    1: new Set(),
    2: new Set(),
    3: new Set(),
    4: new Set(),
    5: new Set()
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token') || params.get('qr_token');
    const urlStudentId = params.get('student_id');

    if (urlToken) {
      setToken(urlToken);
      loadStudentAndAvailability(urlToken, urlStudentId);
    } else {
      setLoading(false);
      setError('Aktivierungstoken fehlt. Bitte verwende den vollständigen Link aus der Einladung.');
    }
  }, []);

  const loadStudentAndAvailability = async (token: string, explicitStudentId: string | null) => {
    try {
      setLoading(true);
      setError(null);

      // Query student using token (qr_token column)
      let query = supabase
        .from('users')
        .select('id, first_name, last_name, instrument, role')
        .eq('qr_token', token)
        .eq('role', 'student');

      if (explicitStudentId) {
        query = query.eq('id', explicitStudentId);
      }

      const { data: student, error: studentError } = await query.maybeSingle();

      if (studentError) throw studentError;
      if (!student) {
        setError('Ungültiger Link. Das Schülerprofil konnte nicht gefunden werden.');
        setLoading(false);
        return;
      }

      setStudentId(student.id);
      setStudentName(`${student.first_name} ${student.last_name}`);
      setInstrument(student.instrument || '');

      // Load existing availabilities for this student
      const { data: availabilities, error: availError } = await supabase
        .from('user_availability')
        .select('day_of_week, time_slot')
        .eq('user_id', student.id);

      if (availError) throw availError;

      const loadedSlots: Record<number, Set<string>> = {
        1: new Set(),
        2: new Set(),
        3: new Set(),
        4: new Set(),
        5: new Set()
      };

      availabilities?.forEach(item => {
        const day = item.day_of_week;
        if (loadedSlots[day]) {
          loadedSlots[day].add(item.time_slot);
        }
      });

      setSelectedSlots(loadedSlots);

    } catch (err: any) {
      console.error('Error loading parent input view:', err);
      setError('Verbindungsfehler beim Laden der Daten.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSlot = (dayValue: number, slot: string) => {
    const daySet = new Set(selectedSlots[dayValue]);
    if (daySet.has(slot)) {
      daySet.delete(slot);
    } else {
      daySet.add(slot);
    }
    
    setSelectedSlots(prev => ({
      ...prev,
      [dayValue]: daySet
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) return;

    setSubmitting(true);
    setError(null);

    try {
      // 1. Delete all current availabilities for this student
      const { error: deleteError } = await supabase
        .from('user_availability')
        .delete()
        .eq('user_id', studentId);

      if (deleteError) throw deleteError;

      // 2. Prepare new items
      const insertItems: { user_id: string; day_of_week: number; time_slot: string }[] = [];
      Object.entries(selectedSlots).forEach(([dayStr, slotsSet]) => {
        const dayValue = parseInt(dayStr, 10);
        slotsSet.forEach(slot => {
          insertItems.push({
            user_id: studentId,
            day_of_week: dayValue,
            time_slot: slot
          });
        });
      });

      // 3. Bulk insert new availabilities
      if (insertItems.length > 0) {
        const { error: insertError } = await supabase
          .from('user_availability')
          .insert(insertItems);

        if (insertError) throw insertError;
      }

      setSuccess(true);
      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (err: any) {
      console.error('Error saving weekly planner:', err);
      setError('Fehler beim Speichern der Zeiten. Bitte versuche es erneut.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="text-slate-400 text-sm font-semibold tracking-wide uppercase">Lade Wochenplaner...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl text-center">
        {/* Brand indicator */}
        <div className="flex justify-center items-center gap-3 mb-6">
          <div className="h-10 w-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/35">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <span className="text-white font-extrabold text-2xl tracking-tight">GrooveLab & Campus</span>
        </div>
        
        <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Stundenplan-Wunschzeiten
        </h2>
        {studentName && (
          <p className="mt-3 text-lg text-indigo-400 font-bold">
            Verfügbarkeiten für: {studentName} ({instrument})
          </p>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-3xl">
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 py-8 px-4 shadow-2xl rounded-3xl sm:px-10">
          
          {success ? (
            <div className="flex flex-col items-center py-12 text-center">
              <CheckCircle className="h-20 w-20 text-emerald-400 animate-bounce" />
              <h3 className="mt-6 text-2xl font-extrabold text-white">Zeiten erfolgreich gespeichert!</h3>
              <p className="mt-3 text-slate-400 text-base max-w-md">
                Vielen Dank! Die Wunschzeiten wurden an die Musikschule übermittelt. Wir melden uns mit dem finalen Stundenplan.
              </p>
            </div>
          ) : error && !studentId ? (
            <div className="flex flex-col items-center py-6 text-center gap-4">
              <AlertCircle className="h-16 w-16 text-rose-500" />
              <div className="text-rose-400 font-medium text-sm bg-rose-950/20 border border-rose-900/30 p-4 rounded-xl">
                {error}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              
              <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/60 mb-6 text-slate-400 text-sm leading-relaxed flex items-start gap-3">
                <Clock className="text-indigo-400 shrink-0 mt-0.5" size={18} />
                <span>
                  Bitte wähle alle Zeiten aus (Montag bis Freitag), in denen dein Kind für den Musikunterricht zur Verfügung steht. Durch Anklicken wählst du Zeitfenster an oder ab.
                </span>
              </div>

              {/* Weekly Planner Grid */}
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
                <div className="min-w-[650px] p-4">
                  {/* Days Header */}
                  <div className="grid grid-cols-6 gap-2 mb-3 text-center">
                    <div className="text-xs font-bold text-slate-500 uppercase flex items-center justify-center gap-1">
                      <Calendar size={14} /> Uhrzeit
                    </div>
                    {DAYS.map(day => (
                      <div key={day.value} className="text-xs font-extrabold text-white uppercase bg-slate-900 py-2.5 rounded-xl border border-slate-800">
                        {day.name}
                      </div>
                    ))}
                  </div>

                  {/* Time Slots Rows */}
                  <div className="space-y-1.5">
                    {TIME_SLOTS.map(slot => (
                      <div key={slot} className="grid grid-cols-6 gap-2 items-center text-center">
                        {/* Time Label */}
                        <div className="text-xs font-bold text-slate-400 font-mono py-2 bg-slate-950/80 rounded-lg">
                          {slot}
                        </div>
                        
                        {/* Days Selectable Buttons */}
                        {DAYS.map(day => {
                          const isSelected = selectedSlots[day.value]?.has(slot);
                          return (
                            <button
                              key={day.value}
                              type="button"
                              onClick={() => handleToggleSlot(day.value, slot)}
                              className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/10'
                                  : 'bg-slate-900/50 text-slate-400 border-slate-800/50 hover:bg-slate-800/40 hover:text-slate-200'
                              }`}
                            >
                              {isSelected ? 'Aktiv' : 'Frei'}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold bg-rose-950/20 border border-rose-900/30 px-3 py-2 rounded-lg">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Actions Footer */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-500 text-center sm:text-left">
                  Deine Änderungen werden direkt an die Koordinierungsstelle übertragen.
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto flex justify-center items-center gap-2 py-3 px-8 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  {submitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  ) : (
                    'Wunschzeiten speichern'
                  )}
                </button>
              </div>

            </form>
          )}

          {/* Help Center Info */}
          <div className="mt-8 border-t border-slate-800/60 pt-4 text-center">
            <p className="text-xs text-slate-500 leading-relaxed flex items-center justify-center gap-1">
              <Music size={12} /> Bei Fragen wende dich bitte direkt an deine Musikschule.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
