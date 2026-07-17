import React from 'react';
import { useGameStore } from '../store/gameStore';
import { formatCurrency } from '../engine/finance';
import { HOUSING_COSTS, VEHICLE_COSTS, THRESHOLDS } from '../engine/constants';

export function HousingPanel() {
  const state = useGameStore();
  const moveToApartment = useGameStore((s) => s.moveToApartment);
  const buyCar = useGameStore((s) => s.buyCar);
  const totalCash = state.checking.balance + state.savings.balance;

  const canAffordApartment = totalCash >= HOUSING_COSTS.apartment.securityDeposit + HOUSING_COSTS.apartment.rent;
  const canAffordCar = totalCash >= VEHICLE_COSTS.cheapCarPrice + VEHICLE_COSTS.license;
  const meetsThresholdForApartment = totalCash >= THRESHOLDS.INDEPENDENCE;
  const meetsThresholdForCar = totalCash >= THRESHOLDS.MOBILITY;

  return (
    <div>
      <h2 style={{ marginBottom: '4px' }}>Housing & Transport</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
        Manage your living situation and transportation.
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
             state.housing.type === 'apartment' ? 'Apartment' : 'House'}
          </span>
        </div>
        {state.housing.type === 'parents_basement' && (
          <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
            <p style={{ fontSize: '14px' }}>🏠 Living with parents — no rent!</p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Save up ${THRESHOLDS.INDEPENDENCE.toLocaleString()} to move out on your own.
            </p>
          </div>
        )}
        {state.housing.type === 'apartment' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Monthly Rent</div>
              <div style={{ fontSize: '18px', fontWeight: 700 }}>{formatCurrency(HOUSING_COSTS.apartment.rent)}</div>
            </div>
            <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Monthly Utilities</div>
              <div style={{ fontSize: '18px', fontWeight: 700 }}>{formatCurrency(HOUSING_COSTS.apartment.utilities)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Housing Options */}
      {state.housing.type === 'parents_basement' && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            <span className="card-title">Move Out</span>
          </div>
          <div className="housing-options">
            <div className={`housing-option ${!meetsThresholdForApartment ? 'locked' : ''}`}>
              <h4>🏢 Apartment</h4>
              <div className="cost">{formatCurrency(HOUSING_COSTS.apartment.rent)}/mo</div>
              <div className="details">
                + {formatCurrency(HOUSING_COSTS.apartment.utilities)}/mo utilities<br />
                Security deposit: {formatCurrency(HOUSING_COSTS.apartment.securityDeposit)}<br />
                {!meetsThresholdForApartment && (
                  <span style={{ color: 'var(--accent-red)' }}>
                    Need ${THRESHOLDS.INDEPENDENCE.toLocaleString()} saved
                  </span>
                )}
              </div>
              <button
                className="btn btn-primary"
                style={{ marginTop: '12px', width: '100%' }}
                onClick={moveToApartment}
                disabled={!meetsThresholdForApartment || !canAffordApartment}
              >
                {!meetsThresholdForApartment ? 'Locked' : !canAffordApartment ? 'Can\'t Afford' : 'Move In'}
              </button>
            </div>
            <div className="housing-option locked">
              <h4>🏡 House</h4>
              <div className="cost">{formatCurrency(HOUSING_COSTS.house.homePrice)}</div>
              <div className="details">
                Down payment: {formatCurrency(HOUSING_COSTS.house.homePrice * HOUSING_COSTS.house.downPayment)}<br />
                + mortgage, taxes, insurance<br />
                <span style={{ color: 'var(--accent-red)' }}>Unlocks later</span>
              </div>
              <button className="btn btn-outline" style={{ marginTop: '12px', width: '100%' }} disabled>
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transportation */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Transportation</span>
          <span className="card-badge" style={{
            background: state.vehicle.owned ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)',
            color: state.vehicle.owned ? 'var(--accent-green)' : 'var(--text-secondary)',
          }}>
            {state.vehicle.owned ? '🚗 Car Owner' : '🚌 Public Transit'}
          </span>
        </div>

        {state.vehicle.owned ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Car Value</div>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>{formatCurrency(state.vehicle.value)}</div>
            </div>
            <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Insurance/yr</div>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>{formatCurrency(VEHICLE_COSTS.insurance)}</div>
            </div>
            <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Registration/yr</div>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>{formatCurrency(VEHICLE_COSTS.registration)}</div>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '13px', marginBottom: '16px' }}>
              A car unlocks better-paying jobs that require transportation. Annual costs:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              <div className="paycheck-row">
                <span>Used Car</span>
                <span>{formatCurrency(VEHICLE_COSTS.cheapCarPrice)}</span>
              </div>
              <div className="paycheck-row">
                <span>Driver's License</span>
                <span>{formatCurrency(VEHICLE_COSTS.license)}</span>
              </div>
              <div className="paycheck-row">
                <span>Insurance/year</span>
                <span>{formatCurrency(VEHICLE_COSTS.insurance)}</span>
              </div>
              <div className="paycheck-row">
                <span>Registration/year</span>
                <span>{formatCurrency(VEHICLE_COSTS.registration)}</span>
              </div>
            </div>
            <div className="paycheck-row total">
              <span>Total to Get Started</span>
              <span>{formatCurrency(VEHICLE_COSTS.cheapCarPrice + VEHICLE_COSTS.license)}</span>
            </div>
            <button
              className="btn btn-primary"
              style={{ marginTop: '12px', width: '100%' }}
              onClick={buyCar}
              disabled={!meetsThresholdForCar || !canAffordCar}
            >
              {!meetsThresholdForCar
                ? `Need $${THRESHOLDS.MOBILITY.toLocaleString()} saved to unlock`
                : !canAffordCar
                ? `Need ${formatCurrency(VEHICLE_COSTS.cheapCarPrice + VEHICLE_COSTS.license)}`
                : 'Buy a Car'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
