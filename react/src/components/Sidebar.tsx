import React from 'react';
import { useGameStore } from '../store/gameStore';
import { getSkillLabel } from '../engine/skills';
import { SkillType, DegreeType } from '../engine/types';

function sidebarDegreeLabel(degree: DegreeType): string {
  const labels: Record<DegreeType, string> = {
    high_school: 'High School',
    trade_school: 'Trade School',
    associates: "Associate's",
    bachelors: "Bachelor's",
    mba: 'MBA',
  };
  return labels[degree];
}

type Panel = 'dashboard' | 'jobs' | 'education' | 'banking' | 'credit' | 'housing' | 'utilities' | 'taxes' | 'investing' | 'settings';

interface NavItem {
  id: Panel;
  icon: string;
  label: string;
  unlocksAtStage: number;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard', unlocksAtStage: 1 },
  { id: 'jobs', icon: '💼', label: 'Jobs', unlocksAtStage: 1 },
  { id: 'education', icon: '🎓', label: 'Education', unlocksAtStage: 1 },
  { id: 'banking', icon: '🏦', label: 'Banking', unlocksAtStage: 1 },
  { id: 'credit', icon: '💳', label: 'Credit', unlocksAtStage: 3 },
  { id: 'housing', icon: '🏠', label: 'Housing & Transport', unlocksAtStage: 2 },
  { id: 'utilities', icon: '💡', label: 'Utilities & Expenses', unlocksAtStage: 2 },
  { id: 'taxes', icon: '📋', label: 'Taxes', unlocksAtStage: 1 },
  { id: 'investing', icon: '📈', label: 'Investing', unlocksAtStage: 6 },
  { id: 'settings', icon: '⚙️', label: 'Settings', unlocksAtStage: 1 },
];

const STAGE_ORDER = [
  'GETTING_STARTED', 'INDEPENDENCE', 'CREDIT_BUILDING',
  'MOBILITY', 'CAREER_GROWTH', 'INVESTING', 'LIFE_MILESTONES',
];

export function Sidebar() {
  const { activePanel, setActivePanel, stage, skills, currentWeek, age, creditScore, education, sidebarCollapsed } = useGameStore();
  const currentStageNum = STAGE_ORDER.indexOf(stage) + 1;

  const getGameDate = (): string => {
    const startDate = new Date(2025, 0, 6);
    const gameDate = new Date(startDate.getTime() + currentWeek * 7 * 24 * 60 * 60 * 1000);
    return gameDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getShortDate = (): string => {
    const startDate = new Date(2025, 0, 6);
    const gameDate = new Date(startDate.getTime() + currentWeek * 7 * 24 * 60 * 60 * 1000);
    return `${gameDate.getMonth() + 1}/${gameDate.getFullYear()}`;
  };

  const topSkills = Object.entries(skills.skills)
    .filter(([k, v]) => v > 0 && k !== 'happiness')
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  const happiness = skills.skills.happiness ?? 0;
  const happinessColor = happiness >= 60 ? '#10b981' : happiness >= 25 ? '#f59e0b' : '#ef4444';

  const skillColors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6', '#ef4444', '#6366f1'];

  // ─── Minimized (narrow) view ────────────────────────────────────────
  if (sidebarCollapsed) {
    return (
      <div className="sidebar sidebar-minimized">
        {/* Expand button */}
        <button
          className="sidebar-expand-btn"
          onClick={() => useGameStore.setState({ sidebarCollapsed: false })}
          aria-label="Expand sidebar"
        >
          ›
        </button>

        {/* CC logo */}
        <div className="sidebar-mini-logo">
          <span style={{ color: 'var(--accent-green)', fontWeight: 800 }}>C</span>
          <span style={{ color: 'white', fontWeight: 800 }}>C</span>
        </div>

        {/* Date & Age */}
        <div className="sidebar-mini-info">
          <div>{getShortDate()}</div>
          <div>Age {age}</div>
        </div>

        {/* Nav icons only */}
        {NAV_ITEMS.map((item) => {
          const locked = currentStageNum < item.unlocksAtStage;
          return (
            <div
              key={item.id}
              className={`nav-item-mini ${activePanel === item.id ? 'active' : ''} ${locked ? 'locked' : ''}`}
              onClick={() => !locked && setActivePanel(item.id)}
              title={item.label}
            >
              {item.icon}
            </div>
          );
        })}
      </div>
    );
  }

  // ─── Full (expanded) view ───────────────────────────────────────────
  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1><span>Cents</span> City</h1>
          <button
            className="sidebar-collapse-btn"
            onClick={() => useGameStore.setState({ sidebarCollapsed: true })}
            aria-label="Minimize sidebar"
          >
            ‹
          </button>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-sidebar-dim)', marginTop: '4px' }}>
          📅 {getGameDate()} • Age {age}
        </div>
      </div>

      {NAV_ITEMS.map((item) => {
        const locked = currentStageNum < item.unlocksAtStage;
        return (
          <div
            key={item.id}
            className={`nav-item ${activePanel === item.id ? 'active' : ''} ${locked ? 'locked' : ''}`}
            onClick={() => !locked && setActivePanel(item.id)}
          >
            <span className="icon">{item.icon}</span>
            <span>{item.label}</span>
            {locked && <span className="lock-icon">🔒</span>}
          </div>
        );
      })}

      <div className="sidebar-skills">
        {creditScore && (
          <div style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ marginBottom: '6px' }}>Credit Score</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '22px', fontWeight: 800, color: creditScore.score >= 740 ? '#10b981' : creditScore.score >= 670 ? '#3b82f6' : creditScore.score >= 580 ? '#f59e0b' : '#ef4444' }}>
                {creditScore.score}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-sidebar-dim)' }}>
                {creditScore.score >= 740 ? 'Excellent' : creditScore.score >= 670 ? 'Good' : creditScore.score >= 580 ? 'Fair' : 'Poor'}
              </span>
            </div>
          </div>
        )}

        {/* Education */}
        <div style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ marginBottom: '6px' }}>Education</h3>
          <div style={{ fontSize: '14px', fontWeight: 700 }}>{sidebarDegreeLabel(education.highestDegree)}</div>
          {education.enrollment && (
            <div style={{ fontSize: '10px', color: 'var(--accent-blue)', marginTop: '2px' }}>
              Enrolled: {Math.round((education.enrollment.creditsCompleted / education.enrollment.creditsRequired) * 100)}% complete
            </div>
          )}
        </div>

        <h3>Skills</h3>

        {/* Happiness — always shown */}
        <div className="skill-bar" style={{ marginBottom: '10px' }}>
          <div className="skill-bar-label">
            <span>😊 Happiness</span>
            <span>{Math.round(happiness)}%</span>
          </div>
          <div className="skill-bar-track">
            <div
              className="skill-bar-fill"
              style={{ width: `${happiness}%`, background: happinessColor }}
            />
          </div>
          {happiness < 25 && (
            <div style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px' }}>
              Burnout — endurance &amp; communication dropping
            </div>
          )}
        </div>

        {topSkills.length === 0 && (
          <p style={{ color: 'var(--text-sidebar-dim)', fontSize: '12px' }}>
            Get a job to start building skills!
          </p>
        )}
        {topSkills.map(([skill, value], i) => (
          <div className="skill-bar" key={skill}>
            <div className="skill-bar-label">
              <span>{getSkillLabel(skill as SkillType)}</span>
              <span>{Math.round(value)}%</span>
            </div>
            <div className="skill-bar-track">
              <div
                className="skill-bar-fill"
                style={{ width: `${value}%`, background: skillColors[i % skillColors.length] }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
