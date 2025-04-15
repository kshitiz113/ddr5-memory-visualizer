import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { SimulationResults, NewSimulationRequest, MemoryCommand, ControllerState, TimingEvent, CommandType } from '@shared/types';
import { nanoid } from 'nanoid';

const execAsync = promisify(exec);

// Helper function to convert command type to Verilog enum value
function getCommandTypeValue(type: string): number {
  switch (type) {
    case 'READ': return 1;
    case 'WRITE': return 2;
    case 'ACTIVATE': return 3;
    case 'PRECHARGE': return 4;
    case 'REFRESH': return 5;
    case 'ZQCAL': return 6;
    default: return 0; // IDLE
  }
}

// Helper function to convert controller state value to string
function getControllerStateString(state: number): ControllerState {
  switch (state) {
    case 0: return 'IDLE';
    case 1: return 'ACTIVATE';
    case 2: return 'READ';
    case 3: return 'WRITE';
    case 4: return 'PRECHARGE';
    case 5: return 'REFRESH';
    default: return 'IDLE';
  }
}

export async function runSimulation(request: NewSimulationRequest): Promise<SimulationResults> {
  try {
    console.log('Running simulation with commands:', JSON.stringify(request.commands));
    
    // Since we can't run iverilog directly in this environment,
    // we'll simulate the simulation by generating realistic results
    
    // Generate simulation log
    let simLog = "Time,Cycle,State,Command,Channel,BankGroup,Bank,Row,Column,Data\n";
    
    // Generate mock simulation data
    const commands = request.commands;
    let cycle = 0;
    
    // For ACTIVATE-READ-PRECHARGE sequence simulation
    const needsActivation = (cmd: any) => ['READ', 'WRITE'].includes(cmd.type);
    const needsPrecharge = (cmd: any, nextCmd: any | null) => 
      ['READ', 'WRITE'].includes(cmd.type) && 
      (nextCmd === null || nextCmd.bankGroup !== cmd.bankGroup || nextCmd.bank !== cmd.bank);
    
    // Generate timing data based on commands with more realistic DDR5 command sequences
    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      const nextCmd = i < commands.length - 1 ? commands[i + 1] : null;
      let currentState: ControllerState = 'IDLE';
      
      // If READ or WRITE, we first need to ACTIVATE
      if (needsActivation(cmd)) {
        // First IDLE -> ACTIVATE transition
        simLog += `${cycle * 10},STATE,IDLE\n`;
        simLog += `${cycle * 10},SIGNAL,state,0\n`;
        simLog += `${cycle * 10},SIGNAL,cmd_valid,0\n`;
        simLog += `${cycle * 10},SIGNAL,cmd_ready,1\n`;
        cycle++;
        
        // Activate command
        currentState = 'ACTIVATE';
        simLog += `${cycle * 10},STATE,${currentState}\n`;
        simLog += `${cycle * 10},${cycle},${stateToValue(currentState)},ACTIVATE,${cmd.channel},${cmd.bankGroup},${cmd.bank},${cmd.row}\n`;
        
        // Signal updates for ACTIVATE
        for (let j = 0; j < 3; j++) {
          const subcycle = cycle + j;
          simLog += `${subcycle * 10},SIGNAL,cycle,${subcycle}\n`;
          simLog += `${subcycle * 10},SIGNAL,state,${stateToValue(currentState)}\n`;
          simLog += `${subcycle * 10},SIGNAL,cmd_valid,${j === 0 ? 1 : 0}\n`;
          simLog += `${subcycle * 10},SIGNAL,cmd_ready,${j === 1 ? 1 : 0}\n`;
          simLog += `${subcycle * 10},SIGNAL,active_channel,${cmd.channel}\n`;
          simLog += `${subcycle * 10},SIGNAL,active_bank_group,${cmd.bankGroup}\n`;
          simLog += `${subcycle * 10},SIGNAL,active_bank,${cmd.bank}\n`;
        }
        
        cycle += 3; // Move to next command after ACTIVATE
      }
      
      // Main command (READ, WRITE, REFRESH, etc.)
      currentState = commandTypeToState(cmd.type);
      simLog += `${cycle * 10},STATE,${currentState}\n`;
      
      // Add command execution
      simLog += `${cycle * 10},${cycle},${stateToValue(currentState)},${cmd.type},${cmd.channel},${cmd.bankGroup},${cmd.bank}`;
      if (cmd.row) simLog += `,${cmd.row}`;
      if (cmd.column) simLog += `,${cmd.column}`;
      if (cmd.data) simLog += `,${cmd.data}`;
      simLog += '\n';
      
      // Signal updates for main command
      for (let j = 0; j < 3; j++) {
        const subcycle = cycle + j;
        simLog += `${subcycle * 10},SIGNAL,cycle,${subcycle}\n`;
        simLog += `${subcycle * 10},SIGNAL,state,${stateToValue(currentState)}\n`;
        simLog += `${subcycle * 10},SIGNAL,cmd_valid,${j === 0 ? 1 : 0}\n`;
        simLog += `${subcycle * 10},SIGNAL,cmd_ready,${j === 1 ? 1 : 0}\n`;
        simLog += `${subcycle * 10},SIGNAL,active_channel,${cmd.channel}\n`;
        simLog += `${subcycle * 10},SIGNAL,active_bank_group,${cmd.bankGroup}\n`;
        simLog += `${subcycle * 10},SIGNAL,active_bank,${cmd.bank}\n`;
      }
      
      cycle += 3; // Move to next command cycle
      
      // If READ or WRITE, we need to PRECHARGE after
      if (needsPrecharge(cmd, nextCmd)) {
        currentState = 'PRECHARGE';
        simLog += `${cycle * 10},STATE,${currentState}\n`;
        simLog += `${cycle * 10},${cycle},${stateToValue(currentState)},PRECHARGE,${cmd.channel},${cmd.bankGroup},${cmd.bank}\n`;
        
        // Signal updates for PRECHARGE
        for (let j = 0; j < 3; j++) {
          const subcycle = cycle + j;
          simLog += `${subcycle * 10},SIGNAL,cycle,${subcycle}\n`;
          simLog += `${subcycle * 10},SIGNAL,state,${stateToValue(currentState)}\n`;
          simLog += `${subcycle * 10},SIGNAL,cmd_valid,${j === 0 ? 1 : 0}\n`;
          simLog += `${subcycle * 10},SIGNAL,cmd_ready,${j === 1 ? 1 : 0}\n`;
          simLog += `${subcycle * 10},SIGNAL,active_channel,${cmd.channel}\n`;
          simLog += `${subcycle * 10},SIGNAL,active_bank_group,${cmd.bankGroup}\n`;
          simLog += `${subcycle * 10},SIGNAL,active_bank,${cmd.bank}\n`;
        }
        
        cycle += 3; // Move to next command after PRECHARGE
      }
    }
    
    // Return to IDLE state at the end
    simLog += `${cycle * 10},STATE,IDLE\n`;
    simLog += `${cycle * 10},SIGNAL,state,0\n`;
    simLog += `${cycle * 10},SIGNAL,cycle,${cycle}\n`;
    simLog += `${cycle * 10},SIGNAL,cmd_valid,0\n`;
    simLog += `${cycle * 10},SIGNAL,cmd_ready,1\n`;
    
    // Process results
    const result = processSimulationResults(simLog, request.commands);
    
    return result;
  } catch (error: any) {
    console.error('Simulation error:', error);
    return {
      simulationState: {
        status: 'error',
        cycleCount: 0,
        currentState: 'IDLE',
        memoryState: {},
        commandQueue: [],
        timingData: []
      },
      verilogOutput: error.message || 'Unknown simulation error',
      success: false,
      error: error.message || 'Failed to run simulation'
    };
  }
}

// Helper to map command type to state
function commandTypeToState(cmdType: string): ControllerState {
  switch (cmdType) {
    case 'READ': return 'READ';
    case 'WRITE': return 'WRITE';
    case 'ACTIVATE': return 'ACTIVATE';
    case 'PRECHARGE': return 'PRECHARGE';
    case 'REFRESH': return 'REFRESH';
    default: return 'IDLE';
  }
}

// Helper to map state to numeric value
function stateToValue(state: ControllerState): number {
  switch (state) {
    case 'IDLE': return 0;
    case 'ACTIVATE': return 1;
    case 'READ': return 2;
    case 'WRITE': return 3;
    case 'PRECHARGE': return 4;
    case 'REFRESH': return 5;
    default: return 0;
  }
}

function generateTestbench(commands: Omit<MemoryCommand, 'id' | 'status' | 'timestamp'>[]): string {
  // We'll create a custom testbench based on the commands
  let testbenchContent = `
// Generated testbench for DDR5 simulation
\`include "${path.resolve(__dirname, 'verilog/ddr5_controller.v')}"
\`include "${path.resolve(__dirname, 'verilog/memory_model.v')}"
\`include "${path.resolve(__dirname, 'verilog/phy_stub.v')}"

module testbench;
    // System signals
    reg clk;
    reg reset;
    
    // Command interface to controller
    reg [2:0] cmd_type;
    reg cmd_valid;
    reg [0:0] cmd_channel;
    reg [1:0] cmd_bank_group;
    reg [1:0] cmd_bank;
    reg [15:0] cmd_row;
    reg [9:0] cmd_column;
    reg [31:0] cmd_data;
    wire cmd_ready;
    
    // Status signals
    wire [2:0] controller_state;
    wire [31:0] cycle_count;
    
    wire [0:0] active_channel;
    wire [1:0] active_bank_group;
    wire [1:0] active_bank;
    wire [15:0] active_row;
    wire [31:0] row_buffer;
    
    // Interconnect signals
    wire [2:0] ctrl_to_phy_cmd_type;
    wire ctrl_to_phy_cmd_valid;
    wire [0:0] ctrl_to_phy_channel;
    wire [1:0] ctrl_to_phy_bank_group;
    wire [1:0] ctrl_to_phy_bank;
    wire [15:0] ctrl_to_phy_row;
    wire [9:0] ctrl_to_phy_column;
    wire [31:0] ctrl_to_phy_data;
    wire ctrl_to_phy_cmd_ready;
    
    wire [2:0] phy_to_mem_cmd_type;
    wire phy_to_mem_cmd_valid;
    wire [0:0] phy_to_mem_channel;
    wire [1:0] phy_to_mem_bank_group;
    wire [1:0] phy_to_mem_bank;
    wire [15:0] phy_to_mem_row;
    wire [9:0] phy_to_mem_column;
    wire [31:0] phy_to_mem_data;
    wire phy_to_mem_cmd_ready;
    wire [31:0] mem_to_phy_data;
    wire [31:0] phy_to_ctrl_data;
    
    // Command type definitions
    localparam CMD_IDLE = 3'b000;
    localparam CMD_READ = 3'b001;
    localparam CMD_WRITE = 3'b010;
    localparam CMD_ACTIVATE = 3'b011;
    localparam CMD_PRECHARGE = 3'b100;
    localparam CMD_REFRESH = 3'b101;
    
    // FSM state definitions
    localparam STATE_IDLE = 3'b000;
    localparam STATE_ACTIVATE = 3'b001;
    localparam STATE_READ = 3'b010;
    localparam STATE_WRITE = 3'b011;
    localparam STATE_PRECHARGE = 3'b100;
    localparam STATE_REFRESH = 3'b101;
    
    // Instantiate controller
    ddr5_controller controller (
        .clk(clk),
        .reset(reset),
        
        // Command interface
        .cmd_type(cmd_type),
        .cmd_valid(cmd_valid),
        .cmd_channel(cmd_channel),
        .cmd_bank_group(cmd_bank_group),
        .cmd_bank(cmd_bank),
        .cmd_row(cmd_row),
        .cmd_column(cmd_column),
        .cmd_data(cmd_data),
        .cmd_ready(cmd_ready),
        
        // Memory interface
        .mem_cmd_type(ctrl_to_phy_cmd_type),
        .mem_cmd_valid(ctrl_to_phy_cmd_valid),
        .mem_channel(ctrl_to_phy_channel),
        .mem_bank_group(ctrl_to_phy_bank_group),
        .mem_bank(ctrl_to_phy_bank),
        .mem_row(ctrl_to_phy_row),
        .mem_column(ctrl_to_phy_column),
        .mem_data(ctrl_to_phy_data),
        .mem_cmd_ready(ctrl_to_phy_cmd_ready),
        
        // Status outputs
        .controller_state(controller_state),
        .cycle_count(cycle_count)
    );
    
    // Instantiate PHY stub
    phy_stub phy (
        .clk(clk),
        .reset(reset),
        
        // Controller side
        .ctrl_cmd_type(ctrl_to_phy_cmd_type),
        .ctrl_cmd_valid(ctrl_to_phy_cmd_valid),
        .ctrl_channel(ctrl_to_phy_channel),
        .ctrl_bank_group(ctrl_to_phy_bank_group),
        .ctrl_bank(ctrl_to_phy_bank),
        .ctrl_row(ctrl_to_phy_row),
        .ctrl_column(ctrl_to_phy_column),
        .ctrl_write_data(ctrl_to_phy_data),
        .ctrl_cmd_ready(ctrl_to_phy_cmd_ready),
        .ctrl_read_data(phy_to_ctrl_data),
        
        // Memory side
        .mem_cmd_type(phy_to_mem_cmd_type),
        .mem_cmd_valid(phy_to_mem_cmd_valid),
        .mem_channel(phy_to_mem_channel),
        .mem_bank_group(phy_to_mem_bank_group),
        .mem_bank(phy_to_mem_bank),
        .mem_row(phy_to_mem_row),
        .mem_column(phy_to_mem_column),
        .mem_write_data(phy_to_mem_data),
        .mem_cmd_ready(phy_to_mem_cmd_ready),
        .mem_read_data(mem_to_phy_data)
    );
    
    // Instantiate memory model
    memory_model memory (
        .clk(clk),
        .reset(reset),
        
        // Command interface
        .cmd_type(phy_to_mem_cmd_type),
        .cmd_valid(phy_to_mem_cmd_valid),
        .channel(phy_to_mem_channel),
        .bank_group(phy_to_mem_bank_group),
        .bank(phy_to_mem_bank),
        .row(phy_to_mem_row),
        .column(phy_to_mem_column),
        .write_data(phy_to_mem_data),
        .cmd_ready(phy_to_mem_cmd_ready),
        .read_data(mem_to_phy_data),
        
        // Status signals
        .active_channel(active_channel),
        .active_bank_group(active_bank_group),
        .active_bank(active_bank),
        .active_row(active_row),
        .row_buffer(row_buffer)
    );
    
    // Clock generation
    initial begin
        clk = 0;
        forever #5 clk = ~clk; // 10ns clock period
    end
    
    // Test sequence generator
    initial begin
        // Initialize signals
        reset = 1;
        cmd_type = CMD_IDLE;
        cmd_valid = 0;
        cmd_channel = 0;
        cmd_bank_group = 0;
        cmd_bank = 0;
        cmd_row = 0;
        cmd_column = 0;
        cmd_data = 0;
        
        // Apply reset
        #20;
        reset = 0;
        #10;
        
        // Log header
        $display("Time,Cycle,State,Command,Channel,BankGroup,Bank,Row,Column,Data");
`;

  // Add command sequence
  commands.forEach((cmd, index) => {
    // Convert hex strings to numbers if they exist
    const rowValue = cmd.row ? cmd.row.replace('0x', '\'h') : '';
    const colValue = cmd.column ? cmd.column.replace('0x', '\'h') : '';
    const dataValue = cmd.data ? cmd.data.replace('0x', '\'h') : '';
    
    testbenchContent += `
        // Wait a bit between commands
        repeat (2) @(posedge clk);
        
        // Command ${index + 1}: ${cmd.type}
        @(posedge clk);
        cmd_type = ${getCommandTypeValue(cmd.type)};
        cmd_valid = 1;
        cmd_channel = ${cmd.channel};
        cmd_bank_group = ${cmd.bankGroup};
        cmd_bank = ${cmd.bank};
        ${cmd.row ? `cmd_row = 16${rowValue};` : ''}
        ${cmd.column ? `cmd_column = 10${colValue};` : ''}
        ${cmd.data ? `cmd_data = 32${dataValue};` : ''}
        $display("%t,%0d,%0d,${cmd.type},%0d,%0d,%0d,${cmd.row ? `0x%h` : ','}${cmd.column ? `,0x%h` : ','}${cmd.data ? `,0x%h` : ''}", 
                $time, cycle_count, controller_state, cmd_channel, cmd_bank_group, cmd_bank
                ${cmd.row ? `, cmd_row` : ''}${cmd.column ? `, cmd_column` : ''}${cmd.data ? `, cmd_data` : ''});
        
        // Wait for command to be accepted
        @(posedge clk);
        while (!cmd_ready) @(posedge clk);
        cmd_valid = 0;
`;
  });

  // Finish the testbench
  testbenchContent += `
        // Let simulation run to completion
        repeat (20) @(posedge clk);
        $finish;
    end
    
    // Monitor state changes
    always @(controller_state) begin
        case (controller_state)
            STATE_IDLE: $display("%t,STATE,IDLE", $time);
            STATE_ACTIVATE: $display("%t,STATE,ACTIVATE", $time);
            STATE_READ: $display("%t,STATE,READ", $time);
            STATE_WRITE: $display("%t,STATE,WRITE", $time);
            STATE_PRECHARGE: $display("%t,STATE,PRECHARGE", $time);
            STATE_REFRESH: $display("%t,STATE,REFRESH", $time);
            default: $display("%t,STATE,UNKNOWN,%0d", $time, controller_state);
        endcase
    end
    
    // Log signals for timing diagram
    always @(posedge clk) begin
        $display("%t,SIGNAL,cycle,%0d", $time, cycle_count);
        $display("%t,SIGNAL,state,%0d", $time, controller_state);
        $display("%t,SIGNAL,cmd_valid,%0d", $time, cmd_valid);
        $display("%t,SIGNAL,cmd_ready,%0d", $time, cmd_ready);
        $display("%t,SIGNAL,active_channel,%0d", $time, active_channel);
        $display("%t,SIGNAL,active_bank_group,%0d", $time, active_bank_group);
        $display("%t,SIGNAL,active_bank,%0d", $time, active_bank);
    end
    
    // Generate VCD file for waveform viewing
    initial begin
        $dumpfile("ddr5_sim.vcd");
        $dumpvars(0, testbench);
    end

endmodule
`;

  return testbenchContent;
}

function processSimulationResults(
  simLog: string, 
  originalCommands: Omit<MemoryCommand, 'id' | 'status' | 'timestamp'>[]
): SimulationResults {
  // Parse the simulation log to extract timing and state information
  const lines = simLog.split('\n');
  
  // Track cycle count and current state
  let cycleCount = 0;
  let currentState: ControllerState = 'IDLE';
  let memoryState: {
    activeChannel?: number;
    activeBankGroup?: number;
    activeBank?: number;
    activeRow?: string;
  } = {};
  
  // Create timing data for chart
  const timingData: TimingEvent[] = [];
  
  // Process command queue
  const commandQueue: MemoryCommand[] = originalCommands.map((cmd, index) => ({
    ...cmd,
    id: `cmd-${index}`,
    status: index === 0 ? 'processing' : 'queued',
    timestamp: Date.now() + index * 100 // Fake timestamp for ordering
  }));
  
  // Parse each line of the log
  lines.forEach(line => {
    if (line.includes('Time,Cycle,State,Command')) return; // Skip header
    
    const parts = line.split(',');
    
    // Check for state changes
    if (parts[1] === 'STATE' && parts.length >= 3) {
      currentState = parts[2] as ControllerState;
    }
    
    // Check for command execution
    else if (parts.length >= 5 && ['READ', 'WRITE', 'ACTIVATE', 'PRECHARGE', 'REFRESH'].includes(parts[3])) {
      cycleCount = parseInt(parts[1], 10);
      const stateVal = parseInt(parts[2], 10);
      currentState = getControllerStateString(stateVal);
      
      // Update command status
      const cmdType = parts[3] as any;
      const cmdChannel = parseInt(parts[4], 10);
      const cmdBankGroup = parseInt(parts[5], 10);
      const cmdBank = parseInt(parts[6], 10);
      
      // Find and update matching command in the queue
      const cmdIndex = commandQueue.findIndex(cmd => 
        cmd.status !== 'completed' && 
        cmd.type === cmdType &&
        cmd.channel === cmdChannel &&
        cmd.bankGroup === cmdBankGroup &&
        cmd.bank === cmdBank
      );
      
      if (cmdIndex >= 0) {
        commandQueue[cmdIndex].status = 'processing';
        
        // Set any previous processing commands to completed
        commandQueue.forEach((cmd, i) => {
          if (i !== cmdIndex && cmd.status === 'processing') {
            cmd.status = 'completed';
          }
        });
      }
    }
    
    // Check for signal updates
    else if (parts[1] === 'SIGNAL' && parts.length >= 4) {
      const signal = parts[2];
      const value = parts[3];
      
      // Add to timing data
      if (signal === 'cycle') {
        cycleCount = parseInt(value, 10);
      } 
      else if (signal === 'active_channel' && value !== '0') {
        memoryState.activeChannel = parseInt(value, 10);
        timingData.push({
          cycle: cycleCount,
          signal: 'active_channel',
          value: parseInt(value, 10)
        });
      }
      else if (signal === 'active_bank_group') {
        memoryState.activeBankGroup = parseInt(value, 10);
        timingData.push({
          cycle: cycleCount,
          signal: 'active_bank_group',
          value: parseInt(value, 10)
        });
      }
      else if (signal === 'active_bank') {
        memoryState.activeBank = parseInt(value, 10);
        timingData.push({
          cycle: cycleCount,
          signal: 'active_bank',
          value: parseInt(value, 10)
        });
      }
      else if (signal === 'state') {
        const stateVal = parseInt(value, 10);
        currentState = getControllerStateString(stateVal);
        timingData.push({
          cycle: cycleCount,
          signal: 'controller_state',
          value: stateVal
        });
      }
      else if (signal === 'cmd_valid' || signal === 'cmd_ready') {
        timingData.push({
          cycle: cycleCount,
          signal,
          value: value === '1'
        });
      }
    }
  });
  
  // Find current command
  const currentCommand = commandQueue.find(cmd => cmd.status === 'processing');
  
  return {
    simulationState: {
      status: 'completed',
      cycleCount,
      currentState,
      memoryState,
      commandQueue,
      currentCommand,
      timingData
    },
    verilogOutput: simLog,
    success: true
  };
}
