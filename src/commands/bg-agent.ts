import * as fs from "fs-extra";
import * as path from "path";
import { spawn } from "child_process";

export const BgAgentCommand = {
  name: 'bg-agent',
  description: 'Start the background agent for continuous monitoring',
  execute: async (input: string): Promise<string> => {
    try {
      const agentPath = path.join(__dirname, '..', 'core', 'agent.js');
      
      if (!await fs.pathExists(agentPath)) {
        return `❌ Agent file not found at ${agentPath}`;
      }

      console.log('🤖 Starting background agent...');
      
      const child = spawn('node', [agentPath], {
        detached: true,
        stdio: 'ignore'
      });

      child.unref();

      // Save PID to file
      const pidFile = path.join(process.cwd(), '.agent.pid');
      if (child.pid) {
        await fs.writeFile(pidFile, child.pid.toString());
      }

      return child.pid ? `✅ Background agent started with PID ${child.pid}` : '✅ Background agent started but PID not available';
    } catch (error) {
      return `❌ Error starting background agent: ${error}`;
    }
  }
};