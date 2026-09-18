import { useState, useEffect, useCallback } from 'react';
import { CampusEvent, ProgramPoint } from '../types/campusEvents.types';
import { calculateTimelineTimes } from '../utils/campusEventsUtils';
import { downloadCsvFile } from '../../../../utils/csvHelper';
import { formatCombinedStudentNames } from '../../../../utils/nameHelper';
import { supabase as defaultSupabase } from '../../../../lib/supabase';

interface UseCampusConcertCoordinatorParams {
  activeEvent?: CampusEvent | null;
  schoolId: string;
  userId?: string;
  supabase?: any;
  brandColor?: string;
  allUsers?: any[];
  studentConsentsMap?: Record<string, Record<string, boolean>>;
}

export function useCampusConcertCoordinator({
  activeEvent = null,
  schoolId,
  userId = '',
  supabase = defaultSupabase,
  brandColor,
  allUsers = [],
  studentConsentsMap = {}
}: UseCampusConcertCoordinatorParams) {
  const [programPoints, setProgramPoints] = useState<ProgramPoint[]>([]);
  const [loadingProgramPoints, setLoadingProgramPoints] = useState(false);
  const [activeStage, setActiveStage] = useState<number>(1);
  const [stageCount, setStageCount] = useState<number>(1);
  const [techViewMode, setTechViewMode] = useState<'single' | 'all'>('single');
  const [dbConflicts, setDbConflicts] = useState<{ program_point_id: string; conflict_type: string; conflict_message: string }[]>([]);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'above' | 'below' | null>(null);
  const [coordinatorTab, setCoordinatorTab] = useState<'eckdaten' | 'submissions' | 'timeline' | 'feedback' | 'tech' | 'export'>('eckdaten');
  const [expandedPoints, setExpandedPoints] = useState<Record<string, boolean>>({});
  const [techConsoleNightMode, setTechConsoleNightMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('groovelab_tech_night_mode') === 'true';
    } catch {
      return false;
    }
  });

  const fetchProgramPoints = useCallback(async (eventId: string) => {
    if (!eventId) return;
    setLoadingProgramPoints(true);
    try {
      const { data, error } = await supabase
        .from('campus_event_program_points')
        .select('*')
        .eq('event_id', eventId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setProgramPoints(data || []);
    } catch (err) {
      console.warn('Error fetching program points:', err);
    } finally {
      setLoadingProgramPoints(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (activeEvent?.id) {
      fetchProgramPoints(activeEvent.id);
      if (activeEvent.stage_count) {
        setStageCount(activeEvent.stage_count);
      }
    } else {
      setProgramPoints([]);
    }
  }, [activeEvent?.id, activeEvent?.stage_count, fetchProgramPoints]);

  const handleUpdateProgramPointStatus = useCallback(async (ppId: string, newStatus: 'approved' | 'rejected') => {
    try {
      const { data, error } = await supabase
        .from('campus_event_program_points')
        .update({ status: newStatus })
        .eq('id', ppId)
        .select()
        .single();
      if (error) throw error;
      setProgramPoints(prev => prev.map(pp => pp.id === ppId ? data : pp));
    } catch (err: any) {
      console.error('Error updating program point status:', err);
      alert('Fehler beim Aktualisieren des Status: ' + err.message);
    }
  }, [supabase]);

  const handleDeleteProgramPoint = useCallback(async (ppId: string) => {
    if (!window.confirm('Möchtest du diesen Programmpunkt wirklich löschen?')) return;
    try {
      const { error } = await supabase
        .from('campus_event_program_points')
        .delete()
        .eq('id', ppId);
      if (error) throw error;
      setProgramPoints(prev => prev.filter(pp => pp.id !== ppId));
    } catch (err: any) {
      console.error('Error deleting program point:', err);
      alert('Fehler beim Löschen des Programmpunkts: ' + err.message);
    }
  }, [supabase]);

  const handleMoveProgramPoint = useCallback(async (ppId: string, direction: 'up' | 'down') => {
    const current = programPoints.find(p => p.id === ppId);
    if (!current) return;
    const stage = current.stage_number || 1;
    const stagePoints = programPoints
      .filter(p => (p.stage_number || 1) === stage && (p.is_scheduled || p.is_pause))
      .sort((a, b) => a.sort_order - b.sort_order);

    const idx = stagePoints.findIndex(p => p.id === ppId);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === stagePoints.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const other = stagePoints[targetIdx];

    const currentOrder = current.sort_order;
    const otherOrder = other.sort_order;

    setProgramPoints(prev => prev.map(p => {
      if (p.id === current.id) return { ...p, sort_order: otherOrder };
      if (p.id === other.id) return { ...p, sort_order: currentOrder };
      return p;
    }));

    try {
      await Promise.all([
        supabase.from('campus_event_program_points').update({ sort_order: otherOrder }).eq('id', current.id),
        supabase.from('campus_event_program_points').update({ sort_order: currentOrder }).eq('id', other.id)
      ]);
    } catch (err) {
      console.error('Error moving program point:', err);
    }
  }, [programPoints, supabase]);

  const handleExportPDF = useCallback(() => {
    if (!activeEvent) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup wurde blockiert. Bitte erlaube Popups für den PDF-Druck.');
      return;
    }

    const stagesMap: Record<number, ProgramPoint[]> = {};
    programPoints.forEach(pp => {
      if (pp.is_scheduled || pp.is_pause) {
        const stage = pp.stage_number || 1;
        if (!stagesMap[stage]) stagesMap[stage] = [];
        stagesMap[stage].push(pp);
      }
    });

    const activeEventStartTime = activeEvent.event_start_time || activeEvent.start_time || '14:00';
    const timeMap = calculateTimelineTimes(programPoints, activeEventStartTime);
    let stagesContentHTML = '';
    let isFirstStage = true;

    Object.keys(stagesMap).sort((a, b) => parseInt(a, 10) - parseInt(b, 10)).forEach(stageKey => {
      const stageNum = parseInt(stageKey, 10);
      const points = stagesMap[stageNum].sort((a, b) => a.sort_order - b.sort_order);

      stagesContentHTML += `
      <div class="stage-section" style="${!isFirstStage ? 'page-break-before: always; margin-top: 30px;' : ''}">
        <div class="stage-header">Bühne ${stageNum}</div>
        <table>
          <thead>
            <tr>
              <th style="width: 18%; text-align: left;">Zeit</th>
              <th style="width: 42%; text-align: left;">Programm &amp; Besetzung</th>
              <th style="width: 40%; text-align: left;">Repertoire / Stücke</th>
            </tr>
          </thead>
          <tbody>
            ${points.map(pp => {
              const timeInfo = timeMap[pp.id] || { start: '--:--', end: '--:--' };
              const songsList = pp.songs && Array.isArray(pp.songs) ? pp.songs : pp.title ? [{ title: pp.title, artist: pp.artist }] : [];
              let songsHTML = '';
              if (pp.is_pause) {
                songsHTML = '<span class="pause-badge">Pause</span>';
              } else if (songsList.length > 0) {
                songsHTML = songsList.map((song: any) => `
                  <div class="song-item">
                    <span class="song-title">${song.title}</span>
                    ${song.artist ? `<span class="song-artist">&middot; ${song.artist}</span>` : ''}
                  </div>
                `).join('');
              } else {
                songsHTML = `<span style="color:#8e8e93; font-style:italic; font-size:0.8rem;">${pp.instrument || '—'}</span>`;
              }

              return `
              <tr class="${pp.is_pause ? 'row-pause' : ''}">
                <td class="tabular-time">${timeInfo.start} &ndash; ${timeInfo.end}</td>
                <td>
                  <div class="program-title">${pp.is_pause ? 'Pause: ' : ''}${formatCombinedStudentNames(pp.name, null, pp.id, true)}</div>
                  ${!pp.is_pause ? `<div class="program-sub">${pp.ensemble_band || 'Einzelbeitrag'}</div>` : ''}
                </td>
                <td>${songsHTML}</td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      `;
      isFirstStage = false;
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${activeEvent.title} - Programmheft</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #1d1d1f;
            margin: 40px;
            line-height: 1.5;
          }
          .header {
            border-bottom: 2px solid #1d1d1f;
            padding-bottom: 16px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .header h1 {
            margin: 0;
            font-size: 1.8rem;
            font-weight: 800;
          }
          .stage-header {
            font-size: 1.2rem;
            font-weight: 700;
            margin-bottom: 12px;
            color: #34a853;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
          }
          th {
            border-bottom: 2px solid #e2e8f0;
            padding: 10px;
            font-size: 0.78rem;
            text-transform: uppercase;
            color: #64748b;
          }
          td {
            border-bottom: 1px solid #f1f5f9;
            padding: 10px;
            font-size: 0.86rem;
            vertical-align: top;
          }
          .tabular-time {
            font-variant-numeric: tabular-nums;
            font-weight: 700;
          }
          .program-title {
            font-weight: 700;
          }
          .program-sub {
            font-size: 0.75rem;
            color: #64748b;
          }
          .song-title {
            font-weight: 600;
          }
          .song-artist {
            color: #64748b;
            font-size: 0.8rem;
          }
          .pause-badge {
            display: inline-block;
            background: #f1f5f9;
            color: #64748b;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 700;
          }
          @media print {
            body { margin: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>${activeEvent.title}</h1>
            <div style="font-size: 0.85rem; color: #64748b; margin-top: 4px;">
              ${activeEvent.event_date ? new Date(activeEvent.event_date).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : ''}
              ${activeEvent.location ? ` &middot; ${activeEvent.location}` : ''}
            </div>
          </div>
          <div style="font-size: 0.8rem; font-weight: 700; color: #34a853;">Campus-Groovelab</div>
        </div>
        ${stagesContentHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  }, [activeEvent, programPoints]);

  const handleExportTechRiderPDF = useCallback(() => {
    if (!activeEvent) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const activeEventStartTime = activeEvent.event_start_time || activeEvent.start_time || '14:00';
    const timeMap = calculateTimelineTimes(programPoints, activeEventStartTime);
    const stagePoints = programPoints
      .filter(p => (p.stage_number || 1) === activeStage && (p.is_scheduled || p.is_pause))
      .sort((a, b) => a.sort_order - b.sort_order);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${activeEvent.title} - Technik-Rider Bühne ${activeStage}</title>
        <style>
          body { font-family: sans-serif; margin: 30px; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { border-bottom: 2px solid #0f172a; padding: 8px; text-align: left; font-size: 0.75rem; text-transform: uppercase; }
          td { border-bottom: 1px solid #e2e8f0; padding: 10px 8px; font-size: 0.82rem; }
        </style>
      </head>
      <body>
        <h2>${activeEvent.title} &middot; Technik-Rider (Bühne ${activeStage})</h2>
        <table>
          <thead>
            <tr>
              <th>Zeit</th>
              <th>Beitrag</th>
              <th>Signal / Audio</th>
              <th>Aufbau / Notizen</th>
            </tr>
          </thead>
          <tbody>
            ${stagePoints.map(pp => {
              const timeInfo = timeMap[pp.id] || { start: '--:--', end: '--:--' };
              return `
                <tr>
                  <td style="font-weight:bold;">${timeInfo.start} &ndash; ${timeInfo.end}</td>
                  <td><strong>${pp.name}</strong><br/><small>${pp.ensemble_band || ''}</small></td>
                  <td>${pp.tech_requirements || 'Standard'}</td>
                  <td>${pp.remarks || '—'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  }, [activeEvent, programPoints, activeStage]);

  const handleExportCSV = useCallback(() => {
    if (!activeEvent) return;
    const activeEventStartTime = activeEvent.event_start_time || activeEvent.start_time || '14:00';
    const timeMap = calculateTimelineTimes(programPoints, activeEventStartTime);

    const headers = ['Bühne', 'Startzeit', 'Endzeit', 'Beitrag', 'Ensemble/Band', 'Dauer (Min)', 'Instrument', 'Technikbedarf'];
    const rows: any[][] = [];

    programPoints.forEach(pp => {
      const timeInfo = timeMap[pp.id] || { start: '', end: '' };
      rows.push([
        String(pp.stage_number || 1),
        timeInfo.start,
        timeInfo.end,
        pp.name || '',
        pp.ensemble_band || '',
        String(pp.duration || 0),
        pp.instrument || '',
        pp.tech_requirements || ''
      ]);
    });

    downloadCsvFile(`Konzertplan_${activeEvent.title.replace(/\s+/g, '_')}.csv`, headers, rows);
  }, [activeEvent, programPoints]);

  return {
    programPoints,
    setProgramPoints,
    loadingProgramPoints,
    activeStage,
    setActiveStage,
    stageCount,
    setStageCount,
    techViewMode,
    setTechViewMode,
    dbConflicts,
    setDbConflicts,
    dragOverId,
    setDragOverId,
    dragOverPosition,
    setDragOverPosition,
    coordinatorTab,
    setCoordinatorTab,
    expandedPoints,
    setExpandedPoints,
    techConsoleNightMode,
    setTechConsoleNightMode,
    fetchProgramPoints,
    handleUpdateProgramPointStatus,
    handleDeleteProgramPoint,
    handleMoveProgramPoint,
    handleExportPDF,
    handleExportTechRiderPDF,
    handleExportCSV
  };
}
