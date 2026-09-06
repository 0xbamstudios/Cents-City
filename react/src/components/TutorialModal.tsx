import React from 'react';
import { useGameStore } from '../store/gameStore';

const STEPS: { icon: string; title: string; blurb: string }[] = [
  { icon: '💼', title: 'Get a job', blurb: 'Head to the Jobs panel and apply for your first position. A paycheck is the foundation of everything else.' },
  { icon: '🎯', title: 'Consider some hobbies', blurb: 'Hobbies build skills and keep your happiness up — burnout hurts your health and how you connect with people.' },
  { icon: '🏠', title: 'Get a place of your own', blurb: 'Move out of the basement. In Housing & Transport you can rent an apartment once you can afford it.' },
  { icon: '💳', title: 'Maybe get a credit card', blurb: 'Used responsibly, a credit card in the Credit panel starts building the score you\'ll need later.' },
  { icon: '🧾', title: 'Make sure you are paying your bills', blurb: 'Check Utilities & Expenses. Missed bills hurt your credit and pile up — stay current.' },
  { icon: '🚗', title: 'Get a car', blurb: 'A car unlocks better-paying jobs. Buy or finance one in Housing & Transport when you\'re ready.' },
  { icon: '📈', title: 'Save for retirement early', blurb: 'Start your 401(k) and IRA as soon as you can. Compounding interest rewards the years you give it.' },
  { icon: '🗂️', title: 'Use your job history to start a career', blurb: 'Time in a role unlocks promotions and higher tracks. Build experience to climb toward senior and executive jobs.' },
  { icon: '🛟', title: 'Have an emergency fund', blurb: 'Life throws surprises — car repairs, a stolen car, medical bills. Keep savings set aside so they don\'t sink you.' },
  { icon: '🎓', title: 'Consider more education', blurb: 'Trade school, college, or an MBA open new careers. The Education panel lets you enroll full or part-time.' },
];

export function TutorialModal() {
  const showTutorial = useGameStore((s) => s.showTutorial);
  const dismissTutorial = useGameStore((s) => s.dismissTutorial);
  const playerName = useGameStore((s) => s.playerName);

  if (!showTutorial || !playerName) return null;

  return (
    <div className="modal-overlay" onClick={dismissTutorial}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
        <div className="modal-header">
          <h3>👋 Welcome to Cents City</h3>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '4px 0 16px' }}>
          Here's a roadmap to get you started. Work through these as you play — you can revisit
          any of them anytime from the sidebar.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '52vh', overflowY: 'auto', paddingRight: '4px' }}>
          {STEPS.map((step, i) => (
            <div
              key={i}
              style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: '8px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-green)', color: 'white', fontWeight: 700, fontSize: '13px' }}>
                {i + 1}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>
                  {step.icon} {step.title}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {step.blurb}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
          <button className="btn btn-primary" onClick={dismissTutorial}>
            OK, I got this
          </button>
        </div>
      </div>
    </div>
  );
}
