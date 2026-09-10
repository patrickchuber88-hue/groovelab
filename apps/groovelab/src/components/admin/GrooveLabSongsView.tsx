import React, { useState } from "react";
import {
  Library, Music, Pencil, Plus, Search,
  Trash2, Play, ExternalLink
} from "lucide-react";
import { renderInstrumentIcon } from "../../utils/instruments";
import { getSongColor } from "../../utils/adminColorHelpers";
import { renderSongVinylCover } from "./AdminSongsView";

export interface GrooveLabSongsViewProps {
  admin: any;
  userId: string;
  songs: any[];
  songSearch: string;
  setSongSearch: (q: string) => void;
  showAddSong: boolean;
  setShowAddSong: (val: boolean) => void;
  editingSong: any;
  setEditingSong: (s: any) => void;
  newSong: any;
  setNewSong: (s: any) => void;
  bulkModeSongs: boolean;
  setBulkModeSongs: (val: boolean) => void;
  bulkTextSongs: string;
  setBulkTextSongs: (val: string) => void;
  handleAddSong: (e: React.FormEvent) => Promise<void>;
  handleDeleteSong: (songId: string) => Promise<void>;
  handleUpdateSong: (e: React.FormEvent) => Promise<void>;
}

export const GrooveLabSongsView: React.FC<GrooveLabSongsViewProps> = ({
  songs,
  songSearch,
  setSongSearch,
  showAddSong,
  setShowAddSong,
  editingSong,
  setEditingSong,
  newSong,
  setNewSong,
  bulkModeSongs,
  setBulkModeSongs,
  bulkTextSongs,
  setBulkTextSongs,
  handleAddSong,
  handleDeleteSong,
  handleUpdateSong,
}) => {
  const [levelFilter, setLevelFilter] = useState<string>("all");

  const INSTRUMENTS = ["E-Gitarre", "E-Bass", "E-Drums", "E-Piano", "Vocals"];

  const filteredSongs = (songs || []).filter((s: any) => {
    const q = songSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (s.title || "").toLowerCase().includes(q) ||
      (s.artist || "").toLowerCase().includes(q);

    const matchesLevel =
      levelFilter === "all" || String(s.level || 1) === levelFilter;

    return matchesSearch && matchesLevel;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", width: "100%" }}>
      {/* Main Glass Panel Card */}
      <div
        className="glass-panel"
        style={{
          background: "white",
          borderRadius: "24px",
          border: "1px solid rgba(0, 0, 0, 0.06)",
          padding: "24px 28px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.03)",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          boxSizing: "border-box",
        }}
      >
        {/* Header Area */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h2
              style={{
                fontSize: "1.85rem",
                color: "#0f172a",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                margin: 0,
                fontWeight: 950,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                letterSpacing: "-0.02em",
              }}
            >
              <div
                style={{
                  background: "rgba(234, 179, 8, 0.15)",
                  color: "#ca8a04",
                  padding: "8px",
                  borderRadius: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Library size={22} />
              </div>
              <span>Songs</span>
            </h2>
            <p style={{ color: "#64748b", fontSize: "0.88rem", margin: "6px 0 0 0", fontWeight: 650 }}>
              Verwalte deine Songs und deren Instrumentierungen für GrooveLab.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowAddSong(!showAddSong);
              setEditingSong(null);
            }}
            style={{
              background: "linear-gradient(135deg, #facc15 0%, #eab308 100%)",
              color: "#0f172a",
              border: "none",
              padding: "10px 20px",
              borderRadius: "14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.88rem",
              fontWeight: 900,
              boxShadow: "0 4px 14px rgba(234, 179, 8, 0.35)",
              transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 6px 18px rgba(234, 179, 8, 0.45)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "0 4px 14px rgba(234, 179, 8, 0.35)";
            }}
          >
            <Plus size={16} strokeWidth={3} />
            <span>Song hinzufügen</span>
          </button>
        </div>

        {/* Search & Level Filter Bar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: "260px" }}>
              <Search
                size={18}
                color="#94a3b8"
                style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                aria-label="Songs nach Titel oder Interpret durchsuchen"
                placeholder="Songs nach Titel/Interpret durchsuchen..."
                value={songSearch}
                onChange={(e) => setSongSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px 12px 48px",
                  borderRadius: "14px",
                  border: "1.5px solid #e2e8f0",
                  background: "#f8fafc",
                  fontWeight: 650,
                  fontSize: "0.92rem",
                  outline: "none",
                  transition: "all 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#eab308";
                  e.currentTarget.style.background = "#ffffff";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(234, 179, 8, 0.15)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.background = "#f8fafc";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Level Filter Pills */}
            <div style={{ display: "flex", gap: "6px", background: "#f1f5f9", padding: "4px", borderRadius: "12px" }}>
              {["all", "1", "2", "3", "4", "5"].map((lvl) => {
                const isActive = levelFilter === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setLevelFilter(lvl)}
                    style={{
                      border: "none",
                      background: isActive ? "#ffffff" : "transparent",
                      color: isActive ? "#0f172a" : "#64748b",
                      fontWeight: isActive ? 900 : 700,
                      fontSize: "0.78rem",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      boxShadow: isActive ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {lvl === "all" ? "Alle Level" : `Lvl ${lvl}`}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Add Song Form Panel */}
        {showAddSong && (
          <form
            onSubmit={handleAddSong}
            className="glass-panel animation-slide-up"
            style={{
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              background: "#ffffff",
              borderRadius: "20px",
              border: "1.5px solid rgba(234, 179, 8, 0.3)",
              boxShadow: "0 12px 36px rgba(234, 179, 8, 0.08)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 950, color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <Plus size={18} color="#eab308" strokeWidth={3} />
                <span>Neuen Song hinzufügen</span>
              </h3>

              {/* Mode Toggle */}
              <div style={{ display: "flex", background: "#f1f5f9", borderRadius: "10px", padding: "3px" }}>
                <button
                  type="button"
                  onClick={() => setBulkModeSongs(false)}
                  style={{
                    background: !bulkModeSongs ? "#ffffff" : "transparent",
                    color: !bulkModeSongs ? "#0f172a" : "#64748b",
                    fontWeight: !bulkModeSongs ? 900 : 700,
                    border: "none",
                    padding: "6px 14px",
                    borderRadius: "8px",
                    fontSize: "0.78rem",
                    cursor: "pointer",
                    boxShadow: !bulkModeSongs ? "0 2px 5px rgba(0,0,0,0.05)" : "none",
                  }}
                >
                  Einzeln
                </button>
                <button
                  type="button"
                  onClick={() => setBulkModeSongs(true)}
                  style={{
                    background: bulkModeSongs ? "#ffffff" : "transparent",
                    color: bulkModeSongs ? "#0f172a" : "#64748b",
                    fontWeight: bulkModeSongs ? 900 : 700,
                    border: "none",
                    padding: "6px 14px",
                    borderRadius: "8px",
                    fontSize: "0.78rem",
                    cursor: "pointer",
                    boxShadow: bulkModeSongs ? "0 2px 5px rgba(0,0,0,0.05)" : "none",
                  }}
                >
                  Sammel-Import
                </button>
              </div>
            </div>

            {!bulkModeSongs ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.72rem", fontWeight: 850, color: "#475569", textTransform: "uppercase" }}>
                      Interpret / Band *
                    </label>
                    <input
                      required
                      aria-label="Interpret oder Band"
                      placeholder="z.B. Nirvana"
                      value={newSong.artist}
                      onChange={(e) => setNewSong({ ...newSong, artist: e.target.value })}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "12px",
                        border: "1.5px solid #e2e8f0",
                        fontSize: "0.92rem",
                        fontWeight: 650,
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.72rem", fontWeight: 850, color: "#475569", textTransform: "uppercase" }}>
                      Songtitel *
                    </label>
                    <input
                      required
                      aria-label="Songtitel"
                      placeholder="z.B. Smells Like Teen Spirit"
                      value={newSong.title}
                      onChange={(e) => setNewSong({ ...newSong, title: e.target.value })}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "12px",
                        border: "1.5px solid #e2e8f0",
                        fontSize: "0.92rem",
                        fontWeight: 650,
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.72rem", fontWeight: 850, color: "#475569", textTransform: "uppercase" }}>
                      Level (Schwierigkeit)
                    </label>
                    <select
                      aria-label="Level"
                      value={newSong.level || 1}
                      onChange={(e) => setNewSong({ ...newSong, level: parseInt(e.target.value, 10) || 1 })}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "12px",
                        border: "1.5px solid #e2e8f0",
                        fontSize: "0.92rem",
                        fontWeight: 650,
                        background: "white",
                      }}
                    >
                      <option value={1}>Level 1 - Starter / Einsteiger</option>
                      <option value={2}>Level 2 - Leicht</option>
                      <option value={3}>Level 3 - Mittelstufe</option>
                      <option value={4}>Level 4 - Fortgeschritten</option>
                      <option value={5}>Level 5 - Pro / Bühnenreif</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.72rem", fontWeight: 850, color: "#475569", textTransform: "uppercase" }}>
                      Media Link (Spotify / YouTube)
                    </label>
                    <input
                      aria-label="Media Link"
                      placeholder="https://open.spotify.com/... oder https://youtube.com/..."
                      value={newSong.media_link || ""}
                      onChange={(e) => setNewSong({ ...newSong, media_link: e.target.value })}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "12px",
                        border: "1.5px solid #e2e8f0",
                        fontSize: "0.88rem",
                        fontWeight: 600,
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.72rem", fontWeight: 850, color: "#475569", textTransform: "uppercase" }}>
                      Tomplay Link (Interaktive Noten)
                    </label>
                    <input
                      aria-label="Tomplay Link"
                      placeholder="https://tomplay.com/..."
                      value={newSong.tomplay_url || ""}
                      onChange={(e) => setNewSong({ ...newSong, tomplay_url: e.target.value })}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "12px",
                        border: "1.5px solid #e2e8f0",
                        fontSize: "0.88rem",
                        fontWeight: 600,
                      }}
                    />
                  </div>
                </div>

                {/* Arrangement / Instrumentation */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <label style={{ fontSize: "0.72rem", fontWeight: 850, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Band-Arrangement (Benötigte Instrumente)
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                    {INSTRUMENTS.map((inst) => {
                      const count = newSong.instrumentation?.[inst] || 0;
                      const isSelected = count > 0;
                      return (
                        <div
                          key={inst}
                          role="button"
                          tabIndex={0}
                          aria-label={`${inst}: ${count} ausgewählt`}
                          onClick={() => {
                            const cur = { ...(newSong.instrumentation || {}) };
                            cur[inst] = isSelected ? 0 : 1;
                            setNewSong({ ...newSong, instrumentation: cur });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              const cur = { ...(newSong.instrumentation || {}) };
                              cur[inst] = isSelected ? 0 : 1;
                              setNewSong({ ...newSong, instrumentation: cur });
                            }
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "10px 16px",
                            borderRadius: "16px",
                            border: isSelected ? "2px solid #eab308" : "1.5px solid #e2e8f0",
                            background: isSelected ? "rgba(254, 240, 138, 0.35)" : "#ffffff",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            boxShadow: isSelected ? "0 4px 12px rgba(234, 179, 8, 0.15)" : "none",
                          }}
                        >
                          <div style={{ color: isSelected ? "#a16207" : "#64748b" }}>
                            {renderInstrumentIcon(inst, isSelected ? "#a16207" : "#94a3b8", 22)}
                          </div>
                          <span style={{ fontSize: "0.85rem", fontWeight: 800, color: isSelected ? "#78350f" : "#475569" }}>
                            {inst}
                          </span>
                          {isSelected && (
                            <span
                              style={{
                                background: "#eab308",
                                color: "#0f172a",
                                fontSize: "0.72rem",
                                fontWeight: 950,
                                padding: "2px 7px",
                                borderRadius: "6px",
                                marginLeft: "4px",
                              }}
                            >
                              {count}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              /* Bulk Mode */
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "0.72rem", fontWeight: 850, color: "#475569", textTransform: "uppercase" }}>
                  Mehrere Songs eintragen (eine Zeile pro Song)
                </label>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#94a3b8", fontWeight: 650 }}>
                  Format: Interpret - Songtitel (z. B. <code>Nirvana - Smells Like Teen Spirit</code>)
                </p>
                <textarea
                  required
                  aria-label="Mehrere Songs im Format Interpret - Titel"
                  placeholder={`Nirvana - Smells Like Teen Spirit\nAC/DC - Highway to Hell\nColdplay - Yellow`}
                  value={bulkTextSongs}
                  onChange={(e) => setBulkTextSongs(e.target.value)}
                  style={{
                    width: "100%",
                    height: "140px",
                    padding: "14px",
                    borderRadius: "14px",
                    border: "1.5px solid #e2e8f0",
                    fontSize: "0.88rem",
                    fontWeight: 650,
                    fontFamily: "monospace",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
              <button
                type="submit"
                style={{
                  flex: 2,
                  background: "linear-gradient(135deg, #facc15 0%, #eab308 100%)",
                  color: "#0f172a",
                  border: "none",
                  padding: "12px 20px",
                  borderRadius: "14px",
                  fontWeight: 900,
                  fontSize: "0.92rem",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(234, 179, 8, 0.3)",
                }}
              >
                {bulkModeSongs ? "Sammel-Import starten" : "Song speichern"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddSong(false);
                  setBulkModeSongs(false);
                  setBulkTextSongs("");
                }}
                style={{
                  flex: 1,
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "none",
                  padding: "12px 20px",
                  borderRadius: "14px",
                  fontWeight: 800,
                  cursor: "pointer",
                  fontSize: "0.92rem",
                }}
              >
                Abbrechen
              </button>
            </div>
          </form>
        )}

        {/* Edit Song Form Panel */}
        {editingSong && (
          <form
            onSubmit={handleUpdateSong}
            className="glass-panel animation-slide-up"
            style={{
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              background: "#fffbeb",
              borderRadius: "20px",
              border: "1.5px solid #fef08a",
              boxShadow: "0 12px 36px rgba(234, 179, 8, 0.08)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 950, color: "#854d0e", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <Pencil size={18} color="#ca8a04" />
                <span>Song bearbeiten: {editingSong.title}</span>
              </h3>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.72rem", fontWeight: 850, color: "#854d0e", textTransform: "uppercase" }}>
                  Interpret / Band *
                </label>
                <input
                  required
                  aria-label="Interpret"
                  value={editingSong.artist}
                  onChange={(e) => setEditingSong({ ...editingSong, artist: e.target.value })}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "12px",
                    border: "1.5px solid #fde047",
                    background: "white",
                    fontSize: "0.92rem",
                    fontWeight: 650,
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.72rem", fontWeight: 850, color: "#854d0e", textTransform: "uppercase" }}>
                  Songtitel *
                </label>
                <input
                  required
                  aria-label="Titel"
                  value={editingSong.title}
                  onChange={(e) => setEditingSong({ ...editingSong, title: e.target.value })}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "12px",
                    border: "1.5px solid #fde047",
                    background: "white",
                    fontSize: "0.92rem",
                    fontWeight: 650,
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.72rem", fontWeight: 850, color: "#854d0e", textTransform: "uppercase" }}>
                  Level
                </label>
                <select
                  aria-label="Level"
                  value={editingSong.level || 1}
                  onChange={(e) => setEditingSong({ ...editingSong, level: parseInt(e.target.value, 10) || 1 })}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "12px",
                    border: "1.5px solid #fde047",
                    background: "white",
                    fontSize: "0.92rem",
                    fontWeight: 650,
                  }}
                >
                  <option value={1}>Level 1 - Starter / Einsteiger</option>
                  <option value={2}>Level 2 - Leicht</option>
                  <option value={3}>Level 3 - Mittelstufe</option>
                  <option value={4}>Level 4 - Fortgeschritten</option>
                  <option value={5}>Level 5 - Pro / Bühnenreif</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.72rem", fontWeight: 850, color: "#854d0e", textTransform: "uppercase" }}>
                  Media Link (Spotify / YouTube)
                </label>
                <input
                  aria-label="Media Link"
                  value={editingSong.media_link || ""}
                  onChange={(e) => setEditingSong({ ...editingSong, media_link: e.target.value })}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "12px",
                    border: "1.5px solid #fde047",
                    background: "white",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.72rem", fontWeight: 850, color: "#854d0e", textTransform: "uppercase" }}>
                  Tomplay Link (Interaktive Noten)
                </label>
                <input
                  aria-label="Tomplay Link"
                  value={editingSong.tomplay_url || ""}
                  onChange={(e) => setEditingSong({ ...editingSong, tomplay_url: e.target.value })}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "12px",
                    border: "1.5px solid #fde047",
                    background: "white",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                  }}
                />
              </div>
            </div>

            {/* Arrangement */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <label style={{ fontSize: "0.72rem", fontWeight: 850, color: "#854d0e", textTransform: "uppercase" }}>
                Band-Arrangement (Benötigte Instrumente)
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                {INSTRUMENTS.map((inst) => {
                  const count = editingSong.instrumentation?.[inst] || 0;
                  const isSelected = count > 0;
                  return (
                    <div
                      key={inst}
                      role="button"
                      tabIndex={0}
                      aria-label={`${inst}: ${count}`}
                      onClick={() => {
                        const cur = { ...(editingSong.instrumentation || {}) };
                        cur[inst] = isSelected ? 0 : 1;
                        setEditingSong({ ...editingSong, instrumentation: cur });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          const cur = { ...(editingSong.instrumentation || {}) };
                          cur[inst] = isSelected ? 0 : 1;
                          setEditingSong({ ...editingSong, instrumentation: cur });
                        }
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 16px",
                        borderRadius: "16px",
                        border: isSelected ? "2px solid #ca8a04" : "1.5px solid #fef08a",
                        background: isSelected ? "#fef08a" : "white",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div style={{ color: isSelected ? "#854d0e" : "#94a3b8" }}>
                        {renderInstrumentIcon(inst, isSelected ? "#854d0e" : "#94a3b8", 22)}
                      </div>
                      <span style={{ fontSize: "0.85rem", fontWeight: 800, color: isSelected ? "#78350f" : "#475569" }}>
                        {inst}
                      </span>
                      {isSelected && (
                        <span
                          style={{
                            background: "#854d0e",
                            color: "white",
                            fontSize: "0.72rem",
                            fontWeight: 950,
                            padding: "2px 7px",
                            borderRadius: "6px",
                          }}
                        >
                          {count}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
              <button
                type="submit"
                style={{
                  flex: 2,
                  background: "linear-gradient(135deg, #facc15 0%, #eab308 100%)",
                  color: "#0f172a",
                  border: "none",
                  padding: "12px 20px",
                  borderRadius: "14px",
                  fontWeight: 900,
                  fontSize: "0.92rem",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(234, 179, 8, 0.3)",
                }}
              >
                Änderungen speichern
              </button>
              <button
                type="button"
                onClick={() => setEditingSong(null)}
                style={{
                  flex: 1,
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "none",
                  padding: "12px 20px",
                  borderRadius: "14px",
                  fontWeight: 800,
                  cursor: "pointer",
                  fontSize: "0.92rem",
                }}
              >
                Abbrechen
              </button>
            </div>
          </form>
        )}

        {/* Songs Count Indicator */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Music size={18} color="#eab308" />
            <h3 style={{ fontSize: "1.05rem", fontWeight: 950, color: "#0f172a", margin: 0 }}>
              Songs ({filteredSongs.length})
            </h3>
          </div>
          {songSearch && (
            <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 700 }}>
              Gefiltert nach „{songSearch}“
            </span>
          )}
        </div>

        {/* Responsive Grid of Songs */}
        {filteredSongs.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              background: "#f8fafc",
              borderRadius: "24px",
              border: "2px dashed #e2e8f0",
              color: "#64748b",
            }}
          >
            <Music size={40} color="#cbd5e1" style={{ marginBottom: "12px" }} />
            <h4 style={{ fontSize: "1.1rem", fontWeight: 850, color: "#1e293b", margin: 0 }}>
              Keine Songs gefunden
            </h4>
            <p style={{ fontSize: "0.85rem", margin: "6px 0 0 0" }}>
              {songSearch
                ? "Kein Song entspricht deinen Suchkriterien."
                : "Füge deinen ersten Song mit „+ Song hinzufügen“ hinzu."}
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: "16px",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            {filteredSongs.map((song: any) => {
              const songColor = getSongColor(song.title || "A");
              const inst = song.instrumentation || {};
              const activeInstruments = Object.entries(inst).filter(([, v]) => (v as number) > 0);

              return (
                <div
                  key={song.id}
                  className="glass-panel hover-scale"
                  role="button"
                  tabIndex={0}
                  aria-label={`Song ${song.title} von ${song.artist}`}
                  onClick={() => {
                    const norm: Record<string, number> = { "E-Gitarre": 0, "E-Bass": 0, "E-Drums": 0, "E-Piano": 0, Vocals: 0 };
                    Object.entries(inst).forEach(([k, v]) => {
                      const lower = k.toLowerCase();
                      if (lower === "guitar" || lower === "e-gitarre") norm["E-Gitarre"] = v as number;
                      else if (lower === "bass" || lower === "e-bass") norm["E-Bass"] = v as number;
                      else if (lower === "drums" || lower === "e-drums") norm["E-Drums"] = v as number;
                      else if (lower === "piano" || lower === "keys" || lower === "e-piano") norm["E-Piano"] = v as number;
                      else if (lower === "vocals" || lower === "gesang") norm["Vocals"] = v as number;
                      else norm[k] = v as number;
                    });
                    setEditingSong({ ...song, instrumentation: norm });
                    setShowAddSong(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setEditingSong({ ...song });
                      setShowAddSong(false);
                    }
                  }}
                  style={{
                    padding: "16px 18px",
                    display: "flex",
                    gap: "14px",
                    alignItems: "center",
                    background: "white",
                    borderRadius: "20px",
                    border: editingSong?.id === song.id ? "2px solid #eab308" : "1px solid rgba(0, 0, 0, 0.06)",
                    borderLeft: `6px solid ${songColor.from}`,
                    boxShadow:
                      editingSong?.id === song.id
                        ? "0 10px 25px -5px rgba(234, 179, 8, 0.25)"
                        : "0 4px 15px rgba(0,0,0,0.02)",
                    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                    cursor: "pointer",
                    boxSizing: "border-box",
                  }}
                >
                  {/* Vinyl Cover peeking out */}
                  {renderSongVinylCover(songColor, "sm")}

                  {/* Title, Artist, Instrumentation */}
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div
                      style={{
                        fontWeight: 950,
                        color: "#0f172a",
                        fontSize: "1.05rem",
                        letterSpacing: "-0.02em",
                        lineHeight: "1.25",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {song.title}
                    </div>

                    <div
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        color: "#64748b",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      von {song.artist}
                    </div>

                    {/* Meta Badges */}
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", marginTop: "4px" }}>
                      <span
                        style={{
                          background: "#fef3c7",
                          color: "#b45309",
                          fontSize: "0.7rem",
                          fontWeight: 900,
                          padding: "2px 8px",
                          borderRadius: "6px",
                        }}
                      >
                        Lvl {song.level || 1}
                      </span>

                      {activeInstruments.map(([name, count]) => (
                        <span
                          key={name}
                          style={{
                            background: "#f1f5f9",
                            color: "#475569",
                            fontSize: "0.68rem",
                            fontWeight: 800,
                            padding: "2px 6px",
                            borderRadius: "6px",
                          }}
                        >
                          {name}
                          {Number(count) > 1 ? ` (${count})` : ""}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, marginLeft: "4px" }}>
                    {song.media_link && (
                      <a
                        href={song.media_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Externer Streaming-Dienst (Spotify / YouTube)"
                        aria-label={`Streaming für ${song.title} öffnen`}
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "10px",
                          background: "#f8fafc",
                          color: "#0f172a",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          textDecoration: "none",
                          border: "1px solid #e2e8f0",
                          transition: "all 0.2s",
                        }}
                      >
                        <Play size={14} style={{ fill: "#0f172a" }} />
                      </a>
                    )}

                    {song.tomplay_url && (
                      <a
                        href={song.tomplay_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Interaktive Noten auf Tomplay öffnen"
                        aria-label={`Tomplay Noten für ${song.title} öffnen`}
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "10px",
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          color: "#2563eb",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          textDecoration: "none",
                          transition: "all 0.2s",
                        }}
                      >
                        <ExternalLink size={14} strokeWidth={2.5} />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSong({ ...song });
                        setShowAddSong(false);
                      }}
                      title="Song bearbeiten"
                      aria-label={`Song ${song.title} bearbeiten`}
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        border: "1px solid #e2e8f0",
                        background: "#f8fafc",
                        color: "#475569",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s",
                      }}
                    >
                      <Pencil size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSong(song.id);
                      }}
                      title="Song löschen"
                      aria-label={`Song ${song.title} von ${song.artist} löschen`}
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        border: "1px solid #fecaca",
                        background: "#fff1f2",
                        color: "#ef4444",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s",
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default GrooveLabSongsView;
