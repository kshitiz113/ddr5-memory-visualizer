import { useSimulationStore } from '@/lib/store';

const CommandPanel = () => {
  const { 
    commandForm, 
    updateCommandField, 
    addCommand, 
    simulationState,
    isRunning
  } = useSimulationStore();

  const handleFormChange = (field: string, value: any) => {
    updateCommandField(field as any, value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addCommand();
  };

  return (
    <div className="p-4 border-b border-gray-200 overflow-auto flex-shrink-0">
      <h3 className="font-medium text-neutral-800 mb-3">Command Panel</h3>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Command Type</label>
          <select 
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            value={commandForm.type}
            onChange={(e) => handleFormChange('type', e.target.value)}
            disabled={isRunning}
          >
            <option value="READ">READ</option>
            <option value="WRITE">WRITE</option>
            <option value="ACTIVATE">ACTIVATE</option>
            <option value="PRECHARGE">PRECHARGE</option>
            <option value="REFRESH">REFRESH</option>
          </select>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Channel</label>
            <select 
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
              value={commandForm.channel}
              onChange={(e) => handleFormChange('channel', parseInt(e.target.value))}
              disabled={isRunning}
            >
              <option value="0">0</option>
              <option value="1">1</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Bank Group</label>
            <select 
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
              value={commandForm.bankGroup}
              onChange={(e) => handleFormChange('bankGroup', parseInt(e.target.value))}
              disabled={isRunning}
            >
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Bank</label>
            <select 
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
              value={commandForm.bank}
              onChange={(e) => handleFormChange('bank', parseInt(e.target.value))}
              disabled={isRunning}
            >
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Row</label>
            <input 
              type="text" 
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm" 
              value={commandForm.row}
              onChange={(e) => handleFormChange('row', e.target.value)}
              placeholder="0x0000"
              disabled={isRunning || commandForm.type === 'REFRESH'}
            />
          </div>
        </div>
        
        <div>
          <label className="block text-xs text-gray-500 mb-1">Column</label>
          <input 
            type="text" 
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm" 
            value={commandForm.column}
            onChange={(e) => handleFormChange('column', e.target.value)}
            placeholder="0x000"
            disabled={isRunning || !['READ', 'WRITE'].includes(commandForm.type)}
          />
        </div>
        
        <div>
          <label className="block text-xs text-gray-500 mb-1">Data (for WRITE)</label>
          <input 
            type="text" 
            className="w-full font-mono border border-gray-300 rounded-md px-3 py-1.5 text-sm" 
            value={commandForm.data}
            onChange={(e) => handleFormChange('data', e.target.value)}
            placeholder="0xDEADBEEF"
            disabled={isRunning || commandForm.type !== 'WRITE'}
          />
        </div>
        
        <button 
          type="submit"
          className={`w-full ${
            isRunning 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-primary hover:bg-blue-600'
          } text-white rounded-md py-2 text-sm font-medium`}
          disabled={isRunning}
        >
          Add Command
        </button>
      </form>
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-xs font-medium text-gray-600 mb-2">Command Queue Statistics</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-gray-50 p-2 rounded">
            <span className="text-gray-500">Total:</span>{' '}
            <span className="font-medium">{simulationState.commandQueue.length}</span>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <span className="text-gray-500">Processing:</span>{' '}
            <span className="font-medium">
              {simulationState.commandQueue.filter(cmd => cmd.status === 'processing').length}
            </span>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <span className="text-gray-500">Completed:</span>{' '}
            <span className="font-medium">
              {simulationState.commandQueue.filter(cmd => cmd.status === 'completed').length}
            </span>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <span className="text-gray-500">Queued:</span>{' '}
            <span className="font-medium">
              {simulationState.commandQueue.filter(cmd => cmd.status === 'queued').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPanel;
