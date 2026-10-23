import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'app', 'page.tsx'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const component = fs.readFileSync(path.join(root, 'components', 'profile', 'PaletteStudioModal.tsx'), 'utf8');
const source = fs.readFileSync(path.join(root, 'test', 'fixtures', 'legacy-client', 'modules', '03-storage.js'), 'utf8');
const bundle = fs.readFileSync(path.join(root, 'test', 'fixtures', 'legacy-client', 'app.js'), 'utf8');
const header = fs.readFileSync(path.join(root, 'components', 'header', 'Header.tsx'), 'utf8');

assert.ok(page.includes('<PaletteStudioModal />'), 'Next page must mount the React Palette Studio.');
assert.doesNotMatch(html, /id="m3-palette-studio-modal"/, 'Legacy HTML must not own the Palette Studio.');
assert.match(component, /data-react-owned="true"/, 'Palette list must declare React ownership.');
assert.match(component, /levelup:open-palette-studio/, 'React modal must listen to the existing open action.');
assert.match(component, /levelup:palette-updated/, 'React palette list must refresh after legacy color engine updates.');
assert.match(source, /levelup:open-palette-studio/, 'Palette source helper must dispatch to the React owner.');
assert.match(source, /levelup:palette-updated/, 'Palette source helper must avoid imperative DOM rendering in React.');
assert.match(bundle, /levelup:open-palette-studio/, 'Loaded client bundle must dispatch palette events.');
assert.match(bundle, /levelup:palette-updated/, 'Loaded client bundle must preserve React palette synchronization.');
assert.match(header, /openPaletteStudio/, 'Header must open Palette Studio by its actual global API name.');
assert.doesNotMatch(header, /openPaletteModal/, 'Header must not call nonexistent openPaletteModal.');

console.log('React owns Palette Studio UI; existing palette engine remains wired through event bridge.');
