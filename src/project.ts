import type { Project, Analysis } from './core/types.ts';
const BAD = new Set(['__proto__','prototype','constructor']);
const NAME = /^[A-Za-z][A-Za-z0-9_]{0,31}$/;
function record(v:unknown): v is Record<string,unknown> {return v!==null&&typeof v==='object'&&!Array.isArray(v);}
function keys(v:Record<string,unknown>, allowed:string[]) {if(Object.keys(v).some(k=>!allowed.includes(k))||allowed.some(k=>!Object.hasOwn(v,k)))throw Error('Project contains missing or unsupported fields.');}
function string(v:unknown,max:number,label:string):string {if(typeof v!=='string'||v.length>max)throw Error(`${label} must be text no longer than ${max} characters.`);return v;}
export function importProject(json:string):Project {
 if(typeof json!=='string'||new TextEncoder().encode(json).length>65536)throw Error('Project exceeds the 64 KiB limit.');
 let parsed:unknown;try{parsed=JSON.parse(json);}catch{throw Error('This file is not valid JSON.');}
 const stack:unknown[]=[parsed];while(stack.length){const value=stack.pop();if(value&&typeof value==='object'){for(const [k,v]of Object.entries(value)){if(BAD.has(k))throw Error('Unsafe property name in project.');stack.push(v);}}}
 if(!record(parsed))throw Error('Expected a DimSleuth project object.');keys(parsed,['schemaVersion','title','formula','symbols']);
 if(parsed.schemaVersion!==1)throw Error('Unsupported project version. Expected schemaVersion 1.');
 const title=string(parsed.title,120,'Title');const formula=string(parsed.formula,2048,'Formula');
 if(!Array.isArray(parsed.symbols)||parsed.symbols.length>128)throw Error('Expected at most 128 symbols.');
 const seen=new Set<string>();const symbols=parsed.symbols.map(item=>{
  if(!record(item))throw Error('Each symbol must have a name and unit.');keys(item,['name','unit']);
  const name=string(item.name,32,'Symbol');const unit=string(item.unit,128,'Unit');
  if(!NAME.test(name)||BAD.has(name)||['pi','e','sqrt','sin','cos','tan','exp','log'].includes(name))throw Error(`Invalid or reserved symbol name: ${name}`);
  if(seen.has(name))throw Error(`Duplicate symbol: ${name}`);seen.add(name);return {name,unit};
 });return {schemaVersion:1,title,formula,symbols};
}
export function exportProject(project:Project):string {return JSON.stringify(importProject(JSON.stringify(project)),null,2)+'\n';}
export function escapeHtml(value:unknown):string {return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
export function exportReport(project:Project,analysis:Analysis):string {
 const p=importProject(exportProject(project));const e=escapeHtml;
 const rows=analysis.nodes.map(n=>`<tr><td><code>${e(p.formula.slice(n.span.start,n.span.end))}</code></td><td>${e(n.dimension?.join(', ')??'unresolved')}</td><td>${e(n.status)}</td><td>${e(n.rule)}</td></tr>`).join('');
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${e(p.title)} · DimSleuth report</title><style>body{font:16px/1.65 system-ui,sans-serif;max-width:1100px;margin:40px auto;padding:0 24px;color:#17223e}h1{line-height:1.2}code{font:15px ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere}table{border-collapse:collapse;width:100%;font-size:14px}td,th{padding:12px;border:1px solid #ccd3e1;text-align:left;vertical-align:top}aside{background:#fff4da;border-left:4px solid #a66300;padding:16px}.formula{background:#edf1fa;padding:20px}ul{padding-left:24px}@media(max-width:600px){table{display:block;overflow:auto}}</style></head><body><p>DimSleuth · v0.1.0 · Local analysis report</p><h1>${e(p.title||'Untitled formula')}</h1><p class="formula"><code>${e(p.formula)}</code></p><h2>${e(analysis.status)}</h2><aside>Dimensional consistency does not prove physical correctness. Signs, numerical factors, physical assumptions, domains, and numerical unit conversions are not checked.</aside><h2>Symbol dimensions</h2><ul>${p.symbols.map(s=>`<li><code>${e(s.name)}</code> : ${e(s.unit)}</li>`).join('')}</ul><h2>Diagnostics</h2><ul>${analysis.diagnostics.length?analysis.diagnostics.map(d=>`<li>${e(d.message)} · characters ${d.span.start+1}–${d.span.end}<br><code>${e(p.formula.slice(d.span.start,d.span.end))}</code></li>`).join(''):'<li>No dimensional errors detected.</li>'}</ul><h2>Operation trace</h2><p>Vector order: length, mass, time, current, temperature, amount, luminous intensity. Exponents are exact rational numbers.</p><table><thead><tr><th>Expression</th><th>SI vector</th><th>Status</th><th>Rule</th></tr></thead><tbody>${rows}</tbody></table><p>This report is a static snapshot. No scripts, external assets, or user data transmission.</p></body></html>`;
}
