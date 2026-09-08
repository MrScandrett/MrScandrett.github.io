import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { steamGalaxyNodes, categoryMeta } from '../assets/js/app-registry.js';
import { projectPaths } from '../assets/js/app-learning-resources.js';
const tools = steamGalaxyNodes.filter(t => t.type === 'tool');
const byId = new Map(tools.map(t => [t.id,t]));
assert.equal(byId.size,tools.length,'Resource IDs must be unique');
assert.ok(!byId.has('glitch'),'Retired Glitch must not be offered');
for (const tool of tools) {
  assert.ok(categoryMeta[tool.category], `Category missing: ${tool.id}`);
  assert.ok(tool.save && tool.cost,`Access and saving guidance missing: ${tool.id}`);
  if(tool.access === 'no-account') {
    assert.ok(tool.browser && tool.free,`Start now requires free browser access: ${tool.id}`);
    assert.ok(tool.source && tool.reviewedOn,`No source for signed-out workflow: ${tool.id}`);
  }
  if(tool.tags?.includes('Steam')) assert.equal(tool.access,'installed');
  if(!/^https?:/.test(tool.link)) await access(new URL('../'+tool.link,import.meta.url));
}
assert.equal(byId.get('googledocs').access,'account');
assert.equal(byId.get('britannica').access,'check','No login text must not become account required');
assert.equal(byId.get('freesound').access,'account');
assert.equal(byId.get('tinkercad').access,'classroom');
assert.equal(byId.get('scratchjr').access,'installed');
for (const path of projectPaths) {
  assert.equal(path.steps.length,4);
  for(const id of path.tools) assert.equal(byId.get(id)?.access,'no-account',`${path.id} must work without accounts`);
  await access(new URL('../'+path.starter,import.meta.url));
}
assert.ok((await readFile(new URL('../downloads/launchpad/story-plan.txt',import.meta.url),'utf8')).includes('[[Listen'));
console.log(`${tools.length} resources; ${tools.filter(t=>t.access==='no-account').length} no-account workflows; ${projectPaths.length} complete starter paths. Catalog checks passed.`);
