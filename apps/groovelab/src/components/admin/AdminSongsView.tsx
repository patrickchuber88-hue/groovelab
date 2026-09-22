import React, { useState, useRef } from "react";
import {
  BookOpen, Download, Library, Music, Pencil, Plus, Search,
  Trash2, X, Play, Settings, Sliders, Zap
} from "lucide-react";
import { renderInstrumentIcon } from "../../utils/instruments";
import { supabase } from "../../lib/supabase";

import { getLehrwerkColor, getSongColor } from "../../utils/adminColorHelpers";
export { getLehrwerkColor, getSongColor };

  export const renderSongVinylCover = (songColor: { from: string; to: string; text?: string }, size: 'sm' | 'md' | 'lg' = 'md') => {
    const isSm = size === 'sm';
    const isLg = size === 'lg';
    const sleeveSize = isSm ? 54 : isLg ? 102 : 94;
    const vinylSize = isSm ? 48 : isLg ? 92 : 84;
    const borderRadius = isSm ? 14 : isLg ? 25 : 23;
    const noteWidth = isSm ? 30 : isLg ? 52 : 46;
    const noteHeight = isSm ? 30 : isLg ? 52 : 46;
    const vinylRight = isSm ? -7 : isLg ? -13 : -11;

    const gradId = `adminFineGrad_${(songColor?.from || 'blue').replace(/[^a-zA-Z0-9]/g, '')}_${size}`;
    const highId = `adminFineHigh_${(songColor?.from || 'blue').replace(/[^a-zA-Z0-9]/g, '')}_${size}`;
    const headHigh1 = `adminHead1_${(songColor?.from || 'blue').replace(/[^a-zA-Z0-9]/g, '')}_${size}`;
    const headHigh2 = `adminHead2_${(songColor?.from || 'blue').replace(/[^a-zA-Z0-9]/g, '')}_${size}`;

    return (
      <div style={{
        position: 'relative',
        width: `${sleeveSize + (isSm ? 8 : 12)}px`,
        height: `${sleeveSize}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        marginLeft: isSm ? '-3px' : '-5px',
        flexShrink: 0
      }}>
        {/* 1. Sleek Black Vinyl Disc with Ultra-Fine Grooves */}
        <div style={{
          position: 'absolute',
          right: `${vinylRight}px`,
          width: `${vinylSize}px`,
          height: `${vinylSize}px`,
          borderRadius: '50%',
          boxShadow: '3px 5px 15px rgba(0, 0, 0, 0.32)',
          zIndex: 1,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width={vinylSize} height={vinylSize} viewBox="0 0 100 100" fill="none">
            <defs>
              <radialGradient id={`discBase_${gradId}`} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#2c2c30" />
                <stop offset="25%" stopColor="#141416" />
                <stop offset="60%" stopColor="#08080a" />
                <stop offset="90%" stopColor="#18181b" />
                <stop offset="100%" stopColor="#050506" />
              </radialGradient>
              {/* Anisotropic Light Reflection Beams */}
              <linearGradient id={`discSheen1_${gradId}`} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.22)" />
                <stop offset="35%" stopColor="rgba(255, 255, 255, 0)" />
                <stop offset="65%" stopColor="rgba(255, 255, 255, 0)" />
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0.18)" />
              </linearGradient>
              <linearGradient id={`discSheen2_${gradId}`} x1="100" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.15)" />
                <stop offset="40%" stopColor="rgba(255, 255, 255, 0)" />
                <stop offset="60%" stopColor="rgba(255, 255, 255, 0)" />
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0.12)" />
              </linearGradient>
            </defs>
            {/* Disc Body */}
            <circle cx="50" cy="50" r="49.5" fill={`url(#discBase_${gradId})`} />
            <circle cx="50" cy="50" r="49.5" fill={`url(#discSheen1_${gradId})`} />
            <circle cx="50" cy="50" r="49.5" fill={`url(#discSheen2_${gradId})`} />
            
            {/* Distinct, Crisp Concentric Vinyl Grooves */}
            <circle cx="50" cy="50" r="46.5" stroke="rgba(255,255,255,0.32)" strokeWidth="0.85" />
            <circle cx="50" cy="50" r="44" stroke="rgba(0,0,0,0.65)" strokeWidth="0.85" />
            <circle cx="50" cy="50" r="41.5" stroke="rgba(255,255,255,0.26)" strokeWidth="0.85" />
            <circle cx="50" cy="50" r="39" stroke="rgba(0,0,0,0.6)" strokeWidth="0.85" />
            <circle cx="50" cy="50" r="36.5" stroke="rgba(255,255,255,0.28)" strokeWidth="0.85" />
            <circle cx="50" cy="50" r="34" stroke="rgba(0,0,0,0.6)" strokeWidth="0.85" />
            <circle cx="50" cy="50" r="31.5" stroke="rgba(255,255,255,0.22)" strokeWidth="0.85" />
            <circle cx="50" cy="50" r="29" stroke="rgba(0,0,0,0.6)" strokeWidth="0.85" />
            <circle cx="50" cy="50" r="26.5" stroke="rgba(255,255,255,0.18)" strokeWidth="0.85" />
            <circle cx="50" cy="50" r="24" stroke="rgba(0,0,0,0.5)" strokeWidth="0.85" />
            <circle cx="50" cy="50" r="21.5" stroke="rgba(255,255,255,0.16)" strokeWidth="0.85" />
            
            {/* Outer Rim Light Edge */}
            <circle cx="50" cy="50" r="49" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          </svg>
        </div>

        {/* 2. Soft Pastel Rounded Square Sleeve */}
        <div style={{
          width: `${sleeveSize}px`,
          height: `${sleeveSize}px`,
          background: `linear-gradient(135deg, ${songColor.from} 0%, ${songColor.to} 100%)`,
          borderRadius: `${borderRadius}px`,
          boxShadow: '0 11px 24px -4px rgba(0, 0, 0, 0.1), 0 3px 7px -2px rgba(0, 0, 0, 0.05), inset 0 1.5px 2px rgba(255, 255, 255, 0.9)',
          border: '1.5px solid rgba(255, 255, 255, 0.8)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          boxSizing: 'border-box'
        }}>
          {/* 3. 10% Feiner 3D Double Music Note (Sleek, Glossy, Precision Engineered) */}
          <svg 
            width={noteWidth} 
            height={noteHeight} 
            viewBox="0 0 100 100" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            style={{ filter: 'drop-shadow(0 4.5px 7px rgba(0, 0, 0, 0.25)) drop-shadow(0 1.5px 2.5px rgba(0, 0, 0, 0.14))' }}
          >
            <defs>
              {/* Main 3D Dark Graphite Body */}
              <linearGradient id={gradId} x1="25" y1="15" x2="75" y2="85" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#2c2c30" />
                <stop offset="35%" stopColor="#18181b" />
                <stop offset="75%" stopColor="#0f0f12" />
                <stop offset="100%" stopColor="#08080a" />
              </linearGradient>
              
              {/* Head 1 Specular Glow */}
              <radialGradient id={headHigh1} cx="34" cy="67" r="12" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.45)" />
                <stop offset="45%" stopColor="rgba(255, 255, 255, 0.08)" />
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
              </radialGradient>

              {/* Head 2 Specular Glow */}
              <radialGradient id={headHigh2} cx="67" cy="58" r="12" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.45)" />
                <stop offset="45%" stopColor="rgba(255, 255, 255, 0.08)" />
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
              </radialGradient>

              {/* Top Beam Highlight Line */}
              <linearGradient id={highId} x1="39" y1="21" x2="78" y2="13" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.72)" />
                <stop offset="60%" stopColor="rgba(255, 255, 255, 0.26)" />
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0.05)" />
              </linearGradient>
            </defs>

            {/* Left Note Head (10% feineres 3D-Oval) */}
            <ellipse cx="36" cy="68.5" rx="11.8" ry="8.8" transform="rotate(-19 36 68.5)" fill={`url(#${gradId})`} />
            <ellipse cx="36" cy="68.5" rx="11.8" ry="8.8" transform="rotate(-19 36 68.5)" fill={`url(#${headHigh1})`} />

            {/* Right Note Head (10% feineres 3D-Oval) */}
            <ellipse cx="68" cy="59.5" rx="11.8" ry="8.8" transform="rotate(-19 68 59.5)" fill={`url(#${gradId})`} />
            <ellipse cx="68" cy="59.5" rx="11.8" ry="8.8" transform="rotate(-19 68 59.5)" fill={`url(#${headHigh2})`} />

            {/* Left Stem (5.8px Schlanker Stab) */}
            <rect x="42" y="25" width="5.8" height="44" rx="2.9" fill={`url(#${gradId})`} />

            {/* Right Stem (5.8px Schlanker Stab) */}
            <rect x="74.2" y="16" width="5.8" height="44" rx="2.9" fill={`url(#${gradId})`} />

            {/* Top Beam (10% feinerer Verbindungsbalken) */}
            <path d="M 42 26 C 42 22 45 21 48.5 20.2 L 75.5 13.5 C 78.5 12.8 81.5 14.2 81.5 17.5 L 81.5 24.5 C 81.5 27.5 78.5 28.5 75.5 29.2 L 48.5 35.8 C 45 36.5 42 35.2 42 32 Z" fill={`url(#${gradId})`} />

            {/* Top Beam Specular Light Edge */}
            <path d="M 44.5 23 L 78.5 14.8" stroke={`url(#${highId})`} strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    );
  };

export interface AdminSongsViewProps {
  activePlatform: string;
  admin: any;
  userId: string;
  songs: any[];
  lehrwerke: any[];
  setLehrwerke: React.Dispatch<React.SetStateAction<any[]>>;
  songSearch: string;
  setSongSearch: (q: string) => void;
  mediathekTab: 'songs' | 'lehrwerke' | 'schnelltext';
  setMediathekTab: (tab: 'songs' | 'lehrwerke' | 'schnelltext') => void;
  bulkModeSongs: boolean;
  setBulkModeSongs: (val: boolean) => void;
  bulkTextSongs: string;
  setBulkTextSongs: (val: string) => void;
  bulkModeLehrwerke: boolean;
  setBulkModeLehrwerke: (val: boolean) => void;
  bulkTextLehrwerke: string;
  setBulkTextLehrwerke: (val: string) => void;
  showAddSong: boolean;
  setShowAddSong: (val: boolean) => void;
  showAddLehrwerk: boolean;
  setShowAddLehrwerk: (val: boolean) => void;
  editingSong: any;
  setEditingSong: (s: any) => void;
  editingLehrwerk: any;
  setEditingLehrwerk: (l: any) => void;
  newSong: any;
  setNewSong: (s: any) => void;
  newLehrwerk: any;
  setNewLehrwerk: (l: any) => void;
  textbausteine: any[];
  copiedTbId: string | null;
  setCopiedTbId: (id: string | null) => void;
  selectedSongForDetail: any;
  selectedLehrwerkForDetail: any;
  selectedStudentForProgress: any;
  setShowTeacherToolsModal: (val: boolean) => void;
  setShowTextbausteinModal: (val: boolean) => void;
  setPreviewingTextbaustein: (tb: any) => void;
  setNewHomeworkNoteText: React.Dispatch<React.SetStateAction<string>>;
  setSongLessonNotes: React.Dispatch<React.SetStateAction<string>>;
  handleAddSong: (e: React.FormEvent) => Promise<void>;
  handleDeleteSong: (songId: string) => Promise<void>;
  handleUpdateSong: (e: React.FormEvent) => Promise<void>;
  handleMediathekTouchStart: (e: React.TouchEvent) => void;
  handleMediathekTouchEnd: (e: React.TouchEvent) => void;
}

export const AdminSongsView: React.FC<AdminSongsViewProps> = ({
  activePlatform,
  admin,
  userId,
  songs,
  lehrwerke,
  setLehrwerke,
  songSearch,
  setSongSearch,
  mediathekTab,
  setMediathekTab,
  bulkModeSongs,
  setBulkModeSongs,
  bulkTextSongs,
  setBulkTextSongs,
  bulkModeLehrwerke,
  setBulkModeLehrwerke,
  bulkTextLehrwerke,
  setBulkTextLehrwerke,
  showAddSong,
  setShowAddSong,
  showAddLehrwerk,
  setShowAddLehrwerk,
  editingSong,
  setEditingSong,
  editingLehrwerk,
  setEditingLehrwerk,
  newSong,
  setNewSong,
  newLehrwerk,
  setNewLehrwerk,
  textbausteine,
  copiedTbId,
  setCopiedTbId,
  selectedSongForDetail,
  selectedLehrwerkForDetail,
  selectedStudentForProgress,
  setShowTeacherToolsModal,
  setShowTextbausteinModal,
  setPreviewingTextbaustein,
  setNewHomeworkNoteText,
  setSongLessonNotes,
  handleAddSong,
  handleDeleteSong,
  handleUpdateSong,
  handleMediathekTouchStart,
  handleMediathekTouchEnd,
}) => {
    const brandColor = activePlatform === 'campus' ? '#34a853' : (activePlatform === 'groovelab' ? '#eab308' : '#ea4335');
    const filteredLehrwerke = lehrwerke.filter(item => 
      item.title.toLowerCase().includes(songSearch.toLowerCase()) || 
      (item.author || '').toLowerCase().includes(songSearch.toLowerCase())
    );

    const handleAddLehrwerkSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (bulkModeLehrwerke) {
        const lines = bulkTextLehrwerke.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) return;

        const insertPayloads = lines.map(line => {
          let title = line;
          let author = null;
          let totalPages = 50;

          if (line.includes(' - ')) {
            const parts = line.split(' - ');
            title = parts[0].trim();
            if (parts.length === 2) {
              const second = parts[1].trim();
              if (/^\d+$/.test(second)) {
                totalPages = parseInt(second, 10);
              } else {
                author = second;
              }
            } else if (parts.length >= 3) {
              author = parts[1].trim();
              totalPages = parseInt(parts[2].trim(), 10) || 50;
            }
          }

          return {
            title,
            author,
            total_pages: totalPages,
            school_id: admin?.school_id,
            teacher_id: userId
          };
        });

        const { data, error } = await supabase
          .from('lehrwerke')
          .insert(insertPayloads)
          .select();

        if (error) {
          alert('Fehler beim Sammel-Import: ' + error.message);
        } else if (data) {
          const mapped = data.map((d: any) => ({
            ...d,
            totalPages: d.total_pages || 50
          }));
          setLehrwerke(prev => [...prev, ...mapped]);
          try {
            const storedCustom = localStorage.getItem('custom_lehrwerke');
            const parsedCustom = storedCustom ? JSON.parse(storedCustom) : [];
            const updatedCustom = [...parsedCustom, ...mapped];
            localStorage.setItem('custom_lehrwerke', JSON.stringify(updatedCustom));
          } catch {}
          setShowAddLehrwerk(false);
          setBulkModeLehrwerke(false);
          setBulkTextLehrwerke('');
        }
        return;
      }

      if (!newLehrwerk.title) return;
      
      const insertPayload = {
        title: newLehrwerk.title,
        author: newLehrwerk.author || null,
        total_pages: Number(newLehrwerk.totalPages) || 50,
        school_id: admin?.school_id,
        teacher_id: userId
      };

      const { data, error } = await supabase
        .from('lehrwerke')
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        console.error("Error creating Lehrwerk:", error);
        return;
      }

      if (data) {
        const created = {
          ...data,
          totalPages: data.total_pages || 50
        };
        setLehrwerke(prev => [...prev, created]);
        try {
          const storedCustom = localStorage.getItem('custom_lehrwerke');
          const parsedCustom = storedCustom ? JSON.parse(storedCustom) : [];
          const updatedCustom = [...parsedCustom.filter((b: any) => b.id !== created.id), created];
          localStorage.setItem('custom_lehrwerke', JSON.stringify(updatedCustom));
        } catch {}
        setShowAddLehrwerk(false);
        setNewLehrwerk({ title: '', author: '', totalPages: 50 });
      }
    };

    const handleEditLehrwerkSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingLehrwerk || !editingLehrwerk.title) return;

      const updatePayload = {
        title: editingLehrwerk.title,
        author: editingLehrwerk.author || null,
        total_pages: Number(editingLehrwerk.totalPages) || 50
      };

      const { error } = await supabase
        .from('lehrwerke')
        .update(updatePayload)
        .eq('id', editingLehrwerk.id);

      if (error) {
        console.error("Error updating Lehrwerk:", error);
        return;
      }

      setLehrwerke(prev => prev.map(item => item.id === editingLehrwerk.id ? { ...item, ...updatePayload, totalPages: updatePayload.total_pages } : item));
      try {
        const storedCustom = localStorage.getItem('custom_lehrwerke');
        if (storedCustom) {
          const parsedCustom = JSON.parse(storedCustom);
          const updatedCustom = parsedCustom.map((item: any) => item.id === editingLehrwerk.id ? { ...item, ...updatePayload, totalPages: updatePayload.total_pages } : item);
          localStorage.setItem('custom_lehrwerke', JSON.stringify(updatedCustom));
        }
      } catch {}
      setEditingLehrwerk(null);
    };

    const handleDeleteLehrwerk = async (id: string) => {
      const { error } = await supabase
        .from('lehrwerke')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Error deleting Lehrwerk:", error);
        return;
      }

      setLehrwerke(prev => prev.filter(item => item.id !== id));
      try {
        const storedCustom = localStorage.getItem('custom_lehrwerke');
        if (storedCustom) {
          const parsedCustom = JSON.parse(storedCustom);
          const updatedCustom = parsedCustom.filter((item: any) => item.id !== id);
          localStorage.setItem('custom_lehrwerke', JSON.stringify(updatedCustom));
        }
      } catch {}
      if (editingLehrwerk?.id === id) setEditingLehrwerk(null);
    };

    return (
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', width: '100%' }}>
        {/* Left Side: Main Mediathek Area */}
        <div 
          className="glass-panel" 
          style={{ 
            flex: 1,
            minWidth: 0,
            background: 'white', 
            borderRadius: '20px', 
            border: '1px solid rgba(0, 0, 0, 0.05)', 
            padding: '20px', 
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.02), 0 2px 8px -1px rgba(0, 0, 0, 0.01)',
            display: 'flex', 
            flexDirection: 'column', 
            gap: '24px' 
          }}
        >
          {/* Header Area */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.85rem', color: '#18181b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontWeight: 900 }}>
                <div style={{ background: `${brandColor}15`, color: brandColor, padding: '5px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                  <Library size={20} />
                </div>
                <span>{activePlatform === 'campus' ? 'Mediathek' : 'Songs'}</span>
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '4px 0 0 0', fontWeight: 600 }}>
                {activePlatform === 'campus' 
                  ? 'Verwalte deine Songs, Instrumentierungen und Lehrwerke für den Campus.'
                  : 'Verwalte deine Songs und deren Instrumentierungen für GrooveLab.'}
              </p>
            </div>
            {activePlatform === 'campus' && (
              <button
                type="button"
                onClick={() => setShowTeacherToolsModal(true)}
                aria-label="Aufgaben-Studio und Übe-Tools öffnen"
                title="Aufgaben-Studio & Übe-Tools öffnen"
                style={{
                  background: 'linear-gradient(135deg, #34a853 0%, #2e7d32 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 20px',
                  borderRadius: '9999px',
                  fontSize: '0.84rem',
                  fontWeight: 850,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  fontFamily: 'Inter, sans-serif',
                  boxShadow: '0 4px 14px rgba(52, 168, 83, 0.28)',
                  letterSpacing: '-0.01em',
                  userSelect: 'none'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-1px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 6px 18px rgba(52, 168, 83, 0.38)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(52, 168, 83, 0.28)';
                }}
                onMouseDown={e => {
                  e.currentTarget.style.transform = 'translateY(1px) scale(0.97)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(52, 168, 83, 0.22)';
                }}
                onMouseUp={e => {
                  e.currentTarget.style.transform = 'translateY(-1px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 6px 18px rgba(52, 168, 83, 0.38)';
                }}
              >
                <Sliders size={15} strokeWidth={2.4} color="#ffffff" />
                <span>Aufgaben-Studio & Tools</span>
              </button>
            )}
          </div>

          {/* Top Mediathek Category Tab Bar (Songs, Lehrwerke, Schnell-Text) - Mobile Only */}
          <div className="mediathek-pill-bar" style={{
            width: '100%',
            justifyContent: 'center',
            alignItems: 'center',
            margin: '4px 0 4px 0'
          }}>
            <div 
              role="tablist"
              aria-label="Mediathek Bereiche"
              style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(241, 245, 249, 0.95)',
              borderRadius: '100px',
              padding: '4px',
              width: '100%',
              boxSizing: 'border-box',
              gap: '4px',
              border: '1px solid rgba(226, 232, 240, 0.8)'
            }}>
              <button
                type="button"
                role="tab"
                aria-selected={mediathekTab === 'songs'}
                id="tab-mediathek-songs"
                onClick={() => setMediathekTab('songs')}
                style={{
                  flex: 1,
                  height: '36px',
                  borderRadius: '100px',
                  border: 'none',
                  background: mediathekTab === 'songs' ? brandColor : 'transparent',
                  color: mediathekTab === 'songs' ? '#ffffff' : '#64748b',
                  fontWeight: 850,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  boxShadow: mediathekTab === 'songs' ? `0 2px 8px ${brandColor}40` : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                <Music size={14} style={{ color: mediathekTab === 'songs' ? '#ffffff' : '#64748b' }} />
                <span>Songs ({songs.length})</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={mediathekTab === 'lehrwerke'}
                id="tab-mediathek-lehrwerke"
                onClick={() => setMediathekTab('lehrwerke')}
                style={{
                  flex: 1,
                  height: '36px',
                  borderRadius: '100px',
                  border: 'none',
                  background: mediathekTab === 'lehrwerke' ? brandColor : 'transparent',
                  color: mediathekTab === 'lehrwerke' ? '#ffffff' : '#64748b',
                  fontWeight: 850,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  boxShadow: mediathekTab === 'lehrwerke' ? `0 2px 8px ${brandColor}40` : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                <Library size={14} style={{ color: mediathekTab === 'lehrwerke' ? '#ffffff' : '#64748b' }} />
                <span>Lehrwerke ({lehrwerke.length})</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={mediathekTab === 'schnelltext'}
                id="tab-mediathek-schnelltext"
                onClick={() => setMediathekTab('schnelltext')}
                style={{
                  flex: 1,
                  height: '36px',
                  borderRadius: '100px',
                  border: 'none',
                  background: mediathekTab === 'schnelltext' ? brandColor : 'transparent',
                  color: mediathekTab === 'schnelltext' ? '#ffffff' : '#64748b',
                  fontWeight: 850,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  boxShadow: mediathekTab === 'schnelltext' ? `0 2px 8px ${brandColor}40` : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                <Zap size={14} style={{ color: mediathekTab === 'schnelltext' ? '#ffffff' : '#64748b' }} />
                <span>Schnell-Text</span>
              </button>
            </div>
          </div>

          {/* Swipecard Pagination Dots Bar (Mobile Only) */}
          <div className="mediathek-swipe-dots" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '-12px 0 4px 0' }}>
            <button type="button" onClick={() => setMediathekTab('songs')} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}>
              <div className={`mediathek-dot ${mediathekTab === 'songs' ? 'active' : ''}`} style={{ background: mediathekTab === 'songs' ? brandColor : '#cbd5e1' }} />
            </button>
            <button type="button" onClick={() => setMediathekTab('lehrwerke')} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}>
              <div className={`mediathek-dot ${mediathekTab === 'lehrwerke' ? 'active' : ''}`} style={{ background: mediathekTab === 'lehrwerke' ? brandColor : '#cbd5e1' }} />
            </button>
            <button type="button" onClick={() => setMediathekTab('schnelltext')} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}>
              <div className={`mediathek-dot ${mediathekTab === 'schnelltext' ? 'active' : ''}`} style={{ background: mediathekTab === 'schnelltext' ? brandColor : '#cbd5e1' }} />
            </button>
          </div>

          {/* Unified Smart Search Field */}
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              placeholder={activePlatform === 'campus' ? "Mediathek nach Titel/Interpret/Autor durchsuchen..." : "Songs nach Titel/Interpret durchsuchen..."}
              value={songSearch}
              onChange={e => setSongSearch(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '12px 14px 12px 48px', 
                borderRadius: '14px', 
                border: '1px solid #e2e8f0', 
                background: '#f8fafc', 
                fontWeight: 600, 
                fontSize: '0.92rem', 
                outline: 'none', 
                transition: 'all 0.2s',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.01)'
              }}
            />
          </div>

          {/* Three Columns Layout or Single Column depending on active platform */}
          <div 
            onTouchStart={handleMediathekTouchStart}
            onTouchEnd={handleMediathekTouchEnd}
            style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr', 
              gap: '24px', 
              alignItems: 'flex-start',
              width: '100%'
            }} 
            className="mediathek-grid-layout"
          >
            {/* Left Column: Songs */}
            <div 
              style={{ display: mediathekTab === 'songs' ? 'flex' : 'none', flexDirection: 'column', gap: '16px', width: '100%' }}
              className={`mediathek-col-card mediathek-col-songs ${mediathekTab === 'songs' ? 'mobile-active-card' : 'mobile-hidden-card'}`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Music size={16} color={brandColor} /> Songs ({songs.length})
                </h3>
                <button 
                  type="button"
                  onClick={() => {
                    setShowAddSong(!showAddSong);
                    setEditingSong(null);
                  }} 
                  style={{ 
                    background: `linear-gradient(135deg, ${brandColor}, ${brandColor}ee)`, 
                    color: (activePlatform as string) === 'groovelab' ? '#1e293b' : '#ffffff', 
                    border: 'none', 
                    padding: '6px 12px', 
                    borderRadius: '10px', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    fontSize: '0.75rem', 
                    fontWeight: 900,
                    boxShadow: `0 4px 10px -3px ${brandColor}40`,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Plus size={14} strokeWidth={3} /> Song hinzufügen
                </button>
              </div>

              {showAddSong && (
                <form onSubmit={handleAddSong} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'white', borderRadius: '16px', border: `1px solid ${brandColor}20`, boxShadow: '0 8px 24px rgba(0,0,0,0.02)' }}>
                  {/* Mode Toggles */}
                  <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setBulkModeSongs(false)}
                      style={{
                        background: 'none', border: 'none', padding: '4px 8px', fontSize: '0.78rem', fontWeight: !bulkModeSongs ? 800 : 600,
                        color: !bulkModeSongs ? brandColor : '#64748b', borderBottom: !bulkModeSongs ? `2px solid ${brandColor}` : 'none', cursor: 'pointer', outline: 'none'
                      }}
                    >
                      Einzeln hinzufügen
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkModeSongs(true)}
                      style={{
                        background: 'none', border: 'none', padding: '4px 8px', fontSize: '0.78rem', fontWeight: bulkModeSongs ? 800 : 600,
                        color: bulkModeSongs ? brandColor : '#64748b', borderBottom: bulkModeSongs ? `2px solid ${brandColor}` : 'none', cursor: 'pointer', outline: 'none'
                      }}
                    >
                      Sammel-Onboarding
                    </button>
                  </div>

                  {!bulkModeSongs ? (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Interpret / Band</label>
                          <input required aria-label="Interpret / Band" placeholder="z.B. Nirvana" value={newSong.artist} onChange={e => setNewSong({...newSong, artist: e.target.value})} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.85rem', fontWeight: 600 }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Songtitel</label>
                          <input required aria-label="Songtitel" placeholder="z.B. Smells Like Teenspirit" value={newSong.title} onChange={e => setNewSong({...newSong, title: e.target.value})} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.85rem', fontWeight: 600 }} />
                        </div>
                      </div>

                      {activePlatform !== 'campus' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Arrangement (Benötigte Instrumente)</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center', width: '100%', margin: '4px 0' }}>
                            {['E-Gitarre', 'E-Bass', 'E-Drums', 'E-Piano'].map(inst => {
                              const count = newSong.instrumentation?.[inst] || 0;
                              const isSelected = count > 0;
                              return (
                                <div
                                  key={inst}
                                  onClick={(e) => {
                                    if ((e.target as HTMLElement).closest('button')) return;
                                    const currentInst = { ...newSong.instrumentation };
                                    currentInst[inst] = isSelected ? 0 : 1;
                                    setNewSong({ ...newSong, instrumentation: currentInst });
                                  }}
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '16px 12px',
                                    borderRadius: '20px',
                                    border: isSelected ? '2px solid #eab308' : '1.5px solid #e2e8f0',
                                    background: isSelected 
                                      ? 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)' 
                                      : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                                    width: '120px',
                                    height: '145px',
                                    textAlign: 'center',
                                    gap: '8px',
                                    boxShadow: isSelected 
                                      ? '0 10px 20px -5px rgba(234, 179, 8, 0.18), 0 6px 6px -6px rgba(234, 179, 8, 0.12)' 
                                      : '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -2px rgba(0, 0, 0, 0.02)',
                                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    boxSizing: 'border-box'
                                  }}
                                  onMouseOver={e => {
                                    if (!isSelected) {
                                      e.currentTarget.style.borderColor = '#cbd5e1';
                                      e.currentTarget.style.transform = 'translateY(-2px)';
                                    } else {
                                      e.currentTarget.style.transform = 'translateY(-2px)';
                                    }
                                  }}
                                  onMouseOut={e => {
                                    if (!isSelected) {
                                      e.currentTarget.style.borderColor = '#e2e8f0';
                                      e.currentTarget.style.transform = 'none';
                                    } else {
                                      e.currentTarget.style.transform = 'none';
                                    }
                                  }}
                                >
                                  <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '14px',
                                    background: isSelected ? 'white' : '#f1f5f9',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: isSelected ? '#a16207' : '#64748b',
                                    boxShadow: isSelected ? '0 4px 10px rgba(234, 179, 8, 0.15)' : 'inset 0 2px 4px rgba(0,0,0,0.01)',
                                    transition: 'all 0.2s ease',
                                    transform: isSelected ? 'scale(1.05)' : 'none'
                                  }}>
                                    {renderInstrumentIcon(inst, isSelected ? '#a16207' : '#94a3b8', 26)}
                                  </div>
                                  
                                  <span style={{ 
                                    fontSize: '0.72rem', 
                                    fontWeight: 800, 
                                    color: isSelected ? '#a16207' : '#475569',
                                    letterSpacing: '-0.01em'
                                  }}>
                                    {inst}
                                  </span>
                                  
                                  <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px', 
                                    background: isSelected ? 'rgba(255, 255, 255, 0.7)' : 'rgba(241, 245, 249, 0.7)',
                                    padding: '4px 8px',
                                    borderRadius: '12px',
                                    border: '1px solid',
                                    borderColor: isSelected ? 'rgba(234, 179, 8, 0.2)' : 'rgba(226, 232, 240, 0.5)',
                                    backdropFilter: 'blur(4px)',
                                    transition: 'all 0.2s ease'
                                  }}>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const currentInst = { ...newSong.instrumentation };
                                        currentInst[inst] = Math.max(0, count - 1);
                                        setNewSong({ ...newSong, instrumentation: currentInst });
                                      }}
                                      style={{
                                        width: '22px',
                                        height: '22px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: 'white',
                                        color: '#475569',
                                        fontSize: '0.85rem',
                                        fontWeight: 900,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                        transition: 'all 0.2s ease',
                                        padding: 0
                                      }}
                                    >
                                      -
                                    </button>
                                    <span style={{ 
                                      fontSize: '0.85rem', 
                                      fontWeight: 900, 
                                      color: isSelected ? '#a16207' : '#475569', 
                                      minWidth: '14px',
                                      textAlign: 'center'
                                    }}>
                                      {count}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const currentInst = { ...newSong.instrumentation };
                                        currentInst[inst] = count + 1;
                                        setNewSong({ ...newSong, instrumentation: currentInst });
                                      }}
                                      style={{
                                        width: '22px',
                                        height: '22px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: 'white',
                                        color: '#475569',
                                        fontSize: '0.85rem',
                                        fontWeight: 900,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                        transition: 'all 0.2s ease',
                                        padding: 0
                                      }}
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Media Link (Spotify / YouTube)</label>
                          <input aria-label="Media Link (Spotify / YouTube)" placeholder="https://open.spotify.com/... oder https://youtube.com/..." value={newSong.media_link} onChange={e => setNewSong({...newSong, media_link: e.target.value})} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.85rem', fontWeight: 600 }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Tomplay Link (Interaktive Noten)</label>
                          <input aria-label="Tomplay Link (Interaktive Noten)" placeholder="https://tomplay.com/..." value={newSong.tomplay_url} onChange={e => setNewSong({...newSong, tomplay_url: e.target.value})} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.85rem', fontWeight: 600 }} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Mehrere Songs eintragen</label>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Format: Interpret - Songtitel (eine Zeile pro Song)</p>
                      <textarea
                        required
                        placeholder={`Nirvana - Smells Like Teen Spirit\nMichael Jackson - Billie Jean\nColdplay - Yellow`}
                        value={bulkTextSongs}
                        onChange={e => setBulkTextSongs(e.target.value)}
                        style={{
                          width: '100%', height: '140px', padding: '12px', borderRadius: '10px',
                          border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 600, fontFamily: 'monospace',
                          outline: 'none', resize: 'none'
                        }}
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button type="submit" style={{ flex: 2, background: brandColor, color: '#1e293b', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>Importieren / Speichern</button>
                    <button type="button" onClick={() => { setShowAddSong(false); setBulkModeSongs(false); setBulkTextSongs(''); }} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' }}>Abbrechen</button>
                  </div>
                </form>
              )}

              {editingSong && (
                <form onSubmit={handleUpdateSong} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', background: '#fefdeb', border: '1px solid #fef08a', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.02)' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#854d0e', margin: 0 }}>Song bearbeiten</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Interpret</label>
                      <input required aria-label="Interpret" placeholder="Interpret" value={editingSong.artist} onChange={e => setEditingSong({...editingSong, artist: e.target.value})} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.85rem', fontWeight: 600 }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Titel</label>
                      <input required aria-label="Titel" placeholder="Titel" value={editingSong.title} onChange={e => setEditingSong({...editingSong, title: e.target.value})} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.85rem', fontWeight: 600 }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Media Link (Spotify / YouTube)</label>
                      <input aria-label="Media Link (Spotify / YouTube)" placeholder="https://open.spotify.com/... oder https://youtube.com/..." value={editingSong.media_link || ''} onChange={e => setEditingSong({...editingSong, media_link: e.target.value})} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.85rem', fontWeight: 600 }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Tomplay Link (Interaktive Noten)</label>
                      <input aria-label="Tomplay Link (Interaktive Noten)" placeholder="https://tomplay.com/..." value={editingSong.tomplay_url || ''} onChange={e => setEditingSong({...editingSong, tomplay_url: e.target.value})} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.85rem', fontWeight: 600 }} />
                    </div>
                  </div>

                  {activePlatform !== 'campus' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Arrangement (Benötigte Instrumente)</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center', width: '100%', margin: '4px 0' }}>
                        {['E-Gitarre', 'E-Bass', 'E-Drums', 'E-Piano'].map(inst => {
                          const count = editingSong.instrumentation?.[inst] || 0;
                          const isSelected = count > 0;
                          return (
                            <div
                              key={inst}
                              onClick={(e) => {
                                if ((e.target as HTMLElement).closest('button')) return;
                                const currentInst = { ...editingSong.instrumentation };
                                currentInst[inst] = isSelected ? 0 : 1;
                                setEditingSong({ ...editingSong, instrumentation: currentInst });
                              }}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '16px 12px',
                                borderRadius: '20px',
                                border: isSelected ? '2px solid #eab308' : '1.5px solid #e2e8f0',
                                background: isSelected 
                                  ? 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)' 
                                  : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                                width: '120px',
                                height: '145px',
                                textAlign: 'center',
                                gap: '8px',
                                boxShadow: isSelected 
                                  ? '0 10px 20px -5px rgba(234, 179, 8, 0.18), 0 6px 6px -6px rgba(234, 179, 8, 0.12)' 
                                  : '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -2px rgba(0, 0, 0, 0.02)',
                                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                cursor: 'pointer',
                                position: 'relative',
                                overflow: 'hidden',
                                boxSizing: 'border-box'
                              }}
                              onMouseOver={e => {
                                if (!isSelected) {
                                  e.currentTarget.style.borderColor = '#cbd5e1';
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                } else {
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                }
                              }}
                              onMouseOut={e => {
                                if (!isSelected) {
                                  e.currentTarget.style.borderColor = '#e2e8f0';
                                  e.currentTarget.style.transform = 'none';
                                } else {
                                  e.currentTarget.style.transform = 'none';
                                }
                              }}
                            >
                              <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '14px',
                                background: isSelected ? 'white' : '#f1f5f9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: isSelected ? '#a16207' : '#64748b',
                                boxShadow: isSelected ? '0 4px 10px rgba(234, 179, 8, 0.15)' : 'inset 0 2px 4px rgba(0,0,0,0.01)',
                                transition: 'all 0.2s ease',
                                transform: isSelected ? 'scale(1.05)' : 'none'
                              }}>
                                {renderInstrumentIcon(inst, isSelected ? '#a16207' : '#94a3b8', 26)}
                              </div>
                              
                              <span style={{ 
                                fontSize: '0.72rem', 
                                fontWeight: 800, 
                                color: isSelected ? '#a16207' : '#475569',
                                letterSpacing: '-0.01em'
                              }}>
                                {inst}
                              </span>
                              
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px', 
                                background: isSelected ? 'rgba(255, 255, 255, 0.7)' : 'rgba(241, 245, 249, 0.7)',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                border: '1px solid',
                                borderColor: isSelected ? 'rgba(234, 179, 8, 0.2)' : 'rgba(226, 232, 240, 0.5)',
                                backdropFilter: 'blur(4px)',
                                transition: 'all 0.2s ease'
                              }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const currentInst = { ...editingSong.instrumentation };
                                    currentInst[inst] = Math.max(0, count - 1);
                                    setEditingSong({ ...editingSong, instrumentation: currentInst });
                                  }}
                                  style={{
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'white',
                                    color: '#475569',
                                    fontSize: '0.85rem',
                                    fontWeight: 900,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                    transition: 'all 0.2s ease',
                                    padding: 0
                                  }}
                                >
                                  -
                                </button>
                                <span style={{ 
                                  fontSize: '0.85rem', 
                                  fontWeight: 950, 
                                  color: isSelected ? '#a16207' : '#475569', 
                                  minWidth: '14px',
                                  textAlign: 'center'
                                }}>
                                  {count}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const currentInst = { ...editingSong.instrumentation };
                                    currentInst[inst] = count + 1;
                                    setEditingSong({ ...editingSong, instrumentation: currentInst });
                                  }}
                                  style={{
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'white',
                                    color: '#475569',
                                    fontSize: '0.85rem',
                                    fontWeight: 900,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                    transition: 'all 0.2s ease',
                                    padding: 0
                                  }}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', margin: '4px 0 8px 0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                      <input 
                        type="checkbox"
                        checked={editingSong.is_groovelab_active !== undefined ? !!editingSong.is_groovelab_active : true}
                        onChange={(e) => setEditingSong({ ...editingSong, is_groovelab_active: e.target.checked })}
                        style={{ accentColor: '#eab308', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <span>In GrooveLab aktiv</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                      <input 
                        type="checkbox"
                        checked={editingSong.is_campus_active !== undefined ? !!editingSong.is_campus_active : true}
                        onChange={(e) => setEditingSong({ ...editingSong, is_campus_active: e.target.checked })}
                        style={{ accentColor: '#34a853', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <span>In Campus aktiv</span>
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" style={{ flex: 2, background: brandColor, color: '#1e293b', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>Speichern</button>
                    <button type="button" onClick={() => setEditingSong(null)} style={{ flex: 1, background: 'white', color: '#64748b', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' }}>Abbrechen</button>
                  </div>
                </form>
              )}

              {/* Songs List Grid (3-4 columns responsive) */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                gap: '14px',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                {songs.filter(song => {
                  const matchesSearch = songSearch === '' || 
                    song.title?.toLowerCase().includes(songSearch.toLowerCase()) || 
                    song.artist?.toLowerCase().includes(songSearch.toLowerCase());
                  
                  const matchesPlatform = activePlatform === 'campus' 
                    ? song.is_campus_active 
                    : song.is_groovelab_active;
                    
                  return matchesSearch && matchesPlatform;
                }).sort((a, b) => (a.title || '').localeCompare(b.title || '', 'de', { sensitivity: 'base' })).map(song => {
                  const lwColor = getSongColor(song.title || '');
                  const coverBg = `linear-gradient(135deg, ${lwColor.from} 0%, ${lwColor.to} 100%)`;
                  return (
                    <div key={song.id} className="glass-panel hover-scale" 
                      onClick={() => {
                        const inst = song.instrumentation || {};
                        const norm: any = { 'E-Gitarre': 0, 'E-Bass': 0, 'E-Drums': 0, 'E-Piano': 0, 'Vocals': 0 };
                        Object.entries(inst).forEach(([k, v]) => {
                          const lower = k.toLowerCase();
                          if (lower === 'guitar' || lower === 'e-gitarre') norm['E-Gitarre'] = v;
                          else if (lower === 'bass' || lower === 'e-bass') norm['E-Bass'] = v;
                          else if (lower === 'drums' || lower === 'e-drums') norm['E-Drums'] = v;
                          else if (lower === 'piano' || lower === 'keys' || lower === 'e-piano') norm['E-Piano'] = v;
                          else if (lower === 'vocals' || lower === 'gesang') norm['Vocals'] = v;
                          else norm[k] = v;
                        });
                        setEditingSong({...song, instrumentation: norm});
                        setShowAddSong(false);
                      }}
                      style={{ 
                        padding: '14px 16px', 
                        display: 'flex', 
                        gap: '12px',
                        alignItems: 'center', 
                        background: 'white', 
                        borderRadius: '18px', 
                        border: editingSong?.id === song.id ? `2px solid ${brandColor}` : '1px solid rgba(0, 0, 0, 0.05)', 
                        borderLeft: `5px solid ${lwColor.from}`,
                        boxShadow: editingSong?.id === song.id 
                          ? `0 10px 25px -5px ${brandColor}20` 
                          : '0 8px 30px -10px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.01)', 
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        minHeight: '88px',
                        boxSizing: 'border-box',
                        cursor: 'pointer'
                      }}
                    >
                      {/* Pastel Sleeve + Vinyl peeking out Cover */}
                      {renderSongVinylCover(lwColor, 'sm')}

                      {/* Title and Artist */}
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '1.02rem', letterSpacing: '-0.02em', lineHeight: '1.2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>von {song.artist}</div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '6px' }}>
                        {song.media_link && (
                          <a 
                            href={song.media_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title="Externer Streaming-Dienst (Spotify / YouTube)"
                            style={{ 
                              width: '34px', height: '34px', borderRadius: '10px', 
                              background: '#f8fafc', color: '#0f172a', 
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              textDecoration: 'none', border: '1px solid #e2e8f0',
                              transition: 'all 0.2s'
                            }}
                          >
                            <Play size={14} style={{ fill: '#0f172a' }} />
                          </a>
                        )}
                        {song.tomplay_url && (
                          <a 
                            href={song.tomplay_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Interaktive Noten auf Tomplay für ${song.title} öffnen`}
                            title="Interaktive Noten auf Tomplay öffnen"
                            style={{
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              width: '38px',
                              height: '38px',
                              borderRadius: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#2563eb',
                              transition: 'all 0.2s'
                            }}
                          >
                            <Music size={14} style={{ strokeWidth: 2.5 }} />
                          </a>
                        )}
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDeleteSong(song.id); }} 
                          aria-label={`Song ${song.title} von ${song.artist} löschen`}
                          title="Song löschen"
                          style={{ background: '#fff1f2', border: '1px solid #fecaca', width: '38px', height: '38px', borderRadius: '10px', cursor: 'pointer', color: '#ef4444', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Column 2: Lehrwerke */}
            <div 
              style={{ display: mediathekTab === 'lehrwerke' ? 'flex' : 'none', flexDirection: 'column', gap: '16px', width: '100%' }}
              className={`mediathek-col-card mediathek-col-lehrwerke ${mediathekTab === 'lehrwerke' ? 'mobile-active-card' : 'mobile-hidden-card'}`}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Library size={16} color={brandColor} /> Lehrwerke ({lehrwerke.length})
                  </h3>
                  <button 
                    type="button"
                    onClick={() => {
                      setShowAddLehrwerk(!showAddLehrwerk);
                      setEditingLehrwerk(null);
                    }} 
                    style={{ 
                      background: `linear-gradient(135deg, ${brandColor}, ${brandColor}ee)`, 
                      color: '#ffffff', 
                      border: 'none', 
                      padding: '6px 12px', 
                      borderRadius: '10px', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      fontSize: '0.75rem', 
                      fontWeight: 900,
                      boxShadow: `0 4px 10px -3px ${brandColor}40`,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Plus size={14} strokeWidth={3} /> Lehrwerk hinzufügen
                  </button>
                </div>

                {showAddLehrwerk && (
                  <form onSubmit={handleAddLehrwerkSubmit} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'white', borderRadius: '16px', border: `1px solid ${brandColor}20`, boxShadow: '0 8px 24px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', gap: '12px' }}>
                      <button
                        type="button"
                        onClick={() => setBulkModeLehrwerke(false)}
                        style={{
                          background: 'none', border: 'none', padding: '4px 8px', fontSize: '0.78rem', fontWeight: !bulkModeLehrwerke ? 800 : 600,
                          color: !bulkModeLehrwerke ? brandColor : '#64748b', borderBottom: !bulkModeLehrwerke ? `2px solid ${brandColor}` : 'none', cursor: 'pointer', outline: 'none'
                        }}
                      >
                        Einzeln hinzufügen
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkModeLehrwerke(true)}
                        style={{
                          background: 'none', border: 'none', padding: '4px 8px', fontSize: '0.78rem', fontWeight: bulkModeLehrwerke ? 800 : 600,
                          color: bulkModeLehrwerke ? brandColor : '#64748b', borderBottom: bulkModeLehrwerke ? `2px solid ${brandColor}` : 'none', cursor: 'pointer', outline: 'none'
                        }}
                      >
                        Sammel-Import
                      </button>
                    </div>

                    {!bulkModeLehrwerke ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Titel des Buchs</label>
                          <input required aria-label="Titel des Buchs" placeholder="z.B. GrooveLab Drums Vol. 2" value={newLehrwerk.title} onChange={e => setNewLehrwerk({...newLehrwerk, title: e.target.value})} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.85rem', fontWeight: 600 }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Autor (optional)</label>
                          <input aria-label="Autor" placeholder="z.B. Max Mustermann" value={newLehrwerk.author || ''} onChange={e => setNewLehrwerk({...newLehrwerk, author: e.target.value})} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.85rem', fontWeight: 600 }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Seitenzahl des Buchs</label>
                          <input aria-label="Seitenzahl des Buchs" type="number" min="1" max="1000" placeholder="50" value={newLehrwerk.totalPages} onChange={e => setNewLehrwerk({...newLehrwerk, totalPages: Number(e.target.value) || 50})} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.85rem', fontWeight: 600 }} />
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Mehrere Lehrwerke eintragen</label>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Format: Buchtitel - Autor - Seitenzahl ODER Buchtitel - Seitenzahl (eine Zeile pro Buch)</p>
                        <textarea
                          required
                          placeholder={`GrooveLab Drums Vol. 2 - Max Mustermann - 80\nGrooveLab Piano Vol. 1 - 60`}
                          value={bulkTextLehrwerke}
                          onChange={e => setBulkTextLehrwerke(e.target.value)}
                          style={{
                            width: '100%', height: '120px', padding: '12px', borderRadius: '10px',
                            border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 600, fontFamily: 'monospace',
                            outline: 'none', resize: 'none'
                          }}
                        />
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button type="submit" style={{ flex: 2, background: brandColor, color: '#1e293b', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>Importieren / Speichern</button>
                      <button type="button" onClick={() => { setShowAddLehrwerk(false); setBulkModeLehrwerke(false); setBulkTextLehrwerke(''); }} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' }}>Abbrechen</button>
                    </div>
                  </form>
                )}

                {editingLehrwerk && (
                  <form onSubmit={handleEditLehrwerkSubmit} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', background: '#fefdeb', border: '1px solid #fef08a', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.02)' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#854d0e', margin: 0 }}>📚 Lehrwerk bearbeiten: {editingLehrwerk.title}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Titel des Buchs</label>
                        <input required aria-label="Titel des Buchs" placeholder="z.B. GrooveLab Drums Vol. 2" value={editingLehrwerk.title} onChange={e => setEditingLehrwerk({...editingLehrwerk, title: e.target.value})} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.85rem', fontWeight: 600 }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Autor (optional)</label>
                        <input aria-label="Autor" placeholder="z.B. Max Mustermann" value={editingLehrwerk.author || ''} onChange={e => setEditingLehrwerk({...editingLehrwerk, author: e.target.value})} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.85rem', fontWeight: 600 }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Seitenzahl des Buchs</label>
                        <input aria-label="Seitenzahl des Buchs" type="number" min="1" max="1000" placeholder="50" value={editingLehrwerk.totalPages || 50} onChange={e => setEditingLehrwerk({...editingLehrwerk, totalPages: Number(e.target.value) || 50})} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.85rem', fontWeight: 600 }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button type="submit" style={{ flex: 2, background: brandColor, color: '#1e293b', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>Speichern</button>
                      <button type="button" onClick={() => setEditingLehrwerk(null)} style={{ flex: 1, background: 'white', color: '#64748b', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' }}>Abbrechen</button>
                    </div>
                  </form>
                )}

                {/* Lehrwerke List Grid (3-4 columns responsive) */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                  gap: '14px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  {filteredLehrwerke.map(item => {
                    const gradient = getLehrwerkColor(item.title);
                    return (
                      <div 
                        key={item.id} 
                        className="glass-panel hover-scale" 
                        onClick={() => {
                          setEditingLehrwerk(item);
                          setShowAddLehrwerk(false);
                        }}
                        style={{ 
                          padding: '14px 16px', 
                          background: 'white', 
                          display: 'flex', 
                          gap: '12px', 
                          alignItems: 'center', 
                          borderRadius: '18px', 
                          border: editingLehrwerk?.id === item.id ? `2px solid ${brandColor}` : '1px solid rgba(0, 0, 0, 0.05)', 
                          borderLeft: `5px solid ${gradient.from}`,
                          boxShadow: editingLehrwerk?.id === item.id 
                            ? `0 10px 25px -5px ${brandColor}20` 
                            : '0 8px 30px -10px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.01)',
                          position: 'relative',
                          cursor: 'pointer',
                          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                          minHeight: '88px',
                          boxSizing: 'border-box'
                        }}
                      >
                        {/* Book Pages peeking out + Book Cover Icon */}
                        <div style={{ position: 'relative', width: '60px', height: '50px', flexShrink: 0 }}>
                          {/* Pages peeking out from the right */}
                          <div style={{
                            position: 'absolute',
                            right: '2px',
                            top: '4px',
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1
                          }}>
                            <span style={{ fontSize: '0.7rem' }}>📖</span>
                          </div>
                          {/* Book Cover Sleeve */}
                          <div style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            width: '50px',
                            height: '50px',
                            background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                            borderRadius: '14px',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 2,
                            border: `1px solid ${gradient.text}18`
                          }}>
                            <BookOpen size={20} color={gradient.text} />
                          </div>
                        </div>

                        {/* Title and Author / Pages */}
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '1.02rem', letterSpacing: '-0.02em', lineHeight: '1.2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.author ? `von ${item.author} • ` : ''}📖 {item.totalPages || 50} Seiten
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginLeft: '6px' }}>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLehrwerk(item.id);
                            }} 
                            style={{ 
                              background: '#fff1f2', 
                              border: '1px solid #fecaca', 
                              width: '38px', 
                              height: '38px', 
                              borderRadius: '10px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              cursor: 'pointer', 
                              color: '#ef4444', 
                              transition: 'all 0.2s' 
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            {/* Column 3: Schnell-Text */}
            <div 
              style={{ display: mediathekTab === 'schnelltext' ? 'flex' : 'none', flexDirection: 'column', gap: '16px', width: '100%' }}
              className={`mediathek-col-card mediathek-col-schnelltext ${mediathekTab === 'schnelltext' ? 'mobile-active-card' : 'mobile-hidden-card'}`}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: `${brandColor}15`, color: brandColor, padding: '3px 6px', borderRadius: '6px', fontSize: '0.95rem' }}>⚡</span>
                    Schnell-Text ({textbausteine.filter((tb: any) => tb.active).length})
                  </h3>
                  <button 
                    type="button"
                    onClick={() => setShowTextbausteinModal(true)}
                    style={{ 
                      background: `linear-gradient(135deg, ${brandColor}, ${brandColor}ee)`, 
                      color: '#ffffff', 
                      border: 'none', 
                      padding: '6px 12px', 
                      borderRadius: '10px', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      fontSize: '0.75rem', 
                      fontWeight: 900,
                      boxShadow: `0 4px 10px -3px ${brandColor}40`,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Settings size={14} /> Verwalten
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '10px', width: '100%' }}>
                  {textbausteine.filter((tb: any) => tb.active).map((tb: any) => {
                    const parts = tb.label.split(' ');
                    const hasEmoji = parts[0] && /\p{Emoji}/u.test(parts[0]);
                    const emoji = hasEmoji ? parts[0] : '🎵';
                    const name = hasEmoji ? parts.slice(1).join(' ') : tb.label;
                    const isCopied = copiedTbId === tb.id;

                    const handleCardClick = () => {
                      if (selectedLehrwerkForDetail && selectedStudentForProgress) {
                        setNewHomeworkNoteText(prev => prev ? `${prev}\n\n${tb.text}` : tb.text);
                        setCopiedTbId(tb.id);
                        setTimeout(() => setCopiedTbId(null), 850);
                      } else if (selectedSongForDetail && selectedStudentForProgress) {
                        setSongLessonNotes(prev => prev ? `${prev}\n\n${tb.text}` : tb.text);
                        setCopiedTbId(tb.id);
                        setTimeout(() => setCopiedTbId(null), 850);
                      } else {
                        setPreviewingTextbaustein(tb);
                      }
                    };

                    return (
                      <div 
                        key={tb.id} 
                        onClick={handleCardClick}
                        style={{ 
                          border: isCopied ? '1.5px solid #34a853' : '1px solid #e2e8f0', 
                          borderRadius: '16px', 
                          padding: '12px 10px', 
                          background: isCopied ? '#e6f4ea' : 'white',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          textAlign: 'center',
                          gap: '8px',
                          opacity: tb.active ? 1 : 0.55,
                          boxShadow: isCopied ? '0 4px 10px rgba(52, 168, 83, 0.15)' : '0 2px 6px rgba(0,0,0,0.02)',
                          minHeight: '115px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          transform: isCopied ? 'scale(0.96)' : 'none'
                        }}
                        className="hover-scale-mini"
                      >
                        <span style={{ fontSize: '1.5rem', marginTop: '2px', filter: 'grayscale(100%)' }}>
                          {isCopied ? '✓' : emoji}
                        </span>
                        
                        <span style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 800, 
                          color: isCopied ? '#34a853' : '#1e293b', 
                          display: '-webkit-box', 
                          WebkitLineClamp: 2, 
                          WebkitBoxOrient: 'vertical', 
                          overflow: 'hidden', 
                          lineHeight: '1.2', 
                          height: '2.4em', 
                          wordBreak: 'break-word'
                        }}>
                          {isCopied ? (selectedLehrwerkForDetail || selectedSongForDetail ? 'Eingefügt! ✓' : 'Kopiert! ✓') : name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
          </div>
        </div>
      </div>
    );
};

export default AdminSongsView;
