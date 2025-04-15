import { motion, useAnimation } from 'framer-motion';
import { useEffect } from 'react';
import { useSimulationStore } from '@/lib/store';

const DataTransferVisualizer = () => {
  const { simulationState } = useSimulationStore();
  const cpuToControllerAnimation = useAnimation();
  const controllerToPhyAnimation = useAnimation();
  const phyToMemoryAnimation = useAnimation();
  
  // Determine the active command to animate
  const activeCommand = simulationState.commandQueue.find(cmd => cmd.status === 'processing');
  
  useEffect(() => {
    // Animation sequence based on simulation state
    if (simulationState.status === 'running' || activeCommand) {
      // Animate CPU to Controller
      cpuToControllerAnimation.start({
        x: [0, 100, 0],
        opacity: [0, 1, 0],
        transition: { 
          duration: 1.5, 
          ease: "linear",
          repeat: Infinity,
          repeatDelay: 0.5
        }
      });
      
      // Animate Controller to PHY
      controllerToPhyAnimation.start({
        x: [0, 100, 0],
        opacity: [0, 1, 0],
        transition: { 
          duration: 1.5, 
          ease: "linear",
          repeat: Infinity,
          repeatDelay: 0.5,
          delay: 0.2 // Slight delay for cascade effect
        }
      });
      
      // Animate PHY to Memory
      phyToMemoryAnimation.start({
        x: [0, 100, 0],
        opacity: [0, 1, 0],
        transition: { 
          duration: 1.5, 
          ease: "linear",
          repeat: Infinity,
          repeatDelay: 0.5,
          delay: 0.4 // Slight delay for cascade effect
        }
      });
    } else {
      // Stop animations
      cpuToControllerAnimation.stop();
      controllerToPhyAnimation.stop();
      phyToMemoryAnimation.stop();
    }
  }, [simulationState.status, activeCommand]);
  
  // Helper function to get color based on command type
  const getCommandColor = (type?: string) => {
    switch (type) {
      case 'READ': return '#EF4444'; // red
      case 'WRITE': return '#3B82F6'; // blue
      case 'ACTIVATE': return '#8B5CF6'; // purple
      case 'PRECHARGE': return '#F59E0B'; // amber
      case 'REFRESH': return '#10B981'; // green
      default: return '#9CA3AF'; // gray
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-neutral-800">Data Transfer Animation</h2>
        <div className="flex space-x-2">
          <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded flex items-center">
            <span className={`w-2 h-2 rounded-full mr-1 ${simulationState.status === 'running' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
            {simulationState.status === 'running' ? 'Active' : 'Idle'}
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-4 h-48 relative">
        <svg width="100%" height="100%" viewBox="0 0 800 120">
          {/* CPU Component */}
          <rect x="20" y="40" width="100" height="40" rx="4" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="2"></rect>
          <text x="70" y="65" textAnchor="middle" fontFamily="Inter" fontSize="12" fill="#1F2937">CPU</text>
          
          {/* Controller */}
          <rect x="220" y="40" width="100" height="40" rx="4" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="2"></rect>
          <text x="270" y="65" textAnchor="middle" fontFamily="Inter" fontSize="12" fill="#1F2937">Controller</text>
          
          {/* PHY */}
          <rect x="420" y="40" width="100" height="40" rx="4" fill="#E0E7FF" stroke="#6366F1" strokeWidth="2"></rect>
          <text x="470" y="65" textAnchor="middle" fontFamily="Inter" fontSize="12" fill="#1F2937">PHY</text>
          
          {/* Memory */}
          <rect x="620" y="40" width="100" height="40" rx="4" fill="#DCFCE7" stroke="#10B981" strokeWidth="2"></rect>
          <text x="670" y="65" textAnchor="middle" fontFamily="Inter" fontSize="12" fill="#1F2937">Memory</text>
          
          {/* Connection Lines */}
          <line x1="120" y1="60" x2="220" y2="60" stroke="#9CA3AF" strokeWidth="2"></line>
          <line x1="320" y1="60" x2="420" y2="60" stroke="#9CA3AF" strokeWidth="2"></line>
          <line x1="520" y1="60" x2="620" y2="60" stroke="#9CA3AF" strokeWidth="2"></line>
          
          {/* Data Transfer Animation - CPU to Controller */}
          <motion.g 
            className="data-packet-animation"
            animate={cpuToControllerAnimation}
            initial={{ x: 0, opacity: 0 }}
          >
            <rect 
              x="140" 
              y="50" 
              width="60" 
              height="20" 
              rx="4" 
              fill={getCommandColor(activeCommand?.type)}
              opacity="0.8"
            ></rect>
            <text x="170" y="65" textAnchor="middle" fontFamily="Inter" fontSize="10" fill="white">
              {activeCommand?.type || 'IDLE'}
            </text>
          </motion.g>
          
          {/* Data Transfer Animation - Controller to PHY */}
          <motion.g 
            className="data-packet-animation"
            animate={controllerToPhyAnimation}
            initial={{ x: 0, opacity: 0 }}
          >
            <rect 
              x="340" 
              y="50" 
              width="60" 
              height="20" 
              rx="4" 
              fill={getCommandColor(activeCommand?.type)} 
              opacity="0.8"
            ></rect>
            <text x="370" y="65" textAnchor="middle" fontFamily="Inter" fontSize="10" fill="white">
              {activeCommand?.type || 'IDLE'}
            </text>
          </motion.g>
          
          {/* Data Transfer Animation - PHY to Memory */}
          <motion.g 
            className="data-packet-animation"
            animate={phyToMemoryAnimation}
            initial={{ x: 0, opacity: 0 }}
          >
            <rect 
              x="540" 
              y="50" 
              width="60" 
              height="20" 
              rx="4" 
              fill={getCommandColor(activeCommand?.type)} 
              opacity="0.8"
            ></rect>
            <text x="570" y="65" textAnchor="middle" fontFamily="Inter" fontSize="10" fill="white">
              {activeCommand?.type || 'IDLE'}
            </text>
          </motion.g>
          
          {/* Command Types Legend */}
          <g transform="translate(20, 100)">
            <rect width="15" height="10" fill="#3B82F6"></rect>
            <text x="20" y="8" fontFamily="Inter" fontSize="8" fill="#1F2937">WRITE</text>
            
            <rect x="70" width="15" height="10" fill="#EF4444"></rect>
            <text x="90" y="8" fontFamily="Inter" fontSize="8" fill="#1F2937">READ</text>
            
            <rect x="140" width="15" height="10" fill="#8B5CF6"></rect>
            <text x="160" y="8" fontFamily="Inter" fontSize="8" fill="#1F2937">ACTIVATE</text>
            
            <rect x="210" width="15" height="10" fill="#F59E0B"></rect>
            <text x="230" y="8" fontFamily="Inter" fontSize="8" fill="#1F2937">PRECHARGE</text>
            
            <rect x="280" width="15" height="10" fill="#10B981"></rect>
            <text x="300" y="8" fontFamily="Inter" fontSize="8" fill="#1F2937">REFRESH</text>
          </g>
        </svg>
      </div>
    </div>
  );
};

export default DataTransferVisualizer;
