# Feedback Report: Groovelab App Frontend Architecture & Performance Optimizations

This report reviews the current implementation of schedule conflict checks, proposes client-side performance optimizations for handling concurrency under load, and outlines security enhancements for user registration.

---

## 1. Review of Schedule Conflict Checks Offloading to RPC

### The Legacy Client-Side Check (`getConflictsMap`)
Originally, the event conflict verification was performed on the client side in a React helper function named `getConflictsMap`. 

#### Computational Complexity:
For an event with $N$ program points and $M$ lessons scheduled on that day:
1. `getConflictsMap` iterated over every program point ($O(N)$).
2. For each program point, it:
   - Checked for collisions with all school lessons scheduled for that day ($O(M)$).
   - Iterated over all other program points to check for multi-stage stage clashes ($O(N)$).
3. The resulting worst-case time complexity was **$O(N \cdot M + N^2)$**. 

#### Overhead & Security Drawbacks:
* **Network Payload**: To calculate conflicts client-side, the frontend had to query and download the *entire* list of lessons scheduled on that day for all teachers involved in the event. This represented a substantial network payload.
* **Security & Privacy Leak**: Exposing all teachers' individual schedules for the entire day to the coordinator client violated user privacy and security guidelines.

---

### The Database RPC Check (`get_schedule_conflicts`)
To resolve these overheads, the conflict detection logic was offloaded to a database-side PostgreSQL stored procedure named `get_schedule_conflicts`.

#### database RPC Mechanism:
* The RPC receives the `p_event_id` and an optional `p_transition_time` parameter.
* It dynamically builds a temporary table `temp_pp_times` that calculates the start and end minutes of each scheduled program point sequentially per stage, taking the transition buffer into account.
* It executes a unified set-based query using a `UNION ALL` combination:
  1. **Lesson Conflicts**: Joins `temp_pp_times` with the `lessons` table on matching `teacher_id` and `date`, checking for overlapping time windows.
  2. **Stage Conflicts**: Performs a self-join on `temp_pp_times` on matching `teacher_id` but differing `stage_number`, checking for overlapping time windows.
* This offloads the computation to PostgreSQL, leveraging indexes on `lessons(teacher_id, date)` and `campus_event_program_points(event_id)`. The client receives only a minimal list of identified conflict rows, saving both bandwidth and CPU.

---

### React Frontend Integration in `CampusEventsBoard.tsx`

#### Invoking the RPC
The React component `CampusEventsBoard` calls the Supabase RPC helper `fetchDbConflicts` to query database-calculated conflicts:

```typescript
const fetchDbConflicts = async (eventId: string) => {
  if (!eventId) return;
  try {
    const { data, error } = await supabase.rpc('get_schedule_conflicts', { 
      p_event_id: eventId, 
      p_transition_time: transitionTime 
    });
    if (error) {
      console.error('Error fetching conflicts:', error);
    } else if (data) {
      setDbConflicts(data);
    }
  } catch (err) {
    console.error('Exception in fetchDbConflicts:', err);
  }
};
```

#### Binding to UI States
A React `useEffect` hook binds conflict fetches to relevant UI and data dependencies:

```typescript
useEffect(() => {
  const activeEv = secretaryPlanningEvent || selectedEvent;
  if (activeEv?.id) {
    fetchDbConflicts(activeEv.id);
  } else {
    setDbConflicts([]);
  }
}, [programPoints, transitionTime, secretaryPlanningEvent?.id, selectedEvent?.id]);
```

1. **Warning Alert Banner**:
   Renders a top-level alert banner on the coordinator board if one or more conflicts are active:
   ```tsx
   {dbConflicts.length > 0 && (
     <div style={{
       background: '#fef2f2',
       border: '1.5px solid rgba(255, 59, 48, 0.15)',
       borderRadius: '12px',
       padding: '12px 16px',
       display: 'flex',
       alignItems: 'center',
       gap: '12px',
       color: '#ff3b30',
       fontSize: '0.82rem',
       fontWeight: 500
     }}>
       <AlertCircle size={18} style={{ color: '#ff3b30', flexShrink: 0 }} />
       <div>
         <strong style={{ fontWeight: 700 }}>Ablaufplan-Konflikte erkannt!</strong> Es gibt {dbConflicts.length} Konflikt(e) im aktuellen Ablaufplan. Bitte überprüfen Sie die Details in der Konflikt-Leiste.
       </div>
     </div>
   )}
   ```

2. **Conflict Sidebar Drawer**:
   Displays the exact list of conflicts with messages explaining their cause:
   ```tsx
   <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
     {dbConflicts.length === 0 ? (
       <div style={{ textAlign: 'center', padding: '40px 16px', fontSize: '0.78rem', color: '#86868b', lineHeight: 1.5 }}>
         Keine Konflikte im Ablaufplan vorhanden. Alles sieht gut aus!
       </div>
     ) : (
       dbConflicts.map((c, idx) => (
         <div key={idx} style={{
           padding: '12px',
           background: 'rgba(255, 59, 48, 0.02)',
           border: '1px solid rgba(255, 59, 48, 0.15)',
           borderRadius: '10px',
           fontSize: '0.76rem',
           color: '#ff3b30',
           display: 'flex',
           flexDirection: 'column',
           gap: '4px'
         }}>
           <div style={{ fontWeight: 700, color: '#ff3b30', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
             {c.conflict_type === 'lesson' ? 'Lehrer-Kollision' : 'Bühnen-Kollision'}
           </div>
           <div style={{ color: '#1f1f1f', fontWeight: 500 }}>{c.conflict_message}</div>
         </div>
       ))
     )}
   </div>
   ```

3. **Visual Timeline Highlights**:
   Highlights specific conflicting acts inside the chronological list:
   ```tsx
   {activeStagePoints.map((pp, idx) => {
     const timeInfo = timeMap[pp.id] || { start: '--:--', end: '--:--' };
     const conflictReason = conflicts[pp.id]; // conflicts populated from dbConflicts
     const hasConflict = !!conflictReason;

     return (
       <div
         key={pp.id}
         style={{
           padding: '14px 18px',
           background: hasConflict ? 'rgba(255, 59, 48, 0.02)' : '#ffffff',
           border: hasConflict ? '1.5px solid rgba(255, 59, 48, 0.15)' : '1px solid rgba(0, 0, 0, 0.06)',
           borderRadius: '14px',
           // ...
         }}
       >
         {/* Render point details and conflict message if hasConflict is true */}
         {hasConflict && (
           <span style={{ color: '#ff3b30', fontSize: '0.7rem', fontWeight: 600 }}>
             {conflictReason}
           </span>
         )}
       </div>
     );
   })}
   ```

---

## 2. Client-Side Concurrency and Load Optimizations

### The Load Problem
During heavy usage simulations (~127req/s with 6,500 active users), frequent database writes from client actions (e.g. checking/unchecking lab planning slots or repeatedly clicking proposal voting buttons) saturate the database connection pool. This triggers `504 Connection Pool Timeout` errors on PgBouncer.

### Solution Strategies
To reduce write transactions and mask latency, we propose three techniques:
1. **Debouncing**: Delays the network request until the user has stopped interacting for a specific period of time (e.g., 500ms).
2. **Request Batching**: Groups multiple consecutive updates into a single network payload.
3. **Optimistic UI Updates**: Updates UI state instantly, rolling back to the original state only if the server transaction ultimately fails.

---

### Implementation Code Examples

#### A. Request Debouncing and Optimistic UI (for `Student_UpdateLabPlanning`)
This hook debounces database writes for lab planning and updates the UI immediately.

```typescript
import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface LabPlanningState {
  userId: string;
  schoolId: string;
  day: string;
  time: string;
}

export function useLabPlanning(initialState: boolean) {
  const [isPlanned, setIsPlanned] = useState<boolean>(initialState);
  const [syncing, setSyncing] = useState<boolean>(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const togglePlanning = useCallback((payload: LabPlanningState) => {
    // 1. Optimistic UI update (Instant feedback to user)
    const nextState = !isPlanned;
    setIsPlanned(nextState);
    setSyncing(true);

    // 2. Clear any pending debounced requests
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // 3. Debounce DB write for 500ms
    debounceTimer.current = setTimeout(async () => {
      try {
        if (nextState) {
          // Insert slot
          const { error } = await supabase
            .from('lab_planning')
            .insert({
              user_id: payload.userId,
              school_id: payload.schoolId,
              day: payload.day,
              time: payload.time
            });
          if (error) throw error;
        } else {
          // Delete slot
          const { error } = await supabase
            .from('lab_planning')
            .delete()
            .eq('user_id', payload.userId)
            .eq('day', payload.day)
            .eq('time', payload.time);
          if (error) throw error;
        }
      } catch (err) {
        console.error('Failed to sync lab planning:', err);
        // 4. Revert UI state on failure (Rollback)
        setIsPlanned(!nextState);
        alert('Änderung konnte nicht gespeichert werden.');
      } finally {
        setSyncing(false);
      }
    }, 500);
  }, [isPlanned]);

  return { isPlanned, togglePlanning, syncing };
}
```

---

#### B. Request Batching (for `Student_VoteOnProposal`)
For band proposal voting, if students vote on multiple proposals in a list, we can buffer votes in a local queue and batch them in a single write operation.

```typescript
import { useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

interface PendingVote {
  proposal_id: string;
  user_id: string;
  vote: 'yes' | 'no';
}

export function useBatchVotes() {
  const [submitting, setSubmitting] = useState(false);
  const voteQueue = useRef<Record<string, PendingVote>>({});
  const flushTimer = useRef<NodeJS.Timeout | null>(null);

  const submitVoteOptimistically = (
    proposalId: string, 
    userId: string, 
    vote: 'yes' | 'no', 
    onSuccessUIUpdate: () => void
  ) => {
    // 1. Instantly update UI locally
    onSuccessUIUpdate();

    // 2. Queue or overwrite pending vote for this proposal
    voteQueue.current[proposalId] = {
      proposal_id: proposalId,
      user_id: userId,
      vote
    };

    // 3. Schedule execution buffer (e.g. flush queue every 2 seconds)
    if (!flushTimer.current) {
      flushTimer.current = setTimeout(() => {
        flushQueue();
      }, 2000);
    }
  };

  const flushQueue = async () => {
    const queueToFlush = Object.values(voteQueue.current);
    if (queueToFlush.length === 0) return;

    // Reset local queue and timer
    voteQueue.current = {};
    flushTimer.current = null;
    setSubmitting(true);

    try {
      // Send a single batch UPSERT to supabase, reducing connection pool operations
      const { error } = await supabase
        .from('band_proposal_votes')
        .upsert(queueToFlush, { onConflict: 'proposal_id,user_id' });

      if (error) throw error;
      console.log(`Successfully batch-synced ${queueToFlush.length} votes.`);
    } catch (err) {
      console.error('Failed to sync batch votes:', err);
      // In production, we would trigger a state reload or rollback notifications here
    } finally {
      setSubmitting(false);
    }
  };

  return { submitVoteOptimistically, submitting };
}
```

---

## 3. Secure Registration Using Cryptographic Tokens

### The Current Header-Based Security Issue
* Current RLS routing uses custom headers: `x-user-id` to identify users, and `x-invite-school-id` / `x-invite-token` to bypass tables constraints during signup.
* These custom headers are parsed from query strings and appended via `supabase.ts`'s client fetch wrapper.
* Since client-side HTTP headers can be easily forged by attackers using command-line HTTP clients (e.g., `curl`), exposing direct database tables inserts using custom headers is highly vulnerable.

### The Cryptographic Token-Based Solution
Instead of direct table inserts using custom HTTP headers, registration should be performed using:
1. **Server-Side Verification**: An API endpoint (e.g., Supabase Edge Function or backend Express router) processes registration.
2. **Cryptographic JWT / Auth Tokens**: Registration details are signed cryptographically using JWTs, containing claims like `role`, `school_id`, and `exp`.
3. **Internal Authentication**: The server uses Service Role credentials to insert users into the `users` table after verifying token integrity, returning standard Supabase Auth tokens.

---

### Refactored Registration Flow: Client-Side Code Example

Below is the client-side implementation utilizing secure token verification instead of custom headers:

```typescript
import { useState } from 'react';

interface RegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  instrument?: string;
}

export function useSecureRegistration() {
  const [loading, setLoading] = useState(false);

  const registerUser = async (inviteToken: string, data: RegistrationData) => {
    setLoading(true);
    try {
      // Call secure endpoint instead of supabase.from('users').insert()
      const response = await fetch('/api/auth/register-via-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Pass cryptographic token in standard auth header
          'Authorization': `Bearer ${inviteToken}`
        },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: data.password,
          instrument: data.instrument
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Registrierung fehlgeschlagen');
      }

      // Secure registration returns authenticated session payload containing JWT
      const { user, session } = result;

      // Initialize session in Supabase Auth client to secure subsequent calls
      // (This populates PostgREST JWT claim, eliminating client-controlled headers)
      const { error: sessionErr } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      });

      if (sessionErr) throw sessionErr;

      return user;
    } catch (err: any) {
      console.error('Registration failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { registerUser, loading };
}
```
