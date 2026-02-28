import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { SkillsReaderService } from '../../src/server/services/skills-reader.service.js';

describe('SkillsReaderService', () => {
  let service: SkillsReaderService;
  let tmpDir: string;
  let projectPath: string;
  let skillsDir: string;

  beforeEach(async () => {
    service = new SkillsReaderService();
    tmpDir = await fs.mkdtemp(join(tmpdir(), 'skills-test-'));
    projectPath = tmpDir;
    skillsDir = join(projectPath, '.claude', 'skills');
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  async function createSkill(
    name: string,
    skillMd: string,
    dosAndDonts?: string,
    extraFiles?: Record<string, string>
  ): Promise<void> {
    const dir = join(skillsDir, name);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(join(dir, 'SKILL.md'), skillMd, 'utf-8');
    if (dosAndDonts !== undefined) {
      await fs.writeFile(join(dir, 'dos-and-donts.md'), dosAndDonts, 'utf-8');
    }
    if (extraFiles) {
      for (const [fileName, content] of Object.entries(extraFiles)) {
        await fs.writeFile(join(dir, fileName), content, 'utf-8');
      }
    }
  }

  // ==========================================================================
  // listSkills
  // ==========================================================================

  describe('listSkills', () => {
    it('should return empty array when skills directory does not exist', async () => {
      const skills = await service.listSkills(projectPath);
      expect(skills).toEqual([]);
    });

    it('should return empty array when skills directory is empty', async () => {
      await fs.mkdir(skillsDir, { recursive: true });
      const skills = await service.listSkills(projectPath);
      expect(skills).toEqual([]);
    });

    it('should skip directories without SKILL.md', async () => {
      await fs.mkdir(join(skillsDir, 'no-skill-md'), { recursive: true });
      await fs.writeFile(join(skillsDir, 'no-skill-md', 'README.md'), '# Hello', 'utf-8');

      const skills = await service.listSkills(projectPath);
      expect(skills).toEqual([]);
    });

    it('should parse skill with full frontmatter', async () => {
      await createSkill('backend-express', [
        '---',
        'description: Express.js backend patterns',
        'globs:',
        '  - "src/server/**/*.ts"',
        '  - "src/routes/**/*.ts"',
        'alwaysApply: false',
        '---',
        '',
        '# Backend Express',
        '',
        'Some content here.',
      ].join('\n'));

      const skills = await service.listSkills(projectPath);

      expect(skills).toHaveLength(1);
      expect(skills[0]).toMatchObject({
        id: 'backend-express',
        name: 'Backend Express',
        description: 'Express.js backend patterns',
        category: 'backend',
        learningsCount: 0,
        globs: ['src/server/**/*.ts', 'src/routes/**/*.ts'],
        alwaysApply: false,
      });
    });

    it('should parse skill without frontmatter', async () => {
      await createSkill('simple-skill', '# My Simple Skill\n\nNo frontmatter.');

      const skills = await service.listSkills(projectPath);

      expect(skills).toHaveLength(1);
      expect(skills[0]).toMatchObject({
        id: 'simple-skill',
        name: 'My Simple Skill',
        description: 'Keine Beschreibung verfügbar',
        category: 'simple',
        globs: [],
        alwaysApply: false,
      });
    });

    it('should count learnings from dos-and-donts.md', async () => {
      await createSkill(
        'frontend-lit',
        '---\ndescription: Lit patterns\nalwaysApply: true\n---\n\n# Frontend Lit',
        [
          '# Dos and Donts',
          '',
          '## Entries',
          '',
          '### 2026-02-01 - Use reactive properties',
          'Content here.',
          '',
          '### 2026-02-10 - Avoid shadow DOM leaks',
          'More content.',
          '',
          '### 2026-02-15 - CSS custom properties',
          'Even more content.',
        ].join('\n')
      );

      const skills = await service.listSkills(projectPath);

      expect(skills).toHaveLength(1);
      expect(skills[0].learningsCount).toBe(3);
      expect(skills[0].alwaysApply).toBe(true);
    });

    it('should return 0 learnings when dos-and-donts has no entries', async () => {
      await createSkill(
        'empty-learnings',
        '---\ndescription: Test\n---\n\n# Empty',
        '# Dos and Donts\n\n## Entries\n\nNo entries yet.'
      );

      const skills = await service.listSkills(projectPath);

      expect(skills).toHaveLength(1);
      expect(skills[0].learningsCount).toBe(0);
    });

    it('should list multiple skills sorted alphabetically', async () => {
      await createSkill('quality-gates', '---\ndescription: Quality\n---\n\n# Quality Gates');
      await createSkill('backend-express', '---\ndescription: Backend\n---\n\n# Backend Express');
      await createSkill('frontend-lit', '---\ndescription: Frontend\n---\n\n# Frontend Lit');

      const skills = await service.listSkills(projectPath);

      expect(skills).toHaveLength(3);
      expect(skills[0].name).toBe('Backend Express');
      expect(skills[1].name).toBe('Frontend Lit');
      expect(skills[2].name).toBe('Quality Gates');
    });

    it('should infer category from directory name prefix', async () => {
      await createSkill('domain-specwright', '---\ndescription: Domain\n---\n\n# Domain');
      await createSkill('architecture', '---\ndescription: Arch\n---\n\n# Architecture');

      const skills = await service.listSkills(projectPath);

      expect(skills).toHaveLength(2);
      const arch = skills.find(s => s.id === 'architecture');
      const domain = skills.find(s => s.id === 'domain-specwright');
      expect(arch?.category).toBe('architecture');
      expect(domain?.category).toBe('domain');
    });
  });

  // ==========================================================================
  // getSkillDetail
  // ==========================================================================

  describe('getSkillDetail', () => {
    it('should return null for non-existent skill', async () => {
      const result = await service.getSkillDetail(projectPath, 'does-not-exist');
      expect(result).toBeNull();
    });

    it('should return full detail for a skill with all files', async () => {
      const skillMd = [
        '---',
        'description: Express.js backend patterns',
        'globs:',
        '  - "src/server/**/*.ts"',
        'alwaysApply: false',
        '---',
        '',
        '# Backend Express',
        '',
        'Main skill content.',
      ].join('\n');

      const dosAndDonts = [
        '# Dos and Donts',
        '',
        '## Entries',
        '',
        '### 2026-02-01 - Learning One',
        'Details.',
      ].join('\n');

      await createSkill('backend-express', skillMd, dosAndDonts, {
        'patterns.md': '# Patterns\nSome patterns.',
        'examples.md': '# Examples\nSome examples.',
      });

      const detail = await service.getSkillDetail(projectPath, 'backend-express');

      expect(detail).not.toBeNull();
      expect(detail!.id).toBe('backend-express');
      expect(detail!.name).toBe('Backend Express');
      expect(detail!.description).toBe('Express.js backend patterns');
      expect(detail!.category).toBe('backend');
      expect(detail!.learningsCount).toBe(1);
      expect(detail!.globs).toEqual(['src/server/**/*.ts']);
      expect(detail!.alwaysApply).toBe(false);
      expect(detail!.skillContent).toBe(skillMd);
      expect(detail!.dosAndDontsContent).toBe(dosAndDonts);
      expect(detail!.subDocuments).toEqual(['examples.md', 'patterns.md']);
    });

    it('should return detail with empty dosAndDontsContent when file missing', async () => {
      await createSkill('minimal', '---\ndescription: Minimal\n---\n\n# Minimal Skill');

      const detail = await service.getSkillDetail(projectPath, 'minimal');

      expect(detail).not.toBeNull();
      expect(detail!.dosAndDontsContent).toBe('');
      expect(detail!.learningsCount).toBe(0);
      expect(detail!.subDocuments).toEqual([]);
    });
  });

  // ==========================================================================
  // updateSkillContent
  // ==========================================================================

  describe('updateSkillContent', () => {
    it('should write new content to SKILL.md', async () => {
      await createSkill('backend-express', '# Old Content');

      const newContent = '---\ndescription: Updated\n---\n\n# Backend Express\n\nNew content.';
      await service.updateSkillContent(projectPath, 'backend-express', newContent);

      const written = await fs.readFile(join(skillsDir, 'backend-express', 'SKILL.md'), 'utf-8');
      expect(written).toBe(newContent);
    });

    it('should not affect other files in the skill directory', async () => {
      const dosContent = '# Dos and Donts\n\n## Entries\n\nNo entries yet.';
      await createSkill('backend-express', '# Old Content', dosContent, {
        'patterns.md': '# Patterns',
      });

      await service.updateSkillContent(projectPath, 'backend-express', '# New Content');

      const dos = await fs.readFile(join(skillsDir, 'backend-express', 'dos-and-donts.md'), 'utf-8');
      const patterns = await fs.readFile(join(skillsDir, 'backend-express', 'patterns.md'), 'utf-8');
      expect(dos).toBe(dosContent);
      expect(patterns).toBe('# Patterns');
    });

    it('should throw error when skill directory does not exist', async () => {
      await expect(
        service.updateSkillContent(projectPath, 'nonexistent', '# Content')
      ).rejects.toThrow();
    });

    it('should overwrite existing content completely', async () => {
      await createSkill('my-skill', '# First version\n\nLong content here.');

      await service.updateSkillContent(projectPath, 'my-skill', '# Short');

      const written = await fs.readFile(join(skillsDir, 'my-skill', 'SKILL.md'), 'utf-8');
      expect(written).toBe('# Short');
    });
  });

  // ==========================================================================
  // mcpTools parsing
  // ==========================================================================

  describe('mcpTools', () => {
    it('should parse mcpTools from frontmatter inline array', async () => {
      await createSkill('with-mcp', [
        '---',
        'description: Skill with MCP tools',
        'mcpTools: [playwright, perplexity]',
        '---',
        '',
        '# With MCP',
      ].join('\n'));

      const skills = await service.listSkills(projectPath);

      expect(skills).toHaveLength(1);
      expect(skills[0].mcpTools).toEqual(['playwright', 'perplexity']);
    });

    it('should return empty mcpTools when field is missing', async () => {
      await createSkill('no-mcp', [
        '---',
        'description: Skill without MCP tools',
        '---',
        '',
        '# No MCP',
      ].join('\n'));

      const skills = await service.listSkills(projectPath);

      expect(skills).toHaveLength(1);
      expect(skills[0].mcpTools).toEqual([]);
    });

    it('should return empty mcpTools for empty inline array', async () => {
      await createSkill('empty-mcp', [
        '---',
        'description: Empty MCP tools',
        'mcpTools: []',
        '---',
        '',
        '# Empty MCP',
      ].join('\n'));

      const skills = await service.listSkills(projectPath);

      expect(skills).toHaveLength(1);
      expect(skills[0].mcpTools).toEqual([]);
    });

    it('should include mcpTools in skill detail', async () => {
      await createSkill('detail-mcp', [
        '---',
        'description: Detail with MCP',
        'mcpTools: [chrome-devtools, context7]',
        '---',
        '',
        '# Detail MCP',
      ].join('\n'));

      const detail = await service.getSkillDetail(projectPath, 'detail-mcp');

      expect(detail).not.toBeNull();
      expect(detail!.mcpTools).toEqual(['chrome-devtools', 'context7']);
    });

    it('should update mcpTools in frontmatter via updateSkillContent', async () => {
      await createSkill('update-mcp', [
        '---',
        'description: Update MCP',
        'mcpTools: [old-tool]',
        '---',
        '',
        '# Update MCP',
      ].join('\n'));

      const content = [
        '---',
        'description: Update MCP',
        'mcpTools: [old-tool]',
        '---',
        '',
        '# Update MCP',
      ].join('\n');

      await service.updateSkillContent(projectPath, 'update-mcp', content, ['new-tool-1', 'new-tool-2']);

      const written = await fs.readFile(join(skillsDir, 'update-mcp', 'SKILL.md'), 'utf-8');
      expect(written).toContain('mcpTools: [new-tool-1, new-tool-2]');
      expect(written).not.toContain('old-tool');
    });

    it('should add mcpTools to frontmatter when not present', async () => {
      await createSkill('add-mcp', [
        '---',
        'description: Add MCP',
        '---',
        '',
        '# Add MCP',
      ].join('\n'));

      const content = [
        '---',
        'description: Add MCP',
        '---',
        '',
        '# Add MCP',
      ].join('\n');

      await service.updateSkillContent(projectPath, 'add-mcp', content, ['tool-a']);

      const written = await fs.readFile(join(skillsDir, 'add-mcp', 'SKILL.md'), 'utf-8');
      expect(written).toContain('mcpTools: [tool-a]');
    });

    it('should set empty mcpTools array when passing empty array', async () => {
      await createSkill('clear-mcp', [
        '---',
        'description: Clear MCP',
        'mcpTools: [old-tool]',
        '---',
        '',
        '# Clear MCP',
      ].join('\n'));

      const content = [
        '---',
        'description: Clear MCP',
        'mcpTools: [old-tool]',
        '---',
        '',
        '# Clear MCP',
      ].join('\n');

      await service.updateSkillContent(projectPath, 'clear-mcp', content, []);

      const written = await fs.readFile(join(skillsDir, 'clear-mcp', 'SKILL.md'), 'utf-8');
      expect(written).toContain('mcpTools: []');
      expect(written).not.toContain('old-tool');
    });
  });

  // ==========================================================================
  // deleteSkill
  // ==========================================================================

  describe('deleteSkill', () => {
    it('should remove the skill directory and all contents', async () => {
      await createSkill('to-delete', '# Delete Me', '# Dos', {
        'extra.md': '# Extra',
      });

      // Verify directory exists before delete
      await expect(fs.access(join(skillsDir, 'to-delete'))).resolves.toBeUndefined();

      await service.deleteSkill(projectPath, 'to-delete');

      // Verify directory no longer exists
      await expect(fs.access(join(skillsDir, 'to-delete'))).rejects.toThrow();
    });

    it('should not affect other skill directories', async () => {
      await createSkill('keep-this', '# Keep');
      await createSkill('delete-this', '# Delete');

      await service.deleteSkill(projectPath, 'delete-this');

      // Verify other skill still exists
      const kept = await fs.readFile(join(skillsDir, 'keep-this', 'SKILL.md'), 'utf-8');
      expect(kept).toBe('# Keep');

      // Verify deleted skill is gone
      await expect(fs.access(join(skillsDir, 'delete-this'))).rejects.toThrow();
    });

    it('should throw error when skill directory does not exist', async () => {
      await expect(
        service.deleteSkill(projectPath, 'nonexistent')
      ).rejects.toThrow();
    });

    it('should remove nested subdirectories', async () => {
      await createSkill('nested-skill', '# Nested');
      // Create a nested subdirectory
      const nestedDir = join(skillsDir, 'nested-skill', 'sub');
      await fs.mkdir(nestedDir, { recursive: true });
      await fs.writeFile(join(nestedDir, 'deep.md'), '# Deep', 'utf-8');

      await service.deleteSkill(projectPath, 'nested-skill');

      await expect(fs.access(join(skillsDir, 'nested-skill'))).rejects.toThrow();
    });
  });
});
