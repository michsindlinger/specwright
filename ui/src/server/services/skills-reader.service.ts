import { promises as fs } from 'fs';
import { join } from 'path';
import {
  SkillSummary,
  SkillDetail,
} from '../../shared/types/team.protocol.js';

// ============================================================================
// SkillsReaderService
// ============================================================================

/**
 * Reads skill definitions from a project's .claude/skills/ directory.
 * Parses SKILL.md frontmatter and dos-and-donts.md for learning entries.
 */
export class SkillsReaderService {

  /**
   * Get the skills directory path for a project.
   */
  private getSkillsPath(projectPath: string): string {
    return join(projectPath, '.claude', 'skills');
  }

  /**
   * Parse YAML frontmatter from SKILL.md content using regex.
   * Returns extracted fields or defaults.
   */
  private parseFrontmatter(content: string): {
    description: string;
    globs: string[];
    alwaysApply: boolean;
    teamType: 'devteam' | 'team' | 'individual';
    teamName: string;
    mcpTools: string[];
  } {
    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!frontmatterMatch) {
      return { description: 'Keine Beschreibung verfügbar', globs: [], alwaysApply: false, teamType: 'devteam', teamName: '', mcpTools: [] };
    }

    const fm = frontmatterMatch[1];

    // Extract description
    const descMatch = fm.match(/^description:\s*(.+)$/m);
    const description = descMatch ? descMatch[1].trim() : 'Keine Beschreibung verfügbar';

    // Extract globs (array format)
    const globs: string[] = [];
    const globsMatch = fm.match(/^globs:\s*\n((?:\s+-\s+.+\n?)*)/m);
    if (globsMatch) {
      const globLines = globsMatch[1].matchAll(/^\s+-\s+"?([^"\n]+)"?\s*$/gm);
      for (const match of globLines) {
        globs.push(match[1].trim());
      }
    }

    // Extract alwaysApply
    const alwaysApplyMatch = fm.match(/^alwaysApply:\s*(true|false)/m);
    const alwaysApply = alwaysApplyMatch ? alwaysApplyMatch[1] === 'true' : false;

    // Extract teamType (default: devteam)
    const teamTypeMatch = fm.match(/^teamType:\s*(.+)$/m);
    const rawTeamType = teamTypeMatch ? teamTypeMatch[1].trim().replace(/^["']|["']$/g, '') : 'devteam';
    const teamType = (['team', 'individual'].includes(rawTeamType) ? rawTeamType : 'devteam') as 'devteam' | 'team' | 'individual';

    // Extract teamName
    const teamNameMatch = fm.match(/^teamName:\s*(.+)$/m);
    const teamName = teamNameMatch ? teamNameMatch[1].trim().replace(/^["']|["']$/g, '') : '';

    // Extract mcpTools (YAML inline array format: mcpTools: [tool1, tool2])
    const mcpTools: string[] = [];
    const mcpToolsMatch = fm.match(/^mcpTools:\s*\[([^\]]*)\]/m);
    if (mcpToolsMatch) {
      const toolsStr = mcpToolsMatch[1].trim();
      if (toolsStr) {
        for (const tool of toolsStr.split(',')) {
          const trimmed = tool.trim().replace(/^["']|["']$/g, '');
          if (trimmed) mcpTools.push(trimmed);
        }
      }
    }

    return { description, globs, alwaysApply, teamType, teamName, mcpTools };
  }

  /**
   * Extract display name from SKILL.md content.
   * Uses first markdown heading, falls back to directory name.
   */
  private extractName(content: string, dirName: string): string {
    const headingMatch = content.match(/^#\s+(.+)$/m);
    return headingMatch ? headingMatch[1].trim() : dirName;
  }

  /**
   * Infer category from skill directory name.
   * E.g., "backend-express" -> "backend", "frontend-lit" -> "frontend"
   */
  private inferCategory(dirName: string): string {
    const dashIndex = dirName.indexOf('-');
    if (dashIndex > 0) {
      return dirName.substring(0, dashIndex);
    }
    return dirName;
  }

  /**
   * Count learning entries in dos-and-donts.md.
   * Counts ### headings after the ## Entries section.
   */
  private countLearnings(content: string): number {
    const entriesMatch = content.match(/## Entries\s*\n([\s\S]*)/);
    if (!entriesMatch) return 0;

    const entriesSection = entriesMatch[1];
    // Check for "No entries yet" or similar
    if (entriesSection.match(/no entries yet/i)) return 0;

    const learningHeaders = entriesSection.match(/^### /gm);
    return learningHeaders ? learningHeaders.length : 0;
  }

  /**
   * List all skills for a project.
   */
  async listSkills(projectPath: string): Promise<SkillSummary[]> {
    const skillsPath = this.getSkillsPath(projectPath);

    let entries: string[];
    try {
      const dirents = await fs.readdir(skillsPath, { withFileTypes: true });
      entries = dirents
        .filter(d => d.isDirectory())
        .map(d => d.name);
    } catch {
      // Skills directory doesn't exist - return empty list
      return [];
    }

    const skills: SkillSummary[] = [];

    for (const dirName of entries) {
      const skillDir = join(skillsPath, dirName);
      const skillMdPath = join(skillDir, 'SKILL.md');

      let skillContent: string;
      try {
        skillContent = await fs.readFile(skillMdPath, 'utf-8');
      } catch {
        // No SKILL.md - skip this directory
        continue;
      }

      const { description, globs, alwaysApply, teamType, teamName, mcpTools } = this.parseFrontmatter(skillContent);
      const name = this.extractName(skillContent, dirName);
      const category = this.inferCategory(dirName);

      // Count learnings from dos-and-donts.md
      let learningsCount = 0;
      try {
        const dosContent = await fs.readFile(join(skillDir, 'dos-and-donts.md'), 'utf-8');
        learningsCount = this.countLearnings(dosContent);
      } catch {
        // No dos-and-donts.md - 0 learnings
      }

      skills.push({
        id: dirName,
        name,
        description,
        category,
        learningsCount,
        globs,
        alwaysApply,
        teamType,
        teamName,
        mcpTools,
      });
    }

    // Sort alphabetically by name
    skills.sort((a, b) => a.name.localeCompare(b.name));

    return skills;
  }

  /**
   * Get detailed information about a single skill.
   */
  async getSkillDetail(projectPath: string, skillId: string): Promise<SkillDetail | null> {
    const skillsPath = this.getSkillsPath(projectPath);
    const skillDir = join(skillsPath, skillId);

    // Read SKILL.md
    let skillContent: string;
    try {
      skillContent = await fs.readFile(join(skillDir, 'SKILL.md'), 'utf-8');
    } catch {
      return null;
    }

    const { description, globs, alwaysApply, teamType, teamName, mcpTools } = this.parseFrontmatter(skillContent);
    const name = this.extractName(skillContent, skillId);
    const category = this.inferCategory(skillId);

    // Read dos-and-donts.md
    let dosAndDontsContent = '';
    let learningsCount = 0;
    try {
      dosAndDontsContent = await fs.readFile(join(skillDir, 'dos-and-donts.md'), 'utf-8');
      learningsCount = this.countLearnings(dosAndDontsContent);
    } catch {
      // No dos-and-donts.md
    }

    // List sub-documents (other .md files)
    let subDocuments: string[] = [];
    try {
      const files = await fs.readdir(skillDir);
      subDocuments = files
        .filter(f => f.endsWith('.md') && f !== 'SKILL.md' && f !== 'dos-and-donts.md')
        .sort();
    } catch {
      // Ignore read errors
    }

    return {
      id: skillId,
      name,
      description,
      category,
      learningsCount,
      globs,
      alwaysApply,
      teamType,
      teamName,
      mcpTools,
      skillContent,
      dosAndDontsContent,
      subDocuments,
    };
  }

  /**
   * Update the SKILL.md content for a given skill.
   * If mcpTools is provided, updates or adds the mcpTools field in the frontmatter.
   */
  async updateSkillContent(projectPath: string, skillId: string, content: string, mcpTools?: string[]): Promise<void> {
    const skillsPath = this.getSkillsPath(projectPath);
    const skillDir = join(skillsPath, skillId);

    // Verify skill directory exists before writing
    await fs.access(skillDir);

    let finalContent = content;
    if (mcpTools !== undefined) {
      finalContent = this.updateFrontmatterMcpTools(content, mcpTools);
    }

    await fs.writeFile(join(skillDir, 'SKILL.md'), finalContent, 'utf-8');
  }

  /**
   * Update or add the mcpTools field in YAML frontmatter.
   */
  private updateFrontmatterMcpTools(content: string, mcpTools: string[]): string {
    const frontmatterMatch = content.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
    if (!frontmatterMatch) {
      // No frontmatter - add one with mcpTools
      const toolsStr = mcpTools.length > 0 ? `[${mcpTools.join(', ')}]` : '[]';
      return `---\nmcpTools: ${toolsStr}\n---\n${content}`;
    }

    const prefix = frontmatterMatch[1];
    let fm = frontmatterMatch[2];
    const suffix = frontmatterMatch[3];
    const rest = content.slice(frontmatterMatch[0].length);

    const toolsStr = mcpTools.length > 0 ? `[${mcpTools.join(', ')}]` : '[]';

    // Replace existing mcpTools line or add new one
    if (/^mcpTools:\s*/m.test(fm)) {
      fm = fm.replace(/^mcpTools:\s*\[.*\]/m, `mcpTools: ${toolsStr}`);
    } else {
      fm = fm + `\nmcpTools: ${toolsStr}`;
    }

    return prefix + fm + suffix + rest;
  }

  /**
   * Delete a skill directory and all its contents.
   */
  async deleteSkill(projectPath: string, skillId: string): Promise<void> {
    const skillsPath = this.getSkillsPath(projectPath);
    const skillDir = join(skillsPath, skillId);

    // Verify skill directory exists before deleting
    await fs.access(skillDir);
    await fs.rm(skillDir, { recursive: true });
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const skillsReaderService = new SkillsReaderService();
