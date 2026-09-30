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
