import React from 'react';
import { useGameStore } from '../store/gameStore';
import { formatCurrency } from '../engine/finance';
import { HOUSING_COSTS, VEHICLE_COSTS, THRESHOLDS } from '../engine/constants';
import { VehicleOption } from '../engine/types';
import vehiclesData from '../data/vehicles.json';

export function HousingPanel() {
  const state = useGameStore();
  const moveToApartment = useGameStore((s) => s.moveToApartment);
  const moveToNiceApartment = useGameStore((s) => s.moveToNiceApartment);
  const buyHouse = useGameStore((s) => s.buyHouse);
  const acquireVehicle = useGameStore((s) => s.acquireVehicle);
  const sellVehicle = useGameStore((s) => s.sellVehicle);
  const tradeInVehicle = useGameStore((s) => s.tradeInVehicle);
  const totalCash = state.checking.balance + state.savings.balance;

  const canAffordApartment = totalCash >= HOUSING_COSTS.apartment.securityDeposit + HOUSING_COSTS.apartment.rent;
  const meetsThresholdForApartment = totalCash >= THRESHOLDS.INDEPENDENCE;

  const vehicles = vehiclesData as VehicleOption[];
  const hasVehicle = state.vehicle.owned || state.vehicle.leased || state.vehicle.transitPass;

  // Calculate trade-in value
  const getTradeInValue = (): number => {
    if (!state.vehicle.owned) return 0;
    const weeksHeld = state.currentWeek - state.vehicle.purchaseWeek;
    const yearsHeld = weeksHeld / 52;
    const depRate = Math.min(0.8, yearsHeld * 0.15);
    return Math.round(state.vehicle.value * (1 - depRate));
  };

  const tradeInValue = getTradeInValue();

  return (
    <div>
      <h2 style={{ marginBottom: '4px' }}>Housing & Transportation</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
        Manage where you live and how you get around.
      </p>

      {/* Current Housing */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <span className="card-title">Current Residence</span>
          <span className="card-badge" style={{
            background: state.housing.type === 'parents_basement' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
            color: state.housing.type === 'parents_basement' ? 'var(--accent-orange)' : 'var(--accent-green)',
          }}>
            {state.housing.type === 'parents_basement' ? "Parent's Basement" :
             state.housing.type === 'apartment' ? 'Apartment' :
             state.housing.type === 'nice_apartment' ? 'Nice Apartment' :
             state.housing.type === 'house' ? 'House' : 'Dream Home'}
          </span>
        </div>
        {state.housing.type === 'parents_basement' && (
          <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
            <p style={{ fontSize: '14px' }}>🏠 Living with parents — no rent!</p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Save ${THRESHOLDS.INDEPENDENCE.toLocaleString()} to move out.
            </p>
          </div>
        )}
        {(state.housing.type === 'apartment' || state.housing.type === 'nice_apartment') && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Monthly Rent</div>
              <div style={{ fontSize: '18px', fontWeight: 700 }}>{formatCurrency(state.housing.rent)}</div>
            </div>
            <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Monthly Utilities</div>
              <div style={{ fontSize: '18px', fontWeight: 700 }}>{formatCurrency(state.housing.utilities)}</div>
            </div>
          </div>
        )}
        {(state.housing.type === 'house' || state.housing.type === 'nice_house') && state.housing.mortgage && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Mortgage</div>
              <div style={{ fontSize: '18px', fontWeight: 700 }}>{formatCurrency(state.housing.mortgage.monthlyPayment)}/mo</div>
            </div>
            <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Remaining</div>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>{formatCurrency(state.housing.mortgage.remainingBalance)}</div>
            </div>
            <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Utilities</div>
              <div style={{ fontSize: '18px', fontWeight: 700 }}>{formatCurrency(state.housing.utilities)}/mo</div>
            </div>
          </div>
        )}
      </div>

      {/* Housing Upgrade Options */}
      {state.housing.type !== 'nice_house' && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            <span className="card-title">{state.housing.type === 'parents_basement' ? 'Move Out' : 'Upgrade Housing'}</span>
          </div>
          <div className="housing-options">
            {/* Basic Apartment */}
            {(state.housing.type === 'parents_basement') && (
              <div className="housing-option">
                <h4>🏢 Basic Apartment</h4>
                <div className="cost">{formatCurrency(HOUSING_COSTS.apartment.rent)}/mo</div>
                <div className="details">
                  + {formatCurrency(HOUSING_COSTS.apartment.utilities)}/mo utilities<br />
                  Deposit: {formatCurrency(HOUSING_COSTS.apartment.securityDeposit)}
                </div>
                <button
                  className="btn btn-primary"
                  style={{ marginTop: '12px', width: '100%' }}
                  onClick={moveToApartment}
                  disabled={!meetsThresholdForApartment || !canAffordApartment}
                >
                  {!meetsThresholdForApartment ? `Need $${THRESHOLDS.INDEPENDENCE.toLocaleString()} saved` : !canAffordApartment ? "Can't Afford" : 'Move In'}
                </button>
              </div>
            )}

            {/* Nice Apartment */}
            {(state.housing.type === 'parents_basement' || state.housing.type === 'apartment') && (
              <div className="housing-option">
                <h4>🏢 Nice Apartment</h4>
                <div className="cost">{formatCurrency(HOUSING_COSTS.niceApartment.rent)}/mo</div>
                <div className="details">
                  + {formatCurrency(HOUSING_COSTS.niceApartment.utilities)}/mo utilities<br />
                  Deposit: {formatCurrency(HOUSING_COSTS.niceApartment.securityDeposit)}<br />
                  Modern finishes, in-unit laundry, gym
                </div>
                <button
                  className="btn btn-primary"
                  style={{ marginTop: '12px', width: '100%' }}
                  onClick={moveToNiceApartment}
                  disabled={totalCash < HOUSING_COSTS.niceApartment.securityDeposit}
                >
                  {totalCash < HOUSING_COSTS.niceApartment.securityDeposit ? `Need ${formatCurrency(HOUSING_COSTS.niceApartment.securityDeposit)}` : 'Upgrade'}
                </button>
              </div>
            )}

            {/* Starter House */}
            {(state.housing.type === 'apartment' || state.housing.type === 'nice_apartment') && (
              <div className="housing-option">
                <h4>🏡 Starter Home</h4>
                <div className="cost">{formatCurrency(HOUSING_COSTS.house.homePrice)}</div>
                <div className="details">
                  Down payment: {formatCurrency(Math.round(HOUSING_COSTS.house.homePrice * HOUSING_COSTS.house.downPayment))}<br />
                  ~{formatCurrency(calculateMortgagePayment(HOUSING_COSTS.house))}/mo mortgage<br />
                  Requires 620+ credit score
                </div>
                <button
                  className="btn btn-primary"
                  style={{ marginTop: '12px', width: '100%' }}
                  onClick={() => buyHouse('house')}
                  disabled={totalCash < HOUSING_COSTS.house.homePrice * HOUSING_COSTS.house.downPayment || (state.creditScore?.score || 0) < 620}
                >
                  {(state.creditScore?.score || 0) < 620 ? 'Need 620 credit score' : totalCash < HOUSING_COSTS.house.homePrice * HOUSING_COSTS.house.downPayment ? `Need ${formatCurrency(Math.round(HOUSING_COSTS.house.homePrice * HOUSING_COSTS.house.downPayment))} down` : 'Buy Home'}
                </button>
              </div>
            )}

            {/* Nice House */}
            {(state.housing.type === 'house' || state.housing.type === 'nice_apartment') && (
              <div className="housing-option">
                <h4>🏠 Dream Home</h4>
                <div className="cost">{formatCurrency(HOUSING_COSTS.niceHouse.homePrice)}</div>
                <div className="details">
                  Down payment: {formatCurrency(Math.round(HOUSING_COSTS.niceHouse.homePrice * HOUSING_COSTS.niceHouse.downPayment))}<br />
                  ~{formatCurrency(calculateMortgagePayment(HOUSING_COSTS.niceHouse))}/mo mortgage<br />
                  4BR, 2-car garage, great neighborhood
                </div>
                <button
                  className="btn btn-primary"
                  style={{ marginTop: '12px', width: '100%' }}
                  onClick={() => buyHouse('nice_house')}
                  disabled={totalCash < HOUSING_COSTS.niceHouse.homePrice * HOUSING_COSTS.niceHouse.downPayment || (state.creditScore?.score || 0) < 620}
                >
                  {(state.creditScore?.score || 0) < 620 ? 'Need 620 credit score' : totalCash < HOUSING_COSTS.niceHouse.homePrice * HOUSING_COSTS.niceHouse.downPayment ? `Need ${formatCurrency(Math.round(HOUSING_COSTS.niceHouse.homePrice * HOUSING_COSTS.niceHouse.downPayment))} down` : 'Buy Home'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Current Vehicle */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <span className="card-title">Transportation</span>
          <span className="card-badge" style={{
            background: hasVehicle ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)',
            color: hasVehicle ? 'var(--accent-green)' : 'var(--text-secondary)',
          }}>
            {state.vehicle.owned ? '🚗 Owner' : state.vehicle.leased ? '📋 Leased' : state.vehicle.transitPass ? '🚌 Transit' : '🚶 Walking'}
          </span>
        </div>

        {hasVehicle ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Vehicle</div>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>{state.vehicle.name}</div>
              </div>
              {state.vehicle.owned && (
                <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Current Value</div>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{formatCurrency(tradeInValue)}</div>
                </div>
              )}
              {state.vehicle.monthlyPayment > 0 && (
                <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Monthly Payment</div>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{formatCurrency(state.vehicle.monthlyPayment)}</div>
                </div>
              )}
              <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Insurance/yr</div>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>{formatCurrency(state.vehicle.insuranceCostPerYear)}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-danger" onClick={sellVehicle}>
                {state.vehicle.owned ? `Sell (${formatCurrency(tradeInValue)})` : state.vehicle.leased ? 'End Lease' : 'Cancel Pass'}
              </button>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            No vehicle. A car or transit pass unlocks better job opportunities.
            {!state.vehicle.hasLicense && ` Driver's license costs ${formatCurrency(VEHICLE_COSTS.license)}.`}
          </p>
        )}
      </div>

      {/* Vehicle Options */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">{hasVehicle ? 'Upgrade / Change Vehicle' : 'Get a Vehicle'}</span>
        </div>

        {/* Transit */}
        <h4 style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '12px 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          🚌 Public Transit
        </h4>
        <VehicleGrid
          vehicles={vehicles.filter(v => v.type === 'transit')}
          state={state}
          tradeInValue={tradeInValue}
          onAcquire={acquireVehicle}
          onTradeIn={tradeInVehicle}
          hasVehicle={hasVehicle}
        />

        {/* Buy */}
        <h4 style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '16px 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          🚗 Buy (You Own It)
        </h4>
        <VehicleGrid
          vehicles={vehicles.filter(v => v.type === 'buy')}
          state={state}
          tradeInValue={tradeInValue}
          onAcquire={acquireVehicle}
          onTradeIn={tradeInVehicle}
          hasVehicle={hasVehicle}
        />

        {/* Lease */}
        <h4 style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '16px 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          📋 Lease (Fixed Monthly, No Ownership)
        </h4>
        <VehicleGrid
          vehicles={vehicles.filter(v => v.type === 'lease')}
          state={state}
          tradeInValue={tradeInValue}
          onAcquire={acquireVehicle}
          onTradeIn={tradeInVehicle}
          hasVehicle={hasVehicle}
        />
      </div>
    </div>
  );
}

function calculateMortgagePayment(config: { homePrice: number; downPayment: number; mortgageRate: number; mortgageTermYears: number }): number {
  const loanAmount = config.homePrice - Math.round(config.homePrice * config.downPayment);
  const monthlyRate = config.mortgageRate / 12;
  const numPayments = config.mortgageTermYears * 12;
  return Math.round((loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1));
}

function VehicleGrid({ vehicles, state, tradeInValue, onAcquire, onTradeIn, hasVehicle }: {
  vehicles: VehicleOption[];
  state: any;
  tradeInValue: number;
  onAcquire: (id: string) => void;
  onTradeIn: (id: string) => void;
  hasVehicle: boolean;
}) {
  const totalCash = state.checking.balance + state.savings.balance;
  const licenseCost = !state.vehicle.hasLicense ? VEHICLE_COSTS.license : 0;

  return (
    <div className="job-list">
      {vehicles.map((v) => {
        const isCurrent = state.vehicle.vehicleId === v.id;
        const upfront = v.price + licenseCost;
        const canAfford = totalCash >= upfront;
        const canTradeIn = hasVehicle && state.vehicle.owned && totalCash >= Math.max(0, v.price - tradeInValue);

        return (
          <div key={v.id} className={`job-card ${isCurrent ? 'current' : ''}`}>
            <div className="job-info">
              <h4>{v.name}</h4>
              <p>{v.description}</p>
              <div className="job-meta">
                {v.price > 0 && <span className="job-tag">Upfront: {formatCurrency(v.price)}</span>}
                {v.monthlyPayment > 0 && <span className="job-tag">{formatCurrency(v.monthlyPayment)}/mo</span>}
                {v.insurance > 0 && <span className="job-tag">Ins: {formatCurrency(v.insurance)}/yr</span>}
                {v.mpg > 0 && <span className="job-tag">{v.mpg} MPG</span>}
                <span className="job-tag">Reliability: {v.reliability}%</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
              {v.price > 0 && (
                <div className="job-pay">
                  <div className="wage">{formatCurrency(v.price)}</div>
                </div>
              )}
              {isCurrent ? (
                <span style={{ fontSize: '12px', color: 'var(--accent-green)', fontWeight: 600 }}>✓ Current</span>
              ) : (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button className="btn btn-primary" onClick={() => onAcquire(v.id)} disabled={!canAfford}>
                    {canAfford ? (v.type === 'lease' ? 'Lease' : v.type === 'transit' ? 'Activate' : 'Buy') : 'Cant Afford'}
                  </button>
                  {hasVehicle && state.vehicle.owned && v.type === 'buy' && (
                    <button className="btn btn-outline" onClick={() => onTradeIn(v.id)} disabled={!canTradeIn}>
                      Trade In
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
