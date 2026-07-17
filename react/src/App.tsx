import React from 'react';
import { useGameStore } from './store/gameStore';
import { SetupScreen } from './components/SetupScreen';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AdvisorBar } from './components/AdvisorBar';
import { Dashboard } from './components/Dashboard';
import { JobsPanel } from './components/JobsPanel';
import { BankingPanel } from './components/BankingPanel';
import { CreditPanel } from './components/CreditPanel';
import { TaxesPanel } from './components/TaxesPanel';
import { HousingPanel } from './components/HousingPanel';
import { InvestingPanel } from './components/InvestingPanel';
import { Notifications } from './components/Notifications';

export default function App() {
  const { playerName, activePanel } = useGameStore();

  if (!playerName) {
    return <SetupScreen />;
  }

  const renderPanel = () => {
    switch (activePanel) {
      case 'dashboard': return <Dashboard />;
      case 'jobs': return <JobsPanel />;
      case 'banking': return <BankingPanel />;
      case 'credit': return <CreditPanel />;
      case 'taxes': return <TaxesPanel />;
      case 'housing': return <HousingPanel />;
      case 'investing': return <InvestingPanel />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <Header />
      <div className="main-content">
        {renderPanel()}
      </div>
      <AdvisorBar />
      <Notifications />
    </div>
  );
}
