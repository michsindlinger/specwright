/**
 * GitService
 *
 * Provides git operations for the Web UI.
 * Uses child_process.execFile (NOT exec) for security against shell injection.
 * All operations return structured typed responses.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import { resolve } from 'path';
import { unlink } from 'fs/promises';
import type {
  GitStatusData,
  GitChangedFile,
  GitBranchEntry,
  GitCommitResult,
  GitPullResult,
  GitPushResult,
  GitCheckoutResult,
  GitRevertResult,
  GitPrInfo,
  GitCreateBranchResult,
  GitPushBranchResult,
  GitCreatePullRequestResult,
  GitPreFlightResult,
} from '../../shared/types/git.protocol.js';
import { GIT_CONFIG, GIT_ERROR_CODES } from '../../shared/types/git.protocol.js';

const execFileAsync = promisify(execFile);

/**
 * Custom error class for git operations
 */
export class GitError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly operation: string,
  ) {
    super(message);
    this.name = 'GitError';
  }
}

/**
 * GitService - Manages git operations via execFile
 *
 * All methods accept a projectPath parameter to specify the working directory.
 * All git commands use execFile for security (no shell interpolation).
 */
export class GitService {

  /**
   * Execute a git command safely using execFile
   */
  private async execGit(args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
    try {
      const result = await execFileAsync('git', args, {
        cwd,
        timeout: GIT_CONFIG.OPERATION_TIMEOUT_MS,
        maxBuffer: 1024 * 1024, // 1MB
      });
      return result;
    } catch (error) {
      const err = error as Error & { code?: string; stderr?: string; killed?: boolean };

      // Check if git is not installed
      if (err.code === 'ENOENT') {
        throw new GitError(
          'Git is not installed or not found in PATH',
          GIT_ERROR_CODES.GIT_NOT_FOUND,
          'execGit',
        );
      }

      // Check for timeout
      if (err.killed) {
        throw new GitError(
          `Git operation timed out after ${GIT_CONFIG.OPERATION_TIMEOUT_MS}ms`,
          GIT_ERROR_CODES.TIMEOUT,
          'execGit',
        );
      }

      throw error;
    }
  }

  /**
   * Check if a directory is a git repository
   */
  private async isGitRepo(cwd: string): Promise<boolean> {
    try {
      await this.execGit(['rev-parse', '--is-inside-work-tree'], cwd);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure the directory is a git repository, throw if not
   */
  private async ensureGitRepo(cwd: string, operation: string): Promise<void> {
    const isRepo = await this.isGitRepo(cwd);
    if (!isRepo) {
      throw new GitError(
        'Not a git repository',
        GIT_ERROR_CODES.NOT_A_REPO,
        operation,
      );
    }
  }

  /**
   * Get the git status of a project
   */
  async getStatus(projectPath: string): Promise<GitStatusData> {
    // Check if it's a git repo first
    const isRepo = await this.isGitRepo(projectPath);
    if (!isRepo) {
      return {
        branch: '',
        ahead: 0,
        behind: 0,
        files: [],
        isGitRepo: false,
      };
    }

    // Get current branch
    const { stdout: branchOutput } = await this.execGit(
      ['rev-parse', '--abbrev-ref', 'HEAD'],
      projectPath,
    );
    const branch = branchOutput.trim();

    // Get ahead/behind counts
    let ahead = 0;
    let behind = 0;
    try {
      const { stdout: revOutput } = await this.execGit(
        ['rev-list', '--left-right', '--count', `${branch}...@{upstream}`],
        projectPath,
      );
      const parts = revOutput.trim().split('\t');
      if (parts.length === 2) {
        ahead = parseInt(parts[0], 10) || 0;
        behind = parseInt(parts[1], 10) || 0;
      }
    } catch {
      // No upstream configured - that's fine
    }

    // Get changed files using porcelain v1 format
    const { stdout: statusOutput } = await this.execGit(
      ['status', '--porcelain'],
      projectPath,
    );

    const files: GitChangedFile[] = statusOutput
      .split('\n')
      .filter(line => line.length > 0)
      .map(line => {
        const indexStatus = line[0];
        const workTreeStatus = line[1];
        const filePath = line.substring(3).trim();

        // Determine the effective status code
        let status: string;
        if (indexStatus === '?' && workTreeStatus === '?') {
          status = '?'; // Untracked
        } else if (indexStatus !== ' ' && indexStatus !== '?') {
          status = indexStatus; // Staged change
        } else {
          status = workTreeStatus; // Unstaged change
        }

        // File is staged if it has a non-space, non-? index status
        const staged = indexStatus !== ' ' && indexStatus !== '?';

        return { path: filePath, status, staged };
      });

    return {
      branch,
      ahead,
      behind,
      files,
      isGitRepo: true,
    };
  }

  /**
   * Get list of local branches
   */
  async getBranches(projectPath: string): Promise<GitBranchEntry[]> {
    await this.ensureGitRepo(projectPath, 'getBranches');

    const { stdout } = await this.execGit(
      ['branch', '--format=%(HEAD)|%(refname:short)|%(objectname:short)|%(subject)'],
      projectPath,
    );

    return stdout
      .split('\n')
      .filter(line => line.length > 0)
      .map(line => {
        const parts = line.split('|');
        return {
          name: parts[1] || '',
          current: parts[0] === '*',
          lastCommit: parts[2] || '',
          lastMessage: parts[3] || '',
        };
      });
  }

  /**
   * Checkout a branch
   */
  async checkout(projectPath: string, branch: string): Promise<GitCheckoutResult> {
    await this.ensureGitRepo(projectPath, 'checkout');

    try {
      await this.execGit(['checkout', branch], projectPath);
      return { success: true, branch };
    } catch (error) {
      const err = error as Error & { stderr?: string };
      throw new GitError(
        err.stderr || err.message,
        GIT_ERROR_CODES.OPERATION_FAILED,
        'checkout',
      );
    }
  }

  /**
   * Stage files and commit with a message
   */
  async commit(projectPath: string, files: string[], message: string): Promise<GitCommitResult> {
    await this.ensureGitRepo(projectPath, 'commit');

    // Stage the specified files
    await this.execGit(['add', '--', ...files], projectPath);

    // Commit
    try {
      const { stdout } = await this.execGit(
        ['commit', '-m', message],
        projectPath,
      );

      // Parse commit hash from output
      const hashMatch = stdout.match(/\[[\w/.-]+ ([a-f0-9]+)\]/);
      const hash = hashMatch?.[1] || '';

      return {
        hash,
        message,
        filesChanged: files.length,
      };
    } catch (error) {
      const err = error as Error & { stderr?: string };
      throw new GitError(
        err.stderr || err.message,
        GIT_ERROR_CODES.OPERATION_FAILED,
        'commit',
      );
    }
  }

  /**
   * Pull from remote
   * @param projectPath - Project directory
   * @param rebase - If true, uses --rebase flag (legacy, use strategy instead)
   * @param strategy - Pull strategy: 'merge' | 'rebase' | 'ff-only' (takes precedence over rebase)
   */
  async pull(projectPath: string, rebase = false, strategy?: 'merge' | 'rebase' | 'ff-only'): Promise<GitPullResult> {
    await this.ensureGitRepo(projectPath, 'pull');

    try {
      let args: string[];
      if (strategy === 'rebase') {
        args = ['pull', '--rebase'];
      } else if (strategy === 'ff-only') {
        args = ['pull', '--ff-only'];
      } else if (strategy === 'merge') {
        args = ['pull', '--no-rebase'];
      } else {
        args = rebase ? ['pull', '--rebase'] : ['pull'];
      }
      const { stdout, stderr } = await this.execGit(args, projectPath);

      // Check for "Already up to date"
      const combined = stdout + stderr;
      if (combined.includes('Already up to date')) {
        return {
          success: true,
          summary: 'Already up to date',
          commitsReceived: 0,
          hasConflicts: false,
        };
      }

      // Count received commits from fast-forward summary (e.g. "abc123..def456  main -> origin/main")
      // or merge commit output. Fall back to counting "files changed" as approximation.
      const fastForwardMatch = combined.match(/(\d+) files? changed/);
      const commitsReceived = fastForwardMatch ? parseInt(fastForwardMatch[1], 10) : 1;

      return {
        success: true,
        summary: stdout.trim(),
        commitsReceived,
        hasConflicts: false,
      };
    } catch (error) {
      const err = error as Error & { stderr?: string; stdout?: string };
      const combined = (err.stderr || '') + (err.stdout || '');

      // Check for merge conflicts
      if (combined.includes('CONFLICT') || combined.includes('Merge conflict')) {
        throw new GitError(
          'Merge conflicts detected. Conflicts must be resolved outside the application.',
          GIT_ERROR_CODES.MERGE_CONFLICT,
          'pull',
        );
      }

      // Check for divergent branches
      if (combined.includes('divergent branches') || combined.includes('Need to specify how to reconcile')) {
        throw new GitError(
          'Divergent branches detected. Please choose a pull strategy.',
          GIT_ERROR_CODES.DIVERGENT_BRANCHES,
          'pull',
        );
      }

      // Network errors
      if (combined.includes('Could not resolve host') || combined.includes('Connection refused')) {
        throw new GitError(
          'Network error during pull',
          GIT_ERROR_CODES.NETWORK_ERROR,
          'pull',
        );
      }

      throw new GitError(
        err.stderr || err.message,
        GIT_ERROR_CODES.OPERATION_FAILED,
        'pull',
      );
    }
  }

  /**
   * In-memory PR info cache with TTL
   */
  private prCache = new Map<string, { data: GitPrInfo[]; timestamp: number }>();
  private static readonly PR_CACHE_TTL_MS = 60_000;

  /**
   * Push to remote
   */
  async push(projectPath: string): Promise<GitPushResult> {
    await this.ensureGitRepo(projectPath, 'push');

    try {
      const { stdout, stderr } = await this.execGit(['push'], projectPath);
      const combined = stdout + stderr;

      // Check for "Everything up-to-date"
      if (combined.includes('Everything up-to-date')) {
        return {
          success: true,
          summary: 'Everything up-to-date',
          commitsPushed: 0,
        };
      }

      // Parse commit range from push output (e.g. "abc123..def456  main -> main")
      const rangeMatch = combined.match(/([a-f0-9]+)\.\.([a-f0-9]+)/);
      let commitsPushed = 1;
      if (rangeMatch) {
        try {
          const { stdout: countOutput } = await this.execGit(
            ['rev-list', '--count', `${rangeMatch[1]}..${rangeMatch[2]}`],
            projectPath,
          );
          commitsPushed = parseInt(countOutput.trim(), 10) || 1;
        } catch {
          // Fallback to 1 if rev-list fails
        }
      }

      return {
        success: true,
        summary: combined.trim(),
        commitsPushed,
      };
    } catch (error) {
      const err = error as Error & { stderr?: string };
      const stderr = err.stderr || '';

      // Network errors
      if (stderr.includes('Could not resolve host') || stderr.includes('Connection refused')) {
        throw new GitError(
          'Network error during push',
          GIT_ERROR_CODES.NETWORK_ERROR,
          'push',
        );
      }

      // Push rejected - remote has new commits
      if (stderr.includes('rejected') || stderr.includes('fetch first') || stderr.includes('non-fast-forward')) {
        throw new GitError(
          'Push rejected. Remote contains commits not present locally. Pull first.',
          GIT_ERROR_CODES.PUSH_REJECTED,
          'push',
        );
      }

      throw new GitError(
        err.stderr || err.message,
        GIT_ERROR_CODES.OPERATION_FAILED,
        'push',
      );
    }
  }
  /**
   * Revert files to their last committed state.
   * Handles both staged and unstaged files.
   */
  async revertFiles(projectPath: string, files: string[]): Promise<GitRevertResult> {
    await this.ensureGitRepo(projectPath, 'revert');

    const revertedFiles: string[] = [];
    const failedFiles: Array<{ path: string; error: string }> = [];

    for (const file of files) {
      try {
        // First, unstage the file if it's staged
        try {
          await this.execGit(['reset', 'HEAD', '--', file], projectPath);
        } catch {
          // File may not be staged - that's fine, continue
        }

        // Then restore from last commit
        await this.execGit(['checkout', '--', file], projectPath);
        revertedFiles.push(file);
      } catch (error) {
        const err = error as Error;
        failedFiles.push({ path: file, error: err.message });
      }
    }

    return { revertedFiles, failedFiles };
  }

  /**
   * Delete an untracked file from the filesystem.
   * Only deletes files that are actually untracked (not in git index).
   */
  async deleteUntrackedFile(projectPath: string, file: string): Promise<void> {
    await this.ensureGitRepo(projectPath, 'deleteUntrackedFile');

    // Validate path stays within project directory (prevent path traversal)
    const resolvedProject = resolve(projectPath);
    const resolvedFile = resolve(projectPath, file);
    if (!resolvedFile.startsWith(resolvedProject + '/')) {
      throw new GitError(
        'Invalid file path',
        GIT_ERROR_CODES.OPERATION_FAILED,
        'deleteUntrackedFile',
      );
    }

    // Verify the file is actually untracked
    const { stdout } = await this.execGit(['status', '--porcelain', '--', file], projectPath);
    const trimmed = stdout.trim();

    if (!trimmed.startsWith('??')) {
      throw new GitError(
        'File is not untracked',
        GIT_ERROR_CODES.OPERATION_FAILED,
        'deleteUntrackedFile',
      );
    }

    // Delete the file using fs.unlink
    await unlink(resolvedFile);
  }

  /**
   * Get PR info for the current branch using gh CLI.
   * Returns null if no PR exists or gh is not installed.
   * Uses in-memory cache with 60s TTL.
   */
  async getPrInfo(projectPath: string): Promise<GitPrInfo[]> {
    await this.ensureGitRepo(projectPath, 'getPrInfo');

    // Check cache
    const cached = this.prCache.get(projectPath);
    if (cached && (Date.now() - cached.timestamp) < GitService.PR_CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const { stdout } = await execFileAsync('gh', [
        'pr', 'list', '--state', 'open', '--json', 'number,state,url,title',
      ], {
        cwd: projectPath,
        timeout: GIT_CONFIG.OPERATION_TIMEOUT_MS,
      });

      const parsed = JSON.parse(stdout.trim()) as GitPrInfo[];
      const result: GitPrInfo[] = parsed.map(pr => ({
        number: pr.number,
        state: pr.state,
        url: pr.url,
        title: pr.title,
      }));

      this.prCache.set(projectPath, { data: result, timestamp: Date.now() });
      return result;
    } catch {
      // gh not installed, no PRs, or other error - graceful degradation
      this.prCache.set(projectPath, { data: [], timestamp: Date.now() });
      return [];
    }
  }

  // ============================================================================
  // Branch-per-Story Methods (BPS-001)
  // ============================================================================

  /**
   * BPS-004: Pre-flight check before backlog story execution.
   * Detects merge-in-progress, rebase-in-progress, unresolved conflicts,
   * and dirty index state. Attempts auto-recovery (merge --abort, stash)
   * before giving up with a hard error.
   *
   * @returns Object with ok=true if ready, or ok=false with reason
   */
  async preFlightCheck(projectPath: string): Promise<GitPreFlightResult> {
    await this.ensureGitRepo(projectPath, 'preFlightCheck');

    // 1. Check for merge in progress
    const mergeInProgress = await this.isMergeInProgress(projectPath);
    if (mergeInProgress) {
      // Check if there are unresolved conflicts
      const hasConflicts = await this.hasUnresolvedConflicts(projectPath);
      if (hasConflicts) {
        // Try to abort the merge
        try {
          // First reset any modified tracked files so merge --abort can work
          await this.execGit(['checkout', '--', '.'], projectPath).catch(() => {});
          await this.execGit(['merge', '--abort'], projectPath);
          console.log('[GitService] Pre-flight: Aborted stale merge with conflicts');
        } catch {
          return {
            ok: false,
            reason: 'Laufender Merge mit ungelösten Konflikten konnte nicht abgebrochen werden. Bitte manuell auflösen: git merge --abort',
            issue: 'merge_conflict',
          };
        }
      } else {
        // Merge in progress but no conflicts - try to abort cleanly
        try {
          await this.execGit(['merge', '--abort'], projectPath);
          console.log('[GitService] Pre-flight: Aborted merge (no conflicts)');
        } catch {
          return {
            ok: false,
            reason: 'Laufender Merge konnte nicht abgebrochen werden. Bitte manuell auflösen.',
            issue: 'merge_in_progress',
          };
        }
      }
    }

    // 2. Check for rebase in progress
    const rebaseInProgress = await this.isRebaseInProgress(projectPath);
    if (rebaseInProgress) {
      try {
        await this.execGit(['rebase', '--abort'], projectPath);
        console.log('[GitService] Pre-flight: Aborted stale rebase');
      } catch {
        return {
          ok: false,
          reason: 'Laufender Rebase konnte nicht abgebrochen werden. Bitte manuell auflösen: git rebase --abort',
          issue: 'rebase_in_progress',
        };
      }
    }

    // 3. Check for cherry-pick in progress
    const cherryPickInProgress = await this.isCherryPickInProgress(projectPath);
    if (cherryPickInProgress) {
      try {
        await this.execGit(['cherry-pick', '--abort'], projectPath);
        console.log('[GitService] Pre-flight: Aborted stale cherry-pick');
      } catch {
        return {
          ok: false,
          reason: 'Laufender Cherry-Pick konnte nicht abgebrochen werden. Bitte manuell auflösen.',
          issue: 'cherry_pick_in_progress',
        };
      }
    }

    // 4. Stash uncommitted changes if working directory is dirty
    const isClean = await this.isWorkingDirectoryClean(projectPath);
    if (!isClean) {
      try {
        await this.execGit(['stash', '--include-untracked', '-m', 'specwright-pre-flight-auto-stash'], projectPath);
        console.log('[GitService] Pre-flight: Stashed uncommitted changes');
      } catch (stashError) {
        // Stash can fail if there are still conflicts after cleanup attempts
        return {
          ok: false,
          reason: `Working Directory nicht sauber und Stash fehlgeschlagen: ${stashError instanceof Error ? stashError.message : String(stashError)}`,
          issue: 'dirty_working_directory',
        };
      }
    }

    // 5. Final verification - everything should be clean now
    const finalClean = await this.isWorkingDirectoryClean(projectPath);
    if (!finalClean) {
      return {
        ok: false,
        reason: 'Working Directory nach Cleanup immer noch nicht sauber. Bitte manuell prüfen.',
        issue: 'dirty_working_directory',
      };
    }

    return { ok: true };
  }

  /**
   * Check if a merge is in progress (MERGE_HEAD exists)
   */
  private async isMergeInProgress(projectPath: string): Promise<boolean> {
    try {
      await this.execGit(['rev-parse', '--verify', 'MERGE_HEAD'], projectPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a rebase is in progress
   */
  private async isRebaseInProgress(projectPath: string): Promise<boolean> {
    try {
      // git rebase --show-current-patch fails if no rebase in progress
      const { stdout } = await this.execGit(['status'], projectPath);
      return stdout.includes('rebase in progress') || stdout.includes('interactive rebase in progress');
    } catch {
      return false;
    }
  }

  /**
   * Check if a cherry-pick is in progress (CHERRY_PICK_HEAD exists)
   */
  private async isCherryPickInProgress(projectPath: string): Promise<boolean> {
    try {
      await this.execGit(['rev-parse', '--verify', 'CHERRY_PICK_HEAD'], projectPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if there are unresolved merge conflicts
   */
  private async hasUnresolvedConflicts(projectPath: string): Promise<boolean> {
    try {
      const { stdout } = await this.execGit(['diff', '--name-only', '--diff-filter=U'], projectPath);
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Check if the working directory is clean (no uncommitted changes)
   * @returns true if clean, false if there are uncommitted changes
   */
  async isWorkingDirectoryClean(projectPath: string): Promise<boolean> {
    await this.ensureGitRepo(projectPath, 'isWorkingDirectoryClean');

    const { stdout } = await this.execGit(['status', '--porcelain'], projectPath);
    return stdout.trim().length === 0;
  }

  /**
   * Create a new branch from a base branch and switch to it.
   * If the branch already exists, simply switches to it.
   * @param projectPath - Project directory
   * @param branchName - Name of the new branch
   * @param fromBranch - Base branch to create from (defaults to 'main')
   */
  async createBranch(
    projectPath: string,
    branchName: string,
    fromBranch = 'main',
  ): Promise<GitCreateBranchResult> {
    await this.ensureGitRepo(projectPath, 'createBranch');

    // Check if branch already exists
    const { stdout: existingBranch } = await this.execGit(
      ['rev-parse', '--verify', branchName],
      projectPath,
    ).catch(() => ({ stdout: '', stderr: '' }));

    if (existingBranch.trim()) {
      // Branch exists - switch to it
      await this.execGit(['checkout', branchName], projectPath);
      return { success: true, branch: branchName, created: false };
    }

    // Branch doesn't exist - create and switch
    try {
      await this.execGit(['checkout', '-b', branchName, fromBranch], projectPath);
      return { success: true, branch: branchName, created: true };
    } catch (error) {
      const err = error as Error & { stderr?: string };
      throw new GitError(
        err.stderr || err.message,
        GIT_ERROR_CODES.OPERATION_FAILED,
        'createBranch',
      );
    }
  }

  /**
   * Switch to the main branch
   * @param projectPath - Project directory
   */
  async checkoutMain(projectPath: string): Promise<GitCheckoutResult> {
    await this.ensureGitRepo(projectPath, 'checkoutMain');

    try {
      await this.execGit(['checkout', 'main'], projectPath);
      return { success: true, branch: 'main' };
    } catch (error) {
      const err = error as Error & { stderr?: string };
      throw new GitError(
        err.stderr || err.message,
        GIT_ERROR_CODES.OPERATION_FAILED,
        'checkoutMain',
      );
    }
  }

  /**
   * Push a branch to remote with upstream tracking
   * @param projectPath - Project directory
   * @param branchName - Branch to push
   */
  async pushBranch(projectPath: string, branchName: string): Promise<GitPushBranchResult> {
    await this.ensureGitRepo(projectPath, 'pushBranch');

    try {
      const { stdout, stderr } = await this.execGit(
        ['push', '-u', 'origin', branchName],
        projectPath,
      );
      const combined = stdout + stderr;

      // Check for "Everything up-to-date" or "new branch" pattern
      let commitsPushed = 0;
      if (combined.includes('Everything up-to-date')) {
        commitsPushed = 0;
      } else if (combined.includes('new branch') || combined.includes('set up')) {
        // New branch pushed - count commits
        try {
          const { stdout: countOutput } = await this.execGit(
            ['rev-list', '--count', `origin/${branchName}`],
            projectPath,
          );
          commitsPushed = parseInt(countOutput.trim(), 10) || 1;
        } catch {
          commitsPushed = 1;
        }
      } else {
        // Parse commit range from push output
        const rangeMatch = combined.match(/([a-f0-9]+)\.\.([a-f0-9]+)/);
        if (rangeMatch) {
          try {
            const { stdout: countOutput } = await this.execGit(
              ['rev-list', '--count', `${rangeMatch[1]}..${rangeMatch[2]}`],
              projectPath,
            );
            commitsPushed = parseInt(countOutput.trim(), 10) || 1;
          } catch {
            commitsPushed = 1;
          }
        }
      }

      return { success: true, branch: branchName, commitsPushed };
    } catch (error) {
      const err = error as Error & { stderr?: string };
      const stderr = err.stderr || '';

      // Network errors
      if (stderr.includes('Could not resolve host') || stderr.includes('Connection refused')) {
        throw new GitError(
          'Network error during push',
          GIT_ERROR_CODES.NETWORK_ERROR,
          'pushBranch',
        );
      }

      throw new GitError(
        err.stderr || err.message,
        GIT_ERROR_CODES.OPERATION_FAILED,
        'pushBranch',
      );
    }
  }

  /**
   * Create a Pull Request using gh CLI.
   * Gracefully degrades if gh CLI is not available.
   * @param projectPath - Project directory
   * @param branchName - Branch to create PR from
   * @param title - PR title
   * @param body - PR body (optional)
   */
  async createPullRequest(
    projectPath: string,
    _branchName: string,
    title: string,
    body?: string,
  ): Promise<GitCreatePullRequestResult> {
    await this.ensureGitRepo(projectPath, 'createPullRequest');

    try {
      // Build gh pr create command
      const args = ['pr', 'create', '--title', title, '--base', 'main'];
      if (body) {
        args.push('--body', body);
      } else {
        args.push('--fill'); // Auto-fill from commits
      }

      const { stdout } = await execFileAsync('gh', args, {
        cwd: projectPath,
        timeout: GIT_CONFIG.OPERATION_TIMEOUT_MS,
      });

      // Parse PR URL from output (e.g., "https://github.com/owner/repo/pull/123")
      const urlMatch = stdout.match(/(https:\/\/github\.com\/[\w/-]+\/pull\/(\d+))/);
      if (urlMatch) {
        return {
          success: true,
          prUrl: urlMatch[1],
          prNumber: parseInt(urlMatch[2], 10),
        };
      }

      // If URL not parsed but command succeeded
      return { success: true, warning: stdout.trim() };
    } catch (error) {
      const err = error as Error & { code?: string; stderr?: string };

      // Check if gh is not installed
      if (err.code === 'ENOENT') {
        return {
          success: true,
          warning: 'gh CLI not installed. Create PR manually or install gh.',
        };
      }

      // Check for authentication error
      if (err.stderr?.includes('not authenticated') || err.stderr?.includes('authentication')) {
        return {
          success: true,
          warning: 'gh CLI not authenticated. Run "gh auth login" first.',
        };
      }

      // Other errors - still return success but with warning (per story requirements)
      return {
        success: true,
        warning: err.stderr || err.message || 'PR creation failed. Create manually.',
      };
    }
  }
}

// Singleton instance
export const gitService = new GitService();
