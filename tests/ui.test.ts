import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
const win=new Window({url:'https://example.invalid'});
Object.assign(globalThis,{window:win,document:win.document,localStorage:win.localStorage,HTMLElement:win.HTMLElement,HTMLInputElement:win.HTMLInputElement,HTMLButtonElement:win.HTMLButtonElement,File:win.File,FileReader:win.FileReader});
win.document.body.innerHTML='<div id="app"></div>';
await import('../src/main.ts');
function click(id:string){(document.getElementById(id) as HTMLButtonElement).click();}
test('initial workbench renders formula input and meaningful mismatch',()=>{
 assert.ok(document.getElementById('formula'));assert.match(document.getElementById('status')?.textContent??'',/incompatible|inconsistent|mismatch/i);assert.ok(document.querySelectorAll('.trace-node').length>0);
});
test('preset repair changes formula and becomes consistent',()=>{
 click('repair');assert.ok((document.getElementById('formula') as HTMLTextAreaElement).value.includes('t^2'));assert.match(document.getElementById('status')?.textContent??'',/consistent/i);assert.doesNotMatch(document.getElementById('status')?.textContent??'',/inconsistent/i);
});
test('preset switching and Chinese toggle use same workbench state',()=>{
 (document.querySelector('[data-preset="pendulum"]') as HTMLButtonElement).click();assert.ok((document.getElementById('formula') as HTMLTextAreaElement).value.includes('sqrt'));
 click('language');assert.equal(document.documentElement.lang,'zh-CN');assert.match(document.body.textContent??'',/量纲/);click('language');
});
test('untrusted formula is rendered as text not executable DOM',()=>{
 const input=document.getElementById('formula') as HTMLTextAreaElement;input.value='<img src=x onerror=alert(1)>';click('check');assert.equal(document.querySelector('img'),null);assert.match(document.getElementById('status')?.textContent??'',/invalid/i);
});
test('trace selection links an exact source span and shows rule',()=>{
 (document.querySelector('[data-preset="energy"]') as HTMLButtonElement).click();const node=document.querySelector('.trace-node') as HTMLButtonElement;node.click();assert.ok(document.querySelector('#source mark'));assert.ok(document.getElementById('inspector')?.textContent?.length);
});
test('saving drafts is opt-in and can be cleared',()=>{
 assert.equal(localStorage.getItem('dimsleuth.draft.v1'),null);const save=document.getElementById('remember') as HTMLInputElement;save.checked=true;save.dispatchEvent(new win.Event('change') as unknown as Event);assert.ok(localStorage.getItem('dimsleuth.draft.v1'));click('forget');assert.equal(localStorage.getItem('dimsleuth.draft.v1'),null);
});
test('repair never overwrites newer text awaiting debounce',()=>{
 (document.querySelector('[data-preset="kinematics"]') as HTMLButtonElement).click();
 const input=document.getElementById('formula') as HTMLTextAreaElement;
 input.value='x = v*t';input.dispatchEvent(new win.Event('input') as unknown as Event);click('repair');
 assert.equal(input.value,'x = v*t');
});
test('an older file import cannot replace a newer preset selection',async()=>{
 (document.querySelector('[data-preset="kinematics"]') as HTMLButtonElement).click();
 const file=document.getElementById('file') as HTMLInputElement;
 let finish!:(s:string)=>void;const text=new Promise<string>(resolve=>{finish=resolve;});
 Object.defineProperty(file,'files',{value:[{size:10,text:()=>text}],configurable:true});
 const pending=file.onchange!.call(file,new win.Event('change') as unknown as Event);
 (document.querySelector('[data-preset="energy"]') as HTMLButtonElement).click();
 finish(JSON.stringify({schemaVersion:1,title:'Older import',formula:'F=m*a',symbols:[{name:'F',unit:'N'},{name:'m',unit:'kg'},{name:'a',unit:'m/s^2'}]}));await pending;
 assert.equal((document.getElementById('formula') as HTMLTextAreaElement).value,'E = (1/2)*m*v^2');
});

function checkFormula(formula:string,language:'en'|'zh-CN'){
 (document.querySelector('[data-preset="kinematics"]') as HTMLButtonElement).click();
 if(document.documentElement.lang!==language)click('language');
 (document.getElementById('formula') as HTMLTextAreaElement).value=formula;
 click('check');
}
function inspectorStatus(){return document.querySelector('#inspector .detail-status')?.textContent;}
function selectTrace(expression:string){
 const node=Array.from(document.querySelectorAll<HTMLButtonElement>('.trace-node')).find(el=>el.querySelector('.node-expression')?.firstChild?.textContent===expression);
 assert.ok(node,`Trace step for ${expression}`);
 (node.querySelector('.node-expression') as HTMLElement).click();
 assert.equal(node.getAttribute('aria-pressed'),'true');
 assert.equal(document.querySelector('#source mark')?.textContent,expression);
}
for(const language of ['en','zh-CN'] as const){
 const invalid=language==='en'?'Invalid input':'输入无效';
 const conflict=language==='en'?'Dimension conflict':'量纲冲突';
 const valid=language==='en'?'Valid dimension':'量纲有效';
 const blocked=language==='en'?'Blocked by an earlier error':'受前序错误阻断';
 for(const {formula,selected,rule} of [
  {formula:'y',selected:'y',rule:/Unknown symbol/},
  {formula:'x^pi',selected:'pi',rule:/numeric literals and arithmetic only/},
  {formula:'x^(2^(1/2))',selected:'2^(1/2)',rule:/exact rational/i},
  {formula:'x^(1/0)',selected:'1/0',rule:/zero/i},
  {formula:'x^(0^0)',selected:'0^0',rule:/non-positive power is undefined/},
 ])test(`${language}: inspector identifies invalid input in ${formula}`,()=>{
  checkFormula(formula,language);
  assert.equal(document.getElementById('status')?.textContent,invalid);
  assert.equal(document.querySelector('#inspector .selected-expression')?.textContent,selected);
  assert.match(document.querySelector('#inspector .rule-text')?.textContent??'',rule);
  assert.equal(inspectorStatus(),invalid);
 });
 for(const formula of ['x+t','x=t','sin(x)'])test(`${language}: inspector preserves dimension conflict for ${formula}`,()=>{
  checkFormula(formula,language);
  assert.equal(document.getElementById('status')?.textContent,language==='en'?'Incompatible dimensions':'量纲不一致');
  assert.equal(document.querySelector('#inspector .selected-expression')?.textContent,formula);
  assert.equal(inspectorStatus(),conflict);
 });
 test(`${language}: mixed errors follow the selected operation rather than the overall status`,()=>{
  checkFormula('x+t+y',language);
  assert.equal(document.getElementById('status')?.textContent,invalid);
  assert.equal(inspectorStatus(),conflict);
  selectTrace('y');assert.equal(inspectorStatus(),invalid);
  (document.querySelector('[data-diagnostic="0"] span') as HTMLElement).click();
  assert.equal(document.querySelector('#source mark')?.textContent,'x+t');
  assert.equal(inspectorStatus(),conflict);
  selectTrace('x+t+y');assert.equal(inspectorStatus(),blocked);
  (document.querySelector('#inspector [data-node] code') as HTMLElement).click();
  assert.equal(document.querySelector('#source mark')?.textContent,'x+t');
  assert.equal(inspectorStatus(),conflict);
  selectTrace('x');assert.equal(inspectorStatus(),valid);
  selectTrace('y');assert.equal(inspectorStatus(),invalid);
  assert.equal(document.getElementById('status')?.textContent,invalid);
 });
 test(`${language}: an invalid configured unit has an invalid-input inspector fallback`,()=>{
  checkFormula('x',language);
  (document.getElementById('unit-0') as HTMLInputElement).value='not_a_unit';
  click('check');
  assert.equal(document.getElementById('status')?.textContent,invalid);
  assert.match(document.querySelector('#inspector .rule-text')?.textContent??'',/configured unit for x is invalid/);
  assert.equal(inspectorStatus(),invalid);
 });
 for(const formula of ['1/0','sqrt(-1)','log(-1)'])test(`${language}: ${formula} remains a dimension-only check`,()=>{
  checkFormula(formula,language);
  assert.equal(document.getElementById('status')?.textContent,language==='en'?'Dimensionally consistent':'量纲一致');
  assert.equal(inspectorStatus(),valid);
 });
}
