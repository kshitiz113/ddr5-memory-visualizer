import { ReactNode } from 'react';
import { useSimulationStore } from '@/lib/store';
import { Link, useLocation } from 'wouter';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { runSimulation, isRunning, resetSimulation, setActiveTab } = useSimulationStore();
  const [location, setLocation] = useLocation();

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-neutral-900 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-2">
          <i className="ri-memory-line text-2xl text-primary"></i>
          <h1 className="text-xl font-semibold">DDR5 Memory Controller Visualizer</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            className={`${isRunning ? 'bg-gray-600 cursor-not-allowed' : 'bg-primary hover:bg-blue-600'} text-white px-3 py-1.5 rounded-md text-sm flex items-center`}
            onClick={() => runSimulation()}
            disabled={isRunning}
          >
            <i className="ri-play-fill mr-1"></i> Run Simulation
          </button>
          <button 
            className="bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1.5 rounded-md text-sm flex items-center"
            onClick={() => resetSimulation()}
          >
            <i className="ri-refresh-line mr-1"></i> Reset
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Navigation */}
        <nav className="w-16 bg-neutral-900 flex flex-col items-center py-4 text-neutral-300">
          <a 
            href="#" 
            className={`p-2 rounded ${location === '/' && 'bg-white/10 text-primary'} hover:bg-white/10 mb-4`}
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('architecture');
              setLocation('/');
            }}
          >
            <i className="ri-dashboard-line text-xl"></i>
          </a>
          <a 
            href="#" 
            className="p-2 rounded hover:bg-white/10 mb-4"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('data-transfer');
              setLocation('/');
            }}
          >
            <i className="ri-cpu-line text-xl"></i>
          </a>
          <a 
            href="#" 
            className="p-2 rounded hover:bg-white/10 mb-4"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('fsm');
              setLocation('/');
            }}
          >
            <i className="ri-flow-chart text-xl"></i>
          </a>
          <a 
            href="#" 
            className="p-2 rounded hover:bg-white/10 mb-4"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('timing');
              setLocation('/');
            }}
          >
            <i className="ri-timer-line text-xl"></i>
          </a>
          <a 
            href="#" 
            className="p-2 rounded hover:bg-white/10 mb-4"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('command-queue');
              setLocation('/');
            }}
          >
            <i className="ri-database-2-line text-xl"></i>
          </a>
          <div className="flex-1"></div>
          <a href="#" className="p-2 rounded hover:bg-white/10">
            <i className="ri-information-line text-xl"></i>
          </a>
        </nav>

        {/* Content */}
        {children}
      </div>
    </div>
  );
};

export default Layout;
