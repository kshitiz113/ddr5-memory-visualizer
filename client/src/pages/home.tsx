import { useState } from 'react';
import ArchitectureViewer from '@/components/ArchitectureViewer';
import DataTransferVisualizer from '@/components/DataTransferVisualizer';
import FSMSimulator from '@/components/FSMSimulator';
import TimingDiagram from '@/components/TimingDiagram';
import CommandQueue from '@/components/CommandQueue';
import CommandPanel from '@/components/CommandPanel';
import PerformanceMetrics from '@/components/PerformanceMetrics';
import StepByStepAnimation from '@/components/StepByStepAnimation';
import { useSimulationStore, Tab } from '@/lib/store';

const Home = () => {
  const { activeTab, setActiveTab, runSimulation, isRunning, simulationState, error } = useSimulationStore();

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
  };

  const handleRunSimulation = () => {
    runSimulation();
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Main Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 px-4">
          <div className="flex space-x-1">
            <button 
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'architecture' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300'}`}
              onClick={() => handleTabChange('architecture')}
            >
              Architecture View
            </button>
            <button 
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'data-transfer' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300'}`}
              onClick={() => handleTabChange('data-transfer')}
            >
              Data Transfer
            </button>
            <button 
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'fsm' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300'}`}
              onClick={() => handleTabChange('fsm')}
            >
              FSM Simulator
            </button>
            <button 
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'timing' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300'}`}
              onClick={() => handleTabChange('timing')}
            >
              Timing Diagrams
            </button>
            <button 
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'command-queue' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300'}`}
              onClick={() => handleTabChange('command-queue')}
            >
              Command Queue
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Content Panels */}
          <div className="flex-1 overflow-auto p-4">
            {/* Display different components based on active tab */}
            {activeTab === 'architecture' && <ArchitectureViewer />}
            {activeTab === 'data-transfer' && <DataTransferVisualizer />}
            {activeTab === 'fsm' && <FSMSimulator />}
            {activeTab === 'timing' && <TimingDiagram />}
            {activeTab === 'command-queue' && <CommandQueue />}
            
            {/* Always show FSM Simulator for better visualization */}
            {activeTab !== 'fsm' && <FSMSimulator />}
            
            {/* Always show Data Transfer for better visualization */}
            {activeTab !== 'data-transfer' && <DataTransferVisualizer />}
            
            {/* Error display */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mt-4">
                <p className="text-sm font-medium">Simulation Error: {error}</p>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="w-80 border-l border-gray-200 bg-white overflow-auto flex flex-col">
            {/* Command Panel */}
            <CommandPanel />
            
            {/* Status Bar */}
            <div className="p-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Simulation Status: <span className={`${simulationState.status === 'running' ? 'text-green-600' : 'text-gray-600'} font-medium`}>
                  {simulationState.status.charAt(0).toUpperCase() + simulationState.status.slice(1)}
                </span></span>
                <span>Cycle: <span className="font-mono">{simulationState.cycleCount}</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
