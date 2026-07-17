import React from 'react';
import { useGameStore } from '../store/gameStore';
import { getSkillLabel, getSkillLevel } from '../engine/skills';
import { getJobLevelLabel } from '../engine/jobs';
import { DegreeType, SkillType } from '../engine/types';

interface Props {
  onClose: () => void;
}

export function ResumeModal({ onClose }: Props) {
  const state = useGameStore();

  const topSkills = Object.entries(state.skills.skills)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  // Build work history from jobHistory and current job
  const workHistory = [...state.jobHistory];
  if (state.currentJob) {
    workHistory.push({ job: state.currentJob, startWeek: state.currentWeek, endWeek: 0 });
  }
  workHistory.reverse(); // most recent first

  const getWeekDate = (week: number): string => {
    const startYear = 2025;
    const year = startYear + Math.floor(week / 52);
    const weekInYear = week % 52;
    const month = Math.floor(weekInYear / 4.33);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[Math.min(month, 11)]} ${year}`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        <div className="modal-header">
          <h3>Resume</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid var(--border)' }}>
          <h2 style={{ fontSize: '22px', marginBottom: '4px' }}>{state.playerName}</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Age {state.age} • Cents City
          </p>
        </div>

        {/* Education */}
        <div className="modal-section">
          <h4>Education</h4>
          <div style={{ padding: '8px 0' }}>
            <div style={{ fontWeight: 600 }}>{getDegreeLabel(state.education.highestDegree)}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Cents City High School</div>
          </div>
        </div>

        {/* Certifications */}
        {state.education.certificates.length > 0 && (
          <div className="modal-section">
            <h4>Certifications & Training</h4>
            {state.education.certificates.map((cert, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '13px' }}>{cert.name}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{getWeekDate(cert.weekEarned)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Work Experience */}
        <div className="modal-section">
          <h4>Work Experience</h4>
          {workHistory.length === 0 && (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No work experience yet.</p>
          )}
          {workHistory.map((entry, i) => (
            <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, fontSize: '14px' }}>{entry.job.title}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {getWeekDate(entry.startWeek)} — {entry.endWeek === 0 ? 'Present' : getWeekDate(entry.endWeek)}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {getJobLevelLabel(entry.job.level)} • {entry.job.hoursPerWeek}h/week • ${entry.job.perHourWage}/hr
              </div>
            </div>
          ))}
        </div>

        {/* Skills */}
        {topSkills.length > 0 && (
          <div className="modal-section">
            <h4>Skills</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {topSkills.map(([skill, value]) => (
                <div key={skill} style={{
                  padding: '4px 12px', borderRadius: '12px', fontSize: '12px',
                  background: value >= 60 ? 'rgba(16,185,129,0.1)' : value >= 30 ? 'rgba(59,130,246,0.1)' : 'rgba(107,114,128,0.1)',
                  color: value >= 60 ? 'var(--accent-green)' : value >= 30 ? 'var(--accent-blue)' : 'var(--text-secondary)',
                }}>
                  {getSkillLabel(skill as SkillType)} — {getSkillLevel(value)}
                </div>
              ))}
            </div>
          </div>
        )}

        <button className="btn btn-outline" style={{ width: '100%', marginTop: '12px' }} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

function getDegreeLabel(degree: DegreeType): string {
  const labels: Record<DegreeType, string> = {
    high_school: 'High School Diploma',
    associates: "Associate's Degree",
    bachelors: "Bachelor's Degree",
    masters: "Master's Degree",
  };
  return labels[degree];
}
