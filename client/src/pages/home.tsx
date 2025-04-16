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
import { CommandType } from '@shared/types';

const Home = () => {
  const { activeTab, setActiveTab, runSimulation, isRunning, simulationState, error } = useSimulationStore();
  const [selectedCommandType, setSelectedCommandType] = useState<CommandType>('READ');

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
  };

  const handleRunSimulation = () => {
    runSimulation();
  };
  
  const handleCommandTypeChange = (type: CommandType) => {
    setSelectedCommandType(type);
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Main Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 px-4">
          <div className="flex space-x-1 overflow-x-auto">
            <button 
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'architecture' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300'}`}
              onClick={() => handleTabChange('architecture')}
            >
              Architecture View
            </button>
            <button 
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'data-transfer' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300'}`}
              onClick={() => handleTabChange('data-transfer')}
            >
              Data Transfer
            </button>
            <button 
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'step-by-step' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300'}`}
              onClick={() => handleTabChange('step-by-step')}
            >
              Step-by-Step Animation
            </button>
            <button 
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'fsm' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300'}`}
              onClick={() => handleTabChange('fsm')}
            >
              FSM Simulator
            </button>
            <button 
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'timing' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300'}`}
              onClick={() => handleTabChange('timing')}
            >
              Timing Diagrams
            </button>
            <button 
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'performance' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300'}`}
              onClick={() => handleTabChange('performance')}
            >
              Performance Metrics
            </button>
            <button 
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${activeTab === 'command-queue' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300'}`}
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
            {activeTab === 'performance' && <PerformanceMetrics simulationState={simulationState} />}
            {activeTab === 'step-by-step' && (
              <>
                <div className="mb-4 border border-gray-200 bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-2">Select Command Type to Animate:</h3>
                  <div className="flex flex-wrap gap-2">
                    {['READ', 'WRITE', 'ACTIVATE', 'PRECHARGE', 'REFRESH', 'ZQCAL'].map((type) => (
                      <button
                        key={type}
                        className={`px-3 py-1 text-xs font-medium rounded-md ${
                          selectedCommandType === type 
                            ? 'bg-primary text-white' 
                            : 'bg-white border border-gray-200 hover:bg-gray-100'
                        }`}
                        onClick={() => handleCommandTypeChange(type as CommandType)}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <StepByStepAnimation 
                  commandType={selectedCommandType} 
                  simulationState={simulationState}
                />
              </>
            )}
            
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
