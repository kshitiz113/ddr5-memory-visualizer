// Shared types between client and server

export type CommandType = 'READ' | 'WRITE' | 'ACTIVATE' | 'PRECHARGE' | 'REFRESH' | 'ZQCAL';

export interface MemoryCommand {
  id: string;
  type: CommandType;
  channel: number;
  bankGroup: number;
  bank: number;
  row?: string; // Hex format, e.g. '0xA400'
  column?: string; // Hex format, e.g. '0x042'
  data?: string; // Hex format, e.g. '0xDEADBEEF'
  status: 'processing' | 'queued' | 'completed' | 'error';
  timestamp: number;
}

export interface MemoryState {
  activeChannel?: number;
  activeBankGroup?: number;
  activeBank?: number;
  activeRow?: string;
  rowBuffer?: string;
}

export interface SimulationState {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  cycleCount: number;
  currentState: ControllerState;
  memoryState: MemoryState;
  commandQueue: MemoryCommand[];
  currentCommand?: MemoryCommand;
  timingData: Array<TimingEvent>;
}

export type ControllerState = 'IDLE' | 'ACTIVATE' | 'READ' | 'WRITE' | 'PRECHARGE' | 'REFRESH';

export interface TimingEvent {
  cycle: number;
  signal: string;
  value: boolean | number;
}

export interface NewSimulationRequest {
  commands: Omit<MemoryCommand, 'id' | 'status' | 'timestamp'>[];
  simulation_options?: {
    max_cycles?: number;
    timing_parameters?: {
      tRCD?: number; // ACT to READ/WRITE delay
      tRP?: number;  // PRE to ACT delay
      tCAS?: number; // READ latency
      tCCD_L?: number; // Column to Column Delay (same bank group)
      tFAW?: number; // Four Activate Window
    }
  }
}

export interface SimulationResults {
  simulationState: SimulationState;
  verilogOutput: string;
  success: boolean;
  error?: string;
}
