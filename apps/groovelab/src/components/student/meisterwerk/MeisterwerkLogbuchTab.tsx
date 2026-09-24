import React from 'react';
import { Square, Star, Check, Mic, Award, BookOpen } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { getBlob, deleteBlob } from '../../../utils/blobStorage';
import { formatTeacherFullName } from '../../../utils/nameHelper';
import { Student } from '../meisterwerk.types';
import { MasterworkAudioCapsule } from './MeisterwerkAudioPlayers';

export interface MeisterwerkLogbuchTabProps {
  isMobileOrSim: boolean;
  useNotebookLayout: boolean;
  student: Student;
  assignedLehrwerke: any[];
  globalLehrwerke: any[];
  activeSongSkills: any[];
  setActiveSongSkills: React.Dispatch<React.SetStateAction<any[]>>;
  progressItems: any[];
  setProgressItems: React.Dispatch<React.SetStateAction<any[]>>;
  activeAudioPlayerRef: React.MutableRefObject<HTMLAudioElement | null>;
  playingAudioUrl: string | null;
  setPlayingAudioUrl: (url: string | null) => void;
  notifyHomeworkChange: () => void;
  getSongColor: (title: string) => any;
  renderSongVinylCover: (color: any, size?: any) => React.ReactNode;
  isRecordingAudio: boolean;
  activeRecordingSongId: string | null;
  selectedActiveSongId: string | null;
  recordingTargetRef: React.MutableRefObject<any>;
  stopRecordingAudio: () => void;
  startRecordingAudio: (overrideSongId?: string | React.MouseEvent | any, overrideLabel?: string, isMasterworkSong?: boolean) => void | Promise<void>;
  audioDuration: number;
  readOnly?: boolean;
  getLehrwerkColor: (title: string) => any;
  setCertModalSong: (song: any) => void;
  resolvedSchoolName?: string;
}

export function MeisterwerkLogbuchTab(props: MeisterwerkLogbuchTabProps) {
  const {
    isMobileOrSim,
    useNotebookLayout,
    student,
    assignedLehrwerke,
    globalLehrwerke,
    activeSongSkills,
    setActiveSongSkills,
    progressItems,
    setProgressItems,
    activeAudioPlayerRef,
    playingAudioUrl,
    setPlayingAudioUrl,
    notifyHomeworkChange,
    getSongColor,
    renderSongVinylCover,
    isRecordingAudio,
    activeRecordingSongId,
    selectedActiveSongId,
    recordingTargetRef,
    stopRecordingAudio,
    startRecordingAudio,
    audioDuration,
    readOnly,
    getLehrwerkColor,
    setCertModalSong,
    resolvedSchoolName,
  } = props;

  return (
        <div style={{
          flex: 1,
          padding: isMobileOrSim ? '20px 16px 100px 16px' : (useNotebookLayout ? '32px 32px 80px 60px' : '32px 32px 80px 32px'),
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          background: useNotebookLayout ? '#faf8f2' : '#f8fafc',
          backgroundImage: useNotebookLayout ? 'repeating-linear-gradient(#faf8f2, #faf8f2 27px, #e5e0d4 27px, #e5e0d4 28px)' : 'none',
          borderRadius: useNotebookLayout ? '0 0 20px 20px' : '0',
          boxShadow: useNotebookLayout ? '0 10px 30px rgba(0,0,0,0.15)' : 'none',
          position: 'relative'
        }}>
          {useNotebookLayout && (
            <div style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: '42px',
              width: '2px',
              background: '#fca5a5',
              zIndex: 10
            }} />
          )}
          {useNotebookLayout && (
            <div style={{
              position: 'absolute',
              top: '20px',
              bottom: '20px',
              left: '8px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-around',
              zIndex: 25
            }}>
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#121214',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)'
                }} />
              ))}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>🏆</span>
            <span style={{
              fontSize: '1rem',
              fontWeight: 900,
              color: '#0f172a',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontFamily: '"Helvetica Neue", Helvetica, Inter, Arial, sans-serif'
            }}>
              Meine Meisterwerke
            </span>
          </div>

          {(() => {
            const masteredBooksList: any[] = [];
            assignedLehrwerke.forEach(assigned => {
              const book = globalLehrwerke.find(g => g.id === assigned.lehrwerkId);
              if (book) {
                const masteredPages: number[] = [];
                Object.entries(assigned.pageStates || {}).forEach(([pStr, state]: [string, any]) => {
                  if (state.status === 'mastered') {
                    const pNum = parseInt(pStr, 10);
                    if (!isNaN(pNum)) masteredPages.push(pNum);
                  }
                });
                if (masteredPages.length > 0) {
                  masteredBooksList.push({
                    title: book.title,
                    emoji: book.emoji,
                    pages: masteredPages.sort((a, b) => a - b)
                  });
                }
              }
            });

            const resolveMasteredSongAudio = (songId?: string, title?: string, key?: string): string | undefined => {
              const normKey = (key || title || '').toLowerCase().trim();
              const normTitle = (title || '').toLowerCase().trim();

              // 1. Direct Local Cache by Song ID
              if (songId) {
                const cachedById = localStorage.getItem(`campus_mastered_audio_${student.id}_${songId}`);
                if (cachedById) return cachedById;
              }

              // 2. Direct Local Cache by Title Key
              if (normKey) {
                const cachedByKey = localStorage.getItem(`campus_mastered_audio_${student.id}_${normKey}`);
                if (cachedByKey) return cachedByKey;
              }

              // 3. From activeSongSkills
              const matchSkill = (activeSongSkills || []).find(s => {
                const sTitle = (s.songs?.title || s.title || s.song_title || '').toLowerCase().trim();
                return (songId && s.id === songId) || (normKey && sTitle === normKey) || (normTitle && sTitle === normTitle);
              });
              if (matchSkill && ((matchSkill as any).recording_url || (matchSkill as any).audio_url)) {
                return (matchSkill as any).recording_url || (matchSkill as any).audio_url;
              }

              // 4. From progressItems (recording_url column only)
              const matchProg = (progressItems || []).find((p: any) => {
                const pText = (p.topic_name || p.title || '').toLowerCase().trim();
                const matches = (normKey && pText === normKey) || (normTitle && pText === normTitle) || (songId && p.id === songId);
                return matches && (p as any).recording_url;
              });
              if (matchProg && (matchProg as any).recording_url) {
                return (matchProg as any).recording_url;
              }

              return undefined;
            };

            const playMasteredAudio = async (url: string) => {
              try {
                if (activeAudioPlayerRef.current) {
                  activeAudioPlayerRef.current.pause();
                  activeAudioPlayerRef.current = null;
                  if (playingAudioUrl === url) {
                    setPlayingAudioUrl(null);
                    return;
                  }
                }
                let playUrl = url;
                if (url.startsWith('campus_blob_') || url.startsWith('campus_audio_')) {
                  const raw = await getBlob(url);
                  if (raw) {
                    const finalBlob = raw instanceof Blob ? raw : new Blob([raw], { type: 'audio/webm' });
                    playUrl = URL.createObjectURL(finalBlob);
                  }
                }
                const audio = new Audio(playUrl);
                activeAudioPlayerRef.current = audio;
                setPlayingAudioUrl(url);
                audio.onended = () => {
                  setPlayingAudioUrl(null);
                  activeAudioPlayerRef.current = null;
                };
                audio.onerror = (err) => {
                  console.warn('[playMasteredAudio] Play error:', err);
                  setPlayingAudioUrl(null);
                  activeAudioPlayerRef.current = null;
                };
                await audio.play();
              } catch (err) {
                console.warn('[playMasteredAudio] Playback notice:', err);
                setPlayingAudioUrl(null);
              }
            };

            const handleDeleteMasteredAudio = async (skillItem: any) => {
              try {
                const audioUrl = skillItem.audioUrl;
                const songId = skillItem.id;
                const title = skillItem.title;
                const artist = skillItem.artist;
                const normKey = `${artist || ''} - ${title || ''}`.toLowerCase().trim();
                const cleanTitleKey = (title || '').toLowerCase().trim();

                // 1. Clear LocalStorage
                if (student?.id) {
                  if (songId) {
                    localStorage.removeItem(`campus_mastered_audio_${student.id}_${songId}`);
                  }
                  if (normKey) {
                    localStorage.removeItem(`campus_mastered_audio_${student.id}_${normKey}`);
                  }
                  if (cleanTitleKey) {
                    localStorage.removeItem(`campus_mastered_audio_${student.id}_${cleanTitleKey}`);
                  }
                }

                // 2. Remove from Supabase Storage if remote
                if (audioUrl && audioUrl.startsWith('http')) {
                  const marker = '/storage/v1/object/public/campus-assets/';
                  const markerIndex = audioUrl.indexOf(marker);
                  if (markerIndex !== -1) {
                    const filePath = audioUrl.substring(markerIndex + marker.length);
                    supabase.storage.from('campus-assets').remove([filePath]).catch(() => {});
                  }
                }

                // 3. Remove from IndexedDB if local blob
                if (audioUrl && (audioUrl.startsWith('campus_blob_') || audioUrl.startsWith('campus_audio_'))) {
                  deleteBlob(audioUrl).catch(() => {});
                }

                // 4. Update React State
                setActiveSongSkills(prev => (prev || []).map(s => {
                  const sTitle = (s.songs?.title || s.title || s.song_title || '').toLowerCase().trim();
                  if ((songId && s.id === songId) || (cleanTitleKey && sTitle === cleanTitleKey) || (normKey && sTitle.includes(cleanTitleKey))) {
                    return { ...s, recording_url: null, audio_url: null };
                  }
                  return s;
                }));

                setProgressItems(prev => (prev || []).map(p => {
                  const pTitle = ((p as any).topic_name || (p as any).title || '').toLowerCase().trim();
                  if ((songId && p.id === songId) || (cleanTitleKey && pTitle === cleanTitleKey) || (normKey && pTitle.includes(cleanTitleKey))) {
                    return { ...p, recording_url: null };
                  }
                  return p;
                }));

                // 5. Update Supabase database
                if (songId && !String(songId).startsWith('temp-')) {
                  supabase.from('user_song_skills').update({ recording_url: null }).eq('id', songId).then(() => {});
                  supabase.from('progress_matrix').update({ recording_url: null }).eq('id', songId).then(() => {});
                }
                if (student?.id && title) {
                  supabase.from('progress_matrix').update({ recording_url: null }).eq('student_id', student.id).ilike('topic_name', `%${title}%`).then(() => {});
                }

                notifyHomeworkChange();
              } catch (err) {
                console.error('Error deleting mastered audio:', err);
              }
            };

            const masteredSongsMap = new Map<string, any>();

            // 1. From activeSongSkills
            (activeSongSkills || []).forEach(skill => {
              if (skill.is_stage_ready || skill.progress_percent === 100 || skill.status === 'MASTERED') {
                const title = skill.songs?.title || skill.title || skill.song_title;
                const artist = skill.songs?.artist || skill.artist || 'Unbekannt';
                if (title) {
                  const key = title.toLowerCase().trim();
                  const skillAudio = (skill as any)?.audio_url || (skill as any)?.recording_url || resolveMasteredSongAudio(skill.id, title, key);
                  masteredSongsMap.set(key, {
                    title,
                    artist,
                    instrument: skill.instrument || student?.instrument || 'Campus',
                    id: skill.id,
                    audioUrl: skillAudio,
                    masteredDate: skill.updated_at || skill.created_at
                  });
                }
              }
            });

            // 2. From progressItems
            (progressItems || []).forEach((item: any) => {
              const rawTopic = (item.topic_name || item.title || '').trim();
              if (!rawTopic || rawTopic.includes(' - Seite ') || rawTopic.startsWith('Hausaufgabe KW ') || rawTopic.toLowerCase() === 'test' || rawTopic.toLowerCase() === 'test - test' || rawTopic.toLowerCase() === 'test-test') return;
              if (item.status === 'MASTERED' || (item.progress_percent || 0) === 100) {
                const cleanT = rawTopic.replace(/\s*\([^)]*\)\s*$/, '').trim();
                const key = cleanT.toLowerCase();
                if (!masteredSongsMap.has(key)) {
                  let artist = 'Unbekannt';
                  let title = cleanT;
                  if (cleanT.includes(' - ')) {
                    const parts = cleanT.split(' - ');
                    artist = parts[0].trim();
                    title = parts.slice(1).join(' - ').trim();
                  }
                  const itemAudio = (item as any).recording_url || resolveMasteredSongAudio(item.id, title, key);
                  masteredSongsMap.set(key, {
                    title,
                    artist,
                    instrument: item.instrument || student?.instrument || 'Campus',
                    id: item.id,
                    audioUrl: itemAudio,
                    masteredDate: item.updated_at || item.created_at
                  });
                }
              }
            });

            const masteredSongs = Array.from(masteredSongsMap.values());

            const hasMastered = masteredBooksList.length > 0 || masteredSongs.length > 0;

            if (!hasMastered) {
              return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', margin: '40px auto 0 auto', maxWidth: '600px' }}>
                  <div style={{
                    padding: '60px 24px',
                    textAlign: 'center',
                    border: useNotebookLayout ? '2px dashed #32483e' : '2px dashed #cbd5e1',
                    borderRadius: '24px',
                    color: useNotebookLayout ? '#8fa399' : '#475569',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    background: useNotebookLayout ? 'rgba(0,0,0,0.1)' : 'white',
                    width: '100%'
                  }}>
                    Noch keine Meisterwerke eingetragen. Auf geht's! 🚀
                  </div>

                  {/* Audio-Tresor Retro-Kassette Promo Banner */}
                  <div style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderRadius: '20px',
                    padding: '18px 22px',
                    color: 'white',
                    width: '100%',
                    boxShadow: '0 8px 22px rgba(16, 185, 129, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '26px' }}>📼</span>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: '0.92rem', letterSpacing: '-0.01em' }}>
                          Meisterwerk Audio-Tresor (Retro-Kassette 📼)
                        </div>
                        <div style={{ fontSize: '0.78rem', opacity: 0.95, marginTop: '3px', lineHeight: 1.4 }}>
                          Sobald deine Musikschule ein Tresor-Paket gebucht hat, wird jede gemeisterte Aufnahme auf einer digitalen <strong>Retro-Kassette mit Spulen-Animation, Datumsstempel &amp; Beschriftung</strong> dauerhaft für dich und deine Eltern archiviert!
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', fontSize: '0.72rem', background: 'rgba(255,255,255,0.15)', padding: '8px 14px', borderRadius: '12px', backdropFilter: 'blur(4px)' }}>
                      <span>🔒 <strong>DSGVO-konform:</strong> Lückenlose Speicherung deiner musikalischen Meilensteine – ohne private Kamerafotos!</span>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '24px',
                width: '100%',
                marginTop: '16px'
              }}>
                {/* Spalte 1: Songs */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: useNotebookLayout ? '#34a853' : '#475569',
                    borderBottom: useNotebookLayout ? '2px solid #32483e' : '2px solid #e2e8f0',
                    paddingBottom: '8px',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>🎵</span> Songs
                  </h3>
                  
                  {masteredSongs.length === 0 ? (
                    <div style={{
                      padding: '30px 16px',
                      textAlign: 'center',
                      border: useNotebookLayout ? '1px dashed #32483e' : '1px dashed #cbd5e1',
                      borderRadius: '16px',
                      color: useNotebookLayout ? '#8fa399' : '#64748b',
                      fontSize: '0.82rem',
                      background: useNotebookLayout ? 'rgba(0,0,0,0.1)' : '#f8fafc'
                    }}>
                      Noch keine Meisterwerk-Songs vorhanden.
                    </div>
                  ) : (
                    masteredSongs.map((skill, idx) => {
                      const songColor = getSongColor(skill.title || 'Song');
                      const isThisRecording = isRecordingAudio && (activeRecordingSongId === skill.id || selectedActiveSongId === skill.id || recordingTargetRef.current.songId === skill.id);
                      return (
                        <div 
                          key={`m-song-${idx}`} 
                          style={{
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '16px',
                            padding: '12px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                            minHeight: '64px',
                            boxSizing: 'border-box'
                          }}
                        >
                          {/* Left: Vinyl Cover + Title */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                            {renderSongVinylCover(songColor, 'sm')}
                            <div style={{
                              fontSize: '0.90rem',
                              color: '#0f172a',
                              fontWeight: 900,
                              letterSpacing: '-0.02em',
                              fontFamily: '"Helvetica Neue", Helvetica, Inter, Arial, sans-serif',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {skill.artist} - {skill.title}
                            </div>
                          </div>

                          {/* Right: Buttons [ Aufnahme ] [ 🏅 Gold-Urkunde ] [ 🏆 Meisterwerk ] */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            {/* 🎙️ 1. Aufnahme Button */}
                            {isThisRecording ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  stopRecordingAudio();
                                }}
                                style={{
                                  background: '#fef2f2',
                                  color: '#dc2626',
                                  border: '1.5px solid #f87171',
                                  borderRadius: '10px',
                                  padding: '6px 12px',
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)'
                                }}
                                title="Aufnahme stoppen & im Meisterwerk archivieren"
                              >
                                <Square size={12} fill="#dc2626" />
                                <span>Stopp ({Math.floor(audioDuration / 60)}:{String(Math.floor(audioDuration % 60)).padStart(2, '0')})</span>
                              </button>
                            ) : skill.audioUrl ? (
                              <MasterworkAudioCapsule
                                url={skill.audioUrl}
                                songTitle={`${skill.artist} - ${skill.title}`}
                                onDelete={!readOnly ? () => handleDeleteMasteredAudio(skill) : undefined}
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startRecordingAudio(skill.id, `${skill.artist} - ${skill.title}`, true);
                                }}
                                style={{
                                  background: '#f0fdf4',
                                  color: '#166534',
                                  border: '1px solid #bbf7d0',
                                  borderRadius: '10px',
                                  padding: '6px 11px',
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  boxShadow: '0 1px 4px rgba(22, 101, 52, 0.08)'
                                }}
                                title="100% Meisterwerk-Aufnahme im Unterricht starten"
                              >
                                <Mic size={13} />
                                <span>Aufnahme</span>
                              </button>
                            )}

                            {/* 🏅 2. Gold-Urkunde Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCertModalSong({
                                  studentName: student?.first_name ? `${student.first_name} ${student.last_name || ''}`.trim() : (student?.name || 'Musikschüler'),
                                  songTitle: skill.title,
                                  instrument: skill.instrument || student?.instrument || 'Instrument',
                                  schoolName: resolvedSchoolName || 'Campus-Groovelab Musikschule',
                                  teacherName: (student as any)?.teacher_name ? formatTeacherFullName((student as any).teacher_name) : 'Deine Lehrkraft',
                                  masteredDate: skill.masteredDate || new Date().toISOString(),
                                  certificateId: `MW-${new Date().getFullYear()}-${skill.id ? String(skill.id).substring(0, 6).toUpperCase() : '100'}`
                                });
                              }}
                              style={{
                                background: '#fef3c7',
                                color: '#92400e',
                                border: '1px solid #fde68a',
                                borderRadius: '10px',
                                padding: '6px 12px',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                boxShadow: '0 2px 6px rgba(202, 138, 4, 0.15)'
                              }}
                              title="Offizielle Meisterwerk-Goldurkunde öffnen"
                            >
                              <Award size={14} color="#ca8a04" />
                              <span>Gold-Urkunde</span>
                            </button>

                            {/* 🏆 3. Meisterwerk Badge */}
                            <span style={{
                              fontSize: '0.72rem',
                              background: '#dcfce7',
                              color: '#15803d',
                              padding: '6px 11px',
                              borderRadius: '10px',
                              fontWeight: 800,
                              border: '1px solid #bbf7d0',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              boxShadow: '0 1px 4px rgba(21, 128, 61, 0.08)'
                            }}>
                              <span>🏆</span>
                              <span>Meisterwerk</span>
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Spalte 2: Lehrwerke */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: useNotebookLayout ? '#34a853' : '#475569',
                    borderBottom: useNotebookLayout ? '2px solid #32483e' : '2px solid #e2e8f0',
                    paddingBottom: '8px',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>📖</span> Lehrwerke
                  </h3>

                  {masteredBooksList.length === 0 ? (
                    <div style={{
                      padding: '30px 16px',
                      textAlign: 'center',
                      border: useNotebookLayout ? '1px dashed #32483e' : '1px dashed #cbd5e1',
                      borderRadius: '16px',
                      color: useNotebookLayout ? '#8fa399' : '#64748b',
                      fontSize: '0.82rem',
                      background: useNotebookLayout ? 'rgba(0,0,0,0.1)' : '#f8fafc'
                    }}>
                      Noch keine Meisterwerk-Lehrwerke vorhanden.
                    </div>
                  ) : (
                    masteredBooksList.map((item, idx) => {
                      const bookColor = getLehrwerkColor(item.title);
                      return (
                        <div key={`m-lw-${idx}`} style={{
                          background: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '20px',
                          padding: '12px 18px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                        }}>
                          {/* Gradient cover book */}
                          <div style={{
                            width: '34px',
                            height: '44px',
                            background: `linear-gradient(135deg, ${bookColor.from}, ${bookColor.to})`,
                            borderRadius: '4px',
                            position: 'relative',
                            boxShadow: '0 3px 6px rgba(0,0,0,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <BookOpen size={16} color={bookColor.text} />
                            <div style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: '3px',
                              background: 'rgba(0,0,0,0.12)',
                              borderRight: '1px solid rgba(255,255,255,0.08)'
                            }} />
                          </div>

                          {/* Content in a single line */}
                          <div style={{
                            fontSize: '0.86rem',
                            color: '#0f172a',
                            fontWeight: 900,
                            letterSpacing: '-0.02em',
                            fontFamily: '"Helvetica Neue", Helvetica, Inter, Arial, sans-serif',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {item.title} - <span style={{ color: '#475569', fontWeight: 700 }}>S. {item.pages.join(', ')}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })()}
        </div>

  );
}
