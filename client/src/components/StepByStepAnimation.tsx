import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MemoryCommand, SimulationState, CommandType } from '@shared/types';
import { Button } from './ui/button';
import { 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  RotateCcw, 
  Info, 
  HelpCircle,
  ZoomIn,
  ZoomOut,
  Maximize,
  Layers
} from 'lucide-react';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from './ui/tooltip';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from './ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from './ui/dialog';
import { Slider } from './ui/slider';

interface StepByStepAnimationProps {
  commandType: CommandType;
  simulationState: SimulationState;
  initialStep?: number;
}

// Define animation steps for each command type
const commandSteps: Record<CommandType, string[]> = {
  'READ': [
    'CPU issues READ request', 
    'Memory controller receives command',
    'Check if the row is active',
    'Wait for CAS latency (tCAS)',
    'DRAM sense amplifiers activate',
    'Data flows on internal memory bus',
    'Data placed on external data bus',
    'Data travels to memory controller',
    'Data delivered to CPU',
    'READ operation complete'
  ],
  'WRITE': [
    'CPU issues WRITE request with data',
    'Memory controller receives command and data',
    'Check if the row is active',
    'Wait for write recovery time (tWR)',
    'Data prepared for transmission',
    'Data placed on external data bus',
    'Data arrives at memory interface',
    'Data written to row buffer',
    'Write acknowledgement sent',
    'WRITE operation complete'
  ],
  'ACTIVATE': [
    'Memory controller issues ACTIVATE command',
    'Address decoder selects target bank/row',
    'Wait for row activation timing (tRCD)',
    'Wordline activated for target row',
    'Charge sharing between cells and sense amps',
    'Sense amplifiers detect and amplify signals',
    'Row data transferred to row buffer',
    'Row fully activated',
    'Bank state changed to ACTIVE',
    'ACTIVATE operation complete'
  ],
  'PRECHARGE': [
    'Memory controller issues PRECHARGE command',
    'Check if bank is in ACTIVE state',
    'Wait for precharge timing (tRP)',
    'Modified data written back to array cells',
    'Sense amplifiers deactivated',
    'Bitlines reset to precharge voltage',
    'Bank state changed to IDLE',
    'Row address buffer cleared',
    'Bank ready for new ACTIVATE',
    'PRECHARGE operation complete'
  ],
  'REFRESH': [
    'Memory controller issues REFRESH command',
    'All bank operations suspended',
    'Wait for refresh cycle time (tRFC)',
    'Precharge all banks',
    'Activate refresh row counter',
    'Refresh circuitry restores cell charges',
    'Multiple rows refreshed simultaneously',
    'Refresh operation completes',
    'Banks return to IDLE state',
    'REFRESH operation complete'
  ],
  'ZQCAL': [
    'Memory controller issues ZQCAL command',
    'All memory operations paused',
    'ZQ calibration circuit activated',
    'Reference resistor connected to ZQ pin',
    'Output driver impedance measured',
    'Impedance calibration values calculated',
    'Output driver settings updated',
    'Termination resistor calibration',
    'Calibration complete',
    'ZQCAL operation complete'
  ]
};

// Technical descriptions for each step
const stepDescriptions: Record<CommandType, string[]> = {
  'ZQCAL': [
    'The memory controller issues a ZQCAL command to calibrate the DDR5 memory output driver impedance and on-die termination.',
    'All memory operations are paused to ensure stable electrical conditions during calibration.',
    'The ZQ calibration circuit is activated in the memory chips.',
    'The external reference resistor connected to the ZQ pin (typically 240 ohms) is used as a baseline.',
    'The memory chip measures its output driver impedance against the reference resistor.',
    'Based on the measurement, calibration values are calculated to adjust the output driver characteristics.',
    'The output driver settings are updated to maintain the target impedance (typically 40 ohms).',
    'The on-die termination (ODT) resistors are also calibrated for optimal signal integrity.',
    'The calibration circuit completes adjustments and stores new settings.',
    'The ZQCAL operation is complete. This calibration ensures signal integrity despite voltage and temperature variations.'
  ],
  'READ': [
    'The CPU initiates a memory read operation by sending a READ command to the memory controller with a specific memory address.',
    'The memory controller receives the command and decodes the address into channel, bank, row, and column coordinates.',
    'The controller verifies if the required row is already active in the bank\'s row buffer. A row buffer hit avoids the need for ACTIVATE command.',
    'CAS latency (Column Access Strobe) is the time delay between sending the column address to the DRAM and the moment data becomes available. For DDR5, tCAS is typically 14-22 cycles.',
    'The sense amplifiers in the DRAM detect the small voltage differences in the selected column cells and amplify them to full digital levels.',
    'The amplified data moves from the sense amplifiers to the internal I/O circuitry of the memory chip.',
    'The data is placed on the external data bus that connects the memory chip to the memory controller. DDR5 transfers data on both the rising and falling edges of the clock signal.',
    'The data travels across the physical data bus to the memory controller. DDR5 uses a 64-bit data bus.',
    'The memory controller forwards the retrieved data to the CPU through the system bus.',
    'The read operation is complete. The memory system is ready to process the next command in queue.'
  ],
  'WRITE': [
    'The CPU initiates a memory write operation by sending a WRITE command and the data to be stored to the memory controller.',
    'The memory controller receives the command and data, then decodes the address into channel, bank, row, and column coordinates.',
    'The controller verifies if the required row is already active in the bank\'s row buffer. A row buffer hit avoids the need for ACTIVATE command.',
    'Write recovery time (tWR) is the delay required after a write operation before a precharge command can be issued, ensuring data is properly stored in the memory array.',
    'The memory controller prepares the data packets and addressing information for transmission to the DRAM.',
    'The data is placed on the external data bus. DDR5 transfers data on both the rising and falling edges of the clock signal.',
    'The data travels across the physical data bus and arrives at the memory chip interface.',
    'The data is written to the active row in the row buffer. The row buffer acts as a cache between the DRAM array and I/O circuits.',
    'After the data is successfully written to the row buffer, an acknowledgement may be sent back to the controller.',
    'The write operation is complete. The memory system is ready to process the next command in queue. Note: The data in the row buffer will be written back to the memory array cells when the row is eventually precharged.'
  ],
  'ACTIVATE': [
    'The memory controller issues an ACTIVATE command with the bank and row address when the required row is not currently active.',
    'The DRAM\'s address decoder interprets the row address and selects the appropriate bank and row to activate.',
    'Row activation timing (tRCD) is the delay between row activation and when column access (READ/WRITE) can begin. For DDR5, tRCD is typically 14-18 cycles.',
    'The selected wordline in the DRAM array is energized, connecting the row\'s memory cells to their respective bitlines.',
    'When the cell capacitors connect to the bitlines, charge sharing occurs, creating a small voltage differential on the bitlines.',
    'The sense amplifiers detect the small voltage differentials and amplify them to full logic levels (0V or VDD).',
    'The amplified data from all cells in the row is transferred to the row buffer, which acts as a cache for the active row.',
    'The row is now fully active and accessible for READ or WRITE operations. The data in all columns of that row is available in the row buffer.',
    'The bank\'s internal state machine changes to ACTIVE state, with the current row address registered.',
    'The ACTIVATE operation is complete. The memory controller can now issue READ or WRITE commands to access columns within the activated row.'
  ],
  'PRECHARGE': [
    'The memory controller issues a PRECHARGE command when it needs to access a different row in the same bank.',
    'The memory controller verifies that the bank is in ACTIVE state before issuing the precharge command.',
    'Precharge timing (tRP) is the time required to precharge a bank before it can be activated again. For DDR5, tRP is typically 14-18 cycles.',
    'If any data in the row buffer was modified by WRITE operations, that data is written back to the corresponding memory cells in the DRAM array.',
    'The sense amplifiers are turned off, disconnecting the row buffer from the bitlines.',
    'The bitlines are charged to a predetermined voltage level (typically VDD/2) in preparation for the next row activation.',
    'The bank\'s state machine transitions from ACTIVE to IDLE state, indicating the bank has no active row.',
    'The row address buffer is cleared, removing the association with the previously active row.',
    'The bank is now ready to activate a new row with an ACTIVATE command.',
    'The PRECHARGE operation is complete. The memory controller can issue a new ACTIVATE command for a different row in this bank.'
  ],
  'REFRESH': [
    'The memory controller issues a REFRESH command periodically to prevent data loss in DRAM cells due to charge leakage. Every row must be refreshed within the refresh interval (typically 32ms or 64ms).',
    'All banks stop processing other commands to prioritize the refresh operation.',
    'Refresh cycle time (tRFC) is the time required to complete a refresh operation. For DDR5, this is approximately 350ns and scales with density.',
    'All banks are precharged to ensure data integrity during the refresh operation.',
    'An internal row counter selects which rows to refresh. This counter automatically increments after each refresh.',
    'Refresh circuitry recharges the capacitors in the memory cells to restore their charge to the proper levels.',
    'In modern DRAM, multiple rows can be refreshed simultaneously to improve efficiency.',
    'The refresh operation finishes after the tRFC period, having restored the charge in the targeted rows.',
    'All banks return to the IDLE state, ready to accept new commands.',
    'The REFRESH operation is complete. The memory controller updates its refresh scheduling to ensure all rows are refreshed within the required timeframe.'
  ]
};

// Detailed explanations for educational purposes
const educationalContent: Record<CommandType, { title: string, content: string }> = {
  'ZQCAL': {
    title: 'How DDR5 ZQCAL Operations Work',
    content: `
      <h4>Purpose of ZQ Calibration</h4>
      <p>The ZQCAL command calibrates the DDR5 memory output driver impedance and on-die termination to maintain signal integrity despite variations in voltage, temperature, and manufacturing process.</p>
      
      <h4>ZQ Pin and Reference</h4>
      <p>DDR5 memory connects a precise external resistor (typically 240 ohms) to the ZQ pin, which serves as a reference for calibration. The memory chip uses this reference to tune its internal output driver and termination impedance.</p>
      
      <h4>Key Timing Parameters</h4>
      <ul>
        <li><strong>tZQCAL:</strong> Long calibration time, performed at initialization (1µs in DDR5)</li>
        <li><strong>tZQCS:</strong> Short calibration time, performed periodically during operation (128ns in DDR5)</li>
      </ul>
      
      <h4>Calibration Process</h4>
      <p>During calibration, the memory chip compares its internal impedance against the external reference resistor and makes digital adjustments to match the target values. This ensures consistent signal quality across all operating conditions.</p>
      
      <h4>Types of ZQ Calibration</h4>
      <ul>
        <li><strong>ZQCL (ZQ Calibration Long):</strong> Full calibration performed at initialization or after significant environmental changes</li>
        <li><strong>ZQCS (ZQ Calibration Short):</strong> Periodic quick recalibration to maintain accuracy during normal operation</li>
      </ul>
      
      <h4>DDR5 Advancements</h4>
      <p>DDR5 features enhanced calibration with finer granularity for better impedance control and improved signal integrity at higher speeds. This allows DDR5 to operate reliably at speeds of 4800 MT/s and beyond.</p>
    `
  },
  'READ': {
    title: 'How DDR5 READ Operations Work',
    content: `
      <h4>Memory Read Hierarchy</h4>
      <p>A READ command in DDR5 memory retrieves data stored in the DRAM cells. The process begins with the CPU requesting data via the memory controller, which translates the request into DRAM commands.</p>
      
      <h4>Row Buffer Mechanism</h4>
      <p>The row buffer acts as a cache between the DRAM cells and I/O circuitry. When a READ command is issued, the data must be in the row buffer, which requires an ACTIVATE command if the row isn't already active. This is why row buffer hit rate significantly impacts performance.</p>
      
      <h4>Key Timing Parameters</h4>
      <ul>
        <li><strong>tCAS (CAS Latency):</strong> Time between column address strobe and data availability (14-22 cycles in DDR5)</li>
        <li><strong>tCCD_L (Column-to-Column Delay):</strong> Minimum time between consecutive READ commands (6 cycles in DDR5)</li>
        <li><strong>tBURST:</strong> Time to transfer a complete burst of data (4 cycles for BL16 in DDR5)</li>
      </ul>
      
      <h4>Data Transfer</h4>
      <p>DDR5 transfers data at both rising and falling clock edges (hence "double data rate"). With a 64-bit bus and 4800 MT/s speed, DDR5 reaches transfer rates of 38.4 GB/s per channel.</p>
      
      <h4>Reading Process at the Circuit Level</h4>
      <p>At the physical level, reading a memory cell involves sense amplifiers detecting small voltage differences between bitlines when wordlines are activated. These small signals (often just millivolts) are amplified to full digital levels for reliable data transfer.</p>
    `
  },
  'WRITE': {
    title: 'How DDR5 WRITE Operations Work',
    content: `
      <h4>Memory Write Process</h4>
      <p>A WRITE command stores data into DRAM cells. The process begins with the CPU sending both the WRITE command and the data to be stored to the memory controller.</p>
      
      <h4>Write Path</h4>
      <p>Data travels from the CPU through the memory controller, over the data bus, to the DRAM chips. It's temporarily stored in the row buffer before eventually being written to the actual memory cells during precharge.</p>
      
      <h4>Key Timing Parameters</h4>
      <ul>
        <li><strong>tCWD (CAS Write Delay):</strong> Time from write command to data placement on bus (12-14 cycles in DDR5)</li>
        <li><strong>tWR (Write Recovery):</strong> Time required after a write before precharge can occur (24+ cycles in DDR5)</li>
        <li><strong>tWTR_L (Write to Read Delay):</strong> Minimum time between write and subsequent read (10+ cycles in DDR5)</li>
      </ul>
      
      <h4>Write Leveling</h4>
      <p>DDR5 implements sophisticated write leveling to ensure proper signal timing across all chips, compensating for different signal path lengths and characteristics.</p>
      
      <h4>Writing Process at the Circuit Level</h4>
      <p>At the circuit level, writing involves forcing the bitlines to the desired voltage levels (high for '1', low for '0'). The sense amplifiers push these voltage levels back to the memory cells when the wordline is activated, charging or discharging the cell capacitors accordingly.</p>
    `
  },
  'ACTIVATE': {
    title: 'How DDR5 ACTIVATE Operations Work',
    content: `
      <h4>Purpose of Activation</h4>
      <p>An ACTIVATE command opens a row of memory cells and copies its contents to the row buffer. This is a necessary step before any READ or WRITE operation can occur (unless the desired row is already active).</p>
      
      <h4>Bank Structure</h4>
      <p>DDR5 memory is organized into channels, with each channel containing multiple bank groups, and each bank group containing multiple banks. Each bank can have only one active row at a time.</p>
      
      <h4>Key Timing Parameters</h4>
      <ul>
        <li><strong>tRCD (Row to Column Delay):</strong> Time between row activation and when column access can begin (14-18 cycles in DDR5)</li>
        <li><strong>tRRD_L (Row to Row Delay, Same Bank Group):</strong> Minimum time between ACTIVATE commands to different banks in the same bank group (6 cycles in DDR5)</li>
        <li><strong>tFAW (Four Activate Window):</strong> Window in which only four activates are allowed (32 cycles in DDR5)</li>
      </ul>
      
      <h4>Activation Mechanism</h4>
      <p>When a row is activated, the wordline for that row is energized, connecting all memory cells in that row to their respective bitlines. Charge sharing occurs between the cell capacitors and the bitlines, creating small voltage differentials that are then amplified by the sense amplifiers.</p>
      
      <h4>Power Considerations</h4>
      <p>Row activation is one of the most power-intensive operations in DRAM, which is why DDR5 implements tFAW and other timing parameters to limit the rate of activations and manage power consumption.</p>
    `
  },
  'PRECHARGE': {
    title: 'How DDR5 PRECHARGE Operations Work',
    content: `
      <h4>Purpose of Precharge</h4>
      <p>A PRECHARGE command closes an open row in a bank and prepares the bank for activating a different row. This is necessary when the memory controller needs to access data in a different row of the same bank.</p>
      
      <h4>Write-Back Mechanism</h4>
      <p>During precharge, any modified data in the row buffer is written back to the memory array cells. This ensures data persistence, as DRAM cells are volatile and require periodic refresh.</p>
      
      <h4>Key Timing Parameters</h4>
      <ul>
        <li><strong>tRP (Row Precharge time):</strong> Time required to precharge a bank before it can be activated again (14-18 cycles in DDR5)</li>
        <li><strong>tRAS (Row Active time):</strong> Minimum time a row must remain active before it can be precharged (32+ cycles in DDR5)</li>
      </ul>
      
      <h4>Auto-Precharge Feature</h4>
      <p>DDR5 supports auto-precharge functionality, allowing READ or WRITE commands to automatically trigger a precharge afterward. This saves the memory controller from explicitly issuing a separate PRECHARGE command.</p>
      
      <h4>Precharge Process at the Circuit Level</h4>
      <p>At the circuit level, precharge involves resetting the bitlines to a midpoint voltage (typically VDD/2) to prepare them for the next sensing operation. The sense amplifiers are disabled, and the wordline is deactivated, disconnecting the memory cells from the bitlines.</p>
    `
  },
  'REFRESH': {
    title: 'How DDR5 REFRESH Operations Work',
    content: `
      <h4>Purpose of Refresh</h4>
      <p>A REFRESH command restores the charge in DRAM cells that gradually leaks over time. Without refreshing, DRAM would lose its stored data within milliseconds.</p>
      
      <h4>Refresh Requirements</h4>
      <p>Every row in a DDR5 DRAM must be refreshed within a specified interval (tREFI), typically 7.8μs per refresh command, with all rows refreshed within 32ms or 64ms depending on operating temperature.</p>
      
      <h4>Key Timing Parameters</h4>
      <ul>
        <li><strong>tRFC (Refresh Cycle time):</strong> Time required to complete a refresh operation (350ns for an 8Gb device, scaling with density)</li>
        <li><strong>tREFI (Refresh Interval):</strong> Average interval between refresh commands (7.8μs in DDR5)</li>
      </ul>
      
      <h4>Refresh Modes in DDR5</h4>
      <p>DDR5 implements advanced refresh schemes including:</p>
      <ul>
        <li><strong>Per-Bank Refresh:</strong> Allows refreshing one bank at a time, reducing the impact on system performance</li>
        <li><strong>Same-Bank Refresh:</strong> Focuses multiple refresh commands on the most leak-prone banks</li>
        <li><strong>Fine Granularity Refresh:</strong> Divides refresh operations into smaller chunks to reduce latency spikes</li>
      </ul>
      
      <h4>Refresh Process at the Circuit Level</h4>
      <p>Refreshing involves reading the data from a row (activating it) and then writing it back (precharging it), effectively restoring the charge in the storage capacitors to their full values.</p>
    `
  }
};

// Components for each animation step
const StepAnimation: React.FC<{
  commandType: CommandType;
  step: number;
  scale: number;
}> = ({ commandType, step, scale }) => {
  // Common elements for all command types
  const CPU = <rect x="20" y="40" width="100" height="40" rx="4" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="2" />;
  const Controller = <rect x="220" y="40" width="100" height="40" rx="4" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="2" />;
  const PHY = <rect x="420" y="40" width="100" height="40" rx="4" fill="#E0E7FF" stroke="#6366F1" strokeWidth="2" />;
  const Memory = <rect x="620" y="40" width="100" height="40" rx="4" fill="#DCFCE7" stroke="#10B981" strokeWidth="2" />;
  
  const CPUText = <text x="70" y="65" textAnchor="middle" fontFamily="Inter" fontSize="12" fill="#1F2937">CPU</text>;
  const ControllerText = <text x="270" y="65" textAnchor="middle" fontFamily="Inter" fontSize="12" fill="#1F2937">Controller</text>;
  const PHYText = <text x="470" y="65" textAnchor="middle" fontFamily="Inter" fontSize="12" fill="#1F2937">PHY</text>;
  const MemoryText = <text x="670" y="65" textAnchor="middle" fontFamily="Inter" fontSize="12" fill="#1F2937">Memory</text>;
  
  const ConnectionLines = (
    <>
      <line x1="120" y1="60" x2="220" y2="60" stroke="#9CA3AF" strokeWidth="2"></line>
      <line x1="320" y1="60" x2="420" y2="60" stroke="#9CA3AF" strokeWidth="2"></line>
      <line x1="520" y1="60" x2="620" y2="60" stroke="#9CA3AF" strokeWidth="2"></line>
    </>
  );
  
  const getColorForCommand = (type: CommandType) => {
    switch (type) {
      case 'READ': return '#EF4444'; // red
      case 'WRITE': return '#3B82F6'; // blue
      case 'ACTIVATE': return '#8B5CF6'; // purple
      case 'PRECHARGE': return '#F59E0B'; // amber
      case 'REFRESH': return '#10B981'; // green
      default: return '#9CA3AF'; // gray
    }
  };
  
  // Command packet animation element
  const CommandPacket = (props: { x: number; y: number; type: CommandType }) => (
    <g>
      <rect 
        x={props.x} 
        y={props.y} 
        width="60" 
        height="20" 
        rx="4" 
        fill={getColorForCommand(props.type)}
        opacity="0.8"
      />
      <text 
        x={props.x + 30} 
        y={props.y + 15} 
        textAnchor="middle" 
        fontFamily="Inter" 
        fontSize="10" 
        fill="white"
      >
        {props.type}
      </text>
    </g>
  );
  
  // Data packet animation element
  const DataPacket = (props: { x: number; y: number; value: string; direction: 'read' | 'write' }) => (
    <g>
      <rect 
        x={props.x} 
        y={props.y} 
        width="90" 
        height="10" 
        rx="2" 
        fill={props.direction === 'read' ? "#FEE2E2" : "#DBEAFE"} 
      />
      <text 
        x={props.x + 45} 
        y={props.y + 7} 
        textAnchor="middle" 
        fontFamily="monospace" 
        fontSize="6" 
        fill="#1F2937"
      >
        {props.value}
      </text>
    </g>
  );
  
  // Bank visualization element
  const MemoryBank = (props: { 
    active?: boolean; 
    x: number; 
    y: number; 
    width: number; 
    height: number;
    showRowBuffer?: boolean;
    rowBufferActive?: boolean;
    showSenseAmps?: boolean;
    showInternal?: boolean;
  }) => (
    <g>
      <rect 
        x={props.x} 
        y={props.y} 
        width={props.width} 
        height={props.height} 
        rx="2" 
        fill={props.active ? "#D1FAE5" : "#F3F4F6"} 
        stroke={props.active ? "#10B981" : "#D1D5DB"} 
        strokeWidth="1"
      />
      
      {props.showRowBuffer && (
        <rect 
          x={props.x + 5} 
          y={props.y + 5} 
          width={props.width - 10} 
          height={8} 
          rx="1" 
          fill={props.rowBufferActive ? "#93C5FD" : "#E5E7EB"}
          stroke={props.rowBufferActive ? "#3B82F6" : "#9CA3AF"}
          strokeWidth="0.5"
        />
      )}
      
      {props.showSenseAmps && (
        <g>
          <rect 
            x={props.x + 5} 
            y={props.y + 18} 
            width={props.width - 10} 
            height={4} 
            rx="1" 
            fill="#FEE2E2" 
            stroke="#EF4444" 
            strokeWidth="0.5"
          />
          <text x={props.x + props.width/2} y={props.y + 21} textAnchor="middle" fontFamily="Inter" fontSize="3" fill="#B91C1C">
            Sense Amplifiers
          </text>
        </g>
      )}
      
      {props.showInternal && (
        <g>
          <rect 
            x={props.x + 5} 
            y={props.y + 26} 
            width={props.width - 10} 
            height={props.height - 31} 
            rx="1" 
            fill="#F3F4F6" 
            stroke="#D1D5DB" 
            strokeWidth="0.5"
          />
          <text x={props.x + props.width/2} y={props.y + 33} textAnchor="middle" fontFamily="Inter" fontSize="3" fill="#6B7280">
            Memory Array
          </text>
          
          {/* Grid of cells */}
          <g>
            {Array.from({length: 3}).map((_, rowIdx) => (
              Array.from({length: 6}).map((_, colIdx) => (
                <rect 
                  key={`cell-${rowIdx}-${colIdx}`}
                  x={props.x + 8 + colIdx * 10} 
                  y={props.y + 36 + rowIdx * 6} 
                  width="8" 
                  height="4" 
                  rx="1"
                  fill="#E5E7EB"
                  stroke="#9CA3AF"
                  strokeWidth="0.2"
                />
              ))
            ))}
          </g>
        </g>
      )}
    </g>
  );
  
  // Timing parameter visualization
  const TimingParameter = (props: { 
    x: number; 
    y: number; 
    width: number; 
    label: string;
    value: string;
    color: string;
  }) => (
    <g>
      <rect 
        x={props.x} 
        y={props.y} 
        width={props.width} 
        height="20" 
        rx="2" 
        fill={`${props.color}20`} 
        stroke={props.color} 
        strokeWidth="1"
        strokeDasharray="2 1"
      />
      <text x={props.x + props.width/2} y={props.y + 10} textAnchor="middle" fontFamily="Inter" fontSize="6" fill={props.color}>
        {props.label}: {props.value}
      </text>
    </g>
  );
  
  // Animation steps based on command type and current step
  const renderStepAnimation = () => {
    // Base elements for all steps
    const baseElements = (
      <>
        {CPU}
        {Controller}
        {PHY}
        {Memory}
        {CPUText}
        {ControllerText}
        {PHYText}
        {MemoryText}
        {ConnectionLines}
        
        {/* Data bus visualization */}
        <g transform="translate(520, 85)">
          <rect width="100" height="12" rx="2" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="1" />
          <text x="50" y="9" textAnchor="middle" fontFamily="Inter" fontSize="6" fill="#6B7280">DATA BUS (64-bit)</text>
        </g>
      </>
    );
    
    // Command type specific elements
    if (commandType === 'READ') {
      // READ command specific animations for each step
      switch (step) {
        case 0: // CPU issues READ request
          return (
            <>
              {baseElements}
              <CommandPacket x={140} y={50} type="READ" />
            </>
          );
        case 1: // Memory controller receives command
          return (
            <>
              {baseElements}
              <CommandPacket x={240} y={50} type="READ" />
              <rect 
                x={220} 
                y={40} 
                width={100} 
                height={40} 
                rx={4} 
                fill="#DBEAFE" 
                stroke="#3B82F6" 
                strokeWidth={3}
              />
            </>
          );
        case 2: // Check if the row is active
          return (
            <>
              {baseElements}
              <MemoryBank 
                x={630} 
                y={45} 
                width={80} 
                height={30} 
                active={true}
                showRowBuffer={true}
                rowBufferActive={true}
              />
              <text x={670} y={57} textAnchor="middle" fontFamily="Inter" fontSize="7" fill="#047857">
                Row buffer status check
              </text>
            </>
          );
        case 3: // Wait for CAS latency
          return (
            <>
              {baseElements}
              <TimingParameter 
                x={420} 
                y={90} 
                width={120} 
                label="CAS Latency" 
                value="16 cycles" 
                color="#F59E0B"
              />
              <MemoryBank 
                x={630} 
                y={45} 
                width={80} 
                height={30} 
                active={true}
                showRowBuffer={true}
                rowBufferActive={true}
              />
            </>
          );
        case 4: // DRAM sense amplifiers activate
          return (
            <>
              {baseElements}
              <MemoryBank 
                x={630} 
                y={45} 
                width={80} 
                height={50} 
                active={true}
                showRowBuffer={true}
                rowBufferActive={true}
                showSenseAmps={true}
                showInternal={true}
              />
            </>
          );
        case 5: // Data flows on internal memory bus
          return (
            <>
              {baseElements}
              <MemoryBank 
                x={630} 
                y={45} 
                width={80} 
                height={50} 
                active={true}
                showRowBuffer={true}
                rowBufferActive={true}
                showSenseAmps={true}
                showInternal={true}
              />
              <rect 
                x={635} 
                y={62} 
                width={70} 
                height={2} 
                rx={1} 
                fill="#E0E7FF" 
                stroke="#6366F1" 
                strokeWidth={0.5}
              />
              <rect 
                x={645} 
                y={60} 
                width={10} 
                height={6} 
                rx={1} 
                fill="#EF4444"
                style={{ transform: 'translateX(40px)' }}
              />
              <text x={670} y={68} textAnchor="middle" fontFamily="Inter" fontSize="5" fill="#4F46E5">
                Internal Data Bus
              </text>
            </>
          );
        case 6: // Data placed on external data bus
          return (
            <>
              {baseElements}
              <MemoryBank 
                x={630} 
                y={45} 
                width={80} 
                height={50} 
                active={true}
                showRowBuffer={true}
                rowBufferActive={true}
              />
              <DataPacket x={525} y={73} value="0xDEADBEEF" direction="read" />
            </>
          );
        case 7: // Data travels to memory controller
          return (
            <>
              {baseElements}
              <DataPacket x={465} y={73} value="0xDEADBEEF" direction="read" />
              <rect 
                x={420} 
                y={40} 
                width={100} 
                height={40} 
                rx={4} 
                fill="#E0E7FF" 
                stroke="#6366F1" 
                strokeWidth={3}
              />
            </>
          );
        case 8: // Data delivered to CPU
          return (
            <>
              {baseElements}
              <DataPacket x={265} y={73} value="0xDEADBEEF" direction="read" />
              <rect 
                x={20} 
                y={40} 
                width={100} 
                height={40} 
                rx={4} 
                fill="#F3F4F6" 
                stroke="#9CA3AF" 
                strokeWidth={3}
              />
            </>
          );
        case 9: // READ operation complete
          return (
            <>
              {baseElements}
              <text x={400} y={20} textAnchor="middle" fontFamily="Inter" fontSize="16" fontWeight="bold" fill="#10B981">
                READ Operation Complete
              </text>
            </>
          );
        default:
          return baseElements;
      }
    } else if (commandType === 'WRITE') {
      // WRITE command specific animations for each step
      switch (step) {
        case 0: // CPU issues WRITE request with data
          return (
            <>
              {baseElements}
              <CommandPacket x={140} y={40} type="WRITE" />
              <DataPacket x={140} y={65} value="0x12345678" direction="write" />
            </>
          );
        case 1: // Memory controller receives command and data
          return (
            <>
              {baseElements}
              <CommandPacket x={240} y={40} type="WRITE" />
              <DataPacket x={240} y={65} value="0x12345678" direction="write" />
              <rect 
                x={220} 
                y={40} 
                width={100} 
                height={40} 
                rx={4} 
                fill="#DBEAFE" 
                stroke="#3B82F6" 
                strokeWidth={3}
              />
            </>
          );
        case 2: // Check if the row is active
          return (
            <>
              {baseElements}
              <MemoryBank 
                x={630} 
                y={45} 
                width={80} 
                height={30} 
                active={true}
                showRowBuffer={true}
                rowBufferActive={true}
              />
              <text x={670} y={57} textAnchor="middle" fontFamily="Inter" fontSize="7" fill="#047857">
                Row buffer status check
              </text>
            </>
          );
        case 3: // Wait for write recovery time
          return (
            <>
              {baseElements}
              <TimingParameter 
                x={420} 
                y={90} 
                width={120} 
                label="Write Recovery" 
                value="24 cycles" 
                color="#F59E0B"
              />
              <MemoryBank 
                x={630} 
                y={45} 
                width={80} 
                height={30} 
                active={true}
                showRowBuffer={true}
                rowBufferActive={true}
              />
            </>
          );
        case 4: // Data prepared for transmission
          return (
            <>
              {baseElements}
              <DataPacket x={240} y={73} value="0x12345678" direction="write" />
              <rect 
                x={220} 
                y={40} 
                width={100} 
                height={40} 
                rx={4} 
                fill="#DBEAFE" 
                stroke="#3B82F6" 
                strokeWidth={3}
              />
            </>
          );
        case 5: // Data placed on external data bus
          return (
            <>
              {baseElements}
              <DataPacket x={525} y={73} value="0x12345678" direction="write" />
            </>
          );
        case 6: // Data arrives at memory interface
          return (
            <>
              {baseElements}
              <DataPacket x={630} y={73} value="0x12345678" direction="write" />
              <rect 
                x={620} 
                y={40} 
                width={100} 
                height={40} 
                rx={4} 
                fill="#DCFCE7" 
                stroke="#10B981" 
                strokeWidth={3}
              />
            </>
          );
        case 7: // Data written to row buffer
          return (
            <>
              {baseElements}
              <MemoryBank 
                x={630} 
                y={45} 
                width={80} 
                height={50} 
                active={true}
                showRowBuffer={true}
                rowBufferActive={true}
                showSenseAmps={true}
                showInternal={true}
              />
              <text x={670} y={53} textAnchor="middle" fontFamily="monospace" fontSize="6" fill="#1F2937">
                0x12345678
              </text>
            </>
          );
        case 8: // Write acknowledgement sent
          return (
            <>
              {baseElements}
              <rect 
                x={540} 
                y={50} 
                width={60} 
                height={20} 
                rx={4} 
                fill="#10B981"
                opacity="0.8"
              />
              <text x={570} y={65} textAnchor="middle" fontFamily="Inter" fontSize="8" fill="white">
                ACK
              </text>
              <MemoryBank 
                x={630} 
                y={45} 
                width={80} 
                height={50} 
                active={true}
                showRowBuffer={true}
                rowBufferActive={true}
              />
            </>
          );
        case 9: // WRITE operation complete
          return (
            <>
              {baseElements}
              <text x={400} y={20} textAnchor="middle" fontFamily="Inter" fontSize="16" fontWeight="bold" fill="#10B981">
                WRITE Operation Complete
              </text>
            </>
          );
        default:
          return baseElements;
      }
    } else if (commandType === 'ACTIVATE') {
      // ACTIVATE command specific animations for each step
      switch (step) {
        case 0: // Memory controller issues ACTIVATE command
          return (
            <>
              {baseElements}
              <CommandPacket x={240} y={50} type="ACTIVATE" />
              <rect 
                x={220} 
                y={40} 
                width={100} 
                height={40} 
                rx={4} 
                fill="#DBEAFE" 
                stroke="#3B82F6" 
                strokeWidth={3}
              />
            </>
          );
        case 1: // Address decoder selects target bank/row
          return (
            <>
              {baseElements}
              <MemoryBank 
                x={630} 
                y={45} 
                width={80} 
                height={50} 
                active={false}
                showInternal={true}
              />
              <text x={670} y={57} textAnchor="middle" fontFamily="Inter" fontSize="7" fill="#047857">
                Decoding: Row 0x1234
              </text>
            </>
          );
        case 2: // Wait for row activation timing
          return (
            <>
              {baseElements}
              <TimingParameter 
                x={420} 
                y={90} 
                width={120} 
                label="tRCD" 
                value="14 cycles" 
                color="#8B5CF6"
              />
              <MemoryBank 
                x={630} 
                y={45} 
                width={80} 
                height={50} 
                active={false}
                showInternal={true}
              />
            </>
          );
        case 3: // Wordline activated for target row
          return (
            <>
              {baseElements}
              <MemoryBank 
                x={630} 
                y={45} 
                width={80} 
                height={50} 
                active={true}
                showInternal={true}
              />
              {/* Highlight specific row */}
              <rect 
                x={638} 
                y={81} 
                width={64} 
                height={4} 
                rx={1}
                fill="#8B5CF6"
                stroke="#6D28D9"
                strokeWidth="0.5"
              />
              <text x={670} y={84} textAnchor="middle" fontFamily="Inter" fontSize="3" fill="white">
                Wordline Active
              </text>
            </>
          );
        case 4: // Charge sharing between cells and sense amps
          return (
            <>
              {baseElements}
              <MemoryBank 
                x={630} 
                y={45} 
                width={80} 
                height={50} 
                active={true}
                showSenseAmps={true}
                showInternal={true}
              />
              {/* Animated arrows showing charge movement */}
              <g>
                <line x1={645} y1={82} x2={645} y2={73} stroke="#8B5CF6" strokeWidth={1} markerEnd="url(#arrowhead)" />
                <line x1={655} y1={82} x2={655} y2={73} stroke="#8B5CF6" strokeWidth={1} markerEnd="url(#arrowhead)" />
                <line x1={665} y1={82} x2={665} y2={73} stroke="#8B5CF6" strokeWidth={1} markerEnd="url(#arrowhead)" />
                <line x1={675} y1={82} x2={675} y2={73} stroke="#8B5CF6" strokeWidth={1} markerEnd="url(#arrowhead)" />
                <line x1={685} y1={82} x2={685} y2={73} stroke="#8B5CF6" strokeWidth={1} markerEnd="url(#arrowhead)" />
              </g>
              <defs>
                <marker id="arrowhead" markerWidth={10} markerHeight={7} refX={0} refY={3.5} orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#8B5CF6" />
                </marker>
              </defs>
            </>
          );
        case 5: // Sense amplifiers detect and amplify signals
          return (
            <>
              {baseElements}
              <MemoryBank 
                x={630} 
                y={45} 
                width={80} 
                height={50} 
                active={true}
                showSenseAmps={true}
                showInternal={true}
              />
              <rect 
                x={635} 
                y={63} 
                width={70} 
                height={4} 
                rx={1} 
                fill="#F9A8D4" 
                stroke="#DB2777" 
                strokeWidth={0.5}
              />
              <text x={670} y={67} textAnchor="middle" fontFamily="Inter" fontSize="3" fill="#831843">
                Amplifying Signals
              </text>
            </>
          );
        case 6: // Row data transferred to row buffer
          return (
            <>
              {baseElements}
              <MemoryBank 
                x={630} 
                y={45} 
                width={80} 
                height={50} 
                active={true}
                showRowBuffer={true}
                rowBufferActive={true}
                showSenseAmps={true}
                showInternal={true}
              />
              <g>
                <line x1={645} y1={63} x2={645} y2={55} stroke="#8B5CF6" strokeWidth={1} markerEnd="url(#arrowhead)" />
                <line x1={655} y1={63} x2={655} y2={55} stroke="#8B5CF6" strokeWidth={1} markerEnd="url(#arrowhead)" />
                <line x1={665} y1={63} x2={665} y2={55} stroke="#8B5CF6" strokeWidth={1} markerEnd="url(#arrowhead)" />
                <line x1={675} y1={63} x2={675} y2={55} stroke="#8B5CF6" strokeWidth={1} markerEnd="url(#arrowhead)" />
                <line x1={685} y1={63} x2={685} y2={55} stroke="#8B5CF6" strokeWidth={1} markerEnd="url(#arrowhead)" />
              </g>
            </>
          );
        case 7: // Row fully activated
          return (
            <>
              {baseElements}
              <MemoryBank 
                x={630} 
                y={45} 
                width={80} 
                height={50} 
                active={true}
                showRowBuffer={true}
                rowBufferActive={true}
                showInternal={true}
              />
              <text x={670} y={53} textAnchor="middle" fontFamily="Inter" fontSize="6" fill="#4F46E5">
                Row Buffer Active
              </text>
            </>
          );
        case 8: // Bank state changed to ACTIVE
          return (
            <>
              {baseElements}
              <MemoryBank 
                x={630} 
                y={45} 
                width={80} 
                height={50} 
                active={true}
                showRowBuffer={true}
                rowBufferActive={true}
              />
              <text x={670} y={90} textAnchor="middle" fontFamily="Inter" fontSize="9" fontWeight="bold" fill="#8B5CF6">
                BANK STATE: ACTIVE
              </text>
              <text x={670} y={100} textAnchor="middle" fontFamily="Inter" fontSize="7" fill="#6D28D9">
                Row 0x1234 active
              </text>
            </>
          );
        case 9: // ACTIVATE operation complete
          return (
            <>
              {baseElements}
              <text x={400} y={20} textAnchor="middle" fontFamily="Inter" fontSize="16" fontWeight="bold" fill="#10B981">
                ACTIVATE Operation Complete
              </text>
              <MemoryBank 
                x={630} 
                y={45} 
                width={80} 
                height={50} 
                active={true}
                showRowBuffer={true}
                rowBufferActive={true}
              />
            </>
          );
        default:
          return baseElements;
      }
    } else if (commandType === 'PRECHARGE') {
      // PRECHARGE command specific animations for each step
      switch (step) {
        case 0: // Memory controller issues PRECHARGE command
          return (
            <>
              {baseElements}
              <CommandPacket x={240} y={50} type="PRECHARGE" />
              <rect 
                x={220} 
                y={40} 
                width={100} 
                height={40} 
                rx={4} 
                fill="#DBEAFE" 
                stroke="#3B82F6" 
                strokeWidth={3}
              />
            </>
          );
        case 1: // Check if bank is in ACTIVE state
          return (
            <>
              {baseElements}
              <MemoryBank 
                x={630} 
                y={45} 
                width={80} 
                height={50} 
                active={true}
                showRowBuffer={true}
                rowBufferActive={true}
              />
              <text x={670} y={90} textAnchor="middle" fontFamily="Inter" fontSize="9" fontWeight="bold" fill="#F59E0B">
                BANK STATE: ACTIVE
              </text>
              <text x={670} y={100} textAnchor="middle" fontFamily="Inter" fontSize="7" fill="#B45309">
                Checking bank state
              </text>
            </>
          );
        case 2: // Wait for precharge timing
          return (
            <>
              {baseElements}
              <TimingParameter 
                x={420} 
                y={90} 
                width={120} 
                label="tRP" 
                value="14 cycles" 
                color="#F59E0B"
              />
              <MemoryBank 
                x={630} 
                y={45} 
                width={80} 
                height={50} 
                active={true}
                showRowBuffer={true}
                rowBufferActive={true}
              />
            </>
          );
        case 3: // Modified data written back to array cells
          return (
            <>
              {baseElements}
              <MemoryBank 
                x={630} 
                y={45} 
                width={80} 
                height={50} 
                active={true}
                showRowBuffer={true}
                rowBufferActive={true}
                showSenseAmps={true}
                showInternal={true}
              />
              <g>
                <line x1={645} y1={58} x2={645} y2={66} stroke="#F59E0B" strokeWidth={1} markerEnd="url(#arrowhead)" />
                <line x1={655} y1={58} x2={655} y2={66} stroke="#F59E0B" strokeWidth={1} markerEnd="url(#arrowhead)" />
                <line x1={665} y1={58} x2={665} y2={66} stroke="#F59E0B" strokeWidth={1} markerEnd="url(#arrowhead)" />
                <line x1={675} y1={58} x2={675} y2={66} stroke="#F59E0B" strokeWidth={1} markerEnd="url(#arrowhead)" />
                <line x1={685} y1={58} x2={685} y2={66} stroke="#F59E0B" strokeWidth={1} markerEnd="url(#arrowhead)" />
              </g>
              <defs>
                <marker id="arrowhead" markerWidth={10} markerHeight={7} refX={0} refY={3.5} orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#F59E0B" />
                </marker>
              </defs>
              <text x={670} y={53} textAnchor="middle" fontFamily="Inter" fontSize="5" fill="#B45309">
                Writing back data
              </text>
            </>
          );
        case 4: // Sense amplifiers deactivated
          return (
            <>
              {baseElements}
              <MemoryBank 
                x={630} 
                y={45} 
                width={80} 
                height={50} 
                active={true}
                showRowBuffer={true}
                rowBufferActive={false}
                showSenseAmps={true}
                showInternal={true}
              />
              <text x={670} y={67} textAnchor="middle" fontFamily="Inter" fontSize="3" fill="#B91C1C" textDecoration="line-through">
                Sense Amplifiers
              </text>
            </>
          );
        case 5: // Bitlines reset to precharge voltage
          return (
            <>
              {baseElements}
              <MemoryBank 
                x={630} 
                y={45} 
                width={80} 
                height={50} 
                active={true}
                showRowBuffer={false}
                showSenseAmps={false}
                showInternal={true}
              />
              <text x={670} y={60} textAnchor="middle" fontFamily="Inter" fontSize="5" fill="#6B7280">
                Bitlines reset to VDD/2
              </text>
            </>
          );
        case 6: // Bank state changed to IDLE
          return (
            <>
              {baseElements}
              <MemoryBank 
                x={630} 
                y={45} 
                width={80} 
                height={50} 
                active={false}
                showInternal={true}
              />
              <text x={670} y={90} textAnchor="middle" fontFamily="Inter" fontSize="9" fontWeight="bold" fill="#F59E0B">
                BANK STATE: IDLE
              </text>
            </>
          );
        case 7: // Row address buffer cleared
          return (
            <>
              {baseElements}
              <MemoryBank 
                x={630} 
                y={45} 
                width={80} 
                height={50} 
                active={false}
                showInternal={true}
              />
              <text x={670} y={60} textAnchor="middle" fontFamily="Inter" fontSize="5" fill="#9CA3AF">
                Row address buffer cleared
              </text>
            </>
          );
        case 8: // Bank ready for new ACTIVATE
          return (
            <>
              {baseElements}
              <MemoryBank 
                x={630} 
                y={45} 
                width={80} 
                height={50} 
                active={false}
                showInternal={true}
              />
              <text x={670} y={90} textAnchor="middle" fontFamily="Inter" fontSize="7" fill="#047857">
                Ready for new ACTIVATE
              </text>
            </>
          );
        case 9: // PRECHARGE operation complete
          return (
            <>
              {baseElements}
              <text x={400} y={20} textAnchor="middle" fontFamily="Inter" fontSize="16" fontWeight="bold" fill="#10B981">
                PRECHARGE Operation Complete
              </text>
              <MemoryBank 
                x={630} 
                y={45} 
                width={80} 
                height={50} 
                active={false}
              />
            </>
          );
        default:
          return baseElements;
      }
    } else if (commandType === 'REFRESH') {
      // REFRESH command specific animations for each step
      switch (step) {
        case 0: // Memory controller issues REFRESH command
          return (
            <>
              {baseElements}
              <CommandPacket x={240} y={50} type="REFRESH" />
              <rect 
                x={220} 
                y={40} 
                width={100} 
                height={40} 
                rx={4} 
                fill="#DBEAFE" 
                stroke="#3B82F6" 
                strokeWidth={3}
              />
            </>
          );
        case 1: // All bank operations suspended
          return (
            <>
              {baseElements}
              <g>
                <MemoryBank 
                  x={620} 
                  y={35} 
                  width={40} 
                  height={20} 
                  active={false}
                />
                <MemoryBank 
                  x={665} 
                  y={35} 
                  width={40} 
                  height={20} 
                  active={false}
                />
                <MemoryBank 
                  x={620} 
                  y={60} 
                  width={40} 
                  height={20} 
                  active={false}
                />
                <MemoryBank 
                  x={665} 
                  y={60} 
                  width={40} 
                  height={20} 
                  active={false}
                />
                <text x={670} y={90} textAnchor="middle" fontFamily="Inter" fontSize="7" fill="#10B981">
                  All bank operations suspended
                </text>
              </g>
            </>
          );
        case 2: // Wait for refresh cycle time
          return (
            <>
              {baseElements}
              <TimingParameter 
                x={420} 
                y={90} 
                width={120} 
                label="tRFC" 
                value="350 ns" 
                color="#10B981"
              />
              <g>
                <MemoryBank 
                  x={620} 
                  y={35} 
                  width={40} 
                  height={20} 
                  active={false}
                />
                <MemoryBank 
                  x={665} 
                  y={35} 
                  width={40} 
                  height={20} 
                  active={false}
                />
                <MemoryBank 
                  x={620} 
                  y={60} 
                  width={40} 
                  height={20} 
                  active={false}
                />
                <MemoryBank 
                  x={665} 
                  y={60} 
                  width={40} 
                  height={20} 
                  active={false}
                />
              </g>
            </>
          );
        case 3: // Precharge all banks
          return (
            <>
              {baseElements}
              <g>
                <MemoryBank 
                  x={620} 
                  y={35} 
                  width={40} 
                  height={20} 
                  active={false}
                />
                <MemoryBank 
                  x={665} 
                  y={35} 
                  width={40} 
                  height={20} 
                  active={false}
                />
                <MemoryBank 
                  x={620} 
                  y={60} 
                  width={40} 
                  height={20} 
                  active={false}
                />
                <MemoryBank 
                  x={665} 
                  y={60} 
                  width={40} 
                  height={20} 
                  active={false}
                />
                <text x={670} y={90} textAnchor="middle" fontFamily="Inter" fontSize="7" fill="#F59E0B">
                  All banks precharged
                </text>
              </g>
            </>
          );
        case 4: // Activate refresh row counter
          return (
            <>
              {baseElements}
              <g>
                <rect
                  x={640}
                  y={85}
                  width={60}
                  height={15}
                  rx={2}
                  fill="#DCFCE7"
                  stroke="#10B981"
                  strokeWidth={1}
                />
                <text x={670} y={95} textAnchor="middle" fontFamily="Inter" fontSize="6" fill="#047857">
                  Refresh Counter: 0x42A
                </text>
              </g>
              <MemoryBank 
                x={630} 
                y={45} 
                width={80} 
                height={30} 
                active={false}
              />
            </>
          );
        case 5: // Refresh circuitry restores cell charges
          return (
            <>
              {baseElements}
              <g>
                <MemoryBank 
                  x={620} 
                  y={35} 
                  width={40} 
                  height={20} 
                  active={true}
                  showRowBuffer={false}
                />
                <MemoryBank 
                  x={665} 
                  y={35} 
                  width={40} 
                  height={20} 
                  active={true}
                  showRowBuffer={false}
                />
                <MemoryBank 
                  x={620} 
                  y={60} 
                  width={40} 
                  height={20} 
                  active={true}
                  showRowBuffer={false}
                />
                <MemoryBank 
                  x={665} 
                  y={60} 
                  width={40} 
                  height={20} 
                  active={true}
                  showRowBuffer={false}
                />
                <text x={670} y={90} textAnchor="middle" fontFamily="Inter" fontSize="7" fill="#10B981">
                  Refreshing cells
                </text>
              </g>
            </>
          );
        case 6: // Multiple rows refreshed simultaneously
          return (
            <>
              {baseElements}
              <g>
                <MemoryBank 
                  x={620} 
                  y={35} 
                  width={40} 
                  height={20} 
                  active={true}
                  showInternal={true}
                />
                <MemoryBank 
                  x={665} 
                  y={35} 
                  width={40} 
                  height={20} 
                  active={true}
                  showInternal={true}
                />
                <MemoryBank 
                  x={620} 
                  y={60} 
                  width={40} 
                  height={20} 
                  active={true}
                  showInternal={true}
                />
                <MemoryBank 
                  x={665} 
                  y={60} 
                  width={40} 
                  height={20} 
                  active={true}
                  showInternal={true}
                />
                <text x={670} y={90} textAnchor="middle" fontFamily="Inter" fontSize="7" fill="#10B981">
                  Multiple rows refreshed
                </text>
              </g>
            </>
          );
        case 7: // Refresh operation completes
          return (
            <>
              {baseElements}
              <g>
                <MemoryBank 
                  x={620} 
                  y={35} 
                  width={40} 
                  height={20} 
                  active={false}
                />
                <MemoryBank 
                  x={665} 
                  y={35} 
                  width={40} 
                  height={20} 
                  active={false}
                />
                <MemoryBank 
                  x={620} 
                  y={60} 
                  width={40} 
                  height={20} 
                  active={false}
                />
                <MemoryBank 
                  x={665} 
                  y={60} 
                  width={40} 
                  height={20} 
                  active={false}
                />
                <text x={670} y={90} textAnchor="middle" fontFamily="Inter" fontSize="7" fill="#10B981">
                  Refresh complete
                </text>
              </g>
            </>
          );
        case 8: // Banks return to IDLE state
          return (
            <>
              {baseElements}
              <MemoryBank 
                x={630} 
                y={45} 
                width={80} 
                height={30} 
                active={false}
              />
              <text x={670} y={90} textAnchor="middle" fontFamily="Inter" fontSize="9" fontWeight="bold" fill="#10B981">
                ALL BANKS: IDLE
              </text>
            </>
          );
        case 9: // REFRESH operation complete
          return (
            <>
              {baseElements}
              <text x={400} y={20} textAnchor="middle" fontFamily="Inter" fontSize="16" fontWeight="bold" fill="#10B981">
                REFRESH Operation Complete
              </text>
              <MemoryBank 
                x={630} 
                y={45} 
                width={80} 
                height={30} 
                active={false}
              />
            </>
          );
        default:
          return baseElements;
      }
    }
    
    // Default return if command type not handled
    return baseElements;
  };
  
  return (
    <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
      <svg width="800" height="130" viewBox="0 0 800 130">
        {renderStepAnimation()}
      </svg>
    </div>
  );
};

/**
 * Interactive step-by-step animation component for DDR5 memory operations
 */
const StepByStepAnimation: React.FC<StepByStepAnimationProps> = ({ 
  commandType,
  simulationState,
  initialStep = 0
}) => {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [scale, setScale] = useState(1);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const maxSteps = commandSteps[commandType]?.length || 10;
  
  // Handle automatic playback of animation steps
  useEffect(() => {
    if (isPlaying) {
      animationTimerRef.current = setTimeout(() => {
        if (currentStep < maxSteps - 1) {
          setCurrentStep(prev => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, 2000 / playbackSpeed);
    }
    
    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
    };
  }, [isPlaying, currentStep, maxSteps, playbackSpeed]);
  
  // Reset animation when command type changes
  useEffect(() => {
    setCurrentStep(0);
    setIsPlaying(false);
  }, [commandType]);
  
  const handlePrevStep = () => {
    setIsPlaying(false);
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  const handleNextStep = () => {
    setIsPlaying(false);
    if (currentStep < maxSteps - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };
  
  const togglePlayPause = () => {
    setIsPlaying(prev => !prev);
  };
  
  const resetAnimation = () => {
    setIsPlaying(false);
    setCurrentStep(0);
  };
  
  const handleSpeedChange = (value: number[]) => {
    setPlaybackSpeed(value[0]);
  };
  
  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 1.5));
  };
  
  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.7));
  };
  
  const resetZoom = () => {
    setScale(1);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-neutral-800">
          Step-by-Step Memory Operation: {commandType}
        </h2>
        <div className="flex space-x-2">
          <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Info className="h-4 w-4 mr-1" />
                Learn
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{educationalContent[commandType].title}</DialogTitle>
                <DialogDescription>
                  Detailed explanation of how {commandType} operations work in DDR5 memory
                </DialogDescription>
              </DialogHeader>
              <div dangerouslySetInnerHTML={{ __html: educationalContent[commandType].content }} className="mt-4 prose prose-sm max-w-none" />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {/* Animation area */}
      <div className="border border-gray-200 rounded-lg p-2 relative overflow-hidden bg-gray-50 mb-4">
        <div className="min-h-[130px] flex items-center justify-center">
          <StepAnimation commandType={commandType} step={currentStep} scale={scale} />
        </div>
        
        {/* Zoom controls */}
        <div className="absolute top-2 right-2 flex space-x-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={zoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Zoom In</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={zoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Zoom Out</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={resetZoom}>
                  <Maximize className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reset Zoom</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {/* Step description and controls */}
      <div className="mb-4">
        <div className="bg-gray-50 p-3 rounded-md mb-3">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-medium text-sm">
              Step {currentStep + 1} of {maxSteps}
            </h3>
            <div className="text-xs text-gray-500">
              {Math.round((currentStep + 1) / maxSteps * 100)}% Complete
            </div>
          </div>
          <div className="h-1.5 w-full bg-gray-200 rounded-full mb-2">
            <div 
              className="h-1.5 rounded-full bg-indigo-600" 
              style={{ width: `${((currentStep + 1) / maxSteps) * 100}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-700">
            {commandSteps[commandType][currentStep]}
          </p>
        </div>
        
        {/* Step controls */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePrevStep}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={togglePlayPause}
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Play
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleNextStep}
              disabled={currentStep === maxSteps - 1}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={resetAnimation}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">Speed:</span>
            <div className="w-24">
              <Slider
                defaultValue={[1]}
                min={0.5}
                max={2}
                step={0.5}
                onValueChange={handleSpeedChange}
                value={[playbackSpeed]}
              />
            </div>
            <span className="text-xs text-gray-500">{playbackSpeed}x</span>
          </div>
        </div>
      </div>
      
      {/* Technical explanation for current step */}
      <div className="mb-4">
        <Accordion type="single" collapsible>
          <AccordionItem value="step-details">
            <AccordionTrigger className="text-sm">
              Technical Details
            </AccordionTrigger>
            <AccordionContent>
              <div className="text-sm text-gray-700 space-y-2">
                <p>{stepDescriptions[commandType][currentStep]}</p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
      
      {/* Command sequence context */}
      <div>
        <h3 className="text-sm font-medium mb-2">Command Sequence Context</h3>
        <div className="border rounded-md divide-y">
          {simulationState.commandQueue.slice(0, 3).map((cmd, index) => (
            <div key={index} className="p-2 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div 
                  className={`w-2 h-2 rounded-full ${
                    cmd.status === 'completed' 
                      ? 'bg-green-500' 
                      : cmd.status === 'error' 
                        ? 'bg-red-500' 
                        : 'bg-amber-500'
                  }`}
                />
                <span className="font-medium text-sm">{cmd.type}</span>
                <span className="text-xs text-gray-500">
                  CH:{cmd.channel} BG:{cmd.bankGroup} B:{cmd.bank} 
                  {cmd.row && ` Row:${cmd.row}`}
                  {cmd.column && ` Col:${cmd.column}`}
                </span>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        // This would be implemented to focus on this specific command
                      }}
                    >
                      <Layers className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View this command in sequence</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ))}
          {simulationState.commandQueue.length > 3 && (
            <div className="p-2 text-xs text-center text-gray-500">
              + {simulationState.commandQueue.length - 3} more commands in queue
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StepByStepAnimation;