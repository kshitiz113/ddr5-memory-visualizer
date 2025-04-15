import { create } from 'zustand';
import { MemoryCommand, SimulationState, ControllerState, TimingEvent } from '@shared/types';
import { apiRequest } from './queryClient';
import { nanoid } from 'nanoid';

// Define tab types
export type Tab = 'architecture' | 'data-transfer' | 'fsm' | 'timing' | 'command-queue';

// Define simulation store state
interface SimulationStore {
  // UI state
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  
  // Memory and controller state
  simulationState: SimulationState;
  
  // Selected memory components
  selectedChannel: number | null;
  selectedBankGroup: number | null;
  selectedBank: number | null;
  selectedRow: string | null;
  
  // Command form state
  commandForm: {
    type: string;
    channel: number;
    bankGroup: number;
    bank: number;
    row: string;
    column: string;
    data: string;
  };
  
  // Actions
  selectChannel: (channel: number | null) => void;
  selectBankGroup: (bankGroup: number | null) => void;
  selectBank: (bank: number | null) => void;
  selectRow: (row: string | null) => void;
  
  updateCommandField: <K extends keyof SimulationStore['commandForm']>(
    field: K, 
    value: SimulationStore['commandForm'][K]
  ) => void;
  
  addCommand: () => void;
  removeCommand: (id: string) => void;
  
  runSimulation: () => Promise<void>;
  resetSimulation: () => void;
  
  isRunning: boolean;
  error: string | null;
}

// Create the store with Zustand
export const useSimulationStore = create<SimulationStore>((set, get) => ({
  // UI state
  activeTab: 'architecture',
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  // Memory and controller state
  simulationState: {
    status: 'idle',
    cycleCount: 0,
    currentState: 'IDLE',
    memoryState: {},
    commandQueue: [],
    timingData: [],
  },
  
  // Selected memory components
  selectedChannel: null,
  selectedBankGroup: null,
  selectedBank: null,
  selectedRow: null,
  
  // Command form state
  commandForm: {
    type: 'READ',
    channel: 0,
    bankGroup: 0,
    bank: 0,
    row: '0x0000',
    column: '0x000',
    data: '0xDEADBEEF',
  },
  
  // Selection actions
  selectChannel: (channel) => set({ selectedChannel: channel }),
  selectBankGroup: (bankGroup) => set({ selectedBankGroup: bankGroup }),
  selectBank: (bank) => set({ selectedBank: bank }),
  selectRow: (row) => set({ selectedRow: row }),
  
  // Command form actions
  updateCommandField: (field, value) => set((state) => ({
    commandForm: {
      ...state.commandForm,
      [field]: value,
    }
  })),
  
  // Add a new command to the queue
  addCommand: () => set((state) => {
    const { type, channel, bankGroup, bank, row, column, data } = state.commandForm;
    
    // Create a new command
    const newCommand: MemoryCommand = {
      id: nanoid(),
      type: type as any,
      channel,
      bankGroup,
      bank,
      status: 'queued',
      timestamp: Date.now(),
    };
    
    // Add optional fields if they exist
    if (row) newCommand.row = row;
    if (column) newCommand.column = column;
    if (data && type === 'WRITE') newCommand.data = data;
    
    // Add to command queue
    return {
      simulationState: {
        ...state.simulationState,
        commandQueue: [...state.simulationState.commandQueue, newCommand],
      }
    };
  }),
  
  // Remove a command from the queue
  removeCommand: (id) => set((state) => ({
    simulationState: {
      ...state.simulationState,
      commandQueue: state.simulationState.commandQueue.filter(cmd => cmd.id !== id),
    }
  })),
  
  // Run the simulation
  runSimulation: async () => {
    const state = get();
    
    // Validate commands
    if (state.simulationState.commandQueue.length === 0) {
      set({ 
        error: 'No commands in queue. Add at least one command before running the simulation.',
        isRunning: false 
      });
      return;
    }
    
    // Set simulation as running
    set({ 
      isRunning: true, 
      error: null,
      simulationState: {
        ...state.simulationState,
        status: 'running'
      }
    });
    
    try {
      // Mark first command as processing
      const updatedQueue = [...state.simulationState.commandQueue];
      if (updatedQueue.length > 0 && updatedQueue[0].status === 'queued') {
        updatedQueue[0].status = 'processing';
        
        set({
          simulationState: {
            ...state.simulationState,
            commandQueue: updatedQueue,
            currentCommand: updatedQueue[0]
          }
        });
      }
      
      // Add a slight delay to show processing animation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Prepare simulation request
      const commands = state.simulationState.commandQueue.map(cmd => ({
        type: cmd.type,
        channel: cmd.channel,
        bankGroup: cmd.bankGroup,
        bank: cmd.bank,
        row: cmd.row,
        column: cmd.column,
        data: cmd.data,
      }));
      
      // Call API to run simulation
      const response = await apiRequest('POST', '/api/simulation/run', { commands });
      const result = await response.json();
      
      // Update state with simulation results
      set({
        simulationState: {
          ...result.simulationState,
          status: 'completed' // Ensure status is set to completed
        },
        isRunning: false,
      });
      
      // Handle error
      if (!result.success) {
        set({ error: result.error });
      }
    } catch (error: any) {
      set({
        isRunning: false,
        error: error.message || 'Failed to run simulation',
        simulationState: {
          ...state.simulationState,
          status: 'error'
        }
      });
    }
  },
  
  // Reset the simulation
  resetSimulation: () => set({
    simulationState: {
      status: 'idle',
      cycleCount: 0,
      currentState: 'IDLE',
      memoryState: {},
      commandQueue: [],
      timingData: [],
    },
    selectedChannel: null,
    selectedBankGroup: null,
    selectedBank: null,
    selectedRow: null,
    error: null,
  }),
  
  isRunning: false,
  error: null,
}));
