import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSimulationStore } from '@/lib/store';

const ArchitectureViewer = () => {
  const {
    simulationState, 
    selectedChannel, 
    selectedBankGroup, 
    selectedBank,
    selectedRow,
    selectChannel,
    selectBankGroup,
    selectBank,
    selectRow
  } = useSimulationStore();
  
  const [tooltipInfo, setTooltipInfo] = useState({
    visible: false,
    x: 0,
    y: 0,
    title: '',
    desc: '',
    status: ''
  });

  // Handle component hover
  const handleComponentHover = (
    e: React.MouseEvent, 
    component: string, 
    channel?: number, 
    bankGroup?: number, 
    bank?: number
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    
    let title = '';
    let desc = '';
    let status = '';
    
    // Set tooltip content based on component
    switch(component) {
      case 'cpu':
        title = 'CPU';
        desc = 'Central Processing Unit';
        status = 'Status: Active';
        break;
      case 'controller':
        title = 'Memory Controller';
        desc = 'Manages memory access operations';
        status = `Status: ${simulationState.currentState}`;
        break;
      case 'phy':
        title = 'PHY Interface';
        desc = 'Physical layer interface';
        status = 'Status: Transmitting';
        break;
      case 'memory':
        title = 'DDR5 Memory';
        desc = '2 channels, 8 bank groups';
        status = simulationState.memoryState.activeBank !== undefined 
          ? `Status: Bank ${simulationState.memoryState.activeBank} active` 
          : 'Status: Idle';
        break;
      case 'channel':
        title = `Channel ${channel}`;
        desc = '4 bank groups, 64-bit bus';
        status = `Status: ${channel === simulationState.memoryState.activeChannel ? 'Active' : 'Idle'}`;
        break;
      case 'bank-group':
        title = `Bank Group ${bankGroup}`;
        desc = 'Contains multiple banks';
        status = simulationState.memoryState.activeBankGroup === bankGroup 
          ? 'Status: Active' 
          : 'Status: Idle';
        break;
      case 'bank':
        title = `Bank ${bank}`;
        desc = `Contains multiple rows`;
        status = simulationState.memoryState.activeBank === bank 
          ? 'Status: Active' 
          : 'Status: Idle';
        break;
      default:
        title = component;
        desc = '';
        status = '';
    }
    
    setTooltipInfo({
      visible: true,
      x: rect.left,
      y: rect.top - 80,
      title,
      desc,
      status
    });
  };
  
  const handleComponentMouseLeave = () => {
    setTooltipInfo({ ...tooltipInfo, visible: false });
  };
  
  const handleComponentClick = (
    component: string, 
    channel?: number, 
    bankGroup?: number, 
    bank?: number
  ) => {
    switch(component) {
      case 'channel':
        selectChannel(channel !== selectedChannel ? channel : null);
        break;
      case 'bank-group':
        selectBankGroup(bankGroup !== selectedBankGroup ? bankGroup : null);
        break;
      case 'bank':
        selectBank(bank !== selectedBank ? bank : null);
        break;
      case 'row-buffer':
        // In a real app, we would also handle row selection
        break;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-neutral-800">DDR5 Memory Architecture</h2>
        <div className="flex space-x-2">
          <button className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </button>
          <button className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </button>
          <button className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10"></polyline>
              <polyline points="23 20 23 14 17 14"></polyline>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
            </svg>
          </button>
        </div>
      </div>
      
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <svg width="100%" height="500" viewBox="0 0 1000 500" className="bg-neutral-100/50">
          {/* CPU Component */}
          <g 
            className="cursor-pointer" 
            onMouseEnter={(e) => handleComponentHover(e, 'cpu')}
            onMouseLeave={handleComponentMouseLeave}
            onClick={() => handleComponentClick('cpu')}
          >
            <rect x="50" y="200" width="120" height="100" rx="4" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="2"></rect>
            <text x="110" y="230" textAnchor="middle" fontFamily="Inter" fontSize="14" fill="#1F2937">CPU</text>
            <rect x="70" y="240" width="80" height="50" rx="2" fill="#D1D5DB" stroke="#9CA3AF"></rect>
            <text x="110" y="270" textAnchor="middle" fontFamily="Inter" fontSize="12" fill="#1F2937">Cache</text>
          </g>

          {/* Memory Controller */}
          <g 
            className="cursor-pointer" 
            onMouseEnter={(e) => handleComponentHover(e, 'controller')}
            onMouseLeave={handleComponentMouseLeave}
            onClick={() => handleComponentClick('controller')}
          >
            <rect 
              x="270" 
              y="150" 
              width="180" 
              height="200" 
              rx="4" 
              fill="#DBEAFE" 
              stroke="#3B82F6" 
              strokeWidth={simulationState.currentState !== 'IDLE' ? 3 : 2}
            ></rect>
            <text x="360" y="180" textAnchor="middle" fontFamily="Inter" fontSize="14" fontWeight="500" fill="#1F2937">Memory Controller</text>
            
            {/* Controller Components */}
            <rect x="290" y="190" width="140" height="40" rx="2" fill="#BFDBFE" stroke="#3B82F6"></rect>
            <text x="360" y="215" textAnchor="middle" fontFamily="Inter" fontSize="12" fill="#1F2937">Command Queue</text>
            
            <rect x="290" y="240" width="140" height="40" rx="2" fill="#BFDBFE" stroke="#3B82F6"></rect>
            <text x="360" y="265" textAnchor="middle" fontFamily="Inter" fontSize="12" fill="#1F2937">Address Mapping</text>
            
            <rect 
              x="290" 
              y="290" 
              width="140" 
              height="40" 
              rx="2" 
              fill={simulationState.currentState !== 'IDLE' ? '#93C5FD' : '#BFDBFE'} 
              stroke="#3B82F6"
            ></rect>
            <text x="360" y="315" textAnchor="middle" fontFamily="Inter" fontSize="12" fill="#1F2937">FSM Controller</text>
          </g>

          {/* PHY Layer */}
          <g 
            className="cursor-pointer" 
            onMouseEnter={(e) => handleComponentHover(e, 'phy')}
            onMouseLeave={handleComponentMouseLeave}
            onClick={() => handleComponentClick('phy')}
          >
            <rect x="270" y="380" width="180" height="70" rx="4" fill="#E0E7FF" stroke="#6366F1" strokeWidth="2"></rect>
            <text x="360" y="415" textAnchor="middle" fontFamily="Inter" fontSize="14" fill="#1F2937">PHY Interface</text>
          </g>

          {/* DDR5 Memory */}
          <g 
            className="cursor-pointer" 
            onMouseEnter={(e) => handleComponentHover(e, 'memory')}
            onMouseLeave={handleComponentMouseLeave}
            onClick={() => handleComponentClick('memory')}
          >
            <rect x="550" y="100" width="400" height="300" rx="4" fill="#F0FDF4" stroke="#10B981" strokeWidth="2"></rect>
            <text x="750" y="130" textAnchor="middle" fontFamily="Inter" fontSize="16" fontWeight="500" fill="#1F2937">DDR5 Memory</text>
            
            {/* Memory Channels */}
            <g 
              className="cursor-pointer" 
              onMouseEnter={(e) => handleComponentHover(e, 'channel', 0)}
              onMouseLeave={handleComponentMouseLeave}
              onClick={() => handleComponentClick('channel', 0)}
            >
              <rect 
                x="570" 
                y="150" 
                width="170" 
                height="230" 
                rx="2" 
                fill="#DCFCE7" 
                stroke={selectedChannel === 0 ? '#059669' : '#10B981'}
                strokeWidth={selectedChannel === 0 || simulationState.memoryState.activeChannel === 0 ? 2 : 1}
              ></rect>
              <text x="655" y="170" textAnchor="middle" fontFamily="Inter" fontSize="12" fill="#1F2937">Channel 0</text>
              
              {/* Bank Groups */}
              <g 
                className="cursor-pointer" 
                onMouseEnter={(e) => handleComponentHover(e, 'bank-group', 0, 0)}
                onMouseLeave={handleComponentMouseLeave}
                onClick={() => handleComponentClick('bank-group', 0, 0)}
              >
                <rect 
                  x="585" 
                  y="180" 
                  width="65" 
                  height="40" 
                  rx="2" 
                  fill="#D1FAE5" 
                  stroke={selectedBankGroup === 0 ? '#059669' : '#10B981'} 
                  strokeWidth={selectedBankGroup === 0 || (simulationState.memoryState.activeChannel === 0 && simulationState.memoryState.activeBankGroup === 0) ? 2 : 1}
                ></rect>
                <text x="617.5" y="205" textAnchor="middle" fontFamily="Inter" fontSize="10" fill="#1F2937">Bank Group 0</text>
              </g>
              
              <g 
                className="cursor-pointer" 
                onMouseEnter={(e) => handleComponentHover(e, 'bank-group', 0, 1)}
                onMouseLeave={handleComponentMouseLeave}
                onClick={() => handleComponentClick('bank-group', 0, 1)}
              >
                <rect 
                  x="660" 
                  y="180" 
                  width="65" 
                  height="40" 
                  rx="2" 
                  fill="#D1FAE5" 
                  stroke={selectedBankGroup === 1 ? '#059669' : '#10B981'} 
                  strokeWidth={selectedBankGroup === 1 || (simulationState.memoryState.activeChannel === 0 && simulationState.memoryState.activeBankGroup === 1) ? 2 : 1}
                ></rect>
                <text x="692.5" y="205" textAnchor="middle" fontFamily="Inter" fontSize="10" fill="#1F2937">Bank Group 1</text>
              </g>
              
              <g 
                className="cursor-pointer" 
                onMouseEnter={(e) => handleComponentHover(e, 'bank-group', 0, 2)}
                onMouseLeave={handleComponentMouseLeave}
                onClick={() => handleComponentClick('bank-group', 0, 2)}
              >
                <rect 
                  x="585" 
                  y="230" 
                  width="65" 
                  height="40" 
                  rx="2" 
                  fill="#D1FAE5" 
                  stroke={selectedBankGroup === 2 ? '#059669' : '#10B981'} 
                  strokeWidth={selectedBankGroup === 2 || (simulationState.memoryState.activeChannel === 0 && simulationState.memoryState.activeBankGroup === 2) ? 2 : 1}
                ></rect>
                <text x="617.5" y="255" textAnchor="middle" fontFamily="Inter" fontSize="10" fill="#1F2937">Bank Group 2</text>
              </g>
              
              <g 
                className="cursor-pointer" 
                onMouseEnter={(e) => handleComponentHover(e, 'bank-group', 0, 3)}
                onMouseLeave={handleComponentMouseLeave}
                onClick={() => handleComponentClick('bank-group', 0, 3)}
              >
                <rect 
                  x="660" 
                  y="230" 
                  width="65" 
                  height="40" 
                  rx="2" 
                  fill="#D1FAE5" 
                  stroke={selectedBankGroup === 3 ? '#059669' : '#10B981'} 
                  strokeWidth={selectedBankGroup === 3 || (simulationState.memoryState.activeChannel === 0 && simulationState.memoryState.activeBankGroup === 3) ? 2 : 1}
                ></rect>
                <text x="692.5" y="255" textAnchor="middle" fontFamily="Inter" fontSize="10" fill="#1F2937">Bank Group 3</text>
              </g>
              
              {/* Row Buffer */}
              <g 
                className="cursor-pointer" 
                onMouseEnter={(e) => handleComponentHover(e, 'row-buffer', 0)}
                onMouseLeave={handleComponentMouseLeave}
                onClick={() => handleComponentClick('row-buffer', 0)}
              >
                <rect 
                  x="585" 
                  y="290" 
                  width="140" 
                  height="30" 
                  rx="2" 
                  fill={simulationState.memoryState.activeChannel === 0 ? '#A7F3D0' : '#D1FAE5'} 
                  stroke="#10B981"
                ></rect>
                <text x="655" y="310" textAnchor="middle" fontFamily="Inter" fontSize="10" fill="#1F2937">Row Buffer</text>
              </g>
              
              {/* Data Bus */}
              <rect x="585" y="330" width="140" height="30" rx="2" fill="#6EE7B7" stroke="#10B981"></rect>
              <text x="655" y="350" textAnchor="middle" fontFamily="Inter" fontSize="10" fill="#1F2937">Data Bus (64 bits)</text>
            </g>
            
            <g 
              className="cursor-pointer" 
              onMouseEnter={(e) => handleComponentHover(e, 'channel', 1)}
              onMouseLeave={handleComponentMouseLeave}
              onClick={() => handleComponentClick('channel', 1)}
            >
              <rect 
                x="760" 
                y="150" 
                width="170" 
                height="230" 
                rx="2" 
                fill="#DCFCE7" 
                stroke={selectedChannel === 1 ? '#059669' : '#10B981'}
                strokeWidth={selectedChannel === 1 || simulationState.memoryState.activeChannel === 1 ? 2 : 1}
              ></rect>
              <text x="845" y="170" textAnchor="middle" fontFamily="Inter" fontSize="12" fill="#1F2937">Channel 1</text>
              
              {/* Bank Groups */}
              <g 
                className="cursor-pointer" 
                onMouseEnter={(e) => handleComponentHover(e, 'bank-group', 1, 0)}
                onMouseLeave={handleComponentMouseLeave}
                onClick={() => handleComponentClick('bank-group', 1, 0)}
              >
                <rect 
                  x="775" 
                  y="180" 
                  width="65" 
                  height="40" 
                  rx="2" 
                  fill="#D1FAE5" 
                  stroke={selectedBankGroup === 0 && selectedChannel === 1 ? '#059669' : '#10B981'} 
                  strokeWidth={selectedBankGroup === 0 && selectedChannel === 1 ? 2 : 1}
                ></rect>
                <text x="807.5" y="205" textAnchor="middle" fontFamily="Inter" fontSize="10" fill="#1F2937">Bank Group 0</text>
              </g>
              
              <g 
                className="cursor-pointer" 
                onMouseEnter={(e) => handleComponentHover(e, 'bank-group', 1, 1)}
                onMouseLeave={handleComponentMouseLeave}
                onClick={() => handleComponentClick('bank-group', 1, 1)}
              >
                <rect 
                  x="850" 
                  y="180" 
                  width="65" 
                  height="40" 
                  rx="2" 
                  fill="#D1FAE5" 
                  stroke={selectedBankGroup === 1 && selectedChannel === 1 ? '#059669' : '#10B981'} 
                  strokeWidth={selectedBankGroup === 1 && selectedChannel === 1 ? 2 : 1}
                ></rect>
                <text x="882.5" y="205" textAnchor="middle" fontFamily="Inter" fontSize="10" fill="#1F2937">Bank Group 1</text>
              </g>
              
              <g 
                className="cursor-pointer" 
                onMouseEnter={(e) => handleComponentHover(e, 'bank-group', 1, 2)}
                onMouseLeave={handleComponentMouseLeave}
                onClick={() => handleComponentClick('bank-group', 1, 2)}
              >
                <rect 
                  x="775" 
                  y="230" 
                  width="65" 
                  height="40" 
                  rx="2" 
                  fill="#D1FAE5" 
                  stroke={selectedBankGroup === 2 && selectedChannel === 1 ? '#059669' : '#10B981'} 
                  strokeWidth={selectedBankGroup === 2 && selectedChannel === 1 ? 2 : 1}
                ></rect>
                <text x="807.5" y="255" textAnchor="middle" fontFamily="Inter" fontSize="10" fill="#1F2937">Bank Group 2</text>
              </g>
              
              <g 
                className="cursor-pointer" 
                onMouseEnter={(e) => handleComponentHover(e, 'bank-group', 1, 3)}
                onMouseLeave={handleComponentMouseLeave}
                onClick={() => handleComponentClick('bank-group', 1, 3)}
              >
                <rect 
                  x="850" 
                  y="230" 
                  width="65" 
                  height="40" 
                  rx="2" 
                  fill="#D1FAE5" 
                  stroke={selectedBankGroup === 3 && selectedChannel === 1 ? '#059669' : '#10B981'} 
                  strokeWidth={selectedBankGroup === 3 && selectedChannel === 1 ? 2 : 1}
                ></rect>
                <text x="882.5" y="255" textAnchor="middle" fontFamily="Inter" fontSize="10" fill="#1F2937">Bank Group 3</text>
              </g>
              
              {/* Row Buffer */}
              <g 
                className="cursor-pointer" 
                onMouseEnter={(e) => handleComponentHover(e, 'row-buffer', 1)}
                onMouseLeave={handleComponentMouseLeave}
                onClick={() => handleComponentClick('row-buffer', 1)}
              >
                <rect 
                  x="775" 
                  y="290" 
                  width="140" 
                  height="30" 
                  rx="2" 
                  fill={simulationState.memoryState.activeChannel === 1 ? '#A7F3D0' : '#D1FAE5'} 
                  stroke="#10B981"
                ></rect>
                <text x="845" y="310" textAnchor="middle" fontFamily="Inter" fontSize="10" fill="#1F2937">Row Buffer</text>
              </g>
              
              {/* Data Bus */}
              <rect x="775" y="330" width="140" height="30" rx="2" fill="#6EE7B7" stroke="#10B981"></rect>
              <text x="845" y="350" textAnchor="middle" fontFamily="Inter" fontSize="10" fill="#1F2937">Data Bus (64 bits)</text>
            </g>
          </g>

          {/* Connection Paths */}
          <path d="M170 250 L270 250" stroke="#9CA3AF" strokeWidth="2" fill="none"></path>
          <path d="M360 350 L360 380" stroke="#6366F1" strokeWidth="2" fill="none"></path>
          <path d="M450 250 L550 250" stroke="#10B981" strokeWidth="2" fill="none"></path>
          
          {/* Animated Data Path */}
          <motion.path 
            d="M450 415 L550 415" 
            stroke="#10B981" 
            strokeWidth="2" 
            fill="none" 
            className="data-path"
            strokeDasharray="5"
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: -20 }}
            transition={{ 
              repeat: Infinity, 
              duration: 1, 
              ease: "linear" 
            }}
          />

          {/* Tooltips and Highlights */}
          {tooltipInfo.visible && (
            <foreignObject x={tooltipInfo.x - 50} y={tooltipInfo.y - 50} width="200" height="120">
              <div className="bg-white p-3 rounded-md shadow-lg border border-gray-200">
                <h3 className="font-medium text-sm text-neutral-800">{tooltipInfo.title}</h3>
                <p className="text-xs text-gray-600 mt-1">{tooltipInfo.desc}</p>
                <p className="text-xs text-gray-600 mt-1">{tooltipInfo.status}</p>
              </div>
            </foreignObject>
          )}

          {/* Active Bank Highlight */}
          {simulationState.memoryState.activeChannel !== undefined && 
           simulationState.memoryState.activeBankGroup !== undefined &&
           simulationState.memoryState.activeBank !== undefined && (
            <rect 
              x={simulationState.memoryState.activeChannel === 0 ? 
                  (simulationState.memoryState.activeBankGroup % 2 === 0 ? 585 : 660) : 
                  (simulationState.memoryState.activeBankGroup % 2 === 0 ? 775 : 850)} 
              y={simulationState.memoryState.activeBankGroup < 2 ? 180 : 230} 
              width="65" 
              height="40" 
              rx="2" 
              fill="none" 
              stroke="#F59E0B" 
              strokeWidth="2" 
              strokeDasharray="4"
            />
          )}
        </svg>
      </div>
    </div>
  );
};

export default ArchitectureViewer;
