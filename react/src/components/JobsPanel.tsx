import React from 'react';
import { useGameStore } from '../store/gameStore';
import { getAvailableJobsForStage, getJobLevelLabel, calculateWeeklyPay } from '../engine/jobs';
import { meetsJobRequirements, getSkillLabel } from '../engine/skills';
import { formatCurrency } from '../engine/finance';
import { Job, Hobby, SkillType } from '../engine/types';
import hobbiesData from '../data/hobbies.json';

export function JobsPanel() {
  const state = useGameStore();
  const applyForJob = useGameStore((s) => s.applyForJob);
  const availableJobs = getAvailableJobsForStage(state);

  const allCurrentJobs: Job[] = [];
  if (state.currentJob) allCurrentJobs.push(state.currentJob);
  if (state.secondaryJobs) allCurrentJobs.push(...state.secondaryJobs);

  const totalHours = allCurrentJobs.reduce((sum, j) => sum + j.hoursPerWeek, 0);

  return (
    <div>
      <h2 style={{ marginBottom: '4px' }}>Jobs</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
        {allCurrentJobs.length > 0
          ? `Working ${totalHours}h/week across ${allCurrentJobs.length} position${allCurrentJobs.length > 1 ? 's' : ''}`
          : 'You need a job! Apply below to start earning.'}
        {state.exhaustion > 0 && (
          <span style={{ color: 'var(--accent-orange)', marginLeft: '8px' }}>
            ⚠️ Exhaustion: {Math.round(state.exhaustion)}%
          </span>
        )}
      </p>

      {/* Benefits status */}
      {allCurrentJobs.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '12px', background: state.hasHealthInsurance ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: state.hasHealthInsurance ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {state.hasHealthInsurance ? '✓' : '✗'} Health Insurance
          </span>
          <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '12px', background: state.has401kAccess ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)', color: state.has401kAccess ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
            {state.has401kAccess ? '✓' : '—'} 401(k)
          </span>
        </div>
      )}

      {/* Current Positions */}
      {allCurrentJobs.length > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            <span className="card-title">
              {allCurrentJobs.length === 1 ? 'Current Position' : 'Current Positions'}
            </span>
            <span className="card-badge" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--accent-green)' }}>
              {totalHours}h/week
            </span>
          </div>
          {allCurrentJobs.map((job) => {
            const noticeWeek = state.jobNotices?.[job.id];
            const hasNotice = !!noticeWeek;
            const weeksRemaining = hasNotice ? noticeWeek - state.currentWeek : 0;

            return (
            <div key={job.id} style={{ marginBottom: allCurrentJobs.length > 1 ? '12px' : 0, paddingBottom: allCurrentJobs.length > 1 ? '12px' : 0, borderBottom: allCurrentJobs.length > 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <strong>{job.title}</strong>
                  <span className="job-tag" style={{ marginLeft: '8px' }}>
                    {job.payType === 'salary' ? '💼 Salary' : '⏰ Hourly'}
                  </span>
                  {hasNotice && (
                    <span className="job-tag" style={{ marginLeft: '6px', background: 'rgba(245,158,11,0.1)', color: 'var(--accent-orange)' }}>
                      Notice given — {weeksRemaining > 0 ? `${weeksRemaining} week${weeksRemaining > 1 ? 's' : ''} left` : 'Last week'}
                    </span>
                  )}
                </div>
                {!hasNotice && (
                  <button className="btn btn-outline" style={{ fontSize: '11px', padding: '4px 8px', color: 'var(--accent-orange)', borderColor: 'var(--accent-orange)' }} onClick={() => useGameStore.getState().quitJob(job.id)}>
                    Give Notice
                  </button>
                )}
              </div>
              <CurrentJobDetail job={job} />
            </div>
            );
          })}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">Available Positions</span>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {availableJobs.length} openings
          </span>
        </div>
        <div className="job-list">
          {availableJobs.map((job) => (
            <JobCard key={job.id} job={job} onApply={applyForJob} state={state} totalHours={totalHours} />
          ))}
          {availableJobs.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
              No new positions available right now. Keep building skills!
            </p>
          )}
        </div>
      </div>

      {/* Hobbies */}
      <HobbiesSection />
    </div>
  );
}

function CurrentJobDetail({ job }: { job: Job }) {
  const pay = calculateWeeklyPay(job);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
      <div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Weekly Pay</div>
        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-green)' }}>
          {formatCurrency(pay.base)}
          {pay.maxWithTips > pay.base && <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}> + tips</span>}
        </div>
      </div>
      <div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Hours/Week</div>
        <div style={{ fontSize: '18px', fontWeight: 700 }}>{job.hoursPerWeek}</div>
      </div>
      <div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Pay Type</div>
        <div style={{ fontSize: '16px', fontWeight: 700 }}>{job.payType === 'salary' ? '💼 Salary' : '⏰ Hourly'}</div>
      </div>
      <div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Level</div>
        <div style={{ fontSize: '18px', fontWeight: 700 }}>{getJobLevelLabel(job.level)}</div>
      </div>
    </div>
  );
}

function JobCard({ job, onApply, state, totalHours }: { job: Job; onApply: (job: Job) => void; state: any; totalHours: number }) {
  const { eligible, reasons } = meetsJobRequirements(job, state);
  const pay = calculateWeeklyPay(job);
  const wouldExceedHours = job.payType === 'hourly' && (totalHours + job.hoursPerWeek) > 90;

  return (
    <div className={`job-card ${!eligible ? 'locked' : ''}`}>
      <div className="job-info">
        <h4>{job.title}</h4>
        <p>{job.description}</p>
        <div className="job-meta">
          <span className="job-tag">{getJobLevelLabel(job.level)}</span>
          <span className="job-tag">{job.payType === 'salary' ? '💼 Salary' : '⏰ Hourly'}</span>
          {job.promotesFrom && <span className="job-tag" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--accent-green)' }}>⬆ Promotion</span>}
          {job.carNeeded && <span className="job-tag">🚗 Car Required</span>}
          {job.educationCost > 0 && <span className="job-tag">📚 ${job.educationCost} training</span>}
          <span className="job-tag">{job.hoursPerWeek}h/week</span>
        </div>
        {!eligible && (
          <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--accent-red)' }}>
            {reasons.join(' • ')}
          </div>
        )}
        {eligible && wouldExceedHours && (
          <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--accent-orange)' }}>
            Would exceed 90h/week limit ({totalHours + job.hoursPerWeek}h total)
          </div>
        )}
      </div>
      <div className="job-pay">
        <div className="wage">{formatCurrency(pay.base)}</div>
        <div className="period">/week</div>
        {job.maxTips > 0 && (
          <div style={{ fontSize: '11px', color: 'var(--accent-green)' }}>+ tips</div>
        )}
        <button
          className="btn btn-primary"
          style={{ marginTop: '8px' }}
          onClick={() => onApply(job)}
          disabled={!eligible || wouldExceedHours}
        >
          Apply
        </button>
      </div>
    </div>
  );
}

function HobbiesSection() {
  const state = useGameStore();
  const startHobby = useGameStore((s) => s.startHobby);
  const stopHobby = useGameStore((s) => s.stopHobby);
  const allHobbies = hobbiesData as Hobby[];
  const activeIds = state.activeHobbies.map(h => h.id);
  const totalHobbyCost = state.activeHobbies.reduce((sum, h) => sum + h.weeklyCost, 0);

  return (
    <div className="card" style={{ marginTop: '20px' }}>
      <div className="card-header">
        <span className="card-title">Hobbies & Activities</span>
        {totalHobbyCost > 0 && (
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Cost: {formatCurrency(totalHobbyCost)}/week
          </span>
        )}
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
        Hobbies cost money but build skills that help you land better jobs. Active hobbies are charged weekly.
      </p>

      {/* Active Hobbies */}
      {state.activeHobbies.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            Active ({state.activeHobbies.length})
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {state.activeHobbies.map((hobby) => (
              <div key={hobby.id} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 12px', background: 'rgba(16,185,129,0.05)',
                border: '1px solid var(--accent-green)', borderRadius: '8px',
              }}>
                <span>{hobby.icon}</span>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{hobby.name}</span>
                {hobby.weeklyCost > 0 && <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>${hobby.weeklyCost}/wk</span>}
                <button
                  onClick={() => stopHobby(hobby.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: 'var(--accent-red)', padding: '0 4px' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Hobbies */}
      <div className="job-list">
        {allHobbies.filter(h => !activeIds.includes(h.id)).map((hobby) => (
          <div key={hobby.id} className="job-card">
            <div className="job-info">
              <h4>{hobby.icon} {hobby.name}</h4>
              <p>{hobby.description}</p>
              <div className="job-meta">
                <span className="job-tag">{hobby.weeklyCost > 0 ? `$${hobby.weeklyCost}/week` : 'Free'}</span>
                {Object.entries(hobby.skillsGained).map(([skill, val]) => (
                  <span key={skill} className="job-tag" style={{ background: 'rgba(139,92,246,0.08)', color: 'var(--accent-purple)' }}>
                    +{val} {getSkillLabel(skill as SkillType)}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <button className="btn btn-primary" onClick={() => startHobby(hobby.id)}>
                Start
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
