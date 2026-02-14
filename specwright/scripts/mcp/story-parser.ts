import { readFile } from 'fs/promises';
import { Anthropic } from '@anthropic-ai/sdk';

/**
 * Parsed story content structure
 */
export interface ParsedStory {
  id: string;
  title: string;
  feature: string | null;
  scenarios: string[];
  was: string | null;
  wie: string | null;
  wo: string[];
  wer: string | null;
  dod: string[];
  dorComplete: boolean;
  dependencies: string[];
  type: string | null;
  priority: string | null;
  effort: string | null;
}

/**
 * Layer 1: Regex-based parser (fast, free, deterministic)
 *
 * Attempts to parse story markdown using regex patterns.
 * Throws error if any required section is missing or unparseable.
 */
function regexParseStory(content: string): ParsedStory {
  // Extract title from first heading
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (!titleMatch) {
    throw new Error('Title (# heading) not found');
  }
  const title = titleMatch[1];

  // Extract story ID from title or content
  const storyIdMatch =
    title.match(/Story\s+([A-Z0-9]+-\d+):/i) ||
    content.match(/Story ID:\s*([A-Z0-9-]+)/i) ||
    content.match(/\|\s*\*\*ID\*\*\s*\|\s*([A-Z0-9-]+)\s*\|/i);

  if (!storyIdMatch) {
    throw new Error('Story ID not found in title or content');
  }
  const id = storyIdMatch[1];

  // Extract metadata (Type, Priority, Effort)
  const typeMatch = content.match(/\*\*Type:\*\*\s*(.+?)(?:\n|$)/i);
  const priorityMatch = content.match(/\*\*Priority:\*\*\s*(.+?)(?:\n|$)/i);
  const effortMatch = content.match(/\*\*Estimated Effort:\*\*\s*(.+?)(?:\n|$)/i);

  // Extract Gherkin Feature block
  const featureMatch = content.match(/```gherkin\s*\nFeature:[\s\S]*?```/);
  const feature = featureMatch ? featureMatch[0] : null;

  // Extract Gherkin scenarios
  const scenarios: string[] = [];
  const scenarioMatches = content.matchAll(/```gherkin\s*\nScenario[^:]*:[\s\S]*?```/g);
  for (const match of scenarioMatches) {
    scenarios.push(match[0]);
  }

  // Extract technical sections
  const wasMatch = content.match(/\*\*WAS:\*\*\s*([\s\S]*?)(?=\*\*WIE:|###|$)/i);
  const wieMatch = content.match(/\*\*WIE[^:]*:\*\*\s*([\s\S]*?)(?=\*\*WO:|###|$)/i);
  const woMatch = content.match(/\*\*WO:\*\*\s*([\s\S]*?)(?=\*\*WER:|###|$)/i);
  const werMatch = content.match(/\*\*WER:\*\*\s*(.+?)(?:\n|$)/i);

  // Parse WO into array of file paths
  let wo: string[] = [];
  if (woMatch) {
    const woText = woMatch[1].trim();
    // Extract file paths - look for lines starting with - or containing path-like strings
    const pathMatches = woText.matchAll(/(?:^|\n)\s*[-*]\s*`?([^\n`]+\.(ts|js|tsx|jsx|rb|py|md|json|yml|yaml|sh))`?/gi);
    for (const match of pathMatches) {
      wo.push(match[1].trim());
    }
    // Also try extracting from code blocks
    const codeBlockMatch = woText.match(/```[\s\S]*?```/);
    if (codeBlockMatch) {
      const lines = codeBlockMatch[0].split('\n');
      for (const line of lines) {
        if (line.match(/\.(ts|js|tsx|jsx|rb|py|md|json|yml|yaml|sh)$/i)) {
          wo.push(line.trim());
        }
      }
    }
  }

  // Extract DoD checklist
  const dodSection = content.match(/###\s+DoD[\s\S]*?(?=###|$)/i);
  const dod: string[] = [];
  if (dodSection) {
    const checkItems = dodSection[0].matchAll(/- \[[ x]\]\s*(.+)/g);
    for (const item of checkItems) {
      dod.push(item[1].trim());
    }
  }

  // Extract DoR and check if complete
  const dorSection = content.match(/###\s+DoR[\s\S]*?(?=###|$)/i);
  let dorComplete = true;
  if (dorSection) {
    const uncheckedBoxes = dorSection[0].match(/- \[ \]/g);
    if (uncheckedBoxes && uncheckedBoxes.length > 0) {
      dorComplete = false;
    }
  }

  // Extract dependencies
  const depsMatch = content.match(/\*\*(?:Abhängigkeiten|Dependencies):\*\*\s*(.+?)(?:\n|$)/i);
  const dependencies: string[] = [];
  if (depsMatch && depsMatch[1].trim().toLowerCase() !== 'none') {
    dependencies.push(...depsMatch[1].split(/[,;]/).map(d => d.trim()).filter(d => d));
  }

  // Validate required fields
  if (!feature && scenarios.length === 0) {
    throw new Error('No Feature or Scenarios found');
  }
  if (!wasMatch) {
    throw new Error('WAS section not found');
  }
  if (dod.length === 0) {
    throw new Error('DoD checklist not found');
  }

  return {
    id,
    title,
    feature,
    scenarios,
    was: wasMatch[1].trim(),
    wie: wieMatch ? wieMatch[1].trim() : null,
    wo,
    wer: werMatch ? werMatch[1].trim() : null,
    dod,
    dorComplete,
    dependencies,
    type: typeMatch ? typeMatch[1].trim() : null,
    priority: priorityMatch ? priorityMatch[1].trim() : null,
    effort: effortMatch ? effortMatch[1].trim() : null
  };
}

/**
 * Layer 2: Haiku-based parser (slow, cheap, robust)
 *
 * Uses Claude Haiku to intelligently extract structured data from story markdown.
 * Handles format variations, typos, and missing sections gracefully.
 *
 * Cost: ~$0.001 per story (~500 input + 200 output tokens)
 * Latency: ~1-2 seconds
 */
async function haikuParseStory(content: string): Promise<ParsedStory> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set - cannot use Haiku fallback parser');
  }

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: 'claude-haiku-3-5-20241022',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `Extract structured data from this Specwright story file and return ONLY valid JSON (no markdown, no explanations).

Story Content:
${content}

Return JSON with these exact fields:
{
  "id": "Story ID (e.g., MCPT-001)",
  "title": "Story title without Story ID prefix",
  "feature": "Complete Gherkin Feature block or null",
  "scenarios": ["Array of complete Gherkin Scenario blocks"],
  "was": "WAS section content or null",
  "wie": "WIE section content or null",
  "wo": ["Array of file paths from WO section"],
  "wer": "Agent name from WER section or null",
  "dod": ["DoD checklist items without checkbox markers"],
  "dorComplete": true/false,
  "dependencies": ["Array of story IDs from dependencies"],
  "type": "Type from metadata or null",
  "priority": "Priority from metadata or null",
  "effort": "Effort from metadata or null"
}

Rules:
- Extract complete Gherkin blocks including backticks
- Parse WO into clean array of file paths (just the paths, no bullets or markdown)
- Extract DoD items without [ ] or [x] markers
- dorComplete: false if any DoR checkbox is unchecked [ ]
- If section missing, use null or empty array
- Return ONLY the JSON object, nothing else`
    }]
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  // Extract JSON from response (in case Haiku adds explanation)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Haiku did not return valid JSON');
  }

  return JSON.parse(jsonMatch[0]) as ParsedStory;
}

/**
 * Layer 3: Main parser with fallback strategy
 *
 * Attempts regex parsing first (fast, free).
 * Falls back to Haiku if regex fails (slow, cheap, robust).
 *
 * @param storyPath - Absolute path to story .md file
 * @returns Parsed story data
 */
export async function parseStoryFile(storyPath: string): Promise<ParsedStory> {
  const content = await readFile(storyPath, 'utf-8');

  try {
    // Layer 1: Try regex parser first (fast path)
    const parsed = regexParseStory(content);

    // Validate completeness - all required fields present
    if (parsed.id && parsed.title && parsed.was && parsed.dod.length > 0) {
      console.log(`[StoryParser] Regex parse successful: ${parsed.id}`);
      return parsed;
    }

    throw new Error('Regex parse incomplete - missing required fields');

  } catch (error) {
    // Layer 2: Fallback to Haiku (safety net)
    console.warn(`[StoryParser] Regex parse failed for ${storyPath}, using Haiku fallback`);
    console.warn(`[StoryParser] Error: ${error instanceof Error ? error.message : String(error)}`);

    try {
      const parsed = await haikuParseStory(content);
      console.log(`[StoryParser] Haiku parse successful: ${parsed.id}`);
      return parsed;
    } catch (haikuError) {
      console.error(`[StoryParser] Haiku parse also failed: ${haikuError}`);
      throw new Error(`Failed to parse story: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Validate story format against template requirements
 * Used during /create-spec to ensure stories are always parseable
 *
 * @param content - Story markdown content
 * @returns Validation result with issues array
 */
export function validateStoryFormat(content: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check for required sections
  if (!content.match(/^#\s+/m)) {
    issues.push('Missing title (# heading)');
  }

  if (!content.match(/```gherkin\s*\nFeature:/i)) {
    issues.push('Missing Gherkin Feature block');
  }

  if (!content.match(/###\s+DoR/i)) {
    issues.push('Missing DoR section');
  }

  if (!content.match(/###\s+DoD/i)) {
    issues.push('Missing DoD section');
  }

  if (!content.match(/\*\*WAS:\*\*/i)) {
    issues.push('Missing WAS section');
  }

  if (!content.match(/\*\*WO:\*\*/i)) {
    issues.push('Missing WO section');
  }

  // Check for metadata
  if (!content.match(/\*\*Type:\*\*/i)) {
    issues.push('Missing Type metadata');
  }

  if (!content.match(/\*\*Priority:\*\*/i)) {
    issues.push('Missing Priority metadata');
  }

  // Check DoD has checklist items
  const dodSection = content.match(/###\s+DoD[\s\S]*?(?=###|$)/i);
  if (dodSection) {
    const checkItems = dodSection[0].match(/- \[[ x]\]/g);
    if (!checkItems || checkItems.length === 0) {
      issues.push('DoD section has no checklist items');
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
}
