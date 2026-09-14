import React from 'react';
import {
  AlertCircle,
  X,
  Download,
  CheckCircle
} from 'lucide-react';

export interface AnnouncementItem {
  id: string;
  title: string;
  description?: string;
  message?: string;
  attachment_url?: string;
  questions?: Array<string | { text: string; type?: 'text' | 'boolean' | 'choice'; options?: string[] }>;
  [key: string]: any;
}

interface TeacherAnnouncementReaderModalProps {
  openAnnouncementDetailModal: AnnouncementItem | null;
  setOpenAnnouncementDetailModal: (item: AnnouncementItem | null) => void;
  isMobileDevice: boolean;
  questionnaireAnswers: Record<string, string>;
  setQuestionnaireAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  submittingFeedback: boolean;
  handleSubmitFeedbackResponse: (announcementId: string) => Promise<void>;
  handleMarkRequestAsDone: (announcementId: string) => Promise<void>;
}

export const TeacherAnnouncementReaderModal: React.FC<TeacherAnnouncementReaderModalProps> = ({
  openAnnouncementDetailModal,
  setOpenAnnouncementDetailModal,
  isMobileDevice,
  questionnaireAnswers,
  setQuestionnaireAnswers,
  submittingFeedback,
  handleSubmitFeedbackResponse,
  handleMarkRequestAsDone
}) => {
  if (!openAnnouncementDetailModal) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-reader-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpenAnnouncementDetailModal(null);
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: isMobileDevice ? '16px' : '24px'
      }}
    >
      <div style={{
        background: '#ffffff',
        borderRadius: '28px',
        maxWidth: '580px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(239, 68, 68, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        padding: isMobileDevice ? '22px 18px' : '30px 28px',
        textAlign: 'left',
        animation: 'fadeIn 0.2s ease',
        position: 'relative'
      }}>
        {/* Modal Header & Close Button */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#fef2f2', color: '#ef4444', padding: '10px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={24} strokeWidth={2.4} />
            </div>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 900, background: '#ef4444', color: '#ffffff', padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Wichtige Schulmitteilung
              </span>
              <h3 id="announcement-reader-modal-title" style={{ margin: '4px 0 0 0', fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                {openAnnouncementDetailModal.title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpenAnnouncementDetailModal(null)}
            style={{ border: 'none', background: '#f1f5f9', color: '#64748b', borderRadius: '12px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Mitteilung schließen"
            aria-label="Schließen"
          >
            <X size={18} />
          </button>
        </div>

        {/* Description / Instructions */}
        {(openAnnouncementDetailModal.description || openAnnouncementDetailModal.message) && (
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#334155', lineHeight: '1.55', whiteSpace: 'pre-wrap' }}>
            {openAnnouncementDetailModal.description || openAnnouncementDetailModal.message}
          </div>
        )}

        {/* Attachment */}
        {openAnnouncementDetailModal.attachment_url && (
          <a
            href={openAnnouncementDetailModal.attachment_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#eff6ff',
              color: '#1d4ed8',
              border: '1px solid #bfdbfe',
              padding: '10px 14px',
              borderRadius: '12px',
              fontSize: '0.78rem',
              fontWeight: 750,
              textDecoration: 'none'
            }}
          >
            <Download size={14} /> Anhang öffnen / herunterladen
          </a>
        )}

        {/* If Questionnaire: Render Interactive Questions */}
        {openAnnouncementDetailModal.questions && openAnnouncementDetailModal.questions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              Bitte beantworte folgende Fragen:
            </div>
            {openAnnouncementDetailModal.questions.map((qItem: any, qIdx: number) => {
              const qKey = typeof qItem === 'string' ? qItem : qItem.text;
              const qType = typeof qItem === 'string' ? 'text' : (qItem.type || 'text');
              const qOptions: string[] = typeof qItem === 'object' && qItem.options ? qItem.options : (qType === 'boolean' ? ['Ja', 'Nein'] : []);
              const currentAns = questionnaireAnswers[qKey] || '';

              return (
                <div key={qIdx} style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: '0.80rem', fontWeight: 800, color: '#1e293b' }}>
                    {qIdx + 1}. {qKey}
                  </label>

                  {qType === 'choice' || qType === 'boolean' ? (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {qOptions.map((opt: string) => {
                        const isSelected = currentAns === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setQuestionnaireAnswers(prev => ({ ...prev, [qKey]: opt }))}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '10px',
                              border: isSelected ? '1.5px solid #ea4335' : '1px solid #cbd5e1',
                              background: isSelected ? '#ea4335' : '#ffffff',
                              color: isSelected ? '#ffffff' : '#475569',
                              fontWeight: isSelected ? 850 : 650,
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <textarea
                      value={currentAns}
                      onChange={(e) => setQuestionnaireAnswers(prev => ({ ...prev, [qKey]: e.target.value }))}
                      placeholder="Deine Antwort hier eingeben..."
                      rows={2}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.82rem',
                        outline: 'none',
                        fontFamily: 'inherit',
                        resize: 'vertical'
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Legal Notice § 130 BGB */}
        <div style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic', lineHeight: '1.4', background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          ℹ️ Mit deiner Bestätigung wird der Zugang der Mitteilung nach § 130 BGB für die Schulleitung revisionssicher dokumentiert.
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setOpenAnnouncementDetailModal(null)}
            style={{
              background: '#f1f5f9',
              color: '#475569',
              border: 'none',
              padding: '14px 18px',
              borderRadius: '16px',
              fontSize: '0.85rem',
              fontWeight: 750,
              cursor: 'pointer'
            }}
          >
            Später erinnern
          </button>
          <button
            type="button"
            disabled={submittingFeedback}
            onClick={async () => {
              if (openAnnouncementDetailModal.questions && openAnnouncementDetailModal.questions.length > 0) {
                await handleSubmitFeedbackResponse(openAnnouncementDetailModal.id);
              } else {
                await handleMarkRequestAsDone(openAnnouncementDetailModal.id);
              }
              setOpenAnnouncementDetailModal(null);
            }}
            style={{
              flex: 1,
              background: '#ea4335',
              color: '#ffffff',
              border: 'none',
              padding: '14px',
              borderRadius: '16px',
              fontSize: '0.88rem',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 8px 24px rgba(234, 67, 53, 0.35)',
              transition: 'transform 0.15s ease'
            }}
          >
            <CheckCircle size={18} />
            <span>
              {submittingFeedback 
                ? 'Wird übermittelt...' 
                : (openAnnouncementDetailModal.questions && openAnnouncementDetailModal.questions.length > 0 
                    ? 'Antworten übermitteln & bestätigen' 
                    : '✓ Gelesen & zur Kenntnis genommen')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
