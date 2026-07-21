import React from 'react';
import { useGameStore } from '../store/gameStore';

export function SettingsPanel() {
  const settings = useGameStore((s) => s.settings);
  const updateSettings = useGameStore((s) => s.updateSettings);

  return (
    <div>
      <h2 style={{ marginBottom: '4px' }}>Settings</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
        Configure game automation and preferences.
      </p>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <span className="card-title">Automation</span>
        </div>

        <div className="settings-list">
          <ToggleSetting
            label="Automated Bill Pay"
            description="Automatically pay rent, utilities, auto insurance, and other recurring bills each period. When off, you must manually pay bills or face late fees and credit score penalties."
            value={settings.autoBillPay}
            onChange={(v) => updateSettings({ autoBillPay: v })}
          />

          <ToggleSetting
            label="Automated Tax Filing"
            description="Automatically file your tax return at the end of each year. When off, you must manually file from the Taxes panel — but you can review and optimize your deductions before submitting."
            value={settings.autoTaxFiling}
            onChange={(v) => updateSettings({ autoTaxFiling: v })}
          />

          <ToggleSetting
            label="Auto-pay Credit Cards"
            description="Automatically pay your full credit card balance from checking on each statement date. Avoids interest charges but requires sufficient checking balance. When off, you must pay manually from Utilities & Expenses or the Credit panel."
            value={settings.autoCreditCardPay}
            onChange={(v) => updateSettings({ autoCreditCardPay: v })}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Game Info</span>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          <p style={{ marginBottom: '8px' }}>
            <strong>Automated Bill Pay</strong> — When enabled, recurring expenses (rent, utilities,
            car insurance, registration) are deducted automatically from your checking account.
            When disabled, you'll receive bill notifications and must pay them manually. Missing
            payments will hurt your credit score and may result in late fees.
          </p>
          <p>
            <strong>Automated Tax Filing</strong> — When enabled, your tax return is filed automatically
            at the end of each game year. When disabled, you control when to file, allowing you to
            review capital gains, deductions, and retirement contribution effects before submitting.
          </p>
          <p style={{ marginTop: '8px' }}>
            <strong>Auto-pay Credit Cards</strong> — When enabled, your full credit card balance is
            paid from checking on each statement date (every 4 weeks). This avoids interest charges
            entirely but requires sufficient funds in checking. When disabled, you control payments manually.
          </p>
        </div>
      </div>
    </div>
  );
}

function ToggleSetting({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="setting-row">
      <div className="setting-info">
        <div className="setting-label">{label}</div>
        <div className="setting-desc">{description}</div>
      </div>
      <label className="toggle-switch">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="toggle-slider" />
      </label>
    </div>
  );
}
