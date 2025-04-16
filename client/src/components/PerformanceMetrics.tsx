import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { MemoryCommand, SimulationState } from '@shared/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface PerformanceMetricsProps {
  simulationState: SimulationState;
  previousSimulations?: SimulationState[];
}

/**
 * A component that displays detailed performance metrics and comparison charts
 * for DDR5 memory controller operations.
 */
const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ 
  simulationState,
  previousSimulations = []
}) => {
  const [commandDetailExpanded, setCommandDetailExpanded] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('latency');
  
  // Extract metrics from current simulation
  const metrics = useMemo(() => {
    if (simulationState.status !== 'completed' && simulationState.status !== 'idle') {
      return null;
    }
    
    const commands = simulationState.commandQueue;
    
    // Skip if no commands
    if (!commands.length) {
      return null;
    }
    
    // Count command types
    const commandTypeCounts = commands.reduce<Record<string, number>>((acc, cmd) => {
      acc[cmd.type] = (acc[cmd.type] || 0) + 1;
      return acc;
    }, {});
    
    // Calculate average latency by command type (time from queue to completion)
    const latencyByCommandType = commands.reduce<Record<string, number>>((acc, cmd) => {
      if (!acc[cmd.type]) {
        acc[cmd.type] = 0;
      }
      // Use cycle count as latency measure
      const latency = cmd.status === 'completed' ? 
        simulationState.cycleCount - cmd.timestamp : 0;
      
      acc[cmd.type] += latency;
      return acc;
    }, {});
    
    // Calculate averages
    Object.keys(latencyByCommandType).forEach(type => {
      if (commandTypeCounts[type] > 0) {
        latencyByCommandType[type] = Math.round(latencyByCommandType[type] / commandTypeCounts[type]);
      }
    });
    
    // Bandwidth calculation (based on completed READ/WRITE commands)
    const dataTransferredBytes = commands
      .filter(cmd => (cmd.type === 'READ' || cmd.type === 'WRITE') && cmd.status === 'completed')
      .length * 64; // 64 bytes per command (512 bits)
    
    const totalCycles = simulationState.cycleCount;
    const cycleDuration = 0.417; // nanoseconds (DDR5-4800)
    const executionTimeNs = totalCycles * cycleDuration;
    
    // Calculate bandwidth in GB/s
    const bandwidthGBps = dataTransferredBytes / (executionTimeNs / 1000);
    
    // Calculate row buffer hit rate
    const rowHits = simulationState.timingData?.filter(event => 
      event.signal === 'row_buffer_hit' && event.value === 1
    ).length || 0;
    
    const rowMisses = simulationState.timingData?.filter(event => 
      event.signal === 'row_buffer_hit' && event.value === 0
    ).length || 0;
    
    const rowBufferHitRate = rowHits + rowMisses > 0 ? 
      (rowHits / (rowHits + rowMisses)) * 100 : 0;
    
    // Calculate command efficiency (completed commands / total commands)
    const completedCommands = commands.filter(cmd => cmd.status === 'completed').length;
    const commandEfficiency = commands.length > 0 ? 
      (completedCommands / commands.length) * 100 : 0;
    
    // Calculate bank utilization
    const activeTime: Record<string, number> = {};
    
    simulationState.timingData?.forEach(event => {
      if (event.signal.startsWith('bank_active_')) {
        const bankId = event.signal.split('_').pop();
        if (!bankId) return;
        
        if (!activeTime[bankId]) {
          activeTime[bankId] = 0;
        }
        
        if (event.value === 1) {
          activeTime[bankId] += 1;
        }
      }
    });
    
    const bankUtilization = Object.entries(activeTime).map(([bank, cycles]) => ({
      bank,
      utilization: (cycles / totalCycles) * 100
    }));
    
    return {
      commandTypeCounts,
      latencyByCommandType,
      bandwidthGBps,
      rowBufferHitRate,
      commandEfficiency,
      bankUtilization,
      totalCycles,
      executionTimeNs
    };
    
  }, [simulationState]);
  
  // Prepare chart data
  const commandTypeData = useMemo(() => {
    if (!metrics) return [];
    
    return Object.entries(metrics.commandTypeCounts).map(([type, count]) => ({
      name: type,
      count
    }));
  }, [metrics]);
  
  const latencyData = useMemo(() => {
    if (!metrics) return [];
    
    return Object.entries(metrics.latencyByCommandType).map(([type, latency]) => ({
      name: type,
      cycles: latency
    }));
  }, [metrics]);

  // Comparison data with previous simulations
  const comparisonData = useMemo(() => {
    if (!metrics) return [];
    
    const current = {
      name: 'Current',
      bandwidth: metrics.bandwidthGBps,
      hitRate: metrics.rowBufferHitRate,
      efficiency: metrics.commandEfficiency,
      cycles: metrics.totalCycles
    };
    
    const previousData = previousSimulations.map((sim, index) => {
      // Calculate basic metrics for previous simulations
      const commands = sim.commandQueue;
      const completedCommands = commands.filter(cmd => cmd.status === 'completed').length;
      const efficiency = commands.length > 0 ? 
        (completedCommands / commands.length) * 100 : 0;
        
      const dataTransferredBytes = commands
        .filter(cmd => (cmd.type === 'READ' || cmd.type === 'WRITE') && cmd.status === 'completed')
        .length * 64;
        
      const totalCycles = sim.cycleCount;
      const cycleDuration = 0.417; // nanoseconds (DDR5-4800)
      const executionTimeNs = totalCycles * cycleDuration;
      
      const bandwidthGBps = dataTransferredBytes / (executionTimeNs / 1000);
      
      return {
        name: `Sim ${index + 1}`,
        bandwidth: bandwidthGBps,
        hitRate: 0, // Not calculated for previous sims
        efficiency: efficiency,
        cycles: totalCycles
      };
    });
    
    return [current, ...previousData];
  }, [metrics, previousSimulations]);
  
  // Command execution timeline data
  const timelineData = useMemo(() => {
    if (!simulationState.timingData || !metrics) return [];
    
    // Group timing events by cycle
    const cycleEvents: Record<number, Array<{ signal: string, value: boolean | number }>> = {};
    
    simulationState.timingData.forEach(event => {
      if (!cycleEvents[event.cycle]) {
        cycleEvents[event.cycle] = [];
      }
      cycleEvents[event.cycle].push({ signal: event.signal, value: event.value });
    });
    
    // Create timeline data
    return Object.entries(cycleEvents).map(([cycle, events]) => {
      const data: Record<string, any> = { cycle: parseInt(cycle) };
      
      events.forEach(event => {
        data[event.signal] = event.value;
      });
      
      return data;
    }).sort((a, b) => a.cycle - b.cycle);
  }, [simulationState.timingData, metrics]);
  
  if (!metrics) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="flex items-center justify-center h-40">
          <p className="text-neutral-500">
            Run a simulation to see performance metrics
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <h2 className="text-lg font-semibold text-neutral-800 mb-4">Performance Metrics</h2>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Execution Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.executionTimeNs.toFixed(1)} ns</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total cycles: {metrics.totalCycles}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Bandwidth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.bandwidthGBps.toFixed(2)} GB/s</div>
            <p className="text-xs text-muted-foreground mt-1">
              DDR5-4800 theoretical: 38.4 GB/s
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Row Buffer Hit Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.rowBufferHitRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Higher is better for performance
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Command Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.commandEfficiency.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Completed commands / total commands
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Detailed Charts */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="latency">Command Latency</TabsTrigger>
          <TabsTrigger value="distribution">Command Distribution</TabsTrigger>
          <TabsTrigger value="timeline">Execution Timeline</TabsTrigger>
          <TabsTrigger value="comparison">Simulation Comparison</TabsTrigger>
        </TabsList>
        
        <TabsContent value="latency">
          <Card>
            <CardHeader>
              <CardTitle>Command Latency (Cycles)</CardTitle>
              <CardDescription>
                Average latency for each command type from issue to completion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={latencyData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: 'Cycles', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value) => [`${value} cycles`, 'Latency']} />
                    <Legend />
                    <Bar dataKey="cycles" fill="#8884d8" name="Average Cycles" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="distribution">
          <Card>
            <CardHeader>
              <CardTitle>Command Type Distribution</CardTitle>
              <CardDescription>
                Breakdown of command types in the simulation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={commandTypeData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#82ca9d" name="Number of Commands" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Command Execution Timeline</CardTitle>
              <CardDescription>
                Signal states over time during the simulation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={timelineData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="cycle" label={{ value: 'Cycle', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'Signal Value', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    {timelineData.length > 0 && Object.keys(timelineData[0])
                      .filter(key => key !== 'cycle')
                      .map((signal, index) => (
                        <Line 
                          key={signal}
                          type="stepAfter"
                          dataKey={signal}
                          stroke={`hsl(${index * 30}, 70%, 50%)`}
                          dot={false}
                          name={signal}
                        />
                      ))
                    }
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <CardTitle>Simulation Comparison</CardTitle>
              <CardDescription>
                Compare performance across different simulation runs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={comparisonData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="bandwidth" fill="#8884d8" name="Bandwidth (GB/s)" />
                    <Bar dataKey="efficiency" fill="#82ca9d" name="Command Efficiency (%)" />
                    <Bar dataKey="cycles" fill="#ffc658" name="Total Cycles" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Command Details */}
      <div>
        <h3 className="text-md font-semibold mb-2">Command Sequence Analysis</h3>
        <div className="border rounded-md divide-y">
          {simulationState.commandQueue.map((cmd, index) => (
            <div key={cmd.id || index} className="p-2">
              <div className="flex justify-between items-center">
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
                  <span className="font-medium">{cmd.type}</span>
                  <span className="text-xs text-gray-500">
                    CH:{cmd.channel} BG:{cmd.bankGroup} B:{cmd.bank} 
                    {cmd.row && ` Row:${cmd.row}`}
                    {cmd.column && ` Col:${cmd.column}`}
                  </span>
                </div>
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setCommandDetailExpanded(
                          commandDetailExpanded === cmd.id ? null : cmd.id
                        )}
                      >
                        {commandDetailExpanded === cmd.id ? 'Hide Details' : 'Show Details'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View detailed performance metrics for this command</p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </div>
              
              {commandDetailExpanded === cmd.id && (
                <div className="mt-2 pl-4 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-500">Status:</span> {cmd.status}
                    </div>
                    <div>
                      <span className="text-gray-500">Timestamp:</span> Cycle {cmd.timestamp}
                    </div>
                    <div>
                      <span className="text-gray-500">Latency:</span> {
                        cmd.status === 'completed' 
                          ? `${simulationState.cycleCount - cmd.timestamp} cycles` 
                          : 'N/A'
                      }
                    </div>
                    <div>
                      <span className="text-gray-500">Dependencies:</span> {
                        // Show potential dependencies, e.g., ACTIVATE before READ
                        cmd.type === 'READ' || cmd.type === 'WRITE' 
                          ? 'Requires row activation' 
                          : cmd.type === 'PRECHARGE' 
                            ? 'Required before activating different row' 
                            : 'None'
                      }
                    </div>
                  </div>
                  
                  {/* Command-specific timing information */}
                  <div className="mt-2">
                    <h4 className="font-medium text-xs">Timing Parameters:</h4>
                    <div className="grid grid-cols-3 gap-1 mt-1">
                      {cmd.type === 'READ' && (
                        <>
                          <div className="text-xs">tCAS: 16 cycles</div>
                          <div className="text-xs">tCCD_L: 6 cycles</div>
                          <div className="text-xs">tBURST: 4 cycles</div>
                        </>
                      )}
                      {cmd.type === 'WRITE' && (
                        <>
                          <div className="text-xs">tCWD: 14 cycles</div>
                          <div className="text-xs">tCCD_L: 6 cycles</div>
                          <div className="text-xs">tWR: 24 cycles</div>
                        </>
                      )}
                      {cmd.type === 'ACTIVATE' && (
                        <>
                          <div className="text-xs">tRCD: 18 cycles</div>
                          <div className="text-xs">tRRD_L: 6 cycles</div>
                          <div className="text-xs">tFAW: 32 cycles</div>
                        </>
                      )}
                      {cmd.type === 'PRECHARGE' && (
                        <>
                          <div className="text-xs">tRP: 18 cycles</div>
                          <div className="text-xs">tRAS: 42 cycles</div>
                        </>
                      )}
                      {cmd.type === 'REFRESH' && (
                        <>
                          <div className="text-xs">tRFC: 350 ns</div>
                          <div className="text-xs">tREFI: 7.8 μs</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PerformanceMetrics;