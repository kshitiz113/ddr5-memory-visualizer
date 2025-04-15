import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useSimulationStore } from '@/lib/store';
import { TimingEvent } from '@shared/types';

const TimingDiagram = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { simulationState } = useSimulationStore();
  
  useEffect(() => {
    if (!svgRef.current || simulationState.timingData.length === 0) return;
    
    drawTimingDiagram();
  }, [simulationState.timingData, svgRef.current]);
  
  const drawTimingDiagram = () => {
    const svg = d3.select(svgRef.current);
    const width = svgRef.current!.clientWidth;
    const height = 400;
    const margin = { top: 40, right: 30, bottom: 50, left: 100 };
    
    // Clear existing diagram
    svg.selectAll('*').remove();
    
    // Process timing data
    const timingData = simulationState.timingData;
    
    // Extract unique signals and cycles
    const signals = Array.from(new Set(timingData.map(d => d.signal)));
    const cycles = Array.from(new Set(timingData.map(d => d.cycle))).sort((a, b) => a - b);
    
    // Create scales
    const xScale = d3.scaleBand()
      .domain(cycles.map(c => c.toString()))
      .range([margin.left, width - margin.right])
      .padding(0.1);
    
    const yScale = d3.scaleBand()
      .domain(signals)
      .range([margin.top, height - margin.bottom])
      .padding(0.2);
    
    // Create axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);
    
    // Draw axes
    svg.append('g')
      .attr('transform', `translate(0, ${height - margin.bottom})`)
      .call(xAxis)
      .append('text')
      .attr('x', width / 2)
      .attr('y', 40)
      .attr('fill', 'currentColor')
      .attr('text-anchor', 'middle')
      .text('Clock Cycle');
    
    svg.append('g')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(yAxis)
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -((height - margin.top - margin.bottom) / 2 + margin.top))
      .attr('y', -60)
      .attr('fill', 'currentColor')
      .attr('text-anchor', 'middle')
      .text('Signal');
    
    // Group data by signal
    const signalGroups: { [key: string]: TimingEvent[] } = {};
    signals.forEach(signal => {
      signalGroups[signal] = timingData.filter(d => d.signal === signal)
        .sort((a, b) => a.cycle - b.cycle);
    });
    
    // Draw timing lines for each signal
    Object.entries(signalGroups).forEach(([signal, events]) => {
      // Get y position for this signal
      const yPos = yScale(signal)! + yScale.bandwidth() / 2;
      
      // Create line generator for digital signals
      const lineGenerator = d3.line<TimingEvent>()
        .x(d => xScale(d.cycle.toString())! + xScale.bandwidth() / 2)
        .y(d => {
          // Convert value to y position
          const value = typeof d.value === 'boolean' 
            ? (d.value ? 1 : 0) 
            : (d.value > 0 ? 1 : 0);
          return yPos - (value * yScale.bandwidth() * 0.4);
        });
      
      // Draw path if we have enough points
      if (events.length > 1) {
        svg.append('path')
          .datum(events)
          .attr('fill', 'none')
          .attr('stroke', getSignalColor(signal))
          .attr('stroke-width', 2)
          .attr('d', lineGenerator);
      }
      
      // Draw points and labels for each event
      events.forEach(event => {
        const x = xScale(event.cycle.toString())! + xScale.bandwidth() / 2;
        const value = typeof event.value === 'boolean' 
          ? (event.value ? 1 : 0) 
          : (event.value > 0 ? 1 : 0);
        const y = yPos - (value * yScale.bandwidth() * 0.4);
        
        // Draw point
        svg.append('circle')
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', 4)
          .attr('fill', getSignalColor(signal));
        
        // Draw value label
        svg.append('text')
          .attr('x', x)
          .attr('y', y - 10)
          .attr('text-anchor', 'middle')
          .attr('font-size', '10px')
          .attr('fill', 'currentColor')
          .text(formatValue(event.value));
      });
    });
    
    // Add title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .text('DDR5 Controller Timing Diagram');
    
    // Add timing parameters
    svg.append('text')
      .attr('x', width - margin.right)
      .attr('y', margin.top - 10)
      .attr('text-anchor', 'end')
      .attr('font-size', '12px')
      .attr('fill', '#666')
      .text('tRCD: 4 | tRP: 4 | tCAS: 3 | tCCD_L: 2 | tFAW: 16');
  };
  
  // Helper function to get color for different signals
  const getSignalColor = (signal: string): string => {
    switch (signal) {
      case 'controller_state':
        return '#6366F1'; // indigo
      case 'cmd_valid':
        return '#3B82F6'; // blue
      case 'cmd_ready':
        return '#10B981'; // green
      case 'active_channel':
        return '#F59E0B'; // amber
      case 'active_bank_group':
        return '#EF4444'; // red
      case 'active_bank':
        return '#8B5CF6'; // purple
      default:
        return '#9CA3AF'; // gray
    }
  };
  
  // Helper function to format values for display
  const formatValue = (value: boolean | number): string => {
    if (typeof value === 'boolean') {
      return value ? '1' : '0';
    }
    
    // For controller_state, convert numeric value to state name
    if (value >= 0 && value <= 5) {
      const states = ['IDLE', 'ACT', 'READ', 'WRITE', 'PRE', 'REF'];
      return states[value];
    }
    
    return value.toString();
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-neutral-800">Timing Diagram</h2>
        <div className="flex items-center space-x-3">
          <div className="text-xs text-gray-500 flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-indigo-500 mr-1"></span> State
          </div>
          <div className="text-xs text-gray-500 flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-1"></span> CMD Valid
          </div>
          <div className="text-xs text-gray-500 flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1"></span> CMD Ready
          </div>
        </div>
      </div>
      
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {simulationState.timingData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 bg-gray-50">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No timing data available. Run a simulation to view the diagram.</p>
          </div>
        ) : (
          <svg ref={svgRef} width="100%" height="400" />
        )}
      </div>
      
      <div className="mt-4 text-xs text-gray-500">
        <h3 className="font-medium mb-1">Timing Parameters:</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          <div className="bg-gray-50 p-2 rounded">tRCD: 4 cycles</div>
          <div className="bg-gray-50 p-2 rounded">tRP: 4 cycles</div>
          <div className="bg-gray-50 p-2 rounded">tCAS: 3 cycles</div>
          <div className="bg-gray-50 p-2 rounded">tCCD_L: 2 cycles</div>
          <div className="bg-gray-50 p-2 rounded">tFAW: 16 cycles</div>
        </div>
      </div>
    </div>
  );
};

export default TimingDiagram;
