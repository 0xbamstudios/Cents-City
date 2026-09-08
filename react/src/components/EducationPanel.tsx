import React from 'react';
import { useGameStore } from '../store/gameStore';
import { formatCurrency } from '../engine/finance';
import { EDUCATION } from '../engine/constants';
import { DegreeType } from '../engine/types';

function degreeLabel(d: DegreeType): string {
  const labels: Record<DegreeType, string> = {
    high_school: 'High School Diploma',
    trade_school: 'Trade School Certificate',
    associates: "Associate's Degree",
    bachelors: "Bachelor's Degree",
    mba: 'MBA',
  };
  return labels[d];
}

const PROGRAM_INFO: { id: 'trade_school' | 'college' | 'mba'; icon: string; blurb: string }[] = [
  { id: 'trade_school', icon: '🔧', blurb: 'A focused vocational credential. Boosts Technical and Problem Solving skills.' },
  { id: 'college', icon: '🏛️', blurb: "A four-year Bachelor's degree. Opens the door to most professional careers." },
  { id: 'mba', icon: '📊', blurb: "A graduate business degree. Requires a Bachelor's. Fast-tracks leadership roles and the startup path." },
];

export function EducationPanel() {
  const state = useGameStore();
  const enroll = useGameStore((s) => s.enrollInProgram);
  const drop = useGameStore((s) => s.dropProgram);
  const switchPace = useGameStore((s) => s.switchEnrollmentPace);
  const takeBusinessClass = useGameStore((s) => s.takeBusinessClass);

  const edu = state.education;
  const enrollment = edu.enrollment;
  const hasBenefit = state.currentJob?.payType === 'salary';

  return (
    <div>
      <h2 style={{ marginBottom: '4px' }}>Education</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
        Invest in yourself. Degrees unlock higher-paying careers and new opportunities.
      </p>

      {/* Current status */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <span className="card-title">Your Education</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Highest Credential</div>
            <div style={{ fontSize: '18px', fontWeight: 700 }}>{degreeLabel(edu.highestDegree)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Business Classes</div>
            <div style={{ fontSize: '18px', fontWeight: 700 }}>{edu.businessClassesTaken}</div>
          </div>
        </div>
      </div>

      {/* Active enrollment */}
      {enrollment && (
        <div className="card" style={{ marginBottom: '20px', borderColor: 'var(--accent-blue)' }}>
          <div className="card-header">
            <span className="card-title">Currently Enrolled</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(enrollment.program === 'college' || enrollment.program === 'mba') && (
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    const toFull = enrollment.pace !== 'full_time';
                    if (toFull) {
                      const hasFullTimeJob = [state.currentJob, ...state.secondaryJobs]
                        .filter(Boolean)
                        .some((j: any) => j.payType === 'salary' || j.hoursPerWeek >= 35);
                      if (hasFullTimeJob && !window.confirm('Switching to full-time study means leaving your full-time job(s). Part-time hourly work can continue. Proceed?')) return;
                    }
                    switchPace();
                  }}
                >
                  Switch to {enrollment.pace === 'full_time' ? 'Part-Time' : 'Full-Time'}
                </button>
              )}
              <button className="btn btn-outline" onClick={drop}>Drop Out</button>
            </div>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
            {EDUCATION.programs[enrollment.program].label} — {enrollment.pace === 'full_time' ? 'Full-Time' : 'Part-Time'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            {Math.round(enrollment.creditsCompleted)} / {enrollment.creditsRequired} credits
            {enrollment.creditsPerYearBenefit > 0 && ` • employer covers ${enrollment.creditsPerYearBenefit} credits/yr`}
          </div>
          <div style={{ height: '8px', background: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, (enrollment.creditsCompleted / enrollment.creditsRequired) * 100)}%`,
              background: 'var(--accent-blue)',
            }} />
          </div>
        </div>
      )}

      {/* Programs */}
      {!enrollment && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            <span className="card-title">Enroll in a Program</span>
            {hasBenefit && (
              <span style={{ fontSize: '11px', color: 'var(--accent-green)' }}>
                ✓ Employer covers {EDUCATION.employerCreditsPerYear} credits/yr
              </span>
            )}
          </div>
          <div className="job-list">
            {PROGRAM_INFO.map(({ id, icon, blurb }) => {
              const cfg = EDUCATION.programs[id];
              const totalCost = cfg.credits * cfg.tuitionPerCredit;
              const mbaBlocked = id === 'mba' && edu.highestDegree !== 'bachelors' && edu.highestDegree !== 'mba';
              const hasFullTimeJob = [state.currentJob, ...state.secondaryJobs]
                .filter(Boolean)
                .some((j: any) => j.payType === 'salary' || j.hoursPerWeek >= 35);
              return (
                <div key={id} className="job-card">
                  <div className="job-info">
                    <h4>{icon} {cfg.label}</h4>
                    <p>{blurb}</p>
                    <div className="job-meta">
                      <span className="job-tag">{cfg.credits} credits</span>
                      <span className="job-tag">{formatCurrency(cfg.tuitionPerCredit)}/credit</span>
                      <span className="job-tag">~{formatCurrency(totalCost)} total</span>
                    </div>
                    {mbaBlocked && (
                      <div style={{ fontSize: '11px', color: 'var(--accent-red)', marginTop: '4px' }}>
                        Requires a Bachelor's degree first.
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        if (hasFullTimeJob && !window.confirm('Enrolling full-time means leaving your full-time job(s). Part-time hourly work can continue. Proceed?')) return;
                        enroll(id, 'full_time');
                      }}
                      disabled={mbaBlocked}
                      title={hasFullTimeJob ? 'Full-time study means leaving full-time employment' : ''}
                    >
                      Full-Time
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={() => enroll(id, 'part_time')}
                      disabled={mbaBlocked}
                    >
                      Part-Time
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '10px' }}>
            Full-time finishes faster but means leaving any full-time job (salaried or 35+ hours/week). Part-time takes about twice as long but lets you keep working.
          </p>
        </div>
      )}

      {/* Continuing education */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Continuing Education</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>Business Class</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              A single continuing-ed business course. Builds Financial Acumen and Leadership. ($600)
            </div>
          </div>
          <button className="btn btn-primary" onClick={takeBusinessClass}>Take Class</button>
        </div>
      </div>
    </div>
  );
}
