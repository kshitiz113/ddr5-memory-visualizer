import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { runSimulation } from "./simulation";
import { NewSimulationRequest } from "@shared/types";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);

  // API endpoint to run a simulation
  app.post('/api/simulation/run', async (req, res) => {
    try {
      const simRequest: NewSimulationRequest = req.body;
      
      // Validate request
      if (!simRequest.commands || !Array.isArray(simRequest.commands) || simRequest.commands.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid simulation request. Commands array is required.' 
        });
      }
      
      // Run the simulation
      const result = await runSimulation(simRequest);
      
      return res.json(result);
    } catch (error) {
      console.error('Simulation error:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message || 'Failed to run simulation' 
      });
    }
  });

  // API endpoint to get the current simulation state
  app.get('/api/simulation/state', (req, res) => {
    try {
      // Return a default state when nothing has been run yet
      return res.json({
        status: 'idle',
        cycleCount: 0,
        currentState: 'IDLE',
        memoryState: {},
        commandQueue: [],
        timingData: []
      });
    } catch (error) {
      console.error('Error getting simulation state:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message || 'Failed to get simulation state' 
      });
    }
  });

  return httpServer;
}
