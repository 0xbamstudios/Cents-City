import React from 'react';
import { useGameStore } from '../store/gameStore';
import { getSkillLabel } from '../engine/skills';
import { SkillType } from '../engine/types';

type Panel = 'dashboard' | 'jobs' | 'banking' | 'credit' | 'housing' | 'utilities' | 'taxes' | 'investing' | 'settings';

interface NavItem {
  id: Panel;
  icon: string;
  label: string;
  unlocksAtStage: number;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard', unlocksAtStage: 1 },
  { id: 'jobs', icon: '💼', label: 'Jobs', unlocksAtStage: 1 },
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
  const { activePanel, setActivePanel, stage, skills, currentWeek, age } = useGameStore();
  const currentStageNum = STAGE_ORDER.indexOf(stage) + 1;

  // Compute game date from week number (game starts Jan 6, 2025)
  const getGameDate = (): string => {
    const startDate = new Date(2025, 0, 6); // Jan 6, 2025
    const gameDate = new Date(startDate.getTime() + currentWeek * 7 * 24 * 60 * 60 * 1000);
    return gameDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const topSkills = Object.entries(skills.skills)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  const skillColors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'];

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <h1><span>Cents</span> City</h1>
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
        <h3>Skills</h3>
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
