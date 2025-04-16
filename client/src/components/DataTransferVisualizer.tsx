import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { useSimulationStore } from '@/lib/store';

const DataTransferVisualizer = () => {
  const { simulationState } = useSimulationStore();
  const [showConfetti, setShowConfetti] = useState(false);
  const [completedCommands, setCompletedCommands] = useState<string[]>([]);
  const [animationStage, setAnimationStage] = useState('idle');
  const [currentHighlight, setCurrentHighlight] = useState({ channel: -1, bankGroup: -1, bank: -1 });
  const [dataValue, setDataValue] = useState<string | null>(null);
  
  // Animation controls
  const cpuToControllerAnimation = useAnimation();
  const controllerToPhyAnimation = useAnimation();
  const phyToMemoryAnimation = useAnimation();
  const dataBusAnimation = useAnimation();
  const bankStorageAnimation = useAnimation();
  
  // Refs for timing
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Determine the active command to animate
  const activeCommand = simulationState.commandQueue.find(cmd => cmd.status === 'processing');
  const completedCommandsCount = simulationState.commandQueue.filter(cmd => cmd.status === 'completed').length;
  
  // Track when commands complete
  useEffect(() => {
    const currentCompleted = simulationState.commandQueue
      .filter(cmd => cmd.status === 'completed')
      .map(cmd => cmd.id);
    
    // Check if we have newly completed commands
    if (currentCompleted.length > completedCommands.length) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
      setCompletedCommands(currentCompleted);
    }
  }, [simulationState.commandQueue, completedCommands.length]);
  
  // Function to get details animation for each command type
  const runDetailedAnimation = (commandType: string) => {
    if (!activeCommand) return;
    
    // Reset animation state
    clearTimeout(animationTimerRef.current || undefined);
    
    const runAnimationSequence = async () => {
      try {
        // Stage 1: CPU to Controller
        setAnimationStage('cpu_to_controller');
        await cpuToControllerAnimation.start({
          x: [0, 100],
          opacity: [0, 1, 1],
          transition: { duration: 1.8, ease: "easeInOut" }
        });
        
        // Stage 2: Command Processing in Controller
        setAnimationStage('processing_in_controller');
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        // Update the current command type display
        setDataValue(activeCommand?.type || null);
        
        // Stage 3: Controller to PHY
        setAnimationStage('controller_to_phy');
        await controllerToPhyAnimation.start({
          x: [0, 100],
          opacity: [0, 1, 1],
          transition: { duration: 1.8, ease: "easeInOut" }
        });
        
        // Stage 4: PHY to Memory
        setAnimationStage('phy_to_memory');
        await phyToMemoryAnimation.start({
          x: [0, 100],
          opacity: [0, 1, 1],
          transition: { duration: 1.8, ease: "easeInOut" }
        });
        
        // Highlight appropriate memory components
        if (activeCommand) {
          setCurrentHighlight({
            channel: activeCommand.channel,
            bankGroup: activeCommand.bankGroup,
            bank: activeCommand.bank
          });
        }
        
        // Handle different command types
        switch (commandType) {
          case 'WRITE':
            // Stage 5a: Verify row activation
            setAnimationStage('check_row_activation');
            // Show a pulsing highlight on the memory bank to indicate checking
            await bankStorageAnimation.start({
              opacity: [0.3, 0.7, 0.3],
              scale: [0.95, 1.05, 0.95],
              transition: { 
                duration: 1.0, 
                ease: "easeInOut",
                repeat: 1,
                repeatType: "reverse"
              }
            });
            
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Stage 5b: Display write recovery time
            setAnimationStage('write_recovery');
            setDataValue("tWR: 12 cycles");
            await new Promise(resolve => setTimeout(resolve, 1200));
            
            // Stage 5c: Prepare data for writing
            setAnimationStage('data_preparation');
            setDataValue(activeCommand?.data || "0x00000000");
            await bankStorageAnimation.start({
              opacity: [0, 0.7],
              scale: [0.8, 1],
              transition: { duration: 0.8, ease: "easeOut" }
            });
            
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Stage 5d: Data on internal controller bus
            setAnimationStage('controller_data_bus');
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Stage 5e: Show Data on external Bus for WRITE
            setAnimationStage('data_on_bus');
            await dataBusAnimation.start({
              opacity: [0, 1],
              y: [10, 0],
              transition: { duration: 1.2, ease: "easeOut" }
            });
            
            // Pause to show data on bus clearly
            await new Promise(resolve => setTimeout(resolve, 1200));
            
            // Stage 5f: Data arrives at memory interface
            setAnimationStage('data_at_memory');
            await dataBusAnimation.start({
              x: [0, 60],
              opacity: [1, 0.7],
              transition: { duration: 1.0, ease: "easeInOut" }
            });
            
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Stage 5g: Input buffers in memory
            setAnimationStage('memory_input_buffers');
            await bankStorageAnimation.start({
              opacity: [0.7, 0.9],
              scale: [0.9, 1.1],
              transition: { duration: 0.8, ease: "easeInOut" }
            });
            
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Stage 5h: Store data in memory bank
            setAnimationStage('store_in_bank');
            await bankStorageAnimation.start({
              opacity: [0.9, 1],
              scale: [1, 1.05],
              transition: { duration: 1.0, ease: "easeOut" }
            });
            
            await new Promise(resolve => setTimeout(resolve, 1200));
            
            // Stage 5i: Send write acknowledgement 
            setAnimationStage('write_ack');
            await phyToMemoryAnimation.start({
              x: [100, 0],
              opacity: [0, 0.7, 0],
              transition: { duration: 1.0, ease: "easeInOut" }
            });
            
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Fade out data visualization
            await bankStorageAnimation.start({
              opacity: [1, 0.5],
              transition: { duration: 0.5 }
            });
            break;
            
          case 'READ':
            // Stage 5a: Check row activation status
            setAnimationStage('check_row_activation');
            // Show a pulsing highlight on the memory bank to indicate checking
            await bankStorageAnimation.start({
              opacity: [0.3, 0.7, 0.3],
              scale: [0.95, 1.05, 0.95],
              transition: { 
                duration: 1.0, 
                ease: "easeInOut",
                repeat: 1,
                repeatType: "reverse"
              }
            });
            
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Stage 5b: Display timing parameters (e.g., CAS Latency)
            setAnimationStage('cas_latency');
            setDataValue("tCAS: 16 cycles");
            await new Promise(resolve => setTimeout(resolve, 1200));
            
            // Stage 5c: Activate internal read circuitry 
            setAnimationStage('read_from_bank');
            await bankStorageAnimation.start({
              opacity: [0, 1],
              scale: [0.8, 1],
              transition: { duration: 1.0, ease: "easeOut" }
            });
            
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Stage 5d: Generate read data value from the specified location
            // Using column address (if provided) or generating deterministic value
            const colAddr = activeCommand?.column ? parseInt(activeCommand.column.replace('0x', ''), 16) : 0;
            const rowAddr = activeCommand?.row ? parseInt(activeCommand.row.replace('0x', ''), 16) : 0;
            // Generate deterministic data based on addresses for educational consistency
            const readData = `0x${((rowAddr * 256 + colAddr) % 0xFFFFFFFF).toString(16).padStart(8, '0').toUpperCase()}`;
            setDataValue(readData);
            
            // Stage 5e: Data sense amplifiers activated (internal to DRAM)
            setAnimationStage('sense_amplifiers');
            await bankStorageAnimation.start({
              opacity: [0.7, 1],
              scale: [0.9, 1.1],
              transition: { duration: 0.8, ease: "easeInOut" }
            });
            
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Stage 5f: Data placed on the internal memory data bus
            setAnimationStage('internal_data_bus');
            await bankStorageAnimation.start({
              opacity: [0.8, 1],
              y: [-5, 0],
              transition: { duration: 0.8, ease: "easeOut" }
            });
            
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Stage 5g: Show Data on external data Bus for READ
            setAnimationStage('data_on_bus');
            await dataBusAnimation.start({
              opacity: [0, 1],
              y: [10, 0],
              transition: { duration: 1.2, ease: "easeOut" }
            });
            
            // Show data moving across the bus for longer
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Stage 5h: Data arrives at memory controller
            setAnimationStage('data_to_controller');
            await dataBusAnimation.start({
              x: [0, -60],
              opacity: [1, 0.7],
              transition: { duration: 1.0, ease: "easeInOut" }
            });
            
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Stage 5i: Data delivered to CPU
            setAnimationStage('data_to_cpu');
            await cpuToControllerAnimation.start({
              x: [100, 0],
              opacity: [0.7, 0],
              transition: { duration: 1.0, ease: "easeInOut" }
            });
            
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Fade out all animations
            await dataBusAnimation.start({
              opacity: [1, 0],
              transition: { duration: 0.5 }
            });
            break;
            
          case 'ACTIVATE':
            // Show row activation animation
            setAnimationStage('activate_row');
            await bankStorageAnimation.start({
              opacity: [0, 1],
              scaleY: [0, 1],
              transition: { duration: 0.7, ease: "easeOut" }
            });
            
            await new Promise(resolve => setTimeout(resolve, 800));
            break;
            
          case 'PRECHARGE':
            // Show precharge animation
            setAnimationStage('precharge');
            await bankStorageAnimation.start({
              opacity: [1, 0],
              scaleY: [1, 0],
              transition: { duration: 0.7, ease: "easeInOut" }
            });
            
            await new Promise(resolve => setTimeout(resolve, 500));
            break;
            
          case 'REFRESH':
            // Show refresh animation (pulsing)
            setAnimationStage('refresh');
            await bankStorageAnimation.start({
              opacity: [0.5, 1, 0.5],
              scale: [0.95, 1.05, 0.95],
              transition: { 
                duration: 1.2, 
                ease: "easeInOut",
                repeat: 2,
                repeatType: "reverse"
              }
            });
            
            await new Promise(resolve => setTimeout(resolve, 500));
            break;
        }
        
        // End of sequence
        setAnimationStage('completed');
        setCurrentHighlight({ channel: -1, bankGroup: -1, bank: -1 });
        setDataValue(null);
        
        // Reset animations
        cpuToControllerAnimation.set({ x: 0, opacity: 0 });
        controllerToPhyAnimation.set({ x: 0, opacity: 0 });
        phyToMemoryAnimation.set({ x: 0, opacity: 0 });
        dataBusAnimation.set({ opacity: 0, y: 10 });
        bankStorageAnimation.set({ opacity: 0, scale: 1, scaleY: 1 });
        
        // Do not automatically restart animation
        // Animation will only play once per command
        
      } catch (err) {
        console.error("Animation error:", err);
        setAnimationStage('idle');
      }
    };
    
    // Start the animation sequence
    runAnimationSequence();
    
    // Cleanup
    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
    };
  };
  
  // Run main animation sequence
  useEffect(() => {
    // Clear any existing animation timers
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
    }
    
    // Reset highlights
    setCurrentHighlight({ channel: -1, bankGroup: -1, bank: -1 });
    
    // Start animation if we have an active command
    if (simulationState.status === 'running' && activeCommand) {
      runDetailedAnimation(activeCommand.type);
    } else if (simulationState.status !== 'running') {
      // Stop animations when idle
      setAnimationStage('idle');
      cpuToControllerAnimation.stop();
      controllerToPhyAnimation.stop();
      phyToMemoryAnimation.stop();
      dataBusAnimation.stop();
      bankStorageAnimation.stop();
      setDataValue(null);
    }
    
    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
    };
  }, [
    simulationState.status, 
    activeCommand?.id, // React to changes in the active command ID
    activeCommand?.type // React to changes in the active command type
  ]);
  
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

  // Helper function to get a readable animation stage name
  const getAnimationStageName = () => {
    switch(animationStage) {
      // Common stages
      case 'cpu_to_controller': return 'CPU → Controller';
      case 'processing_in_controller': return 'Processing in Controller';
      case 'controller_to_phy': return 'Controller → PHY';
      case 'phy_to_memory': return 'PHY → Memory';
      case 'completed': return 'Command Completed';
      
      // READ specific stages
      case 'check_row_activation': return 'Checking Row Activation';
      case 'cas_latency': return 'CAS Latency (tCAS)';
      case 'read_from_bank': return 'Reading from Bank';
      case 'sense_amplifiers': return 'Activating Sense Amplifiers';
      case 'internal_data_bus': return 'Internal Data Bus Transfer';
      case 'data_on_bus': return 'Data on External Bus';
      case 'data_to_controller': return 'Data → Controller';
      case 'data_to_cpu': return 'Data → CPU';
      
      // WRITE specific stages
      case 'store_in_bank': return 'Storing in Bank';
      
      // ACTIVATE specific stages
      case 'activate_row': return 'Activating Row';
      
      // PRECHARGE specific stages
      case 'precharge': return 'Precharging Bank';
      
      // REFRESH specific stages
      case 'refresh': return 'Refreshing Memory';
      
      default: return 'Idle';
    }
  };

  // Render confetti particles
  const Confetti = () => {
    const particles = Array.from({ length: 30 }, (_, i) => i);
    const colors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
    
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((id) => {
          const color = colors[Math.floor(Math.random() * colors.length)];
          const size = Math.random() * 8 + 4;
          const x = Math.random() * 100;
          const delay = Math.random() * 0.5;
          
          return (
            <motion.div
              key={id}
              className="absolute"
              style={{
                width: size,
                height: size,
                borderRadius: '2px',
                backgroundColor: color,
                top: '60px',
                left: `${620 + Math.random() * 60}px`,
              }}
              initial={{ opacity: 1, y: 0, x: 0, rotate: 0 }}
              animate={{ 
                opacity: [1, 0.8, 0], 
                y: [0, -30 - Math.random() * 70], 
                x: [0, (Math.random() - 0.5) * 60],
                rotate: [0, Math.random() * 360]
              }}
              transition={{ 
                duration: 1.5 + Math.random(),
                delay: delay,
                ease: "easeOut" 
              }}
            />
          );
        })}
      </div>
    );
  };

  // Memory Bank Visualization with detailed components
  const MemoryBankDetail = () => {
    if (currentHighlight.channel === -1) return null;
    
    return (
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Memory Bank Highlight */}
        <rect 
          x="630" 
          y="45" 
          width="80" 
          height="30" 
          rx="2" 
          fill="#D1FAE5" 
          stroke="#10B981" 
          strokeWidth="1"
          strokeDasharray="2 1"
        />
        
        {/* Bank Info with detailed addressing */}
        <text x="670" y="57" textAnchor="middle" fontFamily="Inter" fontSize="7" fill="#047857">
          {`CH:${currentHighlight.channel} BG:${currentHighlight.bankGroup} B:${currentHighlight.bank}`}
        </text>
        
        {/* Show row buffer for READ operation */}
        {animationStage === 'check_row_activation' && (
          <g>
            <rect 
              x="635" 
              y="62" 
              width="70" 
              height="3" 
              rx="1" 
              fill="#D1D5DB" 
              stroke="#9CA3AF" 
              strokeWidth="0.5"
            />
            <text x="670" y="66" textAnchor="middle" fontFamily="Inter" fontSize="4" fill="#6B7280">
              Row Buffer Check
            </text>
          </g>
        )}
        
        {/* Show CAS Latency timing */}
        {animationStage === 'cas_latency' && (
          <g>
            <rect 
              x="635" 
              y="62" 
              width="70" 
              height="10" 
              rx="1" 
              fill="#FEF3C7" 
              stroke="#F59E0B" 
              strokeWidth="0.5"
              strokeDasharray="1 1"
            />
            <text x="670" y="69" textAnchor="middle" fontFamily="Inter" fontSize="5" fill="#B45309">
              {dataValue || "tCAS: 16 cycles"}
            </text>
          </g>
        )}
        
        {/* Sense Amplifiers for READ operation */}
        {animationStage === 'sense_amplifiers' && (
          <g>
            <rect 
              x="635" 
              y="62" 
              width="70" 
              height="8" 
              rx="1" 
              fill="#FEE2E2" 
              stroke="#EF4444" 
              strokeWidth="0.5"
            />
            <text x="670" y="68" textAnchor="middle" fontFamily="Inter" fontSize="5" fill="#B91C1C">
              Sense Amplifiers
            </text>
          </g>
        )}
        
        {/* Internal data bus for READ operation */}
        {animationStage === 'internal_data_bus' && (
          <g>
            <rect 
              x="635" 
              y="62" 
              width="70" 
              height="2" 
              rx="1" 
              fill="#E0E7FF" 
              stroke="#6366F1" 
              strokeWidth="0.5"
            />
            <motion.rect 
              x="645" 
              y="60" 
              width="10" 
              height="6" 
              rx="1" 
              fill="#EF4444"
              animate={{ 
                x: [645, 685],
                transition: { duration: 0.8, ease: "linear", repeat: 1, repeatType: "reverse" }
              }}
            />
            <text x="670" y="68" textAnchor="middle" fontFamily="Inter" fontSize="5" fill="#4F46E5">
              Internal Data Bus
            </text>
          </g>
        )}
        
        {/* Row Visualization - For ACTIVATE/READ/WRITE operations */}
        {['activate_row', 'read_from_bank', 'store_in_bank'].includes(animationStage) && (
          <motion.g>
            {/* Row buffer structure */}
            <motion.rect 
              x="640" 
              y="60" 
              width="60" 
              height="8" 
              rx="1" 
              fill={['READ', 'WRITE'].includes(activeCommand?.type || '') ? "#93C5FD" : "#C4B5FD"}
              initial={{ scaleY: 0, opacity: 0 }}
              animate={bankStorageAnimation}
              style={{ transformOrigin: "center top" }}
            />
            
            {/* Row address label */}
            <text x="645" y="66" textAnchor="start" fontFamily="Inter" fontSize="4" fill="#1F2937">
              {activeCommand?.row && `Row: ${activeCommand.row}`}
            </text>
            
            {/* Column address for READ/WRITE */}
            {['READ', 'WRITE'].includes(activeCommand?.type || '') && (
              <text x="695" y="66" textAnchor="end" fontFamily="Inter" fontSize="4" fill="#1F2937">
                {activeCommand?.column && `Col: ${activeCommand.column}`}
              </text>
            )}
          </motion.g>
        )}
        
        {/* Data Value - Only show for READ/WRITE when data is present */}
        {['data_on_bus', 'store_in_bank', 'read_from_bank'].includes(animationStage) && dataValue && (
          <text x="670" y="75" textAnchor="middle" fontFamily="monospace" fontSize="6" fill="#1F2937">
            {dataValue}
          </text>
        )}

        {/* Bank Structure Visualization - More detailed for educational purposes */}
        {['check_row_activation', 'read_from_bank', 'store_in_bank', 'sense_amplifiers'].includes(animationStage) && (
          <g transform="translate(640, 83)">
            <rect width="60" height="10" rx="1" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="0.5" />
            <text x="30" y="7" textAnchor="middle" fontFamily="Inter" fontSize="4" fill="#6B7280">
              Bank Array (16K Rows x 1K Columns)
            </text>
            {/* Mini array visualization */}
            <g transform="translate(5, 12)">
              {Array.from({length: 5}).map((_, i) => (
                <rect 
                  key={i} 
                  x={i * 10} 
                  y="0" 
                  width="8" 
                  height="1" 
                  fill={i === 2 ? "#EF4444" : "#E5E7EB"}
                />
              ))}
            </g>
          </g>
        )}
      </motion.g>
    );
  };

  // Calculate completion info
  const completionInfo = 
    completedCommandsCount > 0 ? 
    `Completed: ${completedCommandsCount}/${simulationState.commandQueue.length}` : 
    simulationState.commandQueue.length > 0 ? 
    'No commands completed yet' : 'No commands in queue';

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-neutral-800">Data Transfer Animation</h2>
        <div className="flex space-x-2 items-center">
          <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded flex items-center">
            <span className={`w-2 h-2 rounded-full mr-1 ${simulationState.status === 'running' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
            {simulationState.status === 'running' ? 'Active' : 'Idle'}
          </div>
          <div className="text-xs font-medium bg-blue-50 text-blue-600 px-2 py-1 rounded">
            {completionInfo}
          </div>
        </div>
      </div>
      
      {/* Animation Stage Indicator */}
      <div className="flex items-center mb-3">
        <div className="text-xs font-medium bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full">
          <span className="mr-1">Stage:</span>
          <span>{getAnimationStageName()}</span>
        </div>
        {activeCommand && (
          <div 
            className="ml-2 text-xs px-2 py-1 rounded-full" 
            style={{ 
              backgroundColor: `${getCommandColor(activeCommand.type)}20`, 
              color: getCommandColor(activeCommand.type) 
            }}
          >
            {activeCommand.type}
          </div>
        )}
      </div>

      <div className="border border-gray-200 rounded-lg p-4 h-60 relative">
        {/* Show confetti when a command completes */}
        {showConfetti && <Confetti />}
        
        <svg width="100%" height="100%" viewBox="0 0 800 140">
          {/* CPU Component */}
          <rect x="20" y="40" width="100" height="40" rx="4" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="2"></rect>
          <text x="70" y="65" textAnchor="middle" fontFamily="Inter" fontSize="12" fill="#1F2937">CPU</text>
          
          {/* Controller - Color changes based on activity */}
          <rect 
            x="220" 
            y="40" 
            width="100" 
            height="40" 
            rx="4" 
            fill={simulationState.currentState !== 'IDLE' ? '#DBEAFE' : '#F3F4F6'} 
            stroke={simulationState.currentState !== 'IDLE' ? '#3B82F6' : '#9CA3AF'} 
            strokeWidth={simulationState.currentState !== 'IDLE' ? 3 : 2}
          ></rect>
          <text x="270" y="65" textAnchor="middle" fontFamily="Inter" fontSize="12" fill="#1F2937">
            Controller
            <tspan x="270" y="80" fontSize="8" fill="#6B7280">
              {simulationState.currentState !== 'IDLE' ? simulationState.currentState : ''}
            </tspan>
          </text>
          
          {/* PHY Interface */}
          <rect 
            x="420" 
            y="40" 
            width="100" 
            height="40" 
            rx="4" 
            fill={['READ', 'WRITE', 'REFRESH', 'ACTIVATE', 'PRECHARGE'].includes(simulationState.currentState) ? '#E0E7FF' : '#F3F4F6'} 
            stroke={['READ', 'WRITE', 'REFRESH', 'ACTIVATE', 'PRECHARGE'].includes(simulationState.currentState) ? '#6366F1' : '#9CA3AF'} 
            strokeWidth={['READ', 'WRITE', 'REFRESH', 'ACTIVATE', 'PRECHARGE'].includes(simulationState.currentState) ? 3 : 2}
          ></rect>
          <text x="470" y="65" textAnchor="middle" fontFamily="Inter" fontSize="12" fill="#1F2937">PHY</text>
          
          {/* Memory */}
          <rect 
            x="620" 
            y="40" 
            width="100" 
            height="40" 
            rx="4" 
            fill={simulationState.memoryState.activeBank !== undefined ? '#DCFCE7' : '#F3F4F6'} 
            stroke={simulationState.memoryState.activeBank !== undefined ? '#10B981' : '#9CA3AF'} 
            strokeWidth={simulationState.memoryState.activeBank !== undefined ? 3 : 2}
          ></rect>
          <text x="670" y="65" textAnchor="middle" fontFamily="Inter" fontSize="12" fill="#1F2937">Memory</text>
          
          {/* Detailed memory bank rendering */}
          <MemoryBankDetail />
          
          {/* Connection Lines */}
          <line x1="120" y1="60" x2="220" y2="60" stroke="#9CA3AF" strokeWidth="2"></line>
          <line x1="320" y1="60" x2="420" y2="60" stroke="#9CA3AF" strokeWidth="2"></line>
          <line x1="520" y1="60" x2="620" y2="60" stroke="#9CA3AF" strokeWidth="2"></line>
          
          {/* Data bus visualization */}
          <g transform="translate(520, 85)">
            <rect width="100" height="12" rx="2" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="1" />
            <text x="50" y="9" textAnchor="middle" fontFamily="Inter" fontSize="6" fill="#6B7280">DATA BUS (64-bit)</text>
            
            {/* Data value moving on bus - Only show for READ/WRITE */}
            {['data_on_bus', 'store_in_bank', 'read_from_bank'].includes(animationStage) && dataValue && (
              <motion.g
                animate={dataBusAnimation}
                initial={{ opacity: 0, y: 10 }}
              >
                <rect x="5" y="-12" width="90" height="10" rx="2" fill={activeCommand?.type === 'READ' ? "#FEE2E2" : "#DBEAFE"} />
                <text x="50" y="-5" textAnchor="middle" fontFamily="monospace" fontSize="6" fill="#1F2937">
                  {dataValue}
                </text>
              </motion.g>
            )}
          </g>
          
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
          
          {/* Memory Structure Details */}
          <g transform="translate(30, 110)">
            <text x="0" y="0" fontFamily="Inter" fontSize="7" fontWeight="bold" fill="#6B7280">Memory Structure:</text>
            <text x="0" y="10" fontFamily="Inter" fontSize="6" fill="#6B7280">• 2 Channels, 4 Bank Groups/Channel, 4 Banks/Group</text>
            <text x="0" y="18" fontFamily="Inter" fontSize="6" fill="#6B7280">• Each Bank: 16K Rows × 1K Columns</text>
            <text x="0" y="26" fontFamily="Inter" fontSize="6" fill="#6B7280">• Data Bus: 64-bit width, 4.8 Gbps/pin (DDR5-4800)</text>
          </g>
          
          {/* Command Types Legend */}
          <g transform="translate(550, 110)">
            <text x="0" y="0" fontFamily="Inter" fontSize="7" fontWeight="bold" fill="#6B7280">Command Types:</text>
            <g transform="translate(0, 8)">
              <rect width="10" height="6" fill="#3B82F6"></rect>
              <text x="15" y="5" fontFamily="Inter" fontSize="6" fill="#1F2937">WRITE</text>
              
              <rect x="60" width="10" height="6" fill="#EF4444"></rect>
              <text x="75" y="5" fontFamily="Inter" fontSize="6" fill="#1F2937">READ</text>
              
              <rect x="120" width="10" height="6" fill="#8B5CF6"></rect>
              <text x="135" y="5" fontFamily="Inter" fontSize="6" fill="#1F2937">ACTIVATE</text>
            </g>
            <g transform="translate(0, 18)">
              <rect width="10" height="6" fill="#F59E0B"></rect>
              <text x="15" y="5" fontFamily="Inter" fontSize="6" fill="#1F2937">PRECHARGE</text>
              
              <rect x="60" width="10" height="6" fill="#10B981"></rect>
              <text x="75" y="5" fontFamily="Inter" fontSize="6" fill="#1F2937">REFRESH</text>
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
};

export default DataTransferVisualizer;
