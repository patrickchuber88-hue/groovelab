import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, AlertCircle, Clock, Calendar, Music, Sparkles, Plus, Users, Trash } from 'lucide-react';

interface ParentScheduleInputProps {
  onSuccess?: () => void;
}

interface ChildDetails {
  id?: string;
  firstName: string;
  lastName: string;
  instrument: string;
  birthDate?: string;
  selectedSlots: Record<number, Set<string>>;
  isNew?: boolean;
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

const getInstrumentAvatarUrl = (instr: string) => {
  const low = (instr || '').toLowerCase();
  if (low.includes('gitarre') || low.includes('guitar')) return '/gitarre_avatar_new.png';
  if (low.includes('bass') || low.includes('kontrabass') || low.includes('contrabass')) return '/bass_avatar.png';
  if (low.includes('schlagzeug') || low.includes('drums')) return '/schlagzeug_avatar.png';
  if (low.includes('klavier') || low.includes('piano')) return '/klavier_avatar_new.png';
  if (low.includes('gesang') || low.includes('vocals') || low.includes('vocal')) return '/gesang_avatar.png';
  if (low.includes('trompete') || low.includes('trumpet')) return '/trompete_avatar_new.png';
  if (low.includes('posaune') || low.includes('trombone')) return '/posaune_avatar.png';
  return '/avatar_ghost.jpg';
};

export function ParentScheduleInput({ onSuccess }: ParentScheduleInputProps) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Sibling states
  const [children, setChildren] = useState<ChildDetails[]>([]);
  const [activeChildIndex, setActiveChildIndex] = useState<number>(0);
  const [showSiblingForm, setShowSiblingForm] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [hasCampusSub, setHasCampusSub] = useState<boolean>(true);

  // Sibling input form states
  const [sibFirstName, setSibFirstName] = useState('');
  const [sibLastName, setSibLastName] = useState('');
  const [sibInstrument, setSibInstrument] = useState('Gitarre');
  const [sibBirthDate, setSibBirthDate] = useState('');

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
        .select('id, first_name, last_name, instrument, role, school_id, sibling_group_id, birth_date')
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

      setSchoolId(student.school_id);

      if (student.school_id) {
        const { data: schData } = await supabase
          .from('schools')
          .select('has_campus_subscription')
          .eq('id', student.school_id)
          .maybeSingle();
        setHasCampusSub(schData?.has_campus_subscription !== false);
      }

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

      const initialChildren: ChildDetails[] = [
        {
          id: student.id,
          firstName: student.first_name,
          lastName: student.last_name,
          instrument: student.instrument || '',
          birthDate: student.birth_date || '',
          selectedSlots: loadedSlots,
          isNew: false
        }
      ];

      // Query any siblings already linked with sibling_group_id
      if (student.sibling_group_id) {
        const { data: siblingsData } = await supabase
          .from('users')
          .select('id, first_name, last_name, instrument, birth_date')
          .eq('sibling_group_id', student.sibling_group_id)
          .neq('id', student.id);

        if (siblingsData && siblingsData.length > 0) {
          for (const s of siblingsData) {
            const { data: sAvails } = await supabase
              .from('user_availability')
              .select('day_of_week, time_slot')
              .eq('user_id', s.id);

            const sSlots: Record<number, Set<string>> = {
              1: new Set(),
              2: new Set(),
              3: new Set(),
              4: new Set(),
              5: new Set()
            };

            sAvails?.forEach(item => {
              if (sSlots[item.day_of_week]) {
                sSlots[item.day_of_week].add(item.time_slot);
              }
            });

            initialChildren.push({
              id: s.id,
              firstName: s.first_name,
              lastName: s.last_name,
              instrument: s.instrument || '',
              birthDate: s.birth_date || '',
              selectedSlots: sSlots,
              isNew: false
            });
          }
        }
      }

      setChildren(initialChildren);
      setSibLastName(student.last_name || ''); // Default sibling last name to first student's last name

    } catch (err: any) {
      console.error('Error loading parent input view:', err);
      setError('Verbindungsfehler beim Laden der Daten.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSlot = (dayValue: number, slot: string) => {
    if (children.length === 0) return;
    
    const activeChild = children[activeChildIndex];
    const daySet = new Set(activeChild.selectedSlots[dayValue]);
    
    if (daySet.has(slot)) {
      daySet.delete(slot);
    } else {
      daySet.add(slot);
    }

    const updatedChildren = [...children];
    updatedChildren[activeChildIndex] = {
      ...activeChild,
      selectedSlots: {
        ...activeChild.selectedSlots,
        [dayValue]: daySet
      }
    };
    
    setChildren(updatedChildren);
  };

  const handleAddSibling = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sibFirstName.trim() || !sibLastName.trim() || !sibInstrument.trim()) return;

    // Smart Prefill: Copy availability from Sibling 1 (index 0)
    const sourceSlots = children[0]?.selectedSlots || {
      1: new Set(), 2: new Set(), 3: new Set(), 4: new Set(), 5: new Set()
    };

    const copiedSlots: Record<number, Set<string>> = {
      1: new Set(sourceSlots[1]),
      2: new Set(sourceSlots[2]),
      3: new Set(sourceSlots[3]),
      4: new Set(sourceSlots[4]),
      5: new Set(sourceSlots[5])
    };

    const newSibling: ChildDetails = {
      firstName: sibFirstName.trim(),
      lastName: sibLastName.trim(),
      instrument: sibInstrument.trim(),
      birthDate: sibBirthDate || undefined,
      selectedSlots: copiedSlots,
      isNew: true
    };

    setChildren([...children, newSibling]);
    setActiveChildIndex(children.length); // Switch tab to the newly created sibling
    setShowSiblingForm(false);

    // Reset sibling input form
    setSibFirstName('');
    setSibBirthDate('');
  };

  const handleRemoveNewSibling = (index: number) => {
    if (index === 0) return; // Cannot delete Sibling 1 (main student)
    
    const filtered = children.filter((_, i) => i !== index);
    setChildren(filtered);
    setActiveChildIndex(0);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (children.length === 0) return;

    setSubmitting(true);
    setError(null);

    try {
      // 1. Establish shared sibling_group_id if we have multiple children
      let siblingGroupId = children[0].id ? (await supabase.from('users').select('sibling_group_id').eq('id', children[0].id).single()).data?.sibling_group_id : null;

      if (children.length > 1 && !siblingGroupId) {
        siblingGroupId = crypto.randomUUID();
        // Update first student's sibling_group_id
        await supabase
          .from('users')
          .update({ sibling_group_id: siblingGroupId })
          .eq('id', children[0].id);
      }

      // 2. Process children
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        let currentUserId = child.id;

        // If it's a newly added sibling, insert into database first
        if (child.isNew && !currentUserId) {
          const qrToken = crypto.randomUUID();
          const avatarUrl = getInstrumentAvatarUrl(child.instrument);

          const finalLastName = hasCampusSub ? child.lastName : (child.lastName?.trim() ? child.lastName.trim().charAt(0).toUpperCase() + '.' : '');
          const finalBirthDate = hasCampusSub ? (child.birthDate || null) : null;

          const { data: newStud, error: insertError } = await supabase
            .from('users')
            .insert({
              school_id: schoolId,
              role: 'student',
              first_name: child.firstName,
              last_name: finalLastName,
              birth_date: finalBirthDate,
              photo_url: '/avatar_ghost.jpg',
              avatar_url: avatarUrl,
              qr_token: qrToken,
              instrument: child.instrument,
              sibling_group_id: siblingGroupId,
              is_campus_active: true,
              is_groovelab_active: true,
              app_usage_mode: 'student_only'
            })
            .select()
            .single();

          if (insertError) throw insertError;
          currentUserId = newStud.id;

          // Create avatar for new student
          await supabase.from('avatars').upsert({
            user_id: currentUserId,
            avatar_style: 'Premium_Hero',
            instrument_type: child.instrument,
            evolution_level: 1,
            xp: 0,
            asset_path: avatarUrl,
            streak_flame: 0
          });

          // Copy encrypted parent email prefix/suffix from Sibling 1
          const { data: emailPref } = await supabase.from('user_email_prefixes').select('*').eq('user_id', children[0].id).maybeSingle();
          const { data: emailSuff } = await supabase.from('user_email_suffixes').select('*').eq('user_id', children[0].id).maybeSingle();
          
          if (emailPref) {
            await supabase.from('user_email_prefixes').insert({ user_id: currentUserId, prefix: emailPref.prefix });
          }
          if (emailSuff) {
            await supabase.from('user_email_suffixes').insert({ user_id: currentUserId, suffix: emailSuff.suffix });
          }
        }

        if (!currentUserId) continue;

        // Delete existing availabilities
        const { error: deleteError } = await supabase
          .from('user_availability')
          .delete()
          .eq('user_id', currentUserId);

        if (deleteError) throw deleteError;

        // Insert new ones
        const insertItems: { user_id: string; day_of_week: number; time_slot: string }[] = [];
        Object.entries(child.selectedSlots).forEach(([dayStr, slotsSet]) => {
          const dayValue = parseInt(dayStr, 10);
          slotsSet.forEach(slot => {
            insertItems.push({
              user_id: currentUserId!,
              day_of_week: dayValue,
              time_slot: slot
            });
          });
        });

        if (insertItems.length > 0) {
          const { error: insertError } = await supabase
            .from('user_availability')
            .insert(insertItems);

          if (insertError) throw insertError;
        }
      }

      setSuccess(true);
      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (err: any) {
      console.error('Error saving weekly planner:', err);
      setError('Fehler beim Speichern der Wunschzeiten. Bitte versuche es erneut.');
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

  const activeChild = children[activeChildIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl text-center">
        {/* Brand indicator */}
        <div className="flex justify-center items-center gap-3 mb-6">
          <div className="h-10 w-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/35">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <span className="text-white font-extrabold text-2xl tracking-tight">Campus-Groovelab</span>
        </div>
        
        <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Stundenplan-Wunschzeiten
        </h2>
        <p className="mt-3 text-lg text-slate-400">
          Trage deine Wunschzeiten ein, damit wir euren Stundenplan ideal darauf abstimmen können.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-3xl">
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 py-8 px-4 shadow-2xl rounded-3xl sm:px-10">
          
          {success ? (
            <div className="flex flex-col items-center py-12 text-center">
              <CheckCircle className="h-20 w-20 text-emerald-400 animate-bounce" />
              <h3 className="mt-6 text-2xl font-extrabold text-white">Zeiten erfolgreich gespeichert!</h3>
              <p className="mt-3 text-slate-400 text-base max-w-md">
                Vielen Dank! Die Wunschzeiten wurden an die Musikschule übermittelt. Wir erstellen nun den Stundenplan.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              
              {/* Children Tab Selectors */}
              {children.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-slate-800/80 pb-4">
                  {children.map((child, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setActiveChildIndex(index)}
                        className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          activeChildIndex === index
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/10'
                            : 'bg-slate-950/50 text-slate-400 border-slate-800/50 hover:bg-slate-800/40 hover:text-slate-200'
                        }`}
                      >
                        <Users size={14} />
                        {child.firstName} {child.lastName} ({child.instrument})
                      </button>
                      {child.isNew && (
                        <button
                          type="button"
                          onClick={() => handleRemoveNewSibling(index)}
                          className="p-2 text-rose-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg border border-slate-800/50 cursor-pointer"
                          title="Geschwisterkind entfernen"
                        >
                          <Trash size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {!showSiblingForm && (
                    <button
                      type="button"
                      onClick={() => setShowSiblingForm(true)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-dashed border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all cursor-pointer"
                    >
                      <Plus size={14} /> Geschwisterkind verknüpfen
                    </button>
                  )}
                </div>
              )}

              {/* Sibling Insertion Form */}
              {showSiblingForm && (
                <div className="bg-slate-950/60 border border-slate-800 p-6 rounded-2xl space-y-4 mb-6">
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <Users size={16} className="text-indigo-400" /> Geschwisterkind hinzufügen
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Vorname *</label>
                      <input
                        type="text"
                        value={sibFirstName}
                        onChange={e => setSibFirstName(e.target.value)}
                        placeholder="z.B. Jonas"
                        required
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Nachname *</label>
                      <input
                        type="text"
                        value={sibLastName}
                        onChange={e => setSibLastName(e.target.value)}
                        placeholder="Schmid"
                        required
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Instrument / Fach *</label>
                      <select
                        value={sibInstrument}
                        onChange={e => setSibInstrument(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Gitarre">Gitarre</option>
                        <option value="Klavier">Klavier</option>
                        <option value="Schlagzeug">Schlagzeug</option>
                        <option value="Gesang">Gesang</option>
                        <option value="Geige">Geige</option>
                        <option value="Flöte">Flöte</option>
                        <option value="Trompete">Trompete</option>
                        <option value="Saxophon">Saxophon</option>
                        <option value="Bands & Ensembles">Bands & Ensembles</option>
                      </select>
                    </div>
                    {hasCampusSub && (
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1">Geburtsdatum (optional)</label>
                        <input
                          type="date"
                          value={sibBirthDate}
                          onChange={e => setSibBirthDate(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setShowSiblingForm(false)}
                      className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 cursor-pointer"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="button"
                      onClick={handleAddSibling}
                      disabled={!sibFirstName || !sibLastName}
                      className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg cursor-pointer disabled:opacity-50"
                    >
                      Hinzufügen
                    </button>
                  </div>
                </div>
              )}

              {activeChild && (
                <>
                  <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/60 text-slate-400 text-sm leading-relaxed flex items-start gap-3">
                    <Clock className="text-indigo-400 shrink-0 mt-0.5" size={18} />
                    <span>
                      Verfügbarkeiten für <strong>{activeChild.firstName}</strong>: Bitte wähle alle Zeiten aus (Montag bis Freitag), in denen {activeChild.firstName} für den Musikunterricht zur Verfügung steht. Durch Anklicken wählst du Zeitfenster an oder ab.
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
                              const isSelected = activeChild.selectedSlots[day.value]?.has(slot);
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
                </>
              )}

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
