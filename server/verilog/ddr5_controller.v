// Simple DDR5 Memory Controller Model
module ddr5_controller(
    input wire clk,
    input wire reset,
    
    // Command interface
    input wire [2:0] cmd_type,
    input wire cmd_valid,
    input wire [0:0] cmd_channel,
    input wire [1:0] cmd_bank_group,
    input wire [1:0] cmd_bank,
    input wire [15:0] cmd_row,
    input wire [9:0] cmd_column,
    input wire [31:0] cmd_data,
    output reg cmd_ready,
    
    // Memory interface
    output reg [2:0] mem_cmd_type,
    output reg mem_cmd_valid,
    output reg [0:0] mem_channel,
    output reg [1:0] mem_bank_group,
    output reg [1:0] mem_bank,
    output reg [15:0] mem_row,
    output reg [9:0] mem_column,
    output reg [31:0] mem_data,
    input wire mem_cmd_ready,
    
    // Status outputs
    output reg [2:0] controller_state,
    output reg [31:0] cycle_count
);

    // Command type definitions
    localparam CMD_IDLE = 3'b000;
    localparam CMD_READ = 3'b001;
    localparam CMD_WRITE = 3'b010;
    localparam CMD_ACTIVATE = 3'b011;
    localparam CMD_PRECHARGE = 3'b100;
    localparam CMD_REFRESH = 3'b101;
    
    // FSM states
    localparam STATE_IDLE = 3'b000;
    localparam STATE_ACTIVATE = 3'b001;
    localparam STATE_READ = 3'b010;
    localparam STATE_WRITE = 3'b011;
    localparam STATE_PRECHARGE = 3'b100;
    localparam STATE_REFRESH = 3'b101;
    
    // Timing parameters (in clock cycles)
    localparam tRCD = 4;  // ACT to READ/WRITE delay
    localparam tRP = 4;   // PRE to ACT delay
    localparam tCAS = 3;  // READ latency
    localparam tCCD_L = 2; // Column to Column Delay (same bank group)
    localparam tFAW = 16; // Four Activate Window
    
    // Internal state tracking
    reg [0:0] active_channel [1:0][3:0];  // Per bank group, bank status (0: inactive, 1: active)
    reg [1:0] active_bank_group [1:0][3:0];  // For each channel and bank group
    reg [1:0] active_bank [1:0][3:0];  // For each channel and bank group
    reg [15:0] active_row [1:0][3:0][3:0];  // For each channel, bank group, and bank
    
    // Timing counters
    reg [3:0] act_to_read_counter;
    reg [3:0] pre_to_act_counter;
    reg [3:0] read_latency_counter;
    
    // Command queue (simplified)
    reg [2:0] cmd_queue_type;
    reg cmd_queue_valid;
    reg [0:0] cmd_queue_channel;
    reg [1:0] cmd_queue_bank_group;
    reg [1:0] cmd_queue_bank;
    reg [15:0] cmd_queue_row;
    reg [9:0] cmd_queue_column;
    reg [31:0] cmd_queue_data;
    
    // Initialize counts and state
    initial begin
        controller_state = STATE_IDLE;
        cycle_count = 0;
        cmd_ready = 1;
        mem_cmd_valid = 0;
        act_to_read_counter = 0;
        pre_to_act_counter = 0;
        read_latency_counter = 0;
    end
    
    // Handle reset
    always @(posedge reset) begin
        controller_state <= STATE_IDLE;
        cmd_ready <= 1;
        mem_cmd_valid <= 0;
        act_to_read_counter <= 0;
        pre_to_act_counter <= 0;
        read_latency_counter <= 0;
    end
    
    // Main FSM logic
    always @(posedge clk) begin
        if (!reset) begin
            // Increment cycle counter
            cycle_count <= cycle_count + 1;
            
            // Default values
            mem_cmd_valid <= 0;
            
            // Decrement timing counters if they are > 0
            if (act_to_read_counter > 0) act_to_read_counter <= act_to_read_counter - 1;
            if (pre_to_act_counter > 0) pre_to_act_counter <= pre_to_act_counter - 1;
            if (read_latency_counter > 0) read_latency_counter <= read_latency_counter - 1;
            
            // FSM State transitions
            case (controller_state)
                STATE_IDLE: begin
                    cmd_ready <= 1;
                    
                    // Process new command if valid
                    if (cmd_valid) begin
                        cmd_ready <= 0;
                        
                        case (cmd_type)
                            CMD_ACTIVATE: begin
                                controller_state <= STATE_ACTIVATE;
                                
                                // Store command details
                                mem_cmd_type <= CMD_ACTIVATE;
                                mem_channel <= cmd_channel;
                                mem_bank_group <= cmd_bank_group;
                                mem_bank <= cmd_bank;
                                mem_row <= cmd_row;
                                
                                // Set the bank as active
                                active_channel[cmd_channel][cmd_bank_group] <= 1;
                                active_bank_group[cmd_channel][cmd_bank_group] <= cmd_bank_group;
                                active_bank[cmd_channel][cmd_bank_group] <= cmd_bank;
                                active_row[cmd_channel][cmd_bank_group][cmd_bank] <= cmd_row;
                                
                                // Prepare to send command to memory
                                mem_cmd_valid <= 1;
                                
                                // Start timing counter for ACT to READ/WRITE delay
                                act_to_read_counter <= tRCD;
                            end
                            
                            CMD_READ: begin
                                // Check if bank is active and row is open
                                if (active_channel[cmd_channel][cmd_bank_group] == 1 &&
                                    active_bank_group[cmd_channel][cmd_bank_group] == cmd_bank_group &&
                                    active_bank[cmd_channel][cmd_bank_group] == cmd_bank &&
                                    active_row[cmd_channel][cmd_bank_group][cmd_bank] == cmd_row) begin
                                    
                                    // Row is already active, can proceed with READ
                                    controller_state <= STATE_READ;
                                    
                                    // Store command details
                                    mem_cmd_type <= CMD_READ;
                                    mem_channel <= cmd_channel;
                                    mem_bank_group <= cmd_bank_group;
                                    mem_bank <= cmd_bank;
                                    mem_column <= cmd_column;
                                    
                                    // Prepare to send command to memory
                                    mem_cmd_valid <= 1;
                                    
                                    // Start read latency counter
                                    read_latency_counter <= tCAS;
                                end else begin
                                    // Need to activate row first, queue the read
                                    cmd_queue_type <= CMD_READ;
                                    cmd_queue_valid <= 1;
                                    cmd_queue_channel <= cmd_channel;
                                    cmd_queue_bank_group <= cmd_bank_group;
                                    cmd_queue_bank <= cmd_bank;
                                    cmd_queue_row <= cmd_row;
                                    cmd_queue_column <= cmd_column;
                                    
                                    // Start with ACTIVATE command
                                    controller_state <= STATE_ACTIVATE;
                                    
                                    // Store command details for ACTIVATE
                                    mem_cmd_type <= CMD_ACTIVATE;
                                    mem_channel <= cmd_channel;
                                    mem_bank_group <= cmd_bank_group;
                                    mem_bank <= cmd_bank;
                                    mem_row <= cmd_row;
                                    
                                    // Prepare to send command to memory
                                    mem_cmd_valid <= 1;
                                    
                                    // Start timing counter for ACT to READ delay
                                    act_to_read_counter <= tRCD;
                                end
                            end
                            
                            CMD_WRITE: begin
                                // Check if bank is active and row is open
                                if (active_channel[cmd_channel][cmd_bank_group] == 1 &&
                                    active_bank_group[cmd_channel][cmd_bank_group] == cmd_bank_group &&
                                    active_bank[cmd_channel][cmd_bank_group] == cmd_bank &&
                                    active_row[cmd_channel][cmd_bank_group][cmd_bank] == cmd_row) begin
                                    
                                    // Row is already active, can proceed with WRITE
                                    controller_state <= STATE_WRITE;
                                    
                                    // Store command details
                                    mem_cmd_type <= CMD_WRITE;
                                    mem_channel <= cmd_channel;
                                    mem_bank_group <= cmd_bank_group;
                                    mem_bank <= cmd_bank;
                                    mem_column <= cmd_column;
                                    mem_data <= cmd_data;
                                    
                                    // Prepare to send command to memory
                                    mem_cmd_valid <= 1;
                                end else begin
                                    // Need to activate row first, queue the write
                                    cmd_queue_type <= CMD_WRITE;
                                    cmd_queue_valid <= 1;
                                    cmd_queue_channel <= cmd_channel;
                                    cmd_queue_bank_group <= cmd_bank_group;
                                    cmd_queue_bank <= cmd_bank;
                                    cmd_queue_row <= cmd_row;
                                    cmd_queue_column <= cmd_column;
                                    cmd_queue_data <= cmd_data;
                                    
                                    // Start with ACTIVATE command
                                    controller_state <= STATE_ACTIVATE;
                                    
                                    // Store command details for ACTIVATE
                                    mem_cmd_type <= CMD_ACTIVATE;
                                    mem_channel <= cmd_channel;
                                    mem_bank_group <= cmd_bank_group;
                                    mem_bank <= cmd_bank;
                                    mem_row <= cmd_row;
                                    
                                    // Prepare to send command to memory
                                    mem_cmd_valid <= 1;
                                    
                                    // Start timing counter for ACT to WRITE delay
                                    act_to_read_counter <= tRCD;
                                end
                            end
                            
                            CMD_PRECHARGE: begin
                                controller_state <= STATE_PRECHARGE;
                                
                                // Store command details
                                mem_cmd_type <= CMD_PRECHARGE;
                                mem_channel <= cmd_channel;
                                mem_bank_group <= cmd_bank_group;
                                mem_bank <= cmd_bank;
                                
                                // Prepare to send command to memory
                                mem_cmd_valid <= 1;
                                
                                // Set the bank as inactive
                                active_channel[cmd_channel][cmd_bank_group] <= 0;
                                
                                // Start timing counter for PRE to ACT delay
                                pre_to_act_counter <= tRP;
                            end
                            
                            CMD_REFRESH: begin
                                controller_state <= STATE_REFRESH;
                                
                                // Store command details
                                mem_cmd_type <= CMD_REFRESH;
                                mem_channel <= cmd_channel;
                                
                                // Prepare to send command to memory
                                mem_cmd_valid <= 1;
                                
                                // Set all banks in the channel as inactive
                                active_channel[cmd_channel][0] <= 0;
                                active_channel[cmd_channel][1] <= 0;
                                active_channel[cmd_channel][2] <= 0;
                                active_channel[cmd_channel][3] <= 0;
                            end
                            
                            default: begin
                                // Invalid command, stay in IDLE
                                cmd_ready <= 1;
                            end
                        endcase
                    end
                end
                
                STATE_ACTIVATE: begin
                    // Wait for tRCD before proceeding to READ/WRITE
                    if (act_to_read_counter == 0) begin
                        // Check if there's a queued READ/WRITE command
                        if (cmd_queue_valid) begin
                            cmd_queue_valid <= 0;
                            
                            if (cmd_queue_type == CMD_READ) begin
                                controller_state <= STATE_READ;
                                
                                // Store command details
                                mem_cmd_type <= CMD_READ;
                                mem_channel <= cmd_queue_channel;
                                mem_bank_group <= cmd_queue_bank_group;
                                mem_bank <= cmd_queue_bank;
                                mem_column <= cmd_queue_column;
                                
                                // Prepare to send command to memory
                                mem_cmd_valid <= 1;
                                
                                // Start read latency counter
                                read_latency_counter <= tCAS;
                            end else if (cmd_queue_type == CMD_WRITE) begin
                                controller_state <= STATE_WRITE;
                                
                                // Store command details
                                mem_cmd_type <= CMD_WRITE;
                                mem_channel <= cmd_queue_channel;
                                mem_bank_group <= cmd_queue_bank_group;
                                mem_bank <= cmd_queue_bank;
                                mem_column <= cmd_queue_column;
                                mem_data <= cmd_queue_data;
                                
                                // Prepare to send command to memory
                                mem_cmd_valid <= 1;
                            end else begin
                                // Return to IDLE if no queued command
                                controller_state <= STATE_IDLE;
                                cmd_ready <= 1;
                            end
                        end else begin
                            // Return to IDLE if no queued command
                            controller_state <= STATE_IDLE;
                            cmd_ready <= 1;
                        end
                    end
                end
                
                STATE_READ: begin
                    // Wait for read latency
                    if (read_latency_counter == 0) begin
                        // Read data would be available here
                        // Return to IDLE
                        controller_state <= STATE_IDLE;
                        cmd_ready <= 1;
                    end
                end
                
                STATE_WRITE: begin
                    // Write is complete in one cycle
                    controller_state <= STATE_IDLE;
                    cmd_ready <= 1;
                end
                
                STATE_PRECHARGE: begin
                    // Wait for tRP before allowing new ACTIVATE
                    if (pre_to_act_counter == 0) begin
                        controller_state <= STATE_IDLE;
                        cmd_ready <= 1;
                    end
                end
                
                STATE_REFRESH: begin
                    // Refresh is complete in one cycle
                    controller_state <= STATE_IDLE;
                    cmd_ready <= 1;
                end
                
                default: begin
                    // Unknown state, return to IDLE
                    controller_state <= STATE_IDLE;
                    cmd_ready <= 1;
                end
            endcase
        end
    end

endmodule
