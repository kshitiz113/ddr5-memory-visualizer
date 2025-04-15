// DDR5 Memory Controller Testbench
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
        
        // Wait for controller to stabilize
        #20;
        
        // Test sequence: ACTIVATE -> WRITE -> READ -> PRECHARGE
        
        // ACTIVATE
        @(posedge clk);
        cmd_type = CMD_ACTIVATE;
        cmd_valid = 1;
        cmd_channel = 0;
        cmd_bank_group = 2;
        cmd_bank = 1;
        cmd_row = 16'hA400;
        $display("%t,%0d,%0d,ACTIVATE,%0d,%0d,%0d,0x%h,,-", $time, cycle_count, controller_state, cmd_channel, cmd_bank_group, cmd_bank, cmd_row);
        
        // Wait for command to be accepted
        @(posedge clk);
        while (!cmd_ready) @(posedge clk);
        cmd_valid = 0;
        
        // Wait for tRCD (Activate to Read/Write delay)
        repeat (4) @(posedge clk);
        
        // WRITE
        @(posedge clk);
        cmd_type = CMD_WRITE;
        cmd_valid = 1;
        cmd_channel = 0;
        cmd_bank_group = 2;
        cmd_bank = 1;
        cmd_row = 16'hA400;
        cmd_column = 10'h048;
        cmd_data = 32'hDEADBEEF;
        $display("%t,%0d,%0d,WRITE,%0d,%0d,%0d,0x%h,0x%h,0x%h", $time, cycle_count, controller_state, cmd_channel, cmd_bank_group, cmd_bank, cmd_row, cmd_column, cmd_data);
        
        // Wait for command to be accepted
        @(posedge clk);
        while (!cmd_ready) @(posedge clk);
        cmd_valid = 0;
        
        // READ
        @(posedge clk);
        cmd_type = CMD_READ;
        cmd_valid = 1;
        cmd_channel = 0;
        cmd_bank_group = 2;
        cmd_bank = 1;
        cmd_row = 16'hA400;
        cmd_column = 10'h048;
        $display("%t,%0d,%0d,READ,%0d,%0d,%0d,0x%h,0x%h,-", $time, cycle_count, controller_state, cmd_channel, cmd_bank_group, cmd_bank, cmd_row, cmd_column);
        
        // Wait for command to be accepted
        @(posedge clk);
        while (!cmd_ready) @(posedge clk);
        cmd_valid = 0;
        
        // Wait for CAS latency
        repeat (3) @(posedge clk);
        
        // PRECHARGE
        @(posedge clk);
        cmd_type = CMD_PRECHARGE;
        cmd_valid = 1;
        cmd_channel = 0;
        cmd_bank_group = 2;
        cmd_bank = 1;
        $display("%t,%0d,%0d,PRECHARGE,%0d,%0d,%0d,,,-", $time, cycle_count, controller_state, cmd_channel, cmd_bank_group, cmd_bank);
        
        // Wait for command to be accepted
        @(posedge clk);
        while (!cmd_ready) @(posedge clk);
        cmd_valid = 0;
        
        // Wait for tRP (Precharge to Activate delay)
        repeat (4) @(posedge clk);
        
        // Test another bank group - ACTIVATE
        @(posedge clk);
        cmd_type = CMD_ACTIVATE;
        cmd_valid = 1;
        cmd_channel = 0;
        cmd_bank_group = 1;
        cmd_bank = 0;
        cmd_row = 16'h5500;
        $display("%t,%0d,%0d,ACTIVATE,%0d,%0d,%0d,0x%h,,-", $time, cycle_count, controller_state, cmd_channel, cmd_bank_group, cmd_bank, cmd_row);
        
        // Wait for command to be accepted
        @(posedge clk);
        while (!cmd_ready) @(posedge clk);
        cmd_valid = 0;
        
        // Finish simulation
        repeat (10) @(posedge clk);
        $finish;
    end
    
    // Monitor state changes
    always @(controller_state) begin
        case (controller_state)
            STATE_IDLE: $display("%t: Controller state changed to IDLE", $time);
            STATE_ACTIVATE: $display("%t: Controller state changed to ACTIVATE", $time);
            STATE_READ: $display("%t: Controller state changed to READ", $time);
            STATE_WRITE: $display("%t: Controller state changed to WRITE", $time);
            STATE_PRECHARGE: $display("%t: Controller state changed to PRECHARGE", $time);
            STATE_REFRESH: $display("%t: Controller state changed to REFRESH", $time);
            default: $display("%t: Controller state changed to UNKNOWN (%0d)", $time, controller_state);
        endcase
    end
    
    // Generate VCD file for waveform viewing
    initial begin
        $dumpfile("ddr5_sim.vcd");
        $dumpvars(0, testbench);
    end

endmodule
