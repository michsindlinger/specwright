/**
 * SetupService
 *
 * Checks the installation status of all AgentOS Extended setup steps
 * by inspecting the filesystem for required directories and files.
 */

import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { access, readdir } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';

export interface SetupStepStatus {
  step: 1 | 2 | 3 | 4;
  name: string;
  status: 'not_installed' | 'installed';
  details?: string;
}

export interface StepOutput {
  step: 1 | 2 | 3;
  data: string;
}

export interface StepComplete {
  step: 1 | 2 | 3;
  success: boolean;
  exitCode?: number | null;
  error?: string;
}

const SETUP_STEPS: Array<{ step: 1 | 2 | 3; name: string; command: string }> = [
  {
    step: 1,
    name: 'AgentOS Base Installation',
    command: 'curl -fsSL https://raw.githubusercontent.com/Micro-Thinks/agent-os/main/setup.sh | bash',
  },
  {
    step: 2,
    name: 'Claude Code Setup',
    command: 'curl -fsSL https://raw.githubusercontent.com/Micro-Thinks/agent-os/main/setup-claude-code.sh | bash',
  },
  {
    step: 3,
    name: 'DevTeam Global',
    command: 'curl -fsSL https://raw.githubusercontent.com/Micro-Thinks/agent-os/main/setup-devteam.sh | bash',
  },
];

export class SetupService extends EventEmitter {
  private runningStep: number | null = null;

  /**
   * Execute a setup step by spawning the corresponding shell command.
   * Streams stdout/stderr as 'step-output' events and emits 'step-complete' when done.
   * Only one step can run at a time.
   */
  runStep(step: 1 | 2 | 3, projectPath: string): void {
    if (this.runningStep !== null) {
      throw new Error(`Step ${this.runningStep} is already running. Cannot start step ${step}.`);
    }

    const config = SETUP_STEPS.find((s) => s.step === step);
    if (!config) {
      throw new Error(`Unknown step: ${step}`);
    }

    this.runningStep = step;

    const proc = spawn('bash', ['-c', config.command], { cwd: projectPath });

    proc.stdout.on('data', (chunk: Buffer) => {
      this.emit('step-output', { step, data: chunk.toString() } satisfies StepOutput);
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      this.emit('step-output', { step, data: chunk.toString() } satisfies StepOutput);
    });

    proc.on('close', (code: number | null) => {
      this.runningStep = null;
      this.emit('step-complete', { step, success: code === 0, exitCode: code } satisfies StepComplete);
    });

    proc.on('error', (err: Error) => {
      this.runningStep = null;
      this.emit('step-complete', { step, success: false, error: err.message } satisfies StepComplete);
    });
  }

  /**
   * Check the installation status of all 4 AgentOS Extended steps.
   */
  async checkStatus(projectPath: string): Promise<SetupStepStatus[]> {
    const results = await Promise.all([
      this.checkBaseInstallation(projectPath),
      this.checkClaudeCodeSetup(projectPath),
      this.checkDevTeamGlobal(),
      this.checkDevTeam(projectPath),
    ]);
    return results;
  }

  /**
   * Step 1: Check if AgentOS base installation exists.
   * Requires .agent-os/ directory with workflows/ or standards/ subfolder.
   */
  private async checkBaseInstallation(projectPath: string): Promise<SetupStepStatus> {
    const base: SetupStepStatus = {
      step: 1,
      name: 'AgentOS Base Installation',
      status: 'not_installed',
    };

    try {
      const agentOsPath = join(projectPath, '.agent-os');
      await access(agentOsPath);

      const entries = await readdir(agentOsPath);
      const hasWorkflows = entries.includes('workflows');
      const hasStandards = entries.includes('standards');

      if (hasWorkflows || hasStandards) {
        base.status = 'installed';
        const found = [hasWorkflows && 'workflows', hasStandards && 'standards'].filter(Boolean);
        base.details = `Found: ${found.join(', ')}`;
      } else {
        base.details = '.agent-os/ exists but missing workflows/ and standards/';
      }
    } catch {
      base.details = '.agent-os/ directory not found';
    }

    return base;
  }

  /**
   * Step 2: Check if Claude Code setup exists.
   * Requires CLAUDE.md file AND .claude/ directory.
   */
  private async checkClaudeCodeSetup(projectPath: string): Promise<SetupStepStatus> {
    const base: SetupStepStatus = {
      step: 2,
      name: 'Claude Code Setup',
      status: 'not_installed',
    };

    try {
      const claudeMdPath = join(projectPath, 'CLAUDE.md');
      const claudeDirPath = join(projectPath, '.claude');

      const [mdExists, dirExists] = await Promise.all([
        access(claudeMdPath).then(() => true).catch(() => false),
        access(claudeDirPath).then(() => true).catch(() => false),
      ]);

      if (mdExists && dirExists) {
        base.status = 'installed';
        base.details = 'CLAUDE.md and .claude/ found';
      } else {
        const missing = [!mdExists && 'CLAUDE.md', !dirExists && '.claude/'].filter(Boolean);
        base.details = `Missing: ${missing.join(', ')}`;
      }
    } catch {
      base.details = 'Check failed';
    }

    return base;
  }

  /**
   * Step 3: Check if global DevTeam templates exist.
   * Requires ~/.agent-os/templates/ directory.
   */
  private async checkDevTeamGlobal(): Promise<SetupStepStatus> {
    const base: SetupStepStatus = {
      step: 3,
      name: 'DevTeam Global',
      status: 'not_installed',
    };

    try {
      const templatesPath = join(homedir(), '.agent-os', 'templates');
      await access(templatesPath);
      base.status = 'installed';
      base.details = '~/.agent-os/templates/ found';
    } catch {
      base.details = '~/.agent-os/templates/ not found';
    }

    return base;
  }

  /**
   * Step 4: Check if project DevTeam exists.
   * Requires agent-os/team/ directory with at least one entry.
   */
  private async checkDevTeam(projectPath: string): Promise<SetupStepStatus> {
    const base: SetupStepStatus = {
      step: 4,
      name: 'DevTeam Project',
      status: 'not_installed',
    };

    try {
      const teamPath = join(projectPath, 'agent-os', 'team');
      await access(teamPath);

      const entries = await readdir(teamPath);
      if (entries.length > 0) {
        base.status = 'installed';
        base.details = `${entries.length} entries in agent-os/team/`;
      } else {
        base.details = 'agent-os/team/ exists but is empty';
      }
    } catch {
      base.details = 'agent-os/team/ not found';
    }

    return base;
  }
}

// Singleton instance
export const setupService = new SetupService();
