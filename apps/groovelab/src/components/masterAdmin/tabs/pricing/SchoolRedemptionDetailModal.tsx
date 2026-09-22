import React, { useState } from 'react';
import type { School } from '../../MasterAdminTypes';

interface SchoolRedemptionDetailModalProps {
  selectedOfferForSchools: any;
  schools: School[];
  onClose: () => void;
  onAssignSchool: (offerId: string, schoolId: string) => void;
  onRemoveSchool: (offerId: string, schoolId: string) => void;
}

export const SchoolRedemptionDetailModal: React.FC<SchoolRedemptionDetailModalProps> = ({
  selectedOfferForSchools,
  schools,
  onClose,
  onAssignSchool,
  onRemoveSchool
}) => {
  const [schoolToAssign, setSchoolToAssign] = useState('');

  if (!selectedOfferForSchools) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      padding: '20px'
    }}>
      <div role="dialog" aria-modal="true" style={{
        background: '#ffffff',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '580px',
        padding: '28px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
              👥 Zugeordnete Mandanten
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.80rem', color: '#64748b' }}>
              Aktion: <strong>{selectedOfferForSchools.name}</strong> ({selectedOfferForSchools.discount_percent}% Rabatt)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
          >
            ✕
          </button>
        </div>

        {/* Manual Assign Row */}
        <div style={{ display: 'flex', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <select
            value={schoolToAssign}
            onChange={(e) => setSchoolToAssign(e.target.value)}
            style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700 }}
          >
            <option value="">-- Musikschule manuell zuweisen --</option>
            {schools
              .filter(s => !(selectedOfferForSchools.redeemed_school_ids || []).includes(s.id))
              .map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.city || 'Standard'})</option>
              ))}
          </select>
          <button
            type="button"
            onClick={() => {
              if (schoolToAssign) {
                onAssignSchool(selectedOfferForSchools.id, schoolToAssign);
                setSchoolToAssign('');
              }
            }}
            disabled={!schoolToAssign}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              background: schoolToAssign ? '#059669' : '#cbd5e1',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.80rem',
              fontWeight: 800,
              cursor: schoolToAssign ? 'pointer' : 'not-allowed'
            }}
          >
            Zuweisen
          </button>
        </div>

        {/* Redeemed Schools List */}
        <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(selectedOfferForSchools.redeemed_school_ids || []).length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.84rem', border: '1px dashed #cbd5e1', borderRadius: '12px' }}>
              Bisher wurde diese Aktion noch von keiner Musikschule eingelöst.
            </div>
          ) : (
            (selectedOfferForSchools.redeemed_school_ids || []).map((sId: string) => {
              const schoolObj = schools.find(s => s.id === sId);
              const schoolName = schoolObj?.name || `Schule ID #${sId.substring(0, 8)}`;
              const schoolCity = schoolObj?.city || 'Deutschland';

              return (
                <div
                  key={sId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#f8fafc',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#0f172a' }}>
                      {schoolName}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      Standort: {schoolCity} • Vorteil: {selectedOfferForSchools.discount_percent}% aktiv
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveSchool(selectedOfferForSchools.id, sId)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: 'none',
                      color: '#dc2626',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Entfernen
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '10px 20px', borderRadius: '10px', background: '#0f172a', color: '#ffffff', border: 'none', fontSize: '0.84rem', fontWeight: 800, cursor: 'pointer' }}
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
