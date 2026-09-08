import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { getAvailableJobsForStage, getJobLevelLabel, calculateWeeklyPay } from '../engine/jobs';
import { meetsJobRequirements, getSkillLabel } from '../engine/skills';
import { startupExposureReasons, canFoundStartup, canIPO, isStartupScaled, founderWeeklyHours, nextRound, stageLabel, canAttemptRound, nextRoundMinValuation } from '../engine/startup';
import { STARTUP, RETIREMENT, RETIRE_TARGET } from '../engine/constants';
import { formatCurrency, getNetWorth } from '../engine/finance';
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

  // Available jobs split by pay type; salaried starts collapsed, hourly expanded.
  const hourlyJobs = availableJobs.filter((j) => j.payType !== 'salary');
  const salariedJobs = availableJobs.filter((j) => j.payType === 'salary');
  const [hourlyOpen, setHourlyOpen] = useState(true);
  const [salariedOpen, setSalariedOpen] = useState(false);

  const retire = useGameStore((s) => s.retire);
  const netWorth = getNetWorth(state);
  const retireProgress = Math.min(100, Math.round((netWorth / RETIRE_TARGET) * 1000) / 10);
  const canRetire = netWorth >= RETIRE_TARGET && !state.retired;

  return (
    <div>
      {/* Retire goal */}
      <div className="card" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', border: canRetire ? '1px solid var(--accent-green)' : undefined }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600 }}>🏖️ Goal: Retire with {formatCurrency(RETIRE_TARGET)} net worth</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {state.retired ? 'You have retired. 🎉' : `Net worth ${formatCurrency(netWorth)} • ${retireProgress}% to goal`}
          </div>
        </div>
        <button
          className="btn btn-success"
          onClick={retire}
          disabled={!canRetire}
          title={canRetire ? 'Retire and win the game' : `Reach ${formatCurrency(RETIRE_TARGET)} net worth to retire`}
        >
          {state.retired ? 'Retired' : `Retire (${retireProgress}%)`}
        </button>
      </div>

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

      {/* 401(k) contribution config — salaried jobs with a match */}
      <Retirement401kConfig />

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

      {/* Hourly positions */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div
          className="card-header"
          style={{ cursor: 'pointer' }}
          onClick={() => setHourlyOpen((o) => !o)}
        >
          <span className="card-title">{hourlyOpen ? '▼' : '▶'} Hourly Positions</span>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {hourlyJobs.length} opening{hourlyJobs.length === 1 ? '' : 's'}
          </span>
        </div>
        {hourlyOpen && (
          <div className="job-list">
            {hourlyJobs.map((job) => (
              <JobCard key={job.id} job={job} onApply={applyForJob} state={state} totalHours={totalHours} />
            ))}
            {hourlyJobs.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                No hourly openings right now. Keep building skills!
              </p>
            )}
          </div>
        )}
      </div>

      {/* Salaried positions (collapsed by default) */}
      <div className="card">
        <div
          className="card-header"
          style={{ cursor: 'pointer' }}
          onClick={() => setSalariedOpen((o) => !o)}
        >
          <span className="card-title">{salariedOpen ? '▼' : '▶'} Salaried Positions</span>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {salariedJobs.length} opening{salariedJobs.length === 1 ? '' : 's'}
          </span>
        </div>
        {salariedOpen && (
          <div className="job-list">
            {salariedJobs.map((job) => (
              <JobCard key={job.id} job={job} onApply={applyForJob} state={state} totalHours={totalHours} />
            ))}
            {salariedJobs.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                No salaried openings yet. Build skills and experience to unlock career roles.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Startup / Founder path */}
      <StartupSection />

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
          {(job.family === 'csuite' || job.family === 'ceo') && <span className="job-tag" style={{ background: 'rgba(139,92,246,0.12)', color: 'var(--accent-purple)' }}>👔 C-Suite</span>}
          {(job.family === 'finance' || job.family === 'cfo') && <span className="job-tag" style={{ background: 'rgba(20,184,166,0.12)', color: '#14b8a6' }}>📊 Finance</span>}
          {job.promotesFrom && <span className="job-tag" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--accent-green)' }}>⬆ Promotion</span>}
          {job.carNeeded && <span className="job-tag">🚗 Car Required</span>}
          {job.educationCost > 0 && <span className="job-tag">📚 ${job.educationCost} training</span>}
          {job.annualSalary && <span className="job-tag">{formatCurrency(job.annualSalary)}/yr</span>}
          {job.annualBonusMaxPct && <span className="job-tag" style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--accent-orange)' }}>+ up to {Math.round(job.annualBonusMaxPct * 100)}% bonus</span>}
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
  const [open, setOpen] = useState(true);

  return (
    <div className="card" style={{ marginTop: '20px' }}>
      <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => setOpen((o) => !o)}>
        <span className="card-title">{open ? '▼' : '▶'} Hobbies & Activities</span>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {state.activeHobbies.length > 0 && `${state.activeHobbies.length} active`}
          {totalHobbyCost > 0 && ` • ${formatCurrency(totalHobbyCost)}/week`}
        </span>
      </div>

      {!open ? null : (
      <>
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
      </>
      )}
    </div>
  );
}

function StartupSection() {
  const state = useGameStore();
  const foundStartup = useGameStore((s) => s.foundStartup);
  const raiseFundingRound = useGameStore((s) => s.raiseFundingRound);
  const setFounderRole = useGameStore((s) => s.setFounderRole);
  const takeStartupPublic = useGameStore((s) => s.takeStartupPublic);
  const exitStartup = useGameStore((s) => s.exitStartup);
  const [name, setName] = useState('');
  const [idea, setIdea] = useState('');
  const [open, setOpen] = useState(true);

  const startup = state.startup;
  const reasons = startupExposureReasons(state);
  const exposed = reasons.length > 0 || !!startup;

  // Don't show the section at all until the founder path is unlocked
  if (!exposed) return null;

  // ── No startup yet: show the founding option ──
  if (!startup) {
    return (
      <div className="card" style={{ marginTop: '20px', border: '1px solid var(--accent-purple)' }}>
        <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => setOpen((o) => !o)}>
          <span className="card-title">{open ? '▼' : '▶'} 🚀 Found a Startup</span>
        </div>
        {!open ? null : (<>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
          You've unlocked the founder path. Starting a company is risky — only about a third survive each
          funding round — but a successful exit or IPO can be life-changing. Self-fund the seed round with{' '}
          {formatCurrency(15000)}.
        </p>
        <div style={{ fontSize: '11px', color: 'var(--accent-purple)', marginBottom: '12px' }}>
          Unlocked via: {reasons.join('; ')}
        </div>
        <input
          type="text"
          placeholder="Startup name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '6px', marginBottom: '8px' }}
        />
        <textarea
          placeholder="Describe your startup idea in a few sentences — what does it do, and who is it for?"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          rows={3}
          style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '6px', marginBottom: '4px', resize: 'vertical', fontFamily: 'inherit', fontSize: '13px' }}
        />
        <div style={{ fontSize: '11px', color: idea.trim().length < 40 ? 'var(--accent-orange)' : 'var(--text-secondary)', marginBottom: '10px' }}>
          {idea.trim().length < 40 ? `Tell investors a bit more (${idea.trim().length}/40 characters).` : 'Sounds like a plan!'}
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { if (name.trim() && idea.trim().length >= 40) foundStartup(name.trim(), idea.trim()); }}
          disabled={!name.trim() || idea.trim().length < 40 || !canFoundStartup(state)}
        >
          Found ({formatCurrency(15000)})
        </button>
        </>)}
      </div>
    );
  }

  // ── Failed startup ──
  if (startup.failed) {
    return (
      <div className="card" style={{ marginTop: '20px', border: '1px solid var(--accent-red)' }}>
        <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => setOpen((o) => !o)}>
          <span className="card-title">{open ? '▼' : '▶'} 💥 {startup.name} — Failed</span>
        </div>
        {!open ? null : (<>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Your startup didn't make it. It happens to most founders. Wind it down and move on — the
          experience still counts.
        </p>
        <button className="btn btn-outline" onClick={exitStartup}>Wind Down</button>
        </>)}
      </div>
    );
  }

  // ── Active startup dashboard ──
  const next = nextRound(startup.stage);
  const scaled = isStartupScaled(startup);
  const founderHours = founderWeeklyHours(startup);
  const equityValue = Math.round(startup.valuation * startup.founderEquityPct);
  const netFlow = startup.weeklyRevenue - startup.weeklyCosts;
  const runwayWeeks = netFlow < 0 ? Math.max(0, Math.floor(startup.treasury / -netFlow)) : null;
  const nextMinVal = nextRoundMinValuation(startup.stage);
  const roundReady = canAttemptRound(startup, state.currentWeek);
  const lockedOut = state.currentWeek < (startup.fundingLockoutUntilWeek || 0);
  const lockoutWeeksLeft = lockedOut ? startup.fundingLockoutUntilWeek - state.currentWeek : 0;
  const surcharged = state.currentWeek < (startup.costSurchargeUntilWeek || 0);

  return (
    <div className="card" style={{ marginTop: '20px', border: '1px solid var(--accent-purple)' }}>
      <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => setOpen((o) => !o)}>
        <span className="card-title">{open ? '▼' : '▶'} 🚀 {startup.name}</span>
        <span className="card-badge" style={{ background: 'rgba(139,92,246,0.12)', color: 'var(--accent-purple)' }}>
          {stageLabel(startup.stage)}
        </span>
      </div>

      {!open ? null : (<>
      {startup.stage === 'stealth' && (
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
          You're building quietly in stealth. Grow the company's value, then raise a Series A to go public-facing.
        </p>
      )}

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', marginBottom: '12px' }}>
        <Metric label="Your Equity" value={`${Math.round(startup.founderEquityPct * 100)}%`} />
        <Metric label="Stake Value" value={formatCurrency(equityValue)} />
        <Metric label="Valuation" value={formatCurrency(startup.valuation)} />
        <Metric label="Treasury" value={formatCurrency(startup.treasury)} />
        <Metric label="Revenue/wk" value={formatCurrency(startup.weeklyRevenue)} />
        <Metric label="Costs/wk" value={`${formatCurrency(startup.weeklyCosts)}${surcharged ? ' +5%' : ''}`} />
        <Metric label="Employees" value={String(startup.employees)} />
        <Metric label="Your Time" value={`${founderHours}h/wk`} />
      </div>

      {/* Runway / burn warning */}
      {runwayWeeks !== null && (
        <p style={{ fontSize: '12px', color: runwayWeeks < 26 ? 'var(--accent-red)' : 'var(--accent-orange)', marginBottom: '10px' }}>
          ⚠️ Burning {formatCurrency(-netFlow)}/week — about {runwayWeeks} week(s) of runway left. Raise capital or grow revenue before the treasury runs dry.
        </p>
      )}
      {startup.weeklyFounderPay > 0 && (
        <p style={{ fontSize: '12px', color: 'var(--accent-green)', marginBottom: '10px' }}>
          Drawing {formatCurrency(startup.weeklyFounderPay)}/week in founder pay.
        </p>
      )}

      {/* Role toggle (once scaled) */}
      {scaled && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Founder role — leading is {STARTUP.leadHoursPerWeek}h/week; staying on the board is {STARTUP.boardHoursPerWeek}h/week (you hire a CEO).
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`btn ${startup.founderRole === 'lead' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFounderRole('lead')}
            >
              Lead as CEO ({STARTUP.leadHoursPerWeek}h)
            </button>
            <button
              className={`btn ${startup.founderRole === 'board' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFounderRole('board')}
            >
              Stay on Board ({STARTUP.boardHoursPerWeek}h)
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {next && !startup.public && (
          <button className="btn btn-primary" onClick={raiseFundingRound} disabled={!roundReady}>
            Raise {next.replace('series_', 'Series ').toUpperCase()} ({Math.round(STARTUP.successChance * 100)}% success)
          </button>
        )}
        {canIPO(startup) && !startup.public && (
          <button className="btn btn-success" onClick={takeStartupPublic}>
            📈 Go Public (IPO)
          </button>
        )}
        <button className="btn btn-outline" onClick={exitStartup}>
          Sell My Stake ({formatCurrency(equityValue)})
        </button>
      </div>

      {/* Round-gating hints */}
      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '10px' }}>
        {startup.public
          ? 'Your company is public. Its value now rides the market.'
          : lockedOut
            ? `A recent failed raise means investors won't revisit for ${lockoutWeeksLeft} more week(s). Costs are +5% for now.`
            : next && nextMinVal !== null && !roundReady
              ? `Reach a ${formatCurrency(nextMinVal)} valuation to raise your ${next.replace('series_', 'Series ').toUpperCase()} (currently ${formatCurrency(startup.valuation)}).`
              : canIPO(startup)
                ? `You can take the company public at its current ${formatCurrency(startup.valuation)} valuation.`
                : `The company fails only if its treasury runs out. Rounds are chance-based — a failed attempt raises costs 5% for 3 months and locks out new raises for 2 months.`}
      </p>
      </>)}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '8px 10px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{label}</div>
      <div style={{ fontSize: '15px', fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function Retirement401kConfig() {
  const state = useGameStore();
  const set401kContribution = useGameStore((s) => s.set401kContribution);
  const [pct, setPct] = useState(state.contribution401kPercent ?? 6);

  // Only relevant when the player currently holds a salaried job (these offer a match)
  const hasSalaried = [state.currentJob, ...state.secondaryJobs]
    .filter(Boolean)
    .some((j) => (j as Job).payType === 'salary');
  if (!hasSalaried) return null;

  const matchCapPct = Math.round(RETIREMENT.employerMatchMax * 100);
  const maxPct = Math.round(RETIREMENT.maxEmployeeContributionPercent * 100);
  const currentPct = state.contribution401kPercent ?? 0;
  const effectiveMatch = Math.min(pct, matchCapPct);
  const dirty = pct !== currentPct;
  const missingFullMatch = pct < matchCapPct;

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <div className="card-header">
        <span className="card-title">401(k) Contribution</span>
        <span className="card-badge" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--accent-green)' }}>
          {currentPct}% pre-tax
        </span>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
        Choose how much of each paycheck to contribute pre-tax (up to {maxPct}%). Your employer matches your
        contribution dollar-for-dollar up to {matchCapPct}% — so contribute at least {matchCapPct}% to get the
        full match. Contributions lower your taxable income and grow for retirement.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
        <input
          type="range"
          min={0}
          max={maxPct}
          step={1}
          value={pct}
          onChange={(e) => setPct(Number(e.target.value))}
          style={{ flex: 1 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input
            type="number"
            min={0}
            max={maxPct}
            value={pct}
            onChange={(e) => setPct(Math.max(0, Math.min(maxPct, Number(e.target.value) || 0)))}
            style={{ width: '56px', padding: '6px', border: '1px solid var(--border)', borderRadius: '6px', textAlign: 'right' }}
          />
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>%</span>
        </div>
      </div>

      <div style={{ fontSize: '12px', color: missingFullMatch ? 'var(--accent-orange)' : 'var(--text-secondary)', marginBottom: '12px' }}>
        Employer match at this rate: <strong style={{ color: 'var(--accent-green)' }}>{effectiveMatch}%</strong>
        {missingFullMatch && ` — raise to ${matchCapPct}% to claim the full match (free money).`}
      </div>

      <button
        className="btn btn-primary"
        onClick={() => set401kContribution(pct)}
        disabled={!dirty}
      >
        {dirty ? `Set to ${pct}%` : 'Saved'}
      </button>
    </div>
  );
}
