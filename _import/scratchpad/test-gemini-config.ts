
import { getCliCommandForModel } from '../agent-os-ui/src/server/model-config.ts';

const testModels = [
  'opus',
  'glm-5',
  'google/gemini-3-flash-preview',
  'google/gemini-3-pro-preview',
  'non-existent'
];

console.log('--- Testing getCliCommandForModel ---');
testModels.forEach(modelId => {
  const config = getCliCommandForModel(modelId);
  console.log(`Model: ${modelId}`);
  console.log(`Command: ${config.command}`);
  console.log(`Args: ${JSON.stringify(config.args)}`);
  console.log('---');
});
