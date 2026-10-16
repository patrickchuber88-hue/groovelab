import React from 'react';
import { Building2, ChevronRight, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import type { School, SchoolStat } from '../MasterAdminTypes';
import { MasterPricingRates, isSchoolBypassActive } from '../../../domain/pricingEngine';
import { isSchoolTrialActive } from '../../../domain/schoolMetricsAggregator';
import { computeSchoolBillingMetrics } from '../utils/computeSchoolBillingMetrics';

interface MasterTenantRadarProps {
  schools: School[];
  schoolStats: Record<string, SchoolStat>;
  masterPricing: MasterPricingRates;
  onSelectSchool: (school: School) => void;
  onNavigateSchools: () => void;
}

export const MasterTenantRadar: React.FC<MasterTenantRadarProps> = ({
  schools,
  schoolStats,
  masterPricing,
  onSelectSchool,
  onNavigateSchools
}) => {
  const validSchools = schools.filter(s => s.status !== 'archived');

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '24px',
      padding: '24px',
      border: '1px solid rgba(15, 23, 42, 0.08)',
      boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.03)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: '16px'
    }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={18} color="#0f172a" /> Mandanten- &amp; Testphasen-Radar
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.76rem', color: '#64748b' }}>
              Echter Mandantenstatus, aktive Didaktik-Module und verbleibende Testlaufzeiten
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateSchools}
            style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              color: '#0284c7',
              background: '#f0f9ff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>Alle {validSchools.length} Schulen</span>
            <ChevronRight size={13} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {validSchools.slice(0, 5).map((school) => {
            const stats = schoolStats[school.id] || {};
            const metrics = computeSchoolBillingMetrics(school, stats, masterPricing);
            const isTrial = isSchoolTrialActive(school);
            const isBypass = isSchoolBypassActive(school);

            const trialRemainingDays = school.trial_ends_at
              ? Math.max(0, Math.ceil((new Date(school.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
              : null;

            const isTrialExpiringSoon = isTrial && trialRemainingDays !== null && trialRemainingDays <= 14;

            return (
              <div
                key={school.id}
                onClick={() => onSelectSchool(school)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: isTrialExpiringSoon ? '#fffbeb' : '#f8fafc',
                  border: isTrialExpiringSoon ? '1px solid #fde68a' : '1px solid #f1f5f9',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: school.primary_color || '#0f172a',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '0.75rem',
                    flexShrink: 0
                  }}>
                    {school.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {school.name}
                      </span>
                      {school.city && (
                        <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                          ({school.city})
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      {school.has_campus_subscription && (
                        <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#047857', background: '#ecfdf5', padding: '1px 5px', borderRadius: '4px' }}>
                          Campus
                        </span>
                      )}
                      {school.has_groovelab_subscription && (
                        <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#b45309', background: '#fef3c7', padding: '1px 5px', borderRadius: '4px' }}>
                          GrooveLab
                        </span>
                      )}
                      <span style={{ fontSize: '0.64rem', color: '#94a3b8' }}>
                        • {(stats.students ?? school.active_students_count ?? 0)} Schüler
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {isBypass ? (
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284c7', background: '#e0f2fe', padding: '3px 8px', borderRadius: '6px' }}>
                      Kulanz / Bypass
                    </span>
                  ) : isTrial ? (
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: isTrialExpiringSoon ? '#b45309' : '#475569',
                      background: isTrialExpiringSoon ? '#fef3c7' : '#e2e8f0',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Clock size={11} />
                      {trialRemainingDays !== null ? `Test: Noch ${trialRemainingDays} Tage` : 'Testphase'}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
                      {metrics.totalMonthlyNet.toFixed(2).replace('.', ',')} € / Mo
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '0.72rem', color: '#64748b' }}>
        <span>
          Mandanten: <strong>{schools.filter(s => !isSchoolTrialActive(s) && !isSchoolBypassActive(s) && s.status !== 'archived').length} Vollzahler</strong> • <strong>{schools.filter(s => isSchoolTrialActive(s)).length} Testphase</strong>
        </span>
        <span style={{ color: '#059669', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <CheckCircle2 size={13} color="#059669" /> 100% DB-Echtdaten
        </span>
      </div>
    </div>
  );
};
