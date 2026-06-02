# Implementation Plan - Meisterwerk-Protokoll Notebook Theme

Add a live design switch to the `MeisterwerkDocumentationModal` that allows the user to toggle between the current **Swiss Modernist design** and a stunning new **Premium Ring-Binder Notebook Theme**. This allows real-time experimentation and decision-making directly in the application.

---

## Proposed Design System & Theme Specs

### 1. The Cover Background (Das Buch-Cover)
- A warm, dark textured board or charcoal felt material.
- Created via sleek gradient background: `radial-gradient(circle, #2d2d35 0%, #1a1a22 100%)` with a deep inset box-shadow to simulate a physical book depth.

### 2. The Metallic Binder Spine & Floating Rings (Die Ringmechanik)
- **Ring Binder Spine**: A vertical divider in the center with a subtle metallic column gradient.
- **Rings**: Realistic silver rings spanning across the page divider, built using CSS gradients (`linear-gradient(to right, #94a3b8, #cbd5e1, #ffffff, #cbd5e1, #64748b)`) and realistic dropdown shadows.
- **Binder Holes**: Rounded punched holes on the page edges (`background: '#121214'`) with an inner shadow.

### 3. Notebook Pages (Die Buchseiten)
- **Left Page (Workspace)**: Premium textured ivory paper (`#fbfbfa`) with rounded corners and a binder margin.
- **Right Page (Documentation)**: Classic lined notebook paper built using CSS gradients (`repeating-linear-gradient(#fbfbfa, #fbfbfa 27px, #e2e8f0 27px, #e2e8f0 28px)`) with a vibrant school-red vertical margin line (`#fca5a5`).

### 4. Interactive Accents (Post-it Stickers)
- The homework input or reference notes can be styled as semi-angled yellow sticky notes (`background: '#fef08a'`) with a subtle curl shadow (`box-shadow: '2px 8px 15px rgba(0,0,0,0.06)'`), rotated slightly by `-1deg` to `1deg`.

### 5. Instant Theme Switcher
- A premium header button labeled `✨ Design: Notizbuch-Modus` (when inactive) and `✨ Design: Modernist-Modus` (when active) to let the teacher toggle instantly.

---

## Proposed Changes

### [MeisterwerkDocumentationModal](file:///Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/MeisterwerkDocumentationModal.tsx)

#### [MODIFY] [MeisterwerkDocumentationModal.tsx](file:///Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/MeisterwerkDocumentationModal.tsx)
- Add state variable `isNotebookTheme` (defaulting to `false` or `true` so they can see it immediately, let's default to `true` to surprise them, but keep the toggle fully operational).
- Add CSS animations and variables in the embedded stylesheet for notebook styling.
- Add theme conditional styles to:
  - The outer modal card (leather/felt cover vs. flat grey).
  - The central spine and rings.
  - The page card structures (ivory lined paper vs. flat white).
  - Sticky notes for homework logs.
- Add the theme toggle button in the header.

---

## Verification Plan

### Manual Verification
- Launch the dev environment.
- Open the "Meisterwerk-Protokoll" modal.
- Verify the gorgeous open ring-notebook is displayed.
- Test the toggle button to switch back to the original Swiss Modernist mode.
- Verify that textbooks, pages, notes, and catalog additions remain fully operational in both styles.
























  if (inst.includes('piano') || inst.includes('keys') || inst.includes('klavier') || inst.includes('keyboard')) return '/avatars/klavier_avatar_new.png';
  if (inst.includes('vocal') || inst.includes('gesang') || inst.includes('stimme') || inst.includes('singer')) return '/avatars/gesang_avatar.png';
  if (inst.includes('trompete') || inst.includes('trumpet')) return '/avatars/trompete_avatar_new.png';
  if (inst.includes('posaune') || inst.includes('trombone')) return '/avatars/posaune_avatar.png';
  if (inst.includes('horn')) return '/avatars/horn_avatar_new.png';
  if (inst.includes('cello')) return '/avatars/cello_avatar_new.png';
  if (inst.includes('geige') || inst.includes('violin') || inst.includes('violine')) return '/avatars/violine_avatar_new.png';
  if (inst.includes('klarinette') || inst.includes('clarinet')) return '/avatars/klarinette_avatar_new.png';
  if (inst.includes('querflöte') || inst.includes('flute')) return '/avatars/querfloete_avatar.png';
  if (inst.includes('saxofon') || inst.includes('saxophone') || inst.includes('sax')) return '/avatars/saxophon_avatar_new.png';
  if (inst.includes('blockflöte') || inst.includes('recorder') || inst.includes('blockfloete')) return '/avatars/blockfloete_avatar.png';
  if (inst.includes('bariton') || inst.includes('baritone')) return '/avatars/bariton_avatar.png';
  if (inst.includes('oboe')) return '/avatars/oboe_avatar.png';
  return '/avatars/gitarre_avatar_new.png';
};

export const formatPageNumbers = (pages: number[]): string => {
  if (pages.length === 0) return '';
  const sorted = [...pages].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = start;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      if (start === end) {
        ranges.push(`${start}`);
      } else {
        ranges.push(`${start}–${end}`);
      }
      start = sorted[i];
      end = start;
    }
  }
  if (start === end) {
    ranges.push(`${start}`);
  } else {
    ranges.push(`${start}–${end}`);
  }

  if (ranges.length === 1) return `S. ${ranges[0]}`;
  const last = ranges.pop();
  return `S. ${ranges.join(', ')} & ${last}`;
};

export const MeisterwerkDocumentationModal: React.FC<MeisterwerkDocumentationModalProps> = ({ student, onClose, teacherId }) => {
  const [studentInstrument, setStudentInstrument] = useState<string | null>(null);
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Left column navigation tab
  const [leftTab, setLeftTab] = useState<'lehrwerke' | 'songs' | 'history'>('lehrwerke');

  // Form State for editing / adding
  const [activeItem, setActiveItem] = useState<ProgressItem | null>(null);
  const [topicName, setTopicName] = useState('');
  const [status, setStatus] = useState<'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED'>('IN_PROGRESS');
  const [isCurrentHomework, setIsCurrentHomework] = useState(false);
  const [teacherNotes, setTeacherNotes] = useState('');
  const [homeworkNotes, setHomeworkNotes] = useState('');
  const [homeworkNotesList, setHomeworkNotesList] = useState<string[]>([]);
  const homeworkTextareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Song catalog integration
  const [activeInputTab, setActiveInputTab] = useState<'free' | 'catalog' | 'lehrwerk_page' | 'active_song'>('free');
  const [songs, setSongs] = useState<any[]>([]);
  const [songsLoading, setSongsLoading] = useState(false);
  const [songSearch, setSongSearch] = useState('');
  const [selectedSongId, setSelectedSongId] = useState<string>('');
  const [songPart, setSongPart] = useState('');

  // Lehrwerke assigned to student states
  const [globalLehrwerke, setGlobalLehrwerke] = useState<any[]>([]);
  const [assignedLehrwerke, setAssignedLehrwerke] = useState<any[]>([]);
  const [activeLehrwerkId, setActiveLehrwerkId] = useState<string | null>(null);
  const [activePageNumber, setActivePageNumber] = useState<number | null>(null);
  const [pageGroupIndex, setPageGroupIndex] = useState(0);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);

  // Active Songs
  const [activeSongSkills, setActiveSongSkills] = useState<any[]>([]);
  const [selectedActiveSongId, setSelectedActiveSongId] = useState<string>('');

  // Active paintbrush mode
  const [activeBrush, setActiveBrush] = useState<'NONE' | 'LOCKED' | 'HOMEWORK' | 'MASTERED' | 'THEORY'>('NONE');
  const [showAllPagesGrid, setShowAllPagesGrid] = useState(false);

  // Session log to capture all modifications made in current modal open state
  const [sessionLogs, setSessionLogs] = useState<string[]>([]);
  const [lessonDay, setLessonDay] = useState<number>(1); // Default to Monday = 1
  const [activeModalTab, setActiveModalTab] = useState<'document' | 'logbook'>('document');

  const getISOWeek = (dateInput?: string | Date): string => {
    return getISOWeekRaw(dateInput, lessonDay);
      return saved === 'true';
    }
    return false;
  });

  const getISOWeek = (dateInput?: string | Date): string => {
    return getISOWeekRaw(dateInput, lessonDay);
  };

  // Custom song creation form states
  const [showCreateSongModal, setShowCreateSongModal] = useState(false);
  const [newSongTitle, setNewSongTitle] = useState('');
  const [newSongArtist, setNewSongArtist] = useState('');

  const getCurrentTeacherId = async (): Promise<string> => {
    if (teacherId) return teacherId;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) return user.id;

      // Fallback: Query first teacher in users table
      const { data: teachers } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'teacher')
        .limit(1);
      if (teachers && teachers.length > 0) {
        return teachers[0].id;
      }
    } catch (e) {
      console.error('Error determining teacher ID:', e);
    }
    // Hard fallback UUID
    return 'd3b07384-d113-4ec2-a5d6-6d2c12345678';
  };



  // Fetch student's school's songs catalog
  useEffect(() => {
    async function loadSongs() {
      setSongsLoading(true);
      try {
        const { data: studentUser, error: studentError } = await supabase
          .from('users')

















































    try {
      const storedGlobal = localStorage.getItem('campus_lehrwerke');
      const storedAssigned = localStorage.getItem('student_lehrwerke_progress');

      const defaults = [
        { id: '1', title: 'GrooveLab Guitar Vol. 1', instrument: 'Guitar', type: 'Standardwerk für E-Gitarre', progress: 60, emoji: '🎸', color: '#34a853', totalPages: 50 },
        { id: '2', title: 'GrooveLab Drums Vol. 1', instrument: 'Drums', type: 'Standardwerk für Schlagzeug', progress: 45, emoji: '🥁', color: '#4f46e5', totalPages: 50 },
        { id: '3', title: 'GrooveLab Bass Vol. 1', instrument: 'Bass', type: 'Standardwerk für E-Bass', progress: 30, emoji: '🎸', color: '#f59e0b', totalPages: 50 },
        { id: '4', title: 'GrooveLab Keys Vol. 1', instrument: 'Keys', type: 'Standardwerk für Keyboard', progress: 80, emoji: '🎹', color: '#ec4899', totalPages: 50 },
        { id: '5', title: 'GrooveLab Vocals Vol. 1', instrument: 'Vocals', type: 'Standardwerk für Gesang', progress: 50, emoji: '🎤', color: '#3b82f6', totalPages: 50 }
      ];

      setGlobalLehrwerke(storedGlobal ? JSON.parse(storedGlobal) : defaults);

      if (storedAssigned) {
        const parsedAssigned = JSON.parse(storedAssigned);
        const filtered = parsedAssigned.filter((item: any) => item.studentId === student.id);
        setAssignedLehrwerke(filtered);

        // Auto-select first assigned textbook if none selected
        if (filtered.length > 0 && !activeLehrwerkId) {
          setActiveLehrwerkId(filtered[0].lehrwerkId);
        }
      } else {
        setAssignedLehrwerke([]);
      }
    } catch (e) {
      console.error('Error loading Lehrwerke in modal:', e);
    }
  };

  // Load Student's active song skills
  const loadActiveSongSkills = async () => {
    try {
      const { data: skillsData, error } = await supabase
        .from('user_song_skills')
        .select('*, songs(*)')
        .eq('user_id', student.id);

      if (error) throw error;
      setActiveSongSkills(skillsData || []);
    } catch (e) {
      console.error('Error loading active songs in modal:', e);
    }
  };

  // Fetch student's progress matrix history
  const fetchProgress = async () => {
    setLoading(true);
    setError(null);
    try {






























































































  const selectItemForEditing = (item: ProgressItem) => {
    setActiveItem(item);
    setTopicName(item.topic_name);
    setStatus(item.status);
    setIsCurrentHomework(item.is_current_homework);
    setHomeworkNotes('');
    setActiveInputTab('free');
  };

  const handleCreateNew = () => {
    setActiveItem(null);
    setTopicName('');
    setStatus('IN_PROGRESS');
    setIsCurrentHomework(false);
    setTeacherNotes('');
    setHomeworkNotes('');
    setActiveInputTab('free');
    setSelectedSongId('');
    setSongPart('');
    setActivePageNumber(null);
    setSelectedActiveSongId('');
  };

  const handleResetAllCurrentHomework = async () => {
    try {
      const activeIds = progressItems.filter(item => item.is_current_homework).map(item => item.id);



















      const { error } = await supabase
        .from('progress_matrix')
        .update({ is_current_homework: false })
        .eq('id', itemId);

      if (error) throw error;

      if (bookTitle && pageNum !== undefined) {
        const book = globalLehrwerke.find(b => b.title === bookTitle);
        if (book) {
          const stored = localStorage.getItem('student_lehrwerke_progress');
          const parsed = stored ? JSON.parse(stored) : [];

          const updated = parsed.map((item: any) => {
            if (item.studentId === student.id && item.lehrwerkId === book.id) {
              const pageStates = { ...item.pageStates };
              pageStates[pageNum] = {
                ...pageStates[pageNum],
                status: 'locked',
                updatedAt: new Date().toISOString()
              };


















































































































    }
  };

  const handleStatusChange = (newStatus: 'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED') => {
    setStatus(newStatus);
  };

  // Assign textbook to student inside the modal
  const handleAssignLehrwerk = (lehrwerkId: string) => {
    if (!lehrwerkId) return;
    const book = globalLehrwerke.find(b => b.id === lehrwerkId);
    if (!book) return;

    try {
      const stored = localStorage.getItem('student_lehrwerke_progress');
      const parsed = stored ? JSON.parse(stored) : [];

      if (parsed.some((item: any) => item.studentId === student.id && item.lehrwerkId === lehrwerkId)) {
        return;
      }

      const newAssignment = {
        studentId: student.id,
        lehrwerkId: lehrwerkId,
        assignedAt: new Date().toISOString(),
        pageStates: {}
      };

      const updated = [...parsed, newAssignment];
      localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
      loadLehrwerke();
      setActiveLehrwerkId(lehrwerkId);
      setShowAssignDropdown(false);
    } catch (e) {
      console.error(e);
    }
  };

  const selectTextbookPage = (lehrwerkId: string, pageNum: number) => {
    const book = globalLehrwerke.find(b => b.id === lehrwerkId);
    if (!book) return;

    setActiveLehrwerkId(lehrwerkId);
    setActivePageNumber(pageNum);
    setActiveInputTab('lehrwerk_page');

























  };
  };

  const selectActiveSong = (skill: any) => {
    setSelectedActiveSongId(skill.id);
    setActiveInputTab('active_song');

    const fullTitle = `${skill.songs?.artist} - ${skill.songs?.title} (${skill.instrument})`;
    setTopicName(fullTitle);

    // Look up existing database notes in progressItems
    setTeacherNotes(dbItem ? (dbItem.teacher_notes || '') : '');
    setHomeworkNotes('');

    if (skill.is_stage_ready) {
      setStatus('MASTERED');
























      setIsCurrentHomework(false);
    }
  };

  const selectActiveSong = (skill: any) => {
    setSelectedActiveSongId(skill.id);
    setActiveInputTab('active_song');

    const fullTitle = `${skill.songs?.artist} - ${skill.songs?.title} (${skill.instrument})`;
    setTopicName(fullTitle);


































                status: pageStatus,
                notes: teacherNotes.trim(),
                updatedAt: new Date().toISOString()
    } else if (targetStatus === 'THEORY_DONE') {
      pageStatus = 'purple';
    } else if (targetHomework) {
      pageStatus = 'homework';
    }

    try {
      const book = globalLehrwerke.find(g => g.id === lehrwerkId);
      if (!book) return;

      const globalStored = localStorage.getItem('campus_lehrwerke');
      if (globalStored) {
        const books = JSON.parse(globalStored);
        const updatedBooks = books.map((b: any) => {
          if (b.id === lehrwerkId) {
            const globalPageStates = b.globalPageStates || {};
            if (pageStatus === 'purple') {
              globalPageStates[pageNum] = 'purple';
            } else {
              delete globalPageStates[pageNum];
            }
          overflowY: 'auto',
          }
          return b;
        });
        localStorage.setItem('campus_lehrwerke', JSON.stringify(updatedBooks));
      }

      const stored = localStorage.getItem('student_lehrwerke_progress');
      const parsed = stored ? JSON.parse(stored) : [];

      const updated = parsed.map((item: any) => {
        if (item.studentId === student.id && item.lehrwerkId === lehrwerkId) {
          return {
            ...item,
            pageStates: {
              ...item.pageStates,
              [pageNum]: {
                status: pageStatus,
                notes: teacherNotes.trim(),
                updatedAt: new Date().toISOString()
              }
            }
          };
        }
        return item;
      });

      localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
      loadLehrwerke();

      setTopicName(`${book.title} - Seite ${pageNum}`);
      setStatus(targetStatus);
      setIsCurrentHomework(targetHomework);

      const activeTId = await getCurrentTeacherId();

      const row = {
        student_id: student.id,
        teacher_id: activeTId,
        topic_name: `${book.title} - Seite ${pageNum}`,
        status: targetStatus,
        is_current_homework: targetHomework,
        teacher_notes: teacherNotes.trim(),
        homework_notes: homeworkNotes.trim(),
        updated_at: new Date().toISOString()
      };

      const currentWeek = getISOWeek();
      const existingThisWeek = progressItems.find(item =>
        item.topic_name === `${book.title} - Seite ${pageNum}` &&
        item.updated_at &&
        getISOWeek(item.updated_at) === currentWeek
      );

      if (existingThisWeek?.id) {
        await supabase
          .from('progress_matrix')
          .update(row)
          .eq('id', existingThisWeek.id);
      } else {
        await supabase
          .from('progress_matrix')
          .insert(row);
      }

      // Add to session log
      if (pageStatus === 'homework' || pageStatus === 'purple') {
        const logText = pageStatus === 'homework'
          ? `📖 ${book.title} - S. ${pageNum}`
          : `📖 ${book.tit






























































  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentWeekNum = getISOWeek().split('-W')[1] || '';
    const defaultTitle = `Hausaufgabe KW ${currentWeekNum}`;
    const finalTopicName = topicName.trim() || defaultTitle;

    setSaving(true);
    setError(null);

    // Save page status to local textbooks structure if page active
    if (activeInputTab === 'lehrwerk_page' && activeLehrwerkId && activePageNumber !== null) {
      try {
        const stored = localStorage.getItem('student_lehrwerke_progress');
        const parsed = stored ? JSON.parse(stored) : [];

        // Map status/homework form values back to local textbook format
        let pageStatus: 'locked' | 'homework' | 'mastered' | 'purple' = 'locked';
        if (status === 'MASTERED') {
          pageStatus = 'mastered';
        } else if (status === 'THEORY_DONE') {
          pageStatus = 'purple';
        } else if (isCurrentHomework) {
          pageStatus = 'homework';
        }

        // Manage global page status (purple / info)
        const globalStored = localStorage.getItem('campus_lehrwerke');
        if (globalStored) {
          const books = JSON.parse(globalStored);
          const updatedBooks = books.map((b: any) => {
            if (b.id === activeLehrwerkId) {
              const globalPageStates = b.globalPageStates || {};
              if (pageStatus === 'purple') {
                globalPageStates[activePageNumber] = 'purple';
              } else {
                delete globalPageStates[activePageNumber];
              }
              return { ...b, globalPageStates };
            }
            return b;
          });
          localStorage.setItem('campus_lehrwerke', JSON.stringify(updatedBooks));
        }

        const updated = parsed.map((item: any) => {
          if (item.studentId === student.id && item.lehrwerkId === activeLehrwerkId) {
            return {
              ...item,
{"step_index":929,"source":"MODEL","type":"VIEW_FILE","status":"DONE","created_at":"2026-06-01T21:57:47Z","content":"Created At: 2026-06-01T21:57:47Z\nCompleted At: 2026-06-01T21:57:47Z\nFile Path: `file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/MeisterwerkDocumentationModal.tsx`\nTotal Lines: 3181\nTotal Bytes: 134415\nShowing lines 1420 to 1455\nThe following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.\n1420:                 fontWeight: activeModalTab === 'logbook' ? 800 : 600,\n1421:                 cursor: 'pointer',\n1422:                 boxShadow: activeModalTab === 'logbook' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',\n1423:                 transition: 'all 0.2s',\n1424:                 display: 'flex',\n1425:                 alignItems: 'center',\n1426:                 gap: '6px'\n1427:               }}\n1428:             >\n1429:               <span>🏆</span>\n1430:               <span>Meisterwerk-Logbuch</span>\n1431:             </button>\n1432:             </button>\n1433:           </div>\n1434: \n1435:           {activeModalTab === 'document' && (\n1436:             <button\n1437:               type=\"button\"\n1438:               onClick={() => {\n1439:                 setUseNotebookLayout(prev => {\n1440:                   const newVal = !prev;\n1441:                   localStorage.setItem('meisterwerk_notebook_layout', String(newVal));\n1442:                   return newVal;\n1443:                 });\n1444:               }}\n1445:               style={{\n1446:                 background: useNotebookLayout ? '#1a1a22' : 'white',\n1447:                 border: '1.5px solid #e2e8f0',\n1448:                 color:
                ...item.pageStates,
                [activePageNumber]: {
                  status: pageStatus,
                  notes: teacherNotes.trim(),
                  updatedAt: new Date().toISOString()
                }
              }
            };
          }
          return item;
        });

        localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
        loadLehrwerke();
      } catch (err) {
        console.error('Error saving textbook local progress:', err);
      }
    }

    // Save to active song skills if active song selected
    if (activeInputTab === 'active_song' && selectedActiveSongId) {
      try {
              return { ...b, globalPageStates };
            }
            return b;
          });
          localStorage.setItem('campus_lehrwerke', JSON.stringify(updatedBooks));
        }

        const updated = parsed.map((item: any) => {
          if (item.studentId === student.id && item.lehrwerkId === activeLehrwerkId) {
            return {
              ...item,
              pageStates: {
                ...item.pageStates,
                [activePageNumber]: {
                  status: pageStatus,
                  notes: teacherNotes.trim(),
                  updatedAt: new Date().toISOString()
                }
              }
            };
          }
          return item;
        });

        localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
        loadLehrwerke();
      } catch (err) {
        console.error('Error saving textbook local progress:', err);
      }
    }

    // Save to active song skills if active song selected
    if (activeInputTab === 'active_song' && selectedActiveSongId) {
      try {
        let skillPercent = 25;
        if (status === 'MASTERED') {
          skillPercent = 100;
        } else if (status === 'THEORY_DONE') {
          skillPercent = 60;
        }

        await supabase
          .from('user_song_skills')
          .update({
            is_stage_ready: status === 'MASTERED',









          const itemIds = currentWeekItems.map(item => item.id).filter(Boolean);
          if (itemIds.length > 0) {
            await supabase
              .from('progress_matrix')
              .update({ homework_notes: combinedHomeworkNotes })
              .in('id', itemIds);
          }
        }

        await fetchProgress();
        notifyHomeworkChange();
        setActiveItem(null);
        onClose(); // Automatically close window on save success
        return;
      }

      // 2. Direct Supabase update/insert fallback
      const activeTId = await getCurrentTeacherId();
      const currentWeek = getISOWeek();

      const row = {
        student_id: student.id,
        teacher_id: activeTId,
        topic_name: finalTopicName,
        status,
        is_current_homework: finalIsCurrentHomework,
        teacher_notes: teacherNotes.trim(),
        homework_notes: combinedHomeworkNotes,
        updated_at: new Date().toISOString()
      };

      let dbError;
      if (activeItem?.id) {
        const { error } = await supabase
          .from('progress_matrix')
          .update(row)
          .eq('id', activeItem.id);
        dbError = error;
      } else {
        // Find if there is an entry with the same topic name in the current calendar week
        if (currentWeekItems.length > 0) {
          item.topic_name === finalTopicName &&
          item.updated_at &&
          getISOWeek(item.updated_at) === currentWeek
        );

        if (existingThisWeek?.id) {
          const { error } = await supabase
            .from('progress_matrix')
            .update(row)
            .eq('id', existingThisWeek.id);
          dbError = error;
        } else {
          const { error } = await supabase
            .from('progress_matrix')
            .insert(row);
          dbError = error;
        }
      }

      if (dbError) throw dbError;

      // Sync homework notes to all other progress items of the current week for this student
      const currentWeekItems = progressItems.filter(item =>
        item.updated_at && getISOWeek(item.updated_at) === currentWeek
      );
      if (currentWeekItems.length > 0) {
        const itemIds = currentWeekItems.map(item => item.id).filter(Boolean);
        if (itemIds.length > 0) {
          await supabase
            .from('progress_matrix')
            .update({ homework_notes: combinedHomeworkNotes })
            .in('id', itemIds);
        }
      }

      await fetchProgress();
      notifyHomeworkChange();
      setActiveItem(null);
      onClose(); // Automatically close window on save success
    } catch (err: any) {
      console.error('Error saving progress:', err);
      setError('Fehler beim Speichern des Fortschritts.');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignSongFromCatalog = async (songId: string) => {
    if (!songId) return;

            .eq('id', existingThisWeek.id);
          dbError = error;
        } else {
          const { error } = await supabase
            .from('progress_matrix')
            .insert(row);
          dbError = error;
        }
      }

      if (dbError) throw dbError;

      // Sync homework notes to all other progress items of the current week for this student
      const currentWeekItems = progressItems.filter(item =>
        item.updated_at && getISOWeek(item.updated_at) === currentWeek
      );
      if (currentWeekItems.length > 0) {
        const itemIds = currentWeekItems.map(item => item.id).filter(Boolean);
        if (itemIds.length > 0) {
          await supabase
            .from('progress_matrix')
            .update({ homework_notes: combinedHomeworkNotes })
            .in('id', itemIds);
        }
      }

      await fetchProgress();
      notifyHomeworkChange();
      setActiveItem(null);
      onClose(); // Automatically close window on save success
    } catch (err: any) {
      console.error('Error saving progress:', err);
      setError('Fehler beim Speichern des Fortschritts.');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignSongFromCatalog = async (songId: string) => {
    if (!songId) return;























































































































        user_id: student.id,
        song_id: song.id,
        instrument: defaultInstrument,
        progress_percent: 25,
        is_stage_ready: false
      })
      .select('*, songs(*)')
      .maybeSingle();

    if (skillError) throw skillError;

    await loadActiveSongSkills();

    if (newSkill) {
      selectActiveSong(newSkill);
    } else {
      const { data: refreshedSkills } = await supabase
        .from('user_song_skills')
        .select('*, songs(*)')
        .eq('user_id', student.id);
      if (refreshedSkills) {
        const found = refreshedSkills.find((s: any) => s.song_id === song.id);
        if (found) selectActiveSong(found);
      }
    }

    // Reset modal fields
    setNewSongTitle('');
    setNewSongArtist('');
    setShowCreateSongModal(false);
  const hasChanges = homeworkNotes.trim() !== '' || teacherNotes.trim() !== '' || topicName.trim() !== '' || sessionLogs.length > 0;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 4000,
      background: 'rgba(9, 9, 11, 0.65)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      alignItems: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>


      <div style={{
        background: '#f3f3f6', // Zurich neutral gray background canvas
        borderRadius: '32px',
        width: '100%',
        maxWidth: '1360px',
        height: '92vh',
        boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid rgba(0, 0, 0, 0.05)'
      }} className="animation-slide-up">
        {/* Header - Premium Zurich Card Style Header */}
        <div style={{
          padding: '20px 32px',
          background: 'white',
          borderBottom: '1px solid #e8e8ed',
          display: 'flex',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
              border: '2px solid white'
            }}>
              <img
                src={getInstrumentAvatarUrl(studentInstrument)}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                alt=""
              />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="swiss-label" style={{ fontSize: '0.62rem', background: '#f3f3f6', color: '#4b5563', padding: '3px 8px', borderRadius: '8px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Tageskompass
                </span>
                <h2 className="swiss-h2" style={{ margin: 0, fontSize: '1.25rem', color
            </div>
          </div>

          {/* Swiss Modernist Segmented Tab Control */}
          <div style={{
            display: 'inline-flex',
            background: '#f3f3f6',
            padding: '4px',
            borderRadius: '24px',
            border: '1px solid #e2e8f0'
          }}>
            <button
              type="button"
              onClick={() => setActiveModalTab('document')}
              style={{
                background: activeModalTab === 'document' ? 'white' : 'transparent',
                border: 'none',
                color: activeModalTab === 'document' ? '#000' : '#4b5563',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '0.78rem',
                fontWeight: activeModalTab === 'document' ? 800 : 600,
                cursor: 'pointer',
                boxShadow: activeModalTab === 'document' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>📝</span>
              <span>Unterricht dokumentieren</span>
            </button>
            <button
              type="button"
              onClick={() => setActive
              style={{
                background: activeModalTab === 'logbook' ? 'white' : 'transparent',
                border: 'none',
                color: activeModalTab === 'logbook' ? '#000' : '#4b5563',
            <button
              type="button"
              onClick={() => setActiveModalTab('logbook')}
              style={{
                background: activeModalTab === 'logbook' ? 'white' : 'transparent',
                border: 'none',
                color: activeModalTab === 'logbook' ? '#000' : '#4b5563',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '0.78rem',
                fontWeight: activeModalTab === 'logbook' ? 800 : 600,
                cursor: 'pointer',
                boxShadow: activeModalTab === 'logbook' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>🏆</span>
              <span>Meisterwerk-Logbuch</span>
            </button>
            </button>
          </div>

          {activeModalTab === 'document' && (
            <button
              type="button"
              onClick={() => {
                setUseNotebookLayout(prev => {
                  const newVal = !prev;
                  localStorage.setItem('meisterwerk_notebook_layout', String(newVal));
                  return newVal;
                });
              }}
              style={{
                background: useNotebookLayout ? '#1a1a22' : 'white',
                border: '1.5px solid #e2e8f0',
                color: useNotebookLayout ? '#f5e6c8' : '#4b5563',
                padding: '8px 16px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              className="hover-scale"
            >
              <span>📓</span>
              <span>Notizbuch-Look {useNotebookLayout ? 'aktiv' : 'inaktiv'}</span>
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              background: '#f3f3f6',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#000',
              transition: 'all 0.2s'
            }}
            className="hover-scale"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content - Side-by-side Columns or Logbook or Notizbuch */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0, position: 'relative' }} className="flex-col lg:flex-row">
          {activeModalTab === 'document' ? (
            (() => {
              const isNotebook = useNotebookLayout;
              const paperBg = isNotebook ? '#faf8f2' : 'white';

              return (
                <>

          {/* LEFT COLUMN: 🎯 FOKUS-ARBEITSPLATZ (Lehrwerke & Songs) */}
          <style dangerouslySetInnerHTML={{__html: `
            .hide-scrollbar::-webkit-scrollbar {
              display: none;
            }
            .hide-scrollbar {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { transform: translateY(20px); opacity: 0; }
              @keyframes pulseGlow {
              0%, 100% { box-shadow: 0 10px 30px rgba(16, 185, 129, 0.15), 0 4px 10px rgba(0, 0, 0, 0.05); border-color: #10b981; }
              50% { box-shadow: 0 10px 35px rgba(16, 185, 129, 0.35), 0 4px 10px rgba(0, 0, 0, 0.05); border-color: #059669; }
            }
            .pulse-glow-emerald {
              animation: pulseGlow 2s infinite ease-in-out;
            }
            @keyframes pulseDot {
              0%, 100% { opacity: 0.6; transform: scale(1); }
              50% { opacity: 1; transform: scale(1.25); }
            }
            .pulse-dot {
              animation: pulseDot 1.5s infinite ease-in-out;
            }
          `}} />
          <div style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            background: isNotebook ? '#e5e1d5' : 'transparent',
              overflow: 'hidden',
              position: 'relative'
            }} className="flex-col lg:flex-row">
              <div style={{
            flex: isNotebook ? '1 1 0%' : '1.4 1 0%',
            borderRight: isNotebook ? 'none' : '1px solid #e8e8ed',
            padding: '24px',
            overflowY: isNotebook ? 'hidden' : 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            background: paperBg,
            position: 'relative'
          }}>
            {isNotebook && (
                  top: 0, bottom: 0,
                  left: '50%',
                  width: '5px',
                  transform: 'translateX(-50%)',
                  background: 'linear-gradient(90deg, #111 0%, #333 40%, #555 50%, #333 60%, #111 100%)',
                  boxShadow: '1px 0 3px rgba(0,0,0,0.5), -1px 0 3px rgba(0,0,0,0.5)'
                }} />
                {/* Gold rings */}
                {[0,1,2,3,4,5,6].map(i => (
                  <div key={i} style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    border: '4px solid transparent',
                    background: 'linear-gradient(135deg, #f5c518, #c9a227, #f5c518, #8b6914) border-box',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,215,0,0.4)',
                    position: 'relative',
                    zIndex: 2,
                    flexShrink: 0,
                    outline: '4px solid #1a1a1a',
                    outlineOffset: '-4px'
                  }} />
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Lehrwerke & Übungen
                </span>
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0,
                      borderRight: '1px solid #e8e4dc',

              height: 4px;
              background: linear-gradient(180deg, #c5a059, #e5c185 35%, #ffffff 50%, #e5c185 65%, #a38144);
              border-radius: 2px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.18), inset 0 0.5px 0.5px rgba(255,255,255,0.35);
              z-index: 25;
              position: relative;
            }
            .notebook-hole {
              width: 4px;
                    border: '1.5px solid #c5a059',
                    background: 'transparent',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                    position: 'relative',
                    zIndex: 2,
                    flexShrink: 0
                  }} />
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Lehrwerke & Übungen
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Generous touch-friendly iPad Pinsel-Bar */}
                <div style={{
                    )}
                  </div>
                )}
              </div>
              </div>
            </div>

            {assignedLehrwerke.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center', border: '2px dashed #e8e8ed', borderRadius: '24px', color: '#7d7d82', fontSize: '0.82rem', fontWeight: 600 }}>
                Noch kein Lehrwerk zugewiesen.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {assignedLehrwerke.map(assigned => {
                  const book = globalLehrwerke.find(g => g.id === assigned.lehrwerkId) || {
                    title: 'Unbekanntes Buch',
                    emoji: '📚',
                    color: '#000',
                    totalPages: 50
                  };
                  const isSelected = activeLehrwerkId === assigned.lehrwerkId;
                  const pages = Array.from({ length: book.totalPages || 50 }, (_, i) => i + 1);

                  return (
                    <div key={assigned.lehrwerkId} style={{
                      border: '1px solid #e8e8ed',
                      borderRadius: '24px',
                      background: '#f8f8fa',
                      overflow: 'hidden',
                      transition: 'all 0.25s'
                              background: isActive ? b.color : 'transparent',
                              color: isActive ? 'white' : b.color,
                              padding: '6px 16px',
                              borderRadius: '16px',
                              fontSize: '0.9rem',
                              fontWeight: 900,
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                              boxShadow: isActive ? `0 4px 10px ${b.color}40` : 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minHeight: '36px',
                              minWidth: '40px'
                            }}
                          >
                            {b.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: '10px',
                          fontSize: '15px'
                        }}>
                          {book.emoji}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {book.title}
                          </h4>
                          {(() => {
                            const total = book.totalPages || 50;
                            const worked = Object.values(assigned.pageStates || {}).filter((p: any) => p.status === 'mastered').length;
                            const pct = Math.min(100, Math.round((worked / total) * 100));
                            return (
                              <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                  <p style={{ margin: 0, fontSize: '0.7rem', color: '#7d7d82', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                    {total} Seiten • {worked} gemeistert
                                  </p>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 900, color: pct > 0 ? '#10b981' : '#7d7d82' }}>
                                    ({pct}%)
                                  </span>
                                </div>
                                <div style={{
                                  width: '100%',
                                  height: '6px',
                                  background: '#e8e8ed',
                                  borderRadius: '3px',
                                  marginTop: '6px',
                                  overflow: 'hidden'
                                }}>
                                  <div style={{
                                    width: `${pct}%`,
                                    height: '100%',
                                    background: 'linear-gradient(90deg, #10b981, #059669)',
                                    borderRadius: '3px',
                                    transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                                  }} />
                                </div>
                              </>
                            );
                          })()}
                        </div>
                        <ChevronRight size={16} style={{ color: '#7d7d82', transform: isSelected ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                      </div>

                      {/* Pages Grid - Always expanded for active Lehrwerk */}
                      {isSelected && (
                        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'white' }}>
                           {activePageNumber !== null && (
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              background: '#f8fafc',
                              padding: '12px 16px',
                              borderRadius: '20px',
                              border: '1px solid #e8e8ed'
                            }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                borderBottom: '1px solid #e8e8ed',
                                paddingBottom: '8px',
                                marginBottom: '4px'
                              }}>
                            textAlign: 'left',
                            cursor: 'pointer',
                            color: '#000',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f3f3f6'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <span>{g.emoji}</span>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.title}</span>
                        </button>
                      ))
                    }
                    {globalLehrwerke.filter(g => !assignedLehrwerke.some(a => a.lehrwerkId === g.id)).length === 0 && (
                      <span style={{ fontSize: '0.72rem', color: '#7d7d82', padding: '8px', textAlign: 'center', fontStyle: 'italic' }}>
                        Alle Lehrwerke zugewiesen
                      </span>
                    )}
                  </div>
                )}
              </div>
              </div>
            </div>

            {assignedLehrwerke.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center', border: '2px dashed #e8e8ed', borderRadius: '24px', color: '#7d7d82', fontSize: '0.82rem', fontWeight: 600 }}>
                                  Seite {activePageNumber} / {book.totalPages}
                                </span>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (activePageNumber < (book.totalPages || 50)) {
                                      selectTextbookPage(assigned.lehrwerkId, activePageNumber + 1);
                                    }
                                  }}
                                  disabled={activePageNumber >= (book.totalPages || 50)}
                                  style={{
                                    background: '#000',
                                    color: 'white',
                                    border: 'none',
                                    padding: '6px 14px',
                                    borderRadius: '12px',
                                    fontSize: '0.78rem',
                                    fontWeight: 800,
                                    cursor: activePageNumber >= (book.totalPages || 50) ? 'not-allowed' : 'pointer',
                                    opacity: activePageNumber >= (book.totalPages || 50) ? 0.3 : 1,
                                    display: 'flex',

                position: 'absolute',
                top: 0,
                right: '-18px',
                bottom: 0,
                width: '36px',
                zIndex: 20,
                display: 'flex',
                          borderBottom: '1px solid #e8e8ed',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{
                          width: '32px', height: '32px',
              </div>
            ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); triggerDirectSave(assigned.lehrwerkId, activePageNumber, 'IN_PROGRESS', false); }}
                                    style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#ef4444', border: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                                    title="Ungestartet (Rot)"
                                  />
                                  {/* Yellow */}
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); triggerDirectSave(assigned.lehrwerkId, activePageNumber, 'IN_PROGRESS', true); }}
                                    style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#eab308', border: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                                    title="Hausaufgabe (Gelb)"
                                  />
                                  {/* Green */}
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); triggerDirectSave(assigned.lehrwerkId, activePageNumber, 'MASTERED', false); }}
                                    style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#10b981', border: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                                    title="Meisterwerk (Grün)"
                      {/* Textbook Title Bar */}
                      <div
                        onClick={() => {
                          setActiveLehrwerkId(isSelected ? null : assigned.lehrwerkId);
                          setActivePageNumber(null);
                        }}
                        style={{
                          padding: '14px 18px',
                          background: isSelected ? 'white' : '#f8f8fa',
                          borderBottom: '1px solid #e8e8ed',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{
                          width: '32px', height: '32px',
                          background: isSelected ? '#000' : '#e8e8ed',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isSelected ? 'white' : '#000',
                          fontSize: '15px'
                        }}>
                          {book.emoji}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {book.title}
                          </h4>
                          {(() => {
                            const total = book.totalPages || 50;
                            const worked = Object.values(assigned.pageStates || {}).filter((p: any) => p.status === 'mastered').length;
                            const pct = Math.min(100, Math.round((worked / total) * 100));
                            return (
                              <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                  <p style={{ margin: 0, fontSize: '0.7rem', color: '#7d7d82', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                    {total} Seiten • {worked} gemeistert
                                  </p>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 900, color: pct > 0 ? '#10b981' : '#7d7d82' }}>
                                    ({pct}%)
                                  </span>
                                </div>
                                <div style={{
                                  width: '100%',
                                  height: '6px',
                                  background: '#e8e8ed',
                                  borderRadius: '3px',
                                  marginTop: '6px',
                                  overflow: 'hidden'
                                }}>
                                  <div style={{
                                    width: `${pct}%`,
                                    height: '100%',
                                    background: 'linear-gradient(90deg, #10b981, #059669)',
                                    borderRadius: '3px',
                                    transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                                  }} />
                                </div>
                              </>
                            );
                          })()}
                        </div>
                        <ChevronRight size={16} style={{ color: '#7d7d82', transform: isSelected ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                      </div>

                      {/* Pages Grid - Always expanded for active Lehrwerk */}
                            background: 'transparent',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            textAlign: 'left',
                            cursor: 'pointer',
                            color: '#000',
                            display: 'flex',
                            alignItems: 'center',




















                                      }

                                      triggerDirectSave(assigned.lehrwerkId, num, targetStatus, targetHomework);
                                    }
                                  }}
                                  style={{
                                    flex: '0 0 46px',
                                    width: '46px',
                                    height: '46px',
                                    borderRadius: '50%',
                                    border: `2px solid ${isPageActive ? solidActiveBg : borderColor}`,
                                    background: isPageActive ? solidActiveBg : bg,
                                    color: isPageActive ? 'white' : textColor,
                                    fontWeight: 900,
                                    fontSize: '0.95rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.15s',
                                    boxShadow: isPageActive ? '0 4px 10px rgba(0,0,0,0.15)' : 'none',
                                    transform: isPageActive ? 'scale(1.1)' : 'none'
                                  }}
                                  className="hover-scale-mini"
                                >
                                  {num}
                                </button>
                              );
                            })}
                          </div>














            </div>

            {activeSongSkills.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center', border: '2px dashed #e8e8ed', borderRadius: '24px', color: '#7d7d82', fontSize: '0.82rem', fontWeight: 600 }}>
                Keine aktiven Songs eingetragen.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activeSongSkills.map(skill => {
                  const isSelected = selectedActiveSongId === skill.id && activeInputTab === 'active_song';
                  const progress = skill.is_stage_ready ? 100 : (skill.progress_percent || 0);

                  return (
                    <div
                      key={skill.id}
                      onClick={() => selectActiveSong(skill)}
                      style={{
                        padding: '14px 18px',
                        background: isSelected ? '#f8f8fa' : 'white',
                        borderRadius: '20px',
                        border: `2.5px solid ${isSelected ? '#000' : '#e8e8ed'}`,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        transition: 'all 0.2s'
                      }}
                      className="hover-scale"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 900, color: '#000' }}>
                            {skill.songs?.title}
                          </h4>
                          <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#7d7d82', fontWeight: 700 }}>
                            {skill.songs?.artist} • <span style={{ color: '#000', fontWeight: 800 }}>{skill.instrument}</span>
                          </p>
                        </div>

                        <span style={{
                          background: skill.is_stage_ready ? '#d1fae5' : '#f3f3f6',
                          color: skill.is_stage_ready ? '#065f46' : '#000',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.65rem',
                          fontWeight: 900,
                          textTransform: 'uppercase'
                        }}>
                          {skill.is_stage_ready ? 'Bühnenreif' : `${progress}%`}
                        </span>
                      </div>




                    </div>
                  );
                })}
              </div>
            )}
            {/* Visual separator between Lehrwerke and Songs */}
            <div style={{ borderTop: '1px solid #e8e8ed', margin: '20px 0 10px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Music size={18} style={{ color: '#000' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🎵 Aktive Song-Projekte
              </span>
            </div>

            {activeSongSkills.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center', border: '2px dashed #e8e8ed', borderRadius: '24px', color: '#7d7d82', fontSize: '0.82rem', fontWeight: 600 }}>
                Keine aktiven Songs eingetragen.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              return (
                                <button
                                  key={num}
                                  onClick={() => {
                                    if (activeBrush === 'NONE') {
                                      selectTextbookPage(assigned.lehrwerkId, num);
                                    } else {
                                      let targetStatus: 'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED' = 'IN_PROGRESS';
                                      let targetHomework = false;

                                      if (activeBrush === 'LOCKED') {
                                        targetStatus = 'IN_PROGRESS';
                                        targetHomework = false;
                                      } else if (activeBrush === 'HOMEWORK') {
                                        targetStatus = 'IN_PROGRESS';
                                        targetHomework = true;
                                      } else if (activeBrush === 'MASTERED') {
                                        targetStatus = 'MASTERED';
                                        targetHomework = false;
                                      } else if (activeBrush === 'THEORY') {
                                        targetStatus = 'THEORY_DONE';
                                        targetHomework = false;
                                      }

                                      triggerDirectSave(assigned.lehrwerkId, num, targetStatus, targetHomework);
                                    }
                                  }}
                                  style={{
                                    flex: '0 0 46px',
                                    width: '46px',
                                    height: '46px',
                        <span style={{
                          background: skill.is_stage_ready ? '#d1fae5' : '#f3f3f6',
                          color: skill.is_stage_ready ? '#065f46' : '#000',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.65rem',
                          fontWeight: 900,
                          textTransform: 'uppercase'
                        }}>
                          {skill.is_stage_ready ? 'Bühnenreif' : `${progress}%`}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {/* Visual separator between Lehrwerke and Songs */}
            <div style={{ borderTop: '1px solid #e8e8ed', margin: '20px 0 10px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Music size={18} style={{ color: '#000' }} />
                  );
                })}
              </div>
            )}
            {/* Visual separator between Lehrwerke and Songs */}
            <div style={{ borderTop: '1px solid #e8e8ed', margin: '20px 0 10px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Music size={18} style={{ color: '#000' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🎵 Aktive Song-Projekte
              </span>
            </div>

            {activeSongSkills.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center', border: '2px dashed #e8e8ed', borderRadius: '24px', color: '#7d7d82', fontSize: '0.82rem', fontWeight: 600 }}>
                Keine aktiven Songs eingetragen.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activeSongSkills.map(skill => {
                  const isSelected = selectedActiveSongId === skill.id && activeInputTab === 'active_song';
                  const progress = skill.is_stage_ready ? 100 : (skill.progress_percent || 0);

                  return (
                    <div
                      key={skill.id}

                        gap: '8px',
                        transition: 'all 0.2s'
                      }}
                      className="hover-scale"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 900, color: '#000' }}>
                                    flex: '0 0 46px',
                                    width: '46px',
                                    height: '46px',
                                    borderRadius: '50%',
                                    border: `2px solid ${isPageActive ? solidActiveBg : borderColor}`,
                                    background: isPageActive ? solidActiveBg : bg,
                                    color: isPageActive ? 'white' : textColor,
                                    fontWeight: 900,
                                    fontSize: '0.95rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.15s',
                                    boxShadow: isPageActive ? '0 4px 10px rgba(0,0,0,0.15)' : 'none',
                                    transform: isPageActive ? 'scale(1.1)' : 'none'
                                  }}
                                  className="hover-scale-mini"
                                >
                                  {num}
                                </button>
                              );
                            })}
                          </div
                          {skill.is_stage_ready ? 'Bühnenreif' : `${progress}%`}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ width: '100%', height: '6px', background: '#f3f3f6', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{

            <div style={{ borderTop: '1px solid #e8e8ed', margin: '20px 0 10px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Music size={18} style={{ color: '#000' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🎵 Aktive Song-Projekte
              </span>
            </div>

            {activeSongSkills.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center', border: '2px dashed #e8e8ed', borderRadius: '24px', color: '#7d7d82', fontSize: '0.82rem', fontWeight: 600 }}>
                Keine aktiven Songs eingetragen.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activeSongSkills.map(skill => {
                  const isSelected = selectedActiveSongId === skill.id && activeInputTab === 'active_song';
                  const progress = skill.is_stage_ready ? 100 : (skill.progress_percent || 0);

                  return (
                    <div
                      key={skill.id}
                      onClick={() => selectActiveSong(skill)}
                      style={{
                        padding: '14px 18px',
                        background: isSelected ? '#f8f8fa' : 'white',
                        borderRadius: '20px',
                        border: `2.5px solid ${isSelected ? '#000' : '#e8e8ed'}`,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        transition: 'all 0.2s'
                      }}
                      className="hover-scale"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 900, color: '#000' }}>
                            {skill.songs?.title}
                          </h4>
                          <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#7d7d82', fontWeight: 700 }}>
                            {skill.songs?.artist} • <span style={{ color: '#000', fontWeight: 800 }}>{skill.instrument}</span>
                          </p>
                        </div>

                        <span style={{
                          background: skill.is_stage_ready ? '#d1fae5' : '#f3f3f6',
                          color: skill.is_stage_ready ? '#065f46' : '#000',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.65rem',
                          fontWeight: 900,
                          textTransform: 'uppercase'
                        }}>
                          {skill.is_stage_ready ? 'Bühnenreif' : `${progress}%`}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ width: '100%', height: '6px', background: '#f3f3f6', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${progress}%`,
                          height: '100%',
                          background: skill.is_stage_ready ? '#10b981' : '#000',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>

                      {/* Quick Color Picker inside active song card */}



















                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f3f3f6'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                      >
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.82rem' }}>{song.title}</div>
                          <div style={{ fontSize: '0.7rem', color: '#7d7d82', fontWeight: 600 }}>{song.artist}</div>
                        </div>
                        <span style={{ fontSize: '0.72rem', background: '#000', color: 'white', padding: '2px 8px', borderRadius: '10px', fontWeight: 800 }}>
                          Hinzufügen
                        </span>
                      </button>
                    ));
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 3: ✍️ DOKUMENTATION & HAUSAUFGABE (32%) */}
          <div style={{
            flex: '1.1 1 0%',
            padding: '24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            background: '#f8fafc',
            borderLeft: '1px solid #e4e4e7'
          }}>
            <div>
              <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#09090b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                ✍️ Eintrag & Hausaufgabe
              </span>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.76rem', color: '#71717a', fontWeight: 550, lineHeight: '1.3' }}>
                Dokumentiere den heutigen Unterricht für den Schüler.
              </p>
                    const filtered = songs.filter(s =>
                      s.title?.toLowerCase().includes(songSearch.toLowerCase()) ||
                      s.artist?.toLowerCase().includes(songSearch.toLowerCase())
                    );

                    if (filtered.length === 0) {
                      return (
                        <div style={{ padding: '16px', fontSize: '0.78rem', color: '#7d7d82', textAlign: 'center', fontStyle: 'italic' }}>
                          Keine Treffer gefunden.
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
              }}>
                {/* Combined Hausaufgaben-Fahrplan Widget */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f4f4f5', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#18181b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      🗓️ Hausaufgaben KW {getISOWeek().split('-W')[1]}
                    </span>
                    {(progressItems.some(item => item.is_current_homework) || homeworkNotes.trim() !== '') && (
                      <button
                        type="button"
                        onClick={async () => {
                          await handleResetAllCurrentHomework();
                          setHomeworkNotes('');




                          Hinzufügen
                        </span>
                      </button>
                    ));
                  })()}
                </div>
              )}
            </div>
          </div>

              )}
            </div>
          </div>

          {/* COLUMN 3: ✍️ DOKUMENTATION & HAUSAUFGABE (32%) */}
          <div style={{
            flex: '1.1 1 0%',
            padding: '24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            background: '#f8fafc',
            borderLeft: '1px solid #e4e4e7'
          }}>
                  })()}
                </div>
              )}
            </div>
          </div>
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f3f3f6'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                      >
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.82rem' }}>{song.title}</div>
                          <div style={{ fontSize: '0.7rem', color: '#7d7d82', fontWeight: 600 }}>{song.artist}</div>
                        </div>
                        <span style={{ fontSize: '0.72rem', background: '#000', color: 'white', padding: '2px 8px', borderRadius: '10px', fontWeight: 800 }}>
                          Hinzufügen
                        </span>
                      </button>
                    ));
                  })()}
                </div>
              )}
            </div>
          </div>

          <div style={{
            flex: '1 1 0%',
            padding: '24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            background: isNotebook ? paperBg : '#f8fafc',
            borderLeft: isNotebook ? 'none' : '1px solid #e4e4e7'
          }}>
            <div>
              <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#09090b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                ✍️ Eintrag & Hausaufgabe
              </span>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.76rem', color: '#71717a', fontWeight: 550, lineHeight: '1.3' }}>
                Dokumentiere den heutigen Unterricht für den Schüler.
              </p>
            </div>

            {/* The Main Input Form Card */}
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                background: 'white',
                border: '1px solid #e4e4e7',
                borderRadius: '24px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
              }}>
                {/* Combined Hausaufgaben-Fahrplan Widget */}
                <div style={{
                  background: '#fffdf0',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f4f4f5', paddingBottom: '8px' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#000', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    🎵 Neuen Song erschaffen
                  </div>
                  <input
                    type="text"
                    placeholder="Titel (z.B. Wonderwall)..."
                    value={newSongTitle}
                    onChange={(e) => setNewSongTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #e8e8ed',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      outline: 'none',
                      background: 'white'
                    }}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Künstler (z.B. Oasis)..."
                    value={newSongArtist}
                    onChange={(e) => setNewSongArtist(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #e8e8ed',









                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f3f3f6'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                      >
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.82rem' }}>{song.title}</div>
                          <div style={{ fontSize: '0.7rem', color: '#7d7d82', fontWeight: 600 }}>{song.artist}</div>
                        </div>
                        <span style={{ fontSize: '0.72rem', background: '#000', color: 'white', padding: '2px 8px', borderRadius: '10px', fontWeight: 800 }}>
                          Hinzufügen
                        </span>
                      </button>
                    ));
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Notebook Mechanical Spine right between left and right pages */}
          {isNotebookTheme && (
            <div className="notebook-spine" style={{
              background: 'linear-gradient(to right, #151518, #303038 30%, #4a4a54 50%, #202025 70%, #0c0c0e)',
              width: '10px',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-around',
              alignItems: 'center',
              boxShadow: 'inset 1px 0 2px rgba(0,0,0,0.5), inset -1px 0 2px rgba(0,0,0,0.5), 0 0 6px rgba(0,0,0,0.2)'
            }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                  {/* Holes on left and right page edges */}
                  <div className="notebook-hole" style={{ position: 'absolute', left: '-7px', top: '1px' }} />
                  <div className="notebook-ring" style={{ transform: 'translateX(-18px)' }} />
                  <div className="notebook-hole" style={{ position: 'absolute', right: '-7px', top: '1px' }} />
                </div>
              ))}
            </div>
          )}

          {/* COLUMN 3: ✍️ DOKUMENTATION & HAUSAUFGABE (32%) */}
          <div style={{
            flex: '1.1 1 0%',
            padding: isNotebookTheme ? '24px 24px 24px 36px' : '24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            background: isNotebookTheme ? '#fafaf6' : '#f8fafc',
            borderLeft: isNotebookTheme ? 'none' : '1px solid #e4e4e7',
            borderRadius: isNotebookTheme ? '0 0 24px 0' : '0',
                Dokumentiere den heutigen Unterricht für den Schüler.
              </p>
            </div>

            {/* The Main Input Form Card */}
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 2, position: 'relative' }}>
              <div style={{
                background: 'white',
                border: '1px solid #e4e4e7',
                borderRadius: '24px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                </div>

                {/* Neue Hausaufgabe (Schüler-Sicht) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    📝 Neue Hausaufgabe <span style={{ color: '#64748b', fontWeight: 500 }}>(für den Schüler sichtbar)</span>
                  </label>
                  <textarea
                    ref={homeworkTextareaRef}
                    placeholder="Schreibe dem Schüler auf, was er bis zum nächsten Mal üben soll..."
                    value={homeworkNotes}
                    onChange={(e) => setHomeworkNotes(e.target.value)}
                    style={{
                      width: '100%',
                      height: '110px',
                      padding: '14px 16px',
                      borderRadius: '14px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      outline: 'none',
                    style={{
                      marginTop: '4px',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: 'none',
                      background: homeworkNotes.trim() ? '#10b981' : '#e4e4e7',
                      color: homeworkNotes.trim() ? '#ffffff' : '#a1a1aa',
                      fontWeight: 800,
                      cursor: homeworkNotes.trim() ? 'pointer' : 'default',
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                    className={homeworkNotes.trim() ? "hover-scale" : ""}
                  >
                    ➕ Notiz hinzufügen
                  </button>

                  {/* iPad Schnell-Textbausteine inside the form card as a clean drawer or chips */}
                  <div style={{ marginTop: '6px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {[
                        { label: '🐌 Schnecken-Tempo', text: 'Spiele die schwierige Passage ganz langsam wie eine Schnecke. Erst wenn deine Finger den Weg im Schlaf kennen, schalten wir d



                      {[
                        { label: '🐌 Schnecken-Tempo', text: 'Spiele die schwierige Passage ganz langsam wie eine Schnecke. Erst wenn deine Finger den Weg im Schlaf kennen, schalten wir den Turbo an!' },
                        { label: '🔂 Ritter-Dreierspiel', text: 'Wiederhole den kniffligen Übergang dreimal hintereinander fehlerfrei. Schaffst du das, hast du die Stelle gemeistert!' },
                        { label: '🎵 Laut-Leise Zauber', text: 'Lass das Stück lebendig klingen! Mache deutliche Unterschiede zwischen Flüsterlautstärke (piano) und Löwenbrüllen (forte).' },
                        { label: '⏱️ 10-Min.-Champion', text: 'Stelle dir einen Timer auf 10 Minuten. Übe diese Woche jeden Tag kurz und fokussiert, anstatt einmal ganz lang am Wochenende.' },
                        { label: '🌟 Eigener Remix', text: 'Du beherrschst die Noten super! Überlege dir bis zum nächsten Mal eine eigene coole Rhythmus-Variante für diesen Teil.' },
                        { label: '🕵️‍♂️ Noten-Detektiv', text: 'Lies die Noten laut mit und achte genau auf die Tonlängen. Sei wie ein Detektiv, dem keine Note entwischt!' },
                        { label: '👁️ Blind-Flug', text: 'Schließe beim Spielen mal die Augen. Fühle die Tasten/Saiten und spiele die Stelle ganz blind auswendig!' },
                        { label: '🥁 Puls-Master', text: 'Klatsche zuerst den Rhythmus und zähle l




                          type="button"
                          onClick={() => setHomeworkNotes(prev => prev ? `${prev}\n\n${tpl.text}` : tpl.text)}
                          style={{
                            background: '#ffffff',
                            color: '#4b5563',
                            border: '1px solid #e5e7eb',
                            padding: '6px 12px',
                            borderRadius: '9999px',
                            fontSize: '0.66rem',
                            fontWeight: 650,
                            cursor: 'pointer',
                            transition: 'all 0.12s ease-in-out',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.01)'
                          }}
                          className="hover-scale-mini"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f9fafb';
                            e.currentTarget.style.borderColor = '#cbd5e1';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#ffffff';
                            e.currentTarget.style.borderColor = '#e5e7eb';
                          }}
                        >
                          {tpl.label}
                        </button>
                      ))}
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            background: '#f8fafc',
            borderLeft: '1px solid #e4e4e7'
          }}>
            <div>
              <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#09090b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                ✍️ Eintrag & Hausaufgabe
              </span>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.76rem', color: '#71717a', fontWeight: 550, lineHeight: '1.3' }}>
                Dokumentiere den heutigen Unterricht für den Schüler.
              </p>
            </div>

            {/* The Main Input Form Card */}
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                background: 'white',
                border: '1px solid #e4e4e7',
                borderRadius: '24px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
              }}>
                {/* Combined Hausaufgaben-Fahrplan Widget */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f4f4f5', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#18181b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      🗓️ Hausaufgaben KW {getISOWeek().split('-W')[1]}
                    </span>
                    {(progressItems.some(item => item.is_current_homework) || homeworkNotes.trim() !== '') && (
                      <button
                        type="button"
                        onClick={async () => {
                          await handleResetAllCurrentHomework();
                          setHomeworkNotes('');
                        }}
                        style={{
                          border: 'none',
                          background: 'none',
                          color: '#ef4444',
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          padding: 0,
                          transition: 'color 0.15s ease'
                        }}
                        className="hover-scale-mini"
                      >
                        Zurücksetzen
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(() => {
                      const activeHWs = progressItems.filter(item => item.is_current_homework && !item.topic_name.startsWith('Hausaufgabe KW '));
                      const currentWeek = getISOWeek();
                      const activeTheories = progressItems.filter(item =>
                        item.status === 'THEORY_DONE' &&
                        item.updated_at &&
                        getISOWeek(item.updated_at) === currentWeek &&
                        !item.topic_name.startsWith('Hausaufgabe KW ')
                      );
                      const hasActive = activeHWs.length > 0 || activeTheories.length > 0;
                      const hasNotes = homeworkNotesList.length > 0;

                      if (!hasActive && !hasNotes) {
                        return (
                                    onClick={() => handleDeleteNote(nIdx)}
                                    style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.72rem', padding: '0 4px', fontWeight: 800, marginTop: '1px' }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}
            </form>

            {/* Separator to clean visual space */}
            {(lastHomework || progressItems.filter(item => item.is_current_homework).length > 0 || sessionLogs.length > 0) && (
              <div style={{ borderTop: '1px solid #e4e4e7', margin: '8px 0' }} />
            )}

            {/* REFERENCE & HISTORY GROUP (At the bottom, simple, clean, and extremely compact) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/* 1. Vorwochen-Hausaufgabe (Only rendered if exists, extremely compact) */}
              {lastHomework && (
                <div style={{
                  background: '#fffbeb',
                  border: '1px solid #fef3c7',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  display: 'flex',
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '2px' }}>
                {(activeItem || activePageNumber !== null || selectedActiveSongId) && (
                  <button
                    type="button"
                    onClick={handleCreateNew}
                    style={{
                      flex: 1,
                      padding: '14px',
                      borderRadius: '14px',
                      border: '1px solid #e4e4e7',
                      background: '#ffffff',
                      color: '#3f3f46',
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                      transition: 'all 0.15s ease'
                    }}
                    className="hover-scale"
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                  >
                    Zurücksetzen
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 2,
                    padding: '14px',
                    borderRadius: '14px',
                    border: 'none',
                    background: '#09090b',
                    color: '#ffffff',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-scale"
                  onMouseEnter={(e) => e.currentTarget.style.background = '#18181b'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#09090b'}
                >
                  {saving ? 'Wird gespeichert...' : 'Eintrag speichern'}
                </button>
              </div>

              {error && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  color: '#991b1b',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                Object.entries(assigned.pageStates || {}).forEach(([pStr, state]: [string, any]) => {
                  if (state.status === 'mastered') {
                    const pNum = parseInt(pStr, 10);
                    if (!isNaN(pNum)) masteredPages.push(pNum);
                  }
                });
                const pct = Math.min(100, Math.round((masteredPages.length / total) * 100));
                if (pct === 100 && masteredPages.length > 0) {
                  masteredBooksList.push({
                    title: book.title,
                    emoji: book.emoji,
                    pages: masteredPages
                  });
                }
              }
            });

            const masteredSongs = activeSongSkills.filter(s => s.is_stage_ready || s.progress_percent === 100);

                    </span>
                  </div>
                  <div style={{
                    fontSize: '0.74rem',
                    color: '#78350f',
                    fontWeight: 650,
                    fontStyle: 'italic',
                    lineHeight: '1.25',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }} title={lastHomework.homework_notes}>
                    "{lastHomework.homework_notes}"
                  </div>
                </div>
                    <span style={{ fontSize: '0.6rem', color: '#d97706', fontWeight: 600 }}>
                      {lastHomework.updated_at ? new Date(lastHomework.updated_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }) : ''}
                    </span>
                  </div>
                  <div style={{
                    fontSize: '0.74rem',
                    color: '#78350f',
                    fontWeight: 650,
                    fontStyle: 'italic',
                    lineHeight: '1.25',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }} title={lastHomework.homework_notes}>
                    "{lastHomework.homework_notes}"
                  </div>
                </div>
              )}
            </div>
            </div>
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }} title={lastHomework.homework_notes}>
                    "{lastHomework.homework_notes}"
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
                </>
              );
            })()
          ) : (
        /* COLUMN 4: 🏆 MEISTERWERKE & LOGBUCH (Full Width in Swiss Modernist Style) */
        <div style={{
          flex: 1,
          padding: '32px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          background: '#f8fafc'
        }}>
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
              Meisterwerk-Logbuch
            </span>
          </div>

          {/* List of mastered items inside logbook */}
          {(() => {
            const masteredBooksList: any[] = [];
            assignedLehrwerke.forEach(assigned => {
              const book = globalLehrwerke.find(g => g.id === assigned.lehrwerkId);
              if (book) {
                const total = book.totalPages || 50;
                const masteredPages: number[] = [];
                Object.entries(assigned.pageStates || {}).forEach(([pStr, state]: [string, any]) => {
                  if (state.status === 'mastered') {
                    const pNum = parseInt(pStr, 10);
                    if (!isNaN(pNum)) masteredPages.push(pNum);
                  }
                });
                const pct = Math.min(100, Math.round((masteredPages.length / total) * 100));
                if (pct === 100 && masteredPages.length > 0) {
                  masteredBooksList.push({
                    title: book.title,
                    emoji: book.emoji,
                    pages: masteredPages
                  });
                }
              }
            });

            const masteredSongs = activeSongSkills.filter(s => s.is_stage_ready || s.progress_percent === 100);

            const hasMastered = masteredBooksList.length > 0 || masteredSongs.length > 0;

            if (!hasMastered) {
              return (
                <div style={{
                  padding: '80px 24px',
                  textAlign: 'center',
                  border: '2px dashed #cbd5e1',
                  borderRadius: '24px',
                  color: '#475569',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  background: 'white',
                  maxWidth: '600px',
                  margin: '40px auto 0 auto'
                }}>
                  Noch keine Meisterwerke eingetragen. Auf geht's! 🚀
                </div>
              );
            }

            return (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '20px'
              }}>
                {/* Mastered Lehrwerke */}
                {masteredBooksList.map((item, idx) => (
                  <div key={`m-lw-${idx}`} style={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadi
              }}>
                {/* Mastered Lehrwerke */}
                {masteredBooksList.map((item, idx) => (
                  <div key={`m-lw-${idx}`} style={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '20px',
                    padding: '16px 20px',
                      color: '#0f172a',
                      fontWeight: 900,
                      letterSpacing: '-0.03em',
                      fontFamily: '"Helvetica Neue", Helvetica, Inter, Arial, sans-serif'
                    }}>
                      {item.emoji} {item.title}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {item.pages.map((p: number) => (
                        <div key={p} style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          background: '#f1f5f9',
                          color: '#334155',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          border: '1px solid #e2e8f0'
                        }}>
                          S. {p}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Mastered Songs */}
                {masteredSongs.map((skill, idx) => (
                  <div key={`m-song-${idx}`} style={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '20px',
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{
                        fontSize: '0.86rem',
                        color: '#0f172a',
                        fontWeight: 900,
                        letterSpacing: '-0.03em',
                        fontFamily: '"Helvetica Neue", Helvetica, Inter, Arial, sans-serif'
                      }}>
                        🎤 {skill.songs?.title}
                      </div>
                      <span style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: '8px', fontWeight: 800, border: '1px solid #e2e8f0' }}>
                        {skill.instrument}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 700 }}>
                      {skill.songs?.artist}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Apple-style Backdrop Blur Overlay for All Pages Grid */}
      {showAllPagesGrid && activeLehrwerkId && (() => {
        const assigned = assignedLehrwerke.find(a => a.lehrwerkId === activeLehrwerkId);
        if (!assigned) return null;
        const book = globalLehrwerke.find(g => g.id === activeLehrwerkId) || { title: 'Lehrwerk', emoji: '📚', totalPages: 50 };
        const pages = Array.from({ length: book.totalPages || 50 }, (_, i) => i + 1);

        return (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            animation: 'fadeIn 0.25s ease'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '32px',
              width: '100%',
              maxWidth: '640px',
              maxHeight: '90%',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
              overflow: 'hidden',
                            if (activeBrush === 'LOCKED') {
                              targetStatus = 'IN_PROGRESS';
                              targetHomework = false;
                            } else if (activeBrush === 'HOMEWORK') {
                              targetStatus = 'IN_PROGRESS';
                              targetHomework = true;
                            } else if (activeBrush === 'MASTERED') {
                              targetStatus = 'MASTERED';
                              targetHomework = false;
                            } else if (activeBrush === 'THEORY') {
                              targetStatus = 'THEORY_DONE';
                              targetHomework = false;
                            }

                            triggerDirectSave(assigned.lehrwerkId, num, targetStatus, targetHomewo
                      >
                        {num}
                      </button>
                    );
                          height: '46px',
                          borderRadius: '50%',
                          border: `2px solid ${isPageActive ? solidActiveBg : borderColor}`,
                          background: isPageActive ? solidActiveBg : bg,
                          color: isPageActive ? 'white' : textColor,
                          fontWeight: 900,
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                      {lastHomework.updated_at ? new Date(lastHomework.updated_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }) : ''}
                    </span>
                  </div>
                  <div style={{
                    fontSize: '0.74rem',
                    color: '#78350f',
                    fontWeight: 650,
                    fontStyle: 'italic',
                    lineHeight: '1.25',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }} title={lastHomework.homework_notes}>
                    "{lastHomework.homework_notes}"
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* COLUMN 4: 🏆 MEISTERWERKE & LOGBUCH (Full Width in Swiss Modernist Style) */
        <div style={{
          flex: 1,
          padding: '32px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          background: '#f8fafc'
                        key={num}
                        onClick={() => {
                          if (activeBrush === 'NONE') {
                            selectTextbookPage(assigned.lehrwerkId, num);
                            setShowAllPagesGrid(false);
                          } else {
                            let targetStatus: 'IN_PROGRESS' | 'THEORY_DONE' | 'MASTERED' = 'IN_PROGRESS';
                            let targetHomework = false;

                            if (activeBrush === 'LOCKED') {
                              targetStatus = 'IN_PROGRESS';
                              targetHomework = false;
                            } else if (activeBrush === 'HOMEWORK') {
                              targetStatus = 'IN_PROGRESS';
                              targetHomework = true;
                            } else if (activeBrush === 'MASTERED') {
                              targetStatus = 'MASTERED';
                              targetHomework = false;
                            } else if (activeBrush === 'THEORY') {
                              targetStatus = 'THEORY_DONE';
                              targetHomework = false;
                            }

                            triggerDirectSave(assigned.lehrwerkId, num, targetStatus, targetHomework);
                          }
                        }}
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          border: `2px solid ${isPageActive ? solidActiveBg : borderColor}`,
                          background: isPageActive ? solidActiveBg : bg,
                          color: isPageActive ? 'white' : textColor,
                          fontWeight: 900,
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s',
                          boxShadow: isPageActive ? '0 4px 10px rgba(0,0,0,0.15)' : 'none',
                          transform: isPageActive ? 'scale(1.1)' : 'none'
                        }}
                      >
                        {num}
                          color: isPageActive ? 'white' : textColor,
                          fontWeight: 900,
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s',
                          boxShadow: isPageActive ? '0 4px 10px rgba(0,0,0,0.15)' : 'none',
                          transform: isPageActive ? 'scale(1.1)' : 'none'
                          transform: isPageActive ? 'scale(1.1)' : 'none'
                        }}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {hasChanges && (
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1.5px solid #10b981',
          borderRadius: '24px',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 10px 30px rgba(16, 185, 129, 0.15), 0 4px 10px rgba(0, 0, 0, 0.05)',
          zIndex: 5000,
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }} className="pulse-glow-emerald">
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="pulse-dot" style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', display: 'inline-block' }} />
            Ungespeicherte Änderungen
          </span>
          <button
            type="button"
            onClick={async (e) => {
              e.preventDefault();
              await handleSave(e as any);
            }}
            disabled={saving}
            style={{
              background: '#10b981',
              color: 'white',
              border: 'none',
              padding: '6px 16px',
              borderRadius: '16px',
              fontSize: '0.74rem',
                e.preventDefault();
                await handleSave(e as any);
              }}
              disabled={saving}
              style={{
                background: btnBg,
                color: btnColor,
                border: btnBorder,
                padding: '6px 16px',
                borderRadius: '16px',
                fontSize: '0.74rem',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: btnShadow,
                transition: 'all 0.2s',
              }}
              className="hover-scale"
            >
              {saving ? 'Wird gespeichert...' : 'Jetzt speichern'}
            </button>
          </div>
        );
      })()}
          >
            {saving ? 'Wird gespeichert...' : 'Jetzt speichern'}
          </button>
        </div>
      )}
      </div>
      </div>
    </div>
  );
};


                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Apple-style Backdrop Blur Overlay for All Pages Grid */}
      {showAllPagesGrid && activeLehrwerkId && (() => {
        const assigned = assignedLehrwerke.find(a => a.lehrwerkId === activeLehrwerkId);
        if (!assigned) return null;
        const book = globalLehrwerke.find(g => g.id === activeLehrwerkId) || { title: 'Lehrwerk', emoji: '📚', totalPages: 50 };
        const pages = Array.from({ length: book.totalPages || 50 }, (_, i) => i + 1);

        return (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            animation: 'fadeIn 0.25s ease'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '32px',
              width: '100%',
              maxWidth: '640px',
              maxHeight: '90%',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
              overflow: 'hidden',



































































































                        }}
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          border: `2px solid ${isPageActive ? solidActiveBg : borderColor}`,
                          background: isPageActive ? solidActiveBg : bg,
                          color: isPageActive ? 'white' : textColor,
                          fontWeight: 900,
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s',
                          boxShadow: isPageActive ? '0 4px 10px rgba(0,0,0,0.15)' : 'none',
                          transform: isPageActive ? 'scale(1.1)' : 'none'
                        }}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {isDirty && (
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1.5px solid #10b981',
          borderRadius: '24px',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 10px 30px rgba(16, 185, 129, 0.15), 0 4px 10px rgba(0, 0, 0, 0.05)',
          zIndex: 5000,
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }} className="pulse-glow-emerald">
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="pulse-dot" style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', display: 'inline-block' }} />
            Ungespeicherte Änderungen
          </span>
          <button
            type="submit"
            form="meisterwerk-form"
            style={{
              background: '#10b981',
              color: 'white',
              border: 'none',
              padding: '6px 16px',
              borderRadius: '16px',
              fontSize: '0.74rem',
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
              transition: 'all 0.2s',
            }}
            className="hover-scale"
          >
            Jetzt speichern
          </button>
        </div>
      )}
      </div>
      </div>
    </div>
  );
};





                            } else if (activeBrush === 'THEORY') {
                              targetStatus = 'THEORY_DONE';
                              targetHomework = false;
                            }

                            triggerDirectSave(assigned.lehrwerkId, num, targetStatus, targetHomework);
                          }
                        }}
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          border: `2px solid ${isPageActive ? solidActiveBg : borderColor}`,
                          background: isPageActive ? solidActiveBg : bg,
                          color: isPageActive ? 'white' : textColor,
                          fontWeight: 900,
                          fontSize: '0.95rem',
                              targetStatus = 'MASTERED';
                              targetHomework = false;
                            } else if (activeBrush === 'THEORY') {
                              targetStatus = 'THEORY_DONE';
                              targetHomework = false;
                            }

                            triggerDirectSave(assigned.lehrwerkId, num, targetStatus, targetHomework);
                          }
                        }}
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          border: `2px solid ${isPageActive ? solidActiveBg : borderColor}`,
                          background: isPageActive ? solidActiveBg : bg,
                          color: isPageActive ? 'white' : textColor,
                          fontWeight: 900,
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s',
                          boxShadow: isPageActive ? '0 4px 10px rgba(0,0,0,0.15)' : 'none',
                          transform: isPageActive ? 'scale(1.1)' : 'none'
                        }}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
              </div>
        );
      })()}
      {isDirty && (
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1.5px solid #10b981',
          borderRadius: '24px',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 10px 30px rgba(16, 185, 129, 0.15), 0 4px 10px rgba(0, 0, 0, 0.05)',
          zIndex: 5000,
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }} className="pulse-glow-emerald">
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="pulse-dot" style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', display: 'inline-block' }} />
            Ungespeicherte Änderungen
          </span>
          <button
            type="submit"
            form="meisterwerk-form"
            style={{
              background: '#10b981',
              color: 'white',
              border: 'none',
              padding: '6px 16px',
              borderRadius: '16px',
              fontSize: '0.74rem',
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
              transition: 'all 0.2s',
            }}
            className="hover-scale"
          >
            Jetzt speichern
          </button>
        </div>
      )}
      </div>
      </div>
    </div>
  );
};



