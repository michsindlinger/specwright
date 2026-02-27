/**
 * Team Protocol Types
 *
 * Defines the contract for the Skills/Team REST API.
 * Enables reading skill definitions from .claude/skills/ directories.
 */

// ============================================================================
// Data Types
// ============================================================================

/**
 * Summary of a single skill (used in list view).
 */
export interface SkillSummary {
  /** Skill directory name (e.g., "backend-express") */
  id: string;
  /** Display name extracted from SKILL.md title or directory name */
  name: string;
  /** Description from SKILL.md frontmatter */
  description: string;
  /** Category inferred from directory name prefix (e.g., "backend", "frontend") */
  category: string;
  /** Number of learning entries in dos-and-donts.md */
  learningsCount: number;
  /** Glob patterns from SKILL.md frontmatter */
  globs: string[];
  /** Whether the skill is always applied */
  alwaysApply: boolean;
  /** Team type: "devteam" (default), "team", or "individual" */
  teamType: 'devteam' | 'team' | 'individual';
  /** Display name for custom teams (e.g., "Marketing Team") */
  teamName: string;
}

/**
 * Detailed information about a single skill.
 */
export interface SkillDetail {
  /** Skill directory name */
  id: string;
  /** Display name */
  name: string;
  /** Description from frontmatter */
  description: string;
  /** Category inferred from directory name */
  category: string;
  /** Number of learning entries */
  learningsCount: number;
  /** Glob patterns */
  globs: string[];
  /** Whether the skill is always applied */
  alwaysApply: boolean;
  /** Team type: "devteam" (default), "team", or "individual" */
  teamType: 'devteam' | 'team' | 'individual';
  /** Display name for custom teams (e.g., "Marketing Team") */
  teamName: string;
  /** Full SKILL.md content (raw markdown) */
  skillContent: string;
  /** Full dos-and-donts.md content (raw markdown), empty string if not present */
  dosAndDontsContent: string;
  /** List of sub-document filenames (other .md files in the skill directory) */
  subDocuments: string[];
}

// ============================================================================
// Response Types
// ============================================================================

export interface SkillsListResponse {
  success: boolean;
  skills?: SkillSummary[];
  error?: string;
}

export interface SkillDetailResponse {
  success: boolean;
  skill?: SkillDetail;
  error?: string;
}

export interface SkillUpdateResponse {
  success: boolean;
  error?: string;
}
