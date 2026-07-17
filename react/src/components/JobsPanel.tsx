import React from 'react';
import { useGameStore } from '../store/gameStore';
import { getAvailableJobsForStage, getJobLevelLabel, calculateWeeklyPay } from '../engine/jobs';
import { meetsJobRequirements } from '../engine/skills';
import { formatCurrency } from '../engine/finance';
import { Job } from '../engine/types';

export function JobsPanel() {
  const state = useGameStore();
  const applyForJob = useGameStore((s) => s.applyForJob);
  const availableJobs = getAvailableJobsForStage(state);

  return (
    <div>
      <h2 style={{ marginBottom: '4px' }}>Jobs</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
        {state.currentJob
          ? `Currently working as: ${state.currentJob.title}`
          : 'You need a job! Apply below to start earning.'}
      </p>

      {state.currentJob && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            <span className="card-title">Current Job</span>
            <span className="card-badge" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--accent-green)' }}>
              Active
            </span>
          </div>
          <CurrentJobDetail job={state.currentJob} />
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
            <JobCard key={job.id} job={job} onApply={applyForJob} state={state} />
          ))}
          {availableJobs.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
              No new positions available right now. Keep building skills!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function CurrentJobDetail({ job }: { job: Job }) {
  const pay = calculateWeeklyPay(job);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
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
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Level</div>
        <div style={{ fontSize: '18px', fontWeight: 700 }}>{getJobLevelLabel(job.level)}</div>
      </div>
    </div>
  );
}

function JobCard({ job, onApply, state }: { job: Job; onApply: (job: Job) => void; state: any }) {
  const { eligible, reasons } = meetsJobRequirements(job, state);
  const pay = calculateWeeklyPay(job);

  return (
    <div className={`job-card ${!eligible ? 'locked' : ''}`}>
      <div className="job-info">
        <h4>{job.title}</h4>
        <p>{job.description}</p>
        <div className="job-meta">
          <span className="job-tag">{getJobLevelLabel(job.level)}</span>
          {job.carNeeded && <span className="job-tag">🚗 Car Required</span>}
          {job.educationCost > 0 && <span className="job-tag">📚 ${job.educationCost} training</span>}
          <span className="job-tag">{job.hoursPerWeek}h/week</span>
        </div>
        {!eligible && (
          <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--accent-red)' }}>
            {reasons.join(' • ')}
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
          disabled={!eligible}
        >
          Apply
        </button>
      </div>
    </div>
  );
}
