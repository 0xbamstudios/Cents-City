import React from 'react';
import { useGameStore } from '../store/gameStore';
import { getSkillLabel } from '../engine/skills';
import { SkillType } from '../engine/types';

type Panel = 'dashboard' | 'jobs' | 'banking' | 'credit' | 'housing' | 'taxes' | 'investing';

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
  { id: 'housing', icon: '🏠', label: 'Housing', unlocksAtStage: 2 },
  { id: 'taxes', icon: '📋', label: 'Taxes', unlocksAtStage: 1 },
  { id: 'investing', icon: '📈', label: 'Investing', unlocksAtStage: 6 },
];

const STAGE_ORDER = [
  'GETTING_STARTED', 'INDEPENDENCE', 'CREDIT_BUILDING',
  'MOBILITY', 'CAREER_GROWTH', 'INVESTING', 'LIFE_MILESTONES',
];

export function Sidebar() {
  const { activePanel, setActivePanel, stage, skills } = useGameStore();
  const currentStageNum = STAGE_ORDER.indexOf(stage) + 1;

  const topSkills = Object.entries(skills.skills)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  const skillColors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'];

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <h1><span>Cents</span> City</h1>
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
