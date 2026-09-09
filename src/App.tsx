import React, { useState, useEffect, useRef } from 'react';
import { SimulationEngine } from './simulation/engine';
import { Navigation, PageId } from './components/Navigation';
import { MissionControlPage } from './pages/MissionControlPage';
import { LiveSimulationPage } from './pages/LiveSimulationPage';
import { EnvironmentAnalysisPage } from './pages/EnvironmentAnalysisPage';
import { RiskPredictionPage } from './pages/RiskPredictionPage';
import { PathPlannerPage } from './pages/PathPlannerPage';
import { ScenarioLabPage } from './pages/ScenarioLabPage';
import { AnalyticsBenchmarkPage } from './pages/AnalyticsBenchmarkPage';
import { SystemArchitecturePage } from './pages/SystemArchitecturePage';
import { ScenarioId } from './types/scenario';
import { DrivingMode, VehicleModelType } from './types/vehicle';
import { ActorType } from './types/obstacle';
import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  // Master simulation engine instance kept outside React render loop
  const engineRef = useRef<SimulationEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new SimulationEngine('SUDDEN_CROSSING', 'SEDAN', 'AUTONOMOUS', 45);
  }
  const engine = engineRef.current;

  const [activePage, setActivePage] = useState<PageId>('LIVE_SIMULATION');
  const [isRunning, setIsRunning] = useState(engine.isRunning);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [, setTick] = useState(0);

  // Subscribe to high-frequency engine ticks for UI refreshes
  useEffect(() => {
    const unsubscribe = engine.subscribe(() => {
      setIsRunning(engine.isRunning);
      setTick(t => (t + 1) % 1000000);
    });

    // Check URL query parameters for automated verification
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const requestedPage = params.get('page') as PageId | null;
      if (requestedPage) {
        setActivePage(requestedPage);
      }
      if (params.get('autostart') === 'true') {
        engine.start();
        setIsRunning(true);
      }
    }

    return () => {
      unsubscribe();
      engine.pause();
    };
  }, [engine]);

  // Handler functions
  const handleTogglePlay = () => {
    if (engine.isRunning) {
      engine.pause();
    } else {
      engine.start();
    }
    setIsRunning(engine.isRunning);
  };

  const handleReset = () => {
    engine.reset();
    setIsRunning(false);
  };

  const handleEmergencyStop = () => {
    engine.emergencyStop();
  };

  const handleSelectScenario = (id: ScenarioId) => {
    engine.setScenario(id);
    setActivePage('LIVE_SIMULATION');
  };

  const handleLaunchHeroDemo = () => {
    engine.setScenario('SUDDEN_CROSSING');
    engine.reset();
    setActivePage('LIVE_SIMULATION');
    engine.start();
    setIsRunning(true);
  };

  const handleSelectMode = (mode: DrivingMode) => {
    engine.setDrivingMode(mode);
  };

  const handleSelectVehicle = (type: VehicleModelType) => {
    engine.setVehicleType(type);
  };

  const handleSelectSpeed = (speedKmh: number) => {
    engine.setInitialSpeed(speedKmh);
  };

  const handleInjectHazard = (type: ActorType) => {
    engine.injectHazard(type);
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen theme-bg flex flex-col antialiased selection:bg-cyan-500 selection:text-slate-950 transition-colors duration-200">
        {/* Global Navigation Header */}
        <Navigation
          activePage={activePage}
          onSelectPage={setActivePage}
          isRunning={isRunning}
          overallRiskLevel={engine.riskState.overallRiskLevel}
          onLaunchHeroDemo={handleLaunchHeroDemo}
          isPresentationMode={isPresentationMode}
          onTogglePresentationMode={() => setIsPresentationMode(p => !p)}
        />

        {/* Main Content Area */}
        <main className={`flex-1 ${isPresentationMode ? 'p-2' : 'p-3 md:p-5'}`}>
          {activePage === 'MISSION_CONTROL' && (
            <MissionControlPage
              engine={engine}
              onLaunchSimulation={() => {
                setActivePage('LIVE_SIMULATION');
                engine.start();
              }}
              onSelectScenario={handleSelectScenario}
              onSelectMode={handleSelectMode}
              onSelectVehicle={handleSelectVehicle}
              onSelectSpeed={handleSelectSpeed}
            />
          )}

          {activePage === 'LIVE_SIMULATION' && (
            <LiveSimulationPage
              engine={engine}
              isRunning={isRunning}
              onTogglePlay={handleTogglePlay}
              onReset={handleReset}
              onEmergencyStop={handleEmergencyStop}
              onSetMode={handleSelectMode}
              onInjectHazard={handleInjectHazard}
              onLaunchHeroDemo={handleLaunchHeroDemo}
              isPresentationMode={isPresentationMode}
              onTogglePresentationMode={() => setIsPresentationMode(p => !p)}
            />
          )}

          {activePage === 'ENVIRONMENT_ANALYSIS' && (
            <EnvironmentAnalysisPage engine={engine} />
          )}

          {activePage === 'RISK_PREDICTION' && (
            <RiskPredictionPage engine={engine} />
          )}

          {activePage === 'PATH_PLANNER' && (
            <PathPlannerPage engine={engine} />
          )}

          {activePage === 'SCENARIO_LAB' && (
            <ScenarioLabPage
              engine={engine}
              onSelectScenario={handleSelectScenario}
              onInjectHazard={handleInjectHazard}
            />
          )}

          {activePage === 'ANALYTICS_BENCHMARK' && (
            <AnalyticsBenchmarkPage engine={engine} />
          )}

          {activePage === 'SYSTEM_ARCHITECTURE' && (
            <SystemArchitecturePage />
          )}
        </main>
      </div>
    </ThemeProvider>
  );
}
