# Visualizing Command Execution in DDR5 Memory Controllers

An interactive, web-based educational simulator for understanding DDR5 memory controller operations through step-by-step command execution animations, timing diagrams, bank state transitions, and finite state machine (FSM) visualization.

## Overview

Understanding how DDR5 memory controllers process commands can be challenging because several operations occur across the controller, physical interface (PHY), and DRAM devices under strict timing constraints.

This project aims to simplify these concepts through an interactive visualization tool that illustrates the complete lifecycle of fundamental DDR5 memory commands, from command issuance to memory execution and data transfer.

Instead of focusing exclusively on performance statistics, the system emphasizes **how individual memory commands execute, how banks change states, and how timing constraints affect command scheduling.**

## Key Features

- **Command Execution Visualization:** Step-by-step animations for ACTIVATE, READ, WRITE, PRECHARGE, and REFRESH commands.
- **Memory Controller Pipeline:** Visualizes command issuance, queueing, scheduling, processing, and completion.
- **DDR5 Memory Hierarchy:** Illustrates channels, bank groups, banks, rows, columns, row buffers, and memory arrays.
- **Finite State Machine (FSM):** Displays controller states, valid transitions, and transition conditions.
- **Timing Diagram Visualization:** Shows clock cycles, command signals, address activity, data transfers, and timing constraints.
- **Bank State Management:** Demonstrates transitions between idle, active, and precharged states.
- **Data Bus Animation:** Visualizes data movement between the memory controller and DRAM during READ and WRITE operations.
- **Timing Constraint Analysis:** Explains parameters such as tRCD, tRP, CAS latency, tWR, and tRFC.
- **Interactive Learning Exercises:** Supports command sequencing challenges, timing analysis, and bank management exercises.
- **Memory Access Scenarios:** Demonstrates row hits, row conflicts, and read/write turnaround behavior.

## DDR5 Commands Supported

| Command | Description | Important Timing |
|---|---|---|
| ACTIVATE (ACT) | Opens a row in a bank and loads its contents into the row buffer. | tRCD |
| READ (RD) | Reads data from an activated row. | CL / tCAS |
| WRITE (WR) | Writes data to an activated row. | CWL, tWR |
| PRECHARGE (PRE) | Closes an active row and prepares the bank for another activation. | tRP |
| REFRESH (REF) | Refreshes DRAM cells to preserve stored data. | tRFC |

*Note: Exact timing values and command restrictions depend on the DDR5 device configuration and operating conditions.*

## System Architecture

The application follows a client-server architecture.

```text
                 +----------------------+
                 |     User / Student   |
                 +----------+-----------+
                            |
                            v
                 +----------------------+
                 |    React Frontend    |
                 |  Interactive UI      |
                 +----------+-----------+
                            |
              +-------------+-------------+
              |             |             |
              v             v             v
        Command Flow    Timing Diagram    FSM View
        Visualization   Visualization     Visualization
              |             |             |
              +-------------+-------------+
                            |
                            v
                 +----------------------+
                 |   Express.js API     |
                 | Command Processing   |
                 | State Management     |
                 | Timing Validation    |
                 +----------+-----------+
                            |
                            v
                 +----------------------+
                 | DDR5 Memory Model    |
                 | Banks / Rows /       |
                 | Buffers / Timing     |
                 +----------------------+
```

The backend manages simulated command execution and memory state, while the frontend renders synchronized animations and educational visualizations.

## Command Execution Workflow

Each simulated command follows a sequence of stages:

1. **Command Issuance:** A memory request is generated with the required address and operation parameters.
2. **Command Queueing:** The controller queues requests and checks scheduling dependencies.
3. **State Validation:** The simulator verifies bank state and command prerequisites.
4. **Controller Processing:** The controller FSM transitions to the appropriate processing state.
5. **PHY Transmission:** The command is represented as being transmitted to the DRAM device through the physical interface.
6. **Memory Execution:** The simulated memory model updates bank state, row-buffer contents, or refresh status.
7. **Data Transfer:** READ and WRITE operations visualize data movement over the data bus.
8. **Completion:** The simulator updates the state and determines which commands can execute next.

## Visualization Modules

### 1. READ Command

Visualizes reading data from an already activated row.

- Highlights the selected channel, bank group, bank, and row.
- Animates the READ command through the controller and PHY.
- Illustrates access to the row buffer.
- Shows data transfer from DRAM to the controller.
- Demonstrates delivery of the requested data to the CPU.
- Explains CAS latency and read timing constraints.

### 2. WRITE Command

Demonstrates how data is written to an activated row.

- Visualizes the WRITE command and associated data.
- Animates data movement from the controller to DRAM.
- Highlights the selected bank and row buffer.
- Models write recovery and precharge restrictions.
- Explains how modified row-buffer contents are eventually reflected in the memory array.

### 3. ACTIVATE Command

Shows how a row becomes accessible within a bank.

- Checks whether the bank is available for activation.
- Highlights the requested row in the memory array.
- Animates row activation and row-buffer loading.
- Changes the bank state from idle/precharged to active.
- Demonstrates the tRCD constraint before column commands can execute.

### 4. PRECHARGE Command

Illustrates closing an active row.

- Checks whether precharge is permitted.
- Animates the PRECHARGE command.
- Demonstrates restoration of the bank to a precharged state.
- Explains write recovery and other applicable timing restrictions.
- Visualizes the tRP interval before a subsequent ACTIVATE command.

### 5. REFRESH Command

Demonstrates the periodic maintenance required by DRAM.

- Visualizes refresh scheduling and applicable bank preparation.
- Highlights the affected banks or bank groups.
- Animates the refresh operation.
- Shows the temporary unavailability of affected resources.
- Explains the tRFC timing interval.

*The precise refresh scope and prerequisite behavior depend on the selected DDR5 refresh mode and configuration.*

## Timing Diagram

The timing visualization connects command execution with clock cycles and data transfers.

It is designed to illustrate:

- Command and address bus activity.
- Clock-cycle boundaries.
- READ and WRITE data bursts.
- CAS latency and CAS write latency.
- ACTIVATE-to-READ/WRITE delay (tRCD).
- PRECHARGE time (tRP).
- Write recovery (tWR).
- Refresh cycle time (tRFC).
- Dependencies between consecutive commands.

The timing model can be extended to validate command sequences against configurable DDR5 timing parameters.

## Finite State Machine Visualization

The FSM module provides a visual representation of controller processing states and transitions.

Example conceptual flow:

```text
       IDLE
         |
         v
    COMMAND QUEUE
         |
         v
    VALIDATION
         |
         v
     SCHEDULING
         |
         v
    COMMAND ISSUE
         |
         v
    PHY TRANSMISSION
         |
         v
    MEMORY EXECUTION
         |
         v
    COMPLETION
         |
         v
        IDLE
```

The diagram represents a simplified controller processing workflow. A realistic implementation may use concurrent command scheduling and separate state machines for channels, banks, timing logic, and data paths.

## Educational Scenarios

### Scenario 1: Row Hit

```text
ACTIVATE(row A)
      |
      v
READ(column 1)
      |
      v
READ(column 2)
      |
      v
READ(column 3)
      |
      v
PRECHARGE
```

**Learning objective:** Understand how multiple accesses to the same open row can reuse the row buffer and avoid repeated row activation.

### Scenario 2: Row Conflict

```text
ACTIVATE(row A)
      |
      v
READ(row A)
      |
      v
PRECHARGE
      |
      v
ACTIVATE(row B)
      |
      v
READ(row B)
```

**Learning objective:** Understand the additional latency associated with switching between different rows in the same bank.

### Scenario 3: Write-to-Read Turnaround

```text
ACTIVATE(row A)
      |
      v
WRITE(column 1)
      |
      v
Timing Constraints
      |
      v
READ(column 2)
```

**Learning objective:** Explore the timing restrictions and bus turnaround delays that affect transitions between write and read operations.

## Technology Stack

| Technology | Purpose |
|---|---|
| React | Interactive frontend and visualization components |
| TypeScript | Type-safe application development |
| Framer Motion | Command flow and state transition animations |
| SVG | Memory hierarchy and hardware-style diagrams |
| D3.js | Timing diagram visualization |
| Node.js | JavaScript runtime for the backend |
| Express.js | API endpoints and simulation state management |

These technologies describe the proposed implementation stack; actual dependencies and completed features should match the repository.

## Getting Started

### Prerequisites

Install the following tools:

- Node.js and npm
- A modern web browser
- Git

### Installation

Clone the repository:

```bash
git clone <YOUR_REPOSITORY_URL>
cd <YOUR_PROJECT_DIRECTORY>
```

Install the dependencies for the frontend and backend according to your project structure.

For a project with separate directories:

```bash
cd frontend
npm install

cd ../backend
npm install
```

### Running the Application

Start the backend:

```bash
cd backend
npm run dev
```

Start the frontend in a separate terminal:

```bash
cd frontend
npm run dev
```

Open the local URL printed by the frontend development server in your browser.

*These commands assume separate `frontend` and `backend` directories with corresponding development scripts. Adjust them to match your actual project configuration.*

## Project Structure

A possible organization for the application is:

```text
ddr5-command-visualizer/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CommandVisualizer.tsx
│   │   │   ├── MemoryHierarchy.tsx
│   │   │   ├── TimingDiagram.tsx
│   │   │   └── FSMVisualizer.tsx
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── App.tsx
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── simulation/
│   │   ├── models/
│   │   └── routes/
│   └── package.json
├── docs/
│   └── architecture.md
├── README.md
└── .gitignore
```

This is a suggested structure and can be adapted to the actual implementation.

## Learning Outcomes

After using the simulator, students should be able to:

- Explain the lifecycle of fundamental DDR5 commands.
- Understand the relationship between the memory controller, PHY, and DRAM devices.
- Identify bank states and valid state transitions.
- Interpret basic DRAM timing diagrams.
- Explain row-buffer hits and row conflicts.
- Understand command dependencies and timing restrictions.
- Analyze how scheduling decisions affect memory access latency.

## Future Enhancements

- Power consumption estimation for different command sequences.
- Side-by-side DDR4 and DDR5 command visualization.
- Support for additional DDR5 refresh modes and bank-level operations.
- Configurable memory timing parameters and clock frequencies.
- Advanced command scheduling and performance comparisons.
- Exportable timing diagrams and simulation traces.
- Virtual reality-based memory architecture visualization.
- Support for custom memory controller models.

## References

1. JEDEC, *DDR5 SDRAM Standard*, JESD79-5.
2. P. Rosenfeld, E. Cooper-Balis, and B. Jacob, "DRAMSim2: A Cycle Accurate Memory System Simulator," *IEEE Computer Architecture Letters*, vol. 10, no. 1, 2011.
3. Y. Kim et al., "Ramulator: A Fast and Extensible DRAM Simulator," *IEEE Computer Architecture Letters*, vol. 15, no. 1, 2016.
4. B. Jacob, S. Ng, and D. Wang, *Memory Systems: Cache, DRAM, Disk*. Morgan Kaufmann, 2007.
5. S. Rixner et al., "Memory Access Scheduling," *ACM SIGARCH Computer Architecture News*, vol. 28, no. 2, 2000.

## Contributing

Contributions, suggestions, and educational improvements are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Implement and test your changes.
4. Submit a pull request describing the improvements.

## License

Choose and add an appropriate open-source license, such as the MIT License, before distributing the project.

## Acknowledgements

This project is intended to make modern memory architecture easier to understand through interactive visualization, clear timing explanations, and hands-on experimentation.

---

**Visualizing Command Execution in DDR5 Memory Controllers** — Making complex memory operations easier to see, explore, and understand.
