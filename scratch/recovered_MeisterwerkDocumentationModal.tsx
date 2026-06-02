Created At: 2026-06-01T21:22:34Z
Completed At: 2026-06-01T21:22:34Z

				The command completed successfully.
				Output:
				<truncated 1 lines>
+                    }
+                  });
+                  const pct = Math.min(100, Math.round((masteredPages.length / total) * 100));
+                  if (pct === 100 && masteredPages.length > 0) {
+                    masteredBooksList.push({
+                      title: book.title,
+                      emoji: book.emoji,
+                      pages: masteredPages
+                    });
+                  }
+                }
+              });
+
+              const masteredSongs = activeSongSkills.filter(s => s.is_stage_ready || s.progress_percent === 100);
+
+              const hasMastered = masteredBooksList.length > 0 || masteredSongs.length > 0;
+
+              if (!hasMastered) {
+                return (
+                  <div style={{
+                    padding: '80px 24px',
+                    textAlign: 'center',
+                    border: '2px dashed #cbd5e1',
+                    borderRadius: '24px',
+                    color: '#475569',
+                    fontSize: '0.9rem',
+                    fontWeight: 600,
                     background: 'white',
-                    border: '1px solid #e2e8f0',
-                    borderRadius: '20px',
-                    padding: '16px 20px',
-                    display: 'flex',
-                    flexDirection: 'column',
-                    gap: '6px',
-                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
+                    maxWidth: '600px',
+                    margin: '40px auto 0 auto'
                   }}>
-                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
+                    Noch keine Meisterwerke eingetragen. Auf geht's! 🚀
+                  </div>
+                );
+              }
+
+              return (
+                <div style={{
+                  display: 'grid',
+                  gridT
<truncated 4235 bytes>
>
+              );
+            })()}
+          </div>
+        )
       )}
       
       {/* Apple-style Backdrop Blur Overlay for All Pages Grid */}
@@ -3084,6 +3535,50 @@ export const MeisterwerkDocumentationModal: React.FC<MeisterwerkDocumentationMod
           </div>
         );
       })()}
+      {isDirty && (
+        <div style={{
+          position: 'absolute',
+          bottom: '24px',
+          left: '50%',
+          transform: 'translateX(-50%)',
+          background: 'rgba(255, 255, 255, 0.95)',
+          backdropFilter: 'blur(16px)',
+          WebkitBackdropFilter: 'blur(16px)',
+          border: '1.5px solid #10b981',
+          borderRadius: '24px',
+          padding: '10px 20px',
+          display: 'flex',
+          alignItems: 'center',
+          gap: '16px',
+          boxShadow: '0 10px 30px rgba(16, 185, 129, 0.15), 0 4px 10px rgba(0, 0, 0, 0.05)',
+          zIndex: 5000,
+          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
+        }} className="pulse-glow-emerald">
+          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px' }}>
+            <span className="pulse-dot" style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', display: 'inline-block' }} />
+            Ungespeicherte Änderungen
+          </span>
+          <button
+            type="submit"
+            form="meisterwerk-form"
+            style={{
+              background: '#10b981',
+              color: 'white',
+              border: 'none',
+              padding: '6px 16px',
+              borderRadius: '16px',
+              fontSize: '0.74rem',
+              fontWeight: 900,
+              cursor: 'pointer',
+              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
+              transition: 'all 0.2s',
+            }}
+            className="hover-scale"
+          >
+            Jetzt speichern
+          </button>
+        </div>
+      )}
       </div>
       </div>
     </div>

