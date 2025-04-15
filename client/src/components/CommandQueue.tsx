import { useSimulationStore } from '@/lib/store';

const CommandQueue = () => {
  const { simulationState, removeCommand } = useSimulationStore();
  const commandQueue = simulationState.commandQueue;
  
  // Helper function to get color based on command type
  const getCommandTypeColor = (type: string) => {
    switch (type) {
      case 'READ': return 'border-red-500';
      case 'WRITE': return 'border-blue-500';
      case 'ACTIVATE': return 'border-purple-500';
      case 'PRECHARGE': return 'border-amber-500';
      case 'REFRESH': return 'border-green-500';
      default: return 'border-gray-300';
    }
  };

  // Helper function to get background color based on command status
  const getCommandStatusBg = (status: string) => {
    switch (status) {
      case 'processing': return 'bg-blue-50';
      case 'completed': return 'bg-green-50';
      case 'error': return 'bg-red-50';
      default: return 'bg-gray-50';
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-neutral-800">Command Queue</h2>
        <div className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
          {commandQueue.length} commands
        </div>
      </div>
      
      <div className="overflow-hidden">
        {commandQueue.length === 0 ? (
          <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded text-center">
            No commands in queue. Add commands from the command panel.
          </div>
        ) : (
          <div className="overflow-auto max-h-96 space-y-2">
            {commandQueue.map((command) => (
              <div 
                key={command.id} 
                className={`border-l-4 ${getCommandTypeColor(command.type)} ${getCommandStatusBg(command.status)} p-2 rounded-r relative pr-8`}
              >
                <div className="flex justify-between">
                  <span className="font-mono text-xs font-medium text-neutral-800">{command.type}</span>
                  <span className="text-xs text-gray-500 capitalize">{command.status}</span>
                </div>
                
                <div className="text-xs text-gray-600 mt-1">
                  CH:{command.channel} BG:{command.bankGroup} B:{command.bank}
                  {command.row && ` R:${command.row}`}
                  {command.column && ` C:${command.column}`}
                </div>
                
                {command.data && (
                  <div className="text-xs font-mono text-gray-500 mt-1">
                    Data: {command.data}
                  </div>
                )}
                
                {command.status === 'queued' && (
                  <button
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                    onClick={() => removeCommand(command.id)}
                    title="Remove command"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="mt-4">
        <h3 className="text-sm font-medium mb-2">Command Execution Order</h3>
        <div className="bg-gray-50 p-3 rounded text-xs text-gray-600">
          <p className="mb-1">1. Commands are processed in the order they are added to the queue.</p>
          <p className="mb-1">2. ACTIVATE must precede READ/WRITE to the same bank.</p>
          <p className="mb-1">3. PRECHARGE closes an open row before another can be activated.</p>
          <p>4. Timing constraints (tRCD, tRP, etc.) may delay execution.</p>
        </div>
      </div>
    </div>
  );
};

export default CommandQueue;
