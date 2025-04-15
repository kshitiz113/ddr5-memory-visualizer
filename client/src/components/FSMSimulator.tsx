import { motion } from 'framer-motion';
import { useSimulationStore } from '@/lib/store';
import { useEffect, useState, useRef } from 'react';

// Define FSM state positions
const statePositions = {
  'IDLE': { x: 400, y: 60 },
  'ACTIVATE': { x: 250, y: 150 },
  'READ': { x: 400, y: 240 },
  'WRITE': { x: 550, y: 150 },
  'PRECHARGE': { x: 100, y: 240 },
  'REFRESH': { x: 700, y: 240 }
};

// Define possible transitions between states
const transitions = {
  'IDLE': ['ACTIVATE', 'READ', 'WRITE', 'PRECHARGE', 'REFRESH'],
  'ACTIVATE': ['IDLE', 'READ', 'WRITE'],
  'READ': ['IDLE', 'WRITE', 'PRECHARGE'],
  'WRITE': ['IDLE', 'READ', 'PRECHARGE'],
  'PRECHARGE': ['IDLE', 'ACTIVATE'],
  'REFRESH': ['IDLE']
};

// Path generators for transitions
const getPathBetweenStates = (from: string, to: string) => {
  if (!from || !to || from === to) return '';
  
  const fromPos = statePositions[from as keyof typeof statePositions];
  const toPos = statePositions[to as keyof typeof statePositions];
  
  if (!fromPos || !toPos) return '';
  
  // Generate a curved path
  const midX = (fromPos.x + toPos.x) / 2;
  const midY = (fromPos.y + toPos.y) / 2 - 30; // Curve upward
  
  return `M ${fromPos.x} ${fromPos.y} Q ${midX} ${midY} ${toPos.x} ${toPos.y}`;
};

// Get fixed paths for predefined transitions
const getTransitionPath = (from: string, to: string) => {
  const paths: Record<string, string> = {
    'IDLE-ACTIVATE': 'M 370 85 Q 320 100 280 130',
    'IDLE-WRITE': 'M 430 85 Q 450 120 530 130',
    'ACTIVATE-PRECHARGE': 'M 230 185 Q 200 210 130 220',
    'ACTIVATE-READ': 'M 280 175 Q 320 200 370 220',
    'READ-WRITE': 'M 440 240 Q 490 240 520 180',
    'WRITE-IDLE': 'M 530 115 Q 480 80 430 70',
    'PRECHARGE-READ': 'M 140 240 Q 220 280 360 260',
    'READ-REFRESH': 'M 440 240 Q 540 270 670 250',
    'REFRESH-IDLE': 'M 690 200 Q 650 120 430 60',
    'PRECHARGE-IDLE': 'M 130 215 Q 200 140 370 70',
    'READ-IDLE': 'M 380 205 Q 360 140 380 90',
    'WRITE-PRECHARGE': 'M 520 180 Q 400 230 140 240',
    'READ-PRECHARGE': 'M 360 240 Q 280 260 140 240',
    'ACTIVATE-IDLE': 'M 280 130 Q 320 100 370 85',
    'ACTIVATE-WRITE': 'M 290 150 Q 400 130 510 150',
  };
  
  const key = `${from}-${to}`;
  if (paths[key]) {
    return paths[key];
  }
  
  return getPathBetweenStates(from, to);
};

const FSMSimulator = () => {
  const { simulationState } = useSimulationStore();
  const currentState = simulationState.currentState;
  const [prevState, setPrevState] = useState<string>('IDLE');
  const [showTransition, setShowTransition] = useState(false);
  const [transitionPath, setTransitionPath] = useState('');
  const lastState = useRef(currentState);
  
  // Track state transitions for animation
  useEffect(() => {
    if (currentState !== lastState.current) {
      // Store the previous state before updating
      const previousState = lastState.current;
      lastState.current = currentState;
      setPrevState(previousState);
      
      // Set the transition path
      const path = getTransitionPath(previousState, currentState);
      setTransitionPath(path);
      
      // Show transition animation
      setShowTransition(true);
      
      // Hide transition after animation completes
      const timer = setTimeout(() => {
        setShowTransition(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [currentState]);
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-neutral-800">Controller FSM Simulator</h2>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">Current State:</span>
          <span className="text-xs font-mono bg-indigo-500 text-white px-2 py-1 rounded">{currentState}</span>
          {showTransition && (
            <span className="text-xs font-mono bg-amber-100 text-amber-800 px-2 py-1 ml-2 rounded flex items-center">
              <span className="animate-pulse mr-1 inline-block w-2 h-2 rounded-full bg-amber-500"></span>
              Transition: {prevState} → {currentState}
            </span>
          )}
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-4">
        <svg width="100%" height="300" viewBox="0 0 800 300">
          {/* FSM States */}
          <g>
            {/* IDLE State */}
            <circle 
              cx={statePositions.IDLE.x} 
              cy={statePositions.IDLE.y} 
              r="40" 
              fill={currentState === 'IDLE' ? '#6366F1' : '#F3F4F6'} 
              stroke={currentState === 'IDLE' ? '#4F46E5' : '#9CA3AF'} 
              strokeWidth={currentState === 'IDLE' ? 3 : 2}
            ></circle>
            <text 
              x={statePositions.IDLE.x} 
              y={statePositions.IDLE.y} 
              textAnchor="middle" 
              dominantBaseline="middle" 
              fontFamily="Inter" 
              fontSize="14" 
              fill={currentState === 'IDLE' ? 'white' : '#1F2937'}
            >IDLE</text>
            
            {/* ACTIVATE State */}
            <circle 
              cx={statePositions.ACTIVATE.x} 
              cy={statePositions.ACTIVATE.y} 
              r="40" 
              fill={currentState === 'ACTIVATE' ? '#6366F1' : '#F3F4F6'} 
              stroke={currentState === 'ACTIVATE' ? '#4F46E5' : '#9CA3AF'} 
              strokeWidth={currentState === 'ACTIVATE' ? 3 : 2}
            ></circle>
            <text 
              x={statePositions.ACTIVATE.x} 
              y={statePositions.ACTIVATE.y} 
              textAnchor="middle" 
              dominantBaseline="middle" 
              fontFamily="Inter" 
              fontSize="14" 
              fill={currentState === 'ACTIVATE' ? 'white' : '#1F2937'}
            >ACTIVATE</text>
            
            {/* READ State */}
            <circle 
              cx={statePositions.READ.x} 
              cy={statePositions.READ.y} 
              r="40" 
              fill={currentState === 'READ' ? '#6366F1' : '#F3F4F6'} 
              stroke={currentState === 'READ' ? '#4F46E5' : '#9CA3AF'} 
              strokeWidth={currentState === 'READ' ? 3 : 2}
            ></circle>
            <text 
              x={statePositions.READ.x} 
              y={statePositions.READ.y} 
              textAnchor="middle" 
              dominantBaseline="middle" 
              fontFamily="Inter" 
              fontSize="14" 
              fill={currentState === 'READ' ? 'white' : '#1F2937'}
            >READ</text>
            
            {/* WRITE State */}
            <circle 
              cx={statePositions.WRITE.x} 
              cy={statePositions.WRITE.y} 
              r="40" 
              fill={currentState === 'WRITE' ? '#6366F1' : '#F3F4F6'} 
              stroke={currentState === 'WRITE' ? '#4F46E5' : '#9CA3AF'} 
              strokeWidth={currentState === 'WRITE' ? 3 : 2}
            ></circle>
            <text 
              x={statePositions.WRITE.x} 
              y={statePositions.WRITE.y} 
              textAnchor="middle" 
              dominantBaseline="middle" 
              fontFamily="Inter" 
              fontSize="14" 
              fill={currentState === 'WRITE' ? 'white' : '#1F2937'}
            >WRITE</text>
            
            {/* PRECHARGE State */}
            <circle 
              cx={statePositions.PRECHARGE.x} 
              cy={statePositions.PRECHARGE.y} 
              r="40" 
              fill={currentState === 'PRECHARGE' ? '#6366F1' : '#F3F4F6'} 
              stroke={currentState === 'PRECHARGE' ? '#4F46E5' : '#9CA3AF'} 
              strokeWidth={currentState === 'PRECHARGE' ? 3 : 2}
            ></circle>
            <text 
              x={statePositions.PRECHARGE.x} 
              y={statePositions.PRECHARGE.y} 
              textAnchor="middle" 
              dominantBaseline="middle" 
              fontFamily="Inter" 
              fontSize="12" 
              fill={currentState === 'PRECHARGE' ? 'white' : '#1F2937'}
            >PRECHARGE</text>
            
            {/* REFRESH State */}
            <circle 
              cx={statePositions.REFRESH.x} 
              cy={statePositions.REFRESH.y} 
              r="40" 
              fill={currentState === 'REFRESH' ? '#6366F1' : '#F3F4F6'} 
              stroke={currentState === 'REFRESH' ? '#4F46E5' : '#9CA3AF'} 
              strokeWidth={currentState === 'REFRESH' ? 3 : 2}
            ></circle>
            <text 
              x={statePositions.REFRESH.x} 
              y={statePositions.REFRESH.y} 
              textAnchor="middle" 
              dominantBaseline="middle" 
              fontFamily="Inter" 
              fontSize="14" 
              fill={currentState === 'REFRESH' ? 'white' : '#1F2937'}
            >REFRESH</text>
          </g>
          
          {/* State Transitions */}
          <g stroke="#9CA3AF" strokeWidth="2" fill="none">
            {/* Generate all standard transitions */}
            <path d="M 370 85 Q 320 100 280 130" markerEnd="url(#arrowhead)"></path>
            <path d="M 360 85 Q 450 120 530 130" markerEnd="url(#arrowhead)"></path>
            <path d="M 230 185 Q 200 210 130 220" markerEnd="url(#arrowhead)"></path>
            <path d="M 280 175 Q 320 200 370 220" markerEnd="url(#arrowhead)"></path>
            <path d="M 440 240 Q 490 240 520 180" markerEnd="url(#arrowhead)"></path>
            <path d="M 530 115 Q 480 80 430 70" markerEnd="url(#arrowhead)"></path>
            <path d="M 140 240 Q 220 280 360 260" markerEnd="url(#arrowhead)"></path>
            <path d="M 440 240 Q 540 270 670 250" markerEnd="url(#arrowhead)"></path>
            <path d="M 690 200 Q 650 120 430 60" markerEnd="url(#arrowhead)"></path>
          </g>
          
          {/* Current Transition Highlight */}
          {showTransition && transitionPath && (
            <motion.path 
              d={transitionPath}
              stroke="#6366F1" 
              strokeWidth="3" 
              fill="none" 
              markerEnd="url(#arrowheadActive)" 
              strokeDasharray="5,2"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
          )}
          
          {/* Arrowheads */}
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#9CA3AF" />
            </marker>
            <marker id="arrowheadActive" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#6366F1" />
            </marker>
          </defs>
        </svg>
      </div>
    </div>
  );
};

export default FSMSimulator;
