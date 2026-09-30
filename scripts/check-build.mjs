import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { analyze, parseUnit } from '../lib/index.js';
const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
assert.ok(html.includes('DimSleuth'));assert.ok(!html.includes('https://fonts'));assert.ok(!html.includes('src/main.ts'));
const names=await readdir(new URL('../dist/assets/',import.meta.url));assert.ok(names.some(n=>n.endsWith('.js')));assert.ok(names.some(n=>n.endsWith('.css')));
assert.deepEqual(parseUnit('N'),['1','1','-2','0','0','0','0']);
assert.equal(analyze('F=m*a',[{name:'F',unit:'N'},{name:'m',unit:'kg'},{name:'a',unit:'m/s^2'}]).status,'consistent');
console.log('Built static app and reusable ESM core verified.');
