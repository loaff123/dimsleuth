import test from 'node:test';
import assert from 'node:assert/strict';
import { importProject, exportProject, exportReport } from '../src/project.ts';
const fixture = { schemaVersion: 1 as const, title:'Test <script>alert(1)</script>', formula:'x=v*t', symbols:[{name:'x',unit:'m'},{name:'v',unit:'m/s'},{name:'t',unit:'s'}] };
test('project roundtrip preserves v1 data',()=>assert.deepEqual(importProject(exportProject(fixture)),fixture));
test('unknown versions, excess fields, dangerous keys, repeated symbols and invalid names reject',()=>{
 for(const s of ['{}','null','[]', '{"__proto__":{}}',JSON.stringify({...fixture,schemaVersion:2}),JSON.stringify({...fixture,extra:1}),JSON.stringify({...fixture,symbols:[{name:'constructor',unit:'m'}]}),JSON.stringify({...fixture,symbols:[{name:'x',unit:'m'},{name:'x',unit:'m'}]}),JSON.stringify({...fixture,symbols:[{name:'<img>',unit:'m'}]})])assert.throws(()=>importProject(s));
});
test('length and shape bounds reject without prototype mutation',()=>{
 assert.throws(()=>importProject(' '.repeat(65537)));assert.throws(()=>importProject(JSON.stringify({...fixture,formula:'x'.repeat(2049)})));
 assert.throws(()=>importProject('{"schemaVersion":1,"title":"a","formula":"x","symbols":[],"constructor":{"prototype":{"polluted":true}}}'));
 assert.equal(({} as Record<string,unknown>).polluted,undefined);
});
test('report escapes user supplied title, formula, errors, nodes',()=>{
 const html=exportReport(fixture,{formula:fixture.formula,status:'invalid',nodes:[{id:'a',kind:'symbol',label:'<img onerror=x>',span:{start:0,end:1},children:[],dimension:null,status:'error',rule:'<script>alert(1)</script>'}],diagnostics:[{code:'bad',message:'<svg onload=x>',span:{start:0,end:1}}],lhs:null,rhs:null,root:'a',symbols:['x']});
 assert.ok(html.includes('&lt;script&gt;')); assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img'));assert.ok(!html.includes('<svg')); assert.ok(html.includes('does not prove physical correctness'));
});
