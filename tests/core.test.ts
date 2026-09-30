import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, parseUnit, formatDimension } from '../src/core/index.ts';
import type { Dimension, SymbolInput } from '../src/core/types.ts';

// Fixtures are written directly from SI definitions, independently of parseUnit.
const ONE: Dimension = ['0','0','0','0','0','0','0'];
const LENGTH: Dimension = ['1','0','0','0','0','0','0'];
const MASS: Dimension = ['0','1','0','0','0','0','0'];
const TIME: Dimension = ['0','0','1','0','0','0','0'];
const SPEED: Dimension = ['1','0','-1','0','0','0','0'];
const ACCELERATION: Dimension = ['1','0','-2','0','0','0','0'];
const FORCE: Dimension = ['1','1','-2','0','0','0','0'];
const ENERGY: Dimension = ['2','1','-2','0','0','0','0'];
const symbols: SymbolInput[] = [{name:'F',unit:'N'},{name:'m',unit:'kg'},{name:'a',unit:'m/s^2'},{name:'v',unit:'m/s'},{name:'t',unit:'s'},{name:'x',unit:'m'},{name:'E',unit:'J'}];
function rootDimension(formula: string, input = symbols) {
  const result = analyze(formula,input);
  assert.equal(result.status,'consistent',JSON.stringify(result.diagnostics));
  return result.nodes.find(n => n.id === result.root)?.dimension;
}

test('base units independently match all seven SI axes', () => {
  for (const [unit, expected] of [['m',LENGTH],['kg',MASS],['s',TIME],['A',['0','0','0','1','0','0','0']],['K',['0','0','0','0','1','0','0']],['mol',['0','0','0','0','0','1','0']],['cd',['0','0','0','0','0','0','1']]] as [string,Dimension][]) assert.deepEqual(parseUnit(unit),expected);
});
test('derived units have independently specified dimensions', () => {
  for (const [unit, expected] of [['N',FORCE],['J',ENERGY],['W',['2','1','-3','0','0','0','0']],['Pa',['-1','1','-2','0','0','0','0']],['C',['0','0','1','1','0','0','0']],['V',['2','1','-3','-1','0','0','0']],['ohm',['2','1','-3','-2','0','0','0']],['Hz',['0','0','-1','0','0','0','0']],['rad',ONE],['1',ONE]] as [string,Dimension][]) assert.deepEqual(parseUnit(unit),expected,unit);
});
test('common scaled units preserve dimensions without claiming conversion', () => {
  for (const unit of ['mm','cm','km','μm','µm','nm']) assert.deepEqual(parseUnit(unit),LENGTH);
  for (const unit of ['ms','min','h']) assert.deepEqual(parseUnit(unit),TIME);
  assert.deepEqual(parseUnit('kN'),FORCE);
  assert.deepEqual(parseUnit('g'),MASS);
});
test('unit multiplication grouping division and rational powers are exact', () => {
  assert.deepEqual(parseUnit('kg*m/(s^2)'),FORCE);
  assert.deepEqual(parseUnit('m^(2/6)'),['1/3','0','0','0','0','0','0']);
  assert.deepEqual(parseUnit('sqrt(m^3/s)'),['3/2','0','-1/2','0','0','0','0']);
});
test('unknown and offset units throw readable errors while C means coulomb', () => {
  for (const unit of ['degC','Celsius','°C','degF','Fahrenheit']) assert.throws(()=>parseUnit(unit),/offset|temperature/i);
  assert.throws(()=>parseUnit('bananas'),/unknown unit/i);
  assert.deepEqual(parseUnit('C'),['0','0','1','1','0','0','0']);
});
test('unit grammar rejects addition equality trig and implicit products', () => {
  for (const unit of ['m+s','m=s','sin(m)','m s','2m']) assert.throws(()=>parseUnit(unit),/unit|unexpected|operator|unsupported/i,unit);
});
test('Newton equation is consistent with force dimensions', () => {
  const r=analyze('F = m*a',symbols);
  assert.equal(r.status,'consistent'); assert.deepEqual(r.diagnostics,[]);
  assert.ok(r.lhs); assert.ok(r.rhs); assert.equal(r.nodes.at(-1)?.id,r.root);
  assert.deepEqual(r.nodes.at(-1)?.dimension,FORCE);
});
test('kinetic energy and distance equations match independent vectors', () => {
  assert.deepEqual(rootDimension('E = 0.5*m*v^2'),ENERGY);
  assert.deepEqual(rootDimension('x = v*t + 0.5*a*t^2'),LENGTH);
});
test('multiplication division and grouping operate on SI exponents', () => {
  assert.deepEqual(rootDimension('x/t'),SPEED);
  assert.deepEqual(rootDimension('(v/t)'),ACCELERATION);
  assert.deepEqual(rootDimension('m*a'),FORCE);
});
test('number literals scientific notation and constants are dimensionless', () => {
  for (const f of ['2','0.5','.25','1e-3','2E+4','pi','e','sin(pi/2)','exp(1)','log(2)']) assert.deepEqual(rootDimension(f,[]),ONE,f);
});
test('unary minus binds below exponentiation and powers associate right', () => {
  assert.deepEqual(rootDimension('x^-2'),['-2','0','0','0','0','0','0']);
  assert.deepEqual(rootDimension('x^(-2^2)'),['-4','0','0','0','0','0','0']);
  assert.deepEqual(rootDimension('x^(2^3^2)'),['512','0','0','0','0','0','0']);
});
test('fractional and decimal exponents normalize exactly', () => {
  assert.deepEqual(rootDimension('x^(0.1+0.2)'),['3/10','0','0','0','0','0','0']);
  assert.deepEqual(rootDimension('x^(1/2)'),['1/2','0','0','0','0','0','0']);
  assert.deepEqual(rootDimension('sqrt(x*t)'),['1/2','0','1/2','0','0','0','0']);
  assert.deepEqual(rootDimension('x^(4^(1/2))'),['2','0','0','0','0','0','0']);
});
test('symbolic and function exponents are invalid with a focused diagnostic', () => {
  for (const f of ['x^t','x^pi','x^e','x^sin(1)','x^sqrt(4)']) {
    const r=analyze(f,symbols); assert.equal(r.status,'invalid',f);
    assert.ok(r.diagnostics.some(d=>/exponent/i.test(d.message)),f);
  }
});
test('invalid numeric exponent arithmetic fails safely', () => {
  for (const f of ['x^(1/0)','x^(2^(1/2))','x^(2^100000)','x^(1e999)','x^(0^-1)']) {
    const r=analyze(f,symbols); assert.equal(r.status,'invalid',f);
    assert.ok(r.diagnostics.length>0,f);
  }
});
test('addition mismatch reports full failing subtree and exact source link', () => {
  const formula='  x + t '; const r=analyze(formula,symbols);
  assert.equal(r.status,'inconsistent'); assert.equal(r.diagnostics.length,1);
  const d=r.diagnostics[0]!; assert.deepEqual(d.span,{start:2,end:7});
  assert.equal(formula.slice(d.span.start,d.span.end),'x + t');
  assert.equal(r.nodes.find(n=>n.id===d.nodeId)?.status,'error');
});
test('equation mismatch reports the complete equality', () => {
  const r=analyze('F = m*v',symbols);
  assert.equal(r.status,'inconsistent'); assert.equal(r.diagnostics.length,1);
  assert.deepEqual(r.diagnostics[0]?.span,{start:0,end:7});
});
test('independent branch errors are collected and parents are blocked', () => {
  const r=analyze('(x+t)*(m+v)',symbols);
  assert.equal(r.status,'inconsistent'); assert.equal(r.diagnostics.length,2);
  assert.equal(r.nodes.at(-1)?.status,'blocked');
  assert.equal(r.nodes.filter(n=>n.status==='error').length,2);
});
test('dimensional errors do not cascade through enclosing operations', () => {
  const r=analyze('sqrt((x+t)*m) = E',symbols);
  assert.equal(r.diagnostics.length,1); assert.equal(r.nodes.at(-1)?.status,'blocked');
});
test('dimensionless functions reject dimensioned arguments', () => {
  for (const f of ['sin(x)','cos(t)','tan(v)','exp(m)','log(a)']) {
    const r=analyze(f,symbols); assert.equal(r.status,'inconsistent',f);
    assert.equal(r.diagnostics.length,1); assert.ok(/dimensionless/i.test(r.diagnostics[0]!.message));
  }
});
test('unknown variables invalidate while still inspecting other branches', () => {
  const r=analyze('missing*(x+t)',symbols);
  assert.equal(r.status,'invalid'); assert.equal(r.diagnostics.length,2);
  assert.ok(r.diagnostics.some(d=>d.symbol==='missing'));
});
test('referenced symbols are unique source-order names, excluding constants', () => {
  const r=analyze('x*x + pi*x',symbols);
  assert.deepEqual(r.symbols,['x']);
});
test('unsupported Unicode characters retain accurate UTF-16 diagnostic spans', () => {
  const r=analyze('x + 𝑥',symbols);
  assert.equal(r.status,'invalid');
  assert.deepEqual(r.diagnostics[0]?.span,{start:4,end:6});
  assert.equal(analyze('x',[{name:'𝑥',unit:'m'}]).status,'invalid');
});
test('unused invalid configured units and duplicate names still reject analysis', () => {
  const r=analyze('1',[{name:'unused',unit:'degC'}]);
  assert.equal(r.status,'invalid'); assert.equal(r.diagnostics[0]?.symbol,'unused');
  assert.equal(analyze('x',[{name:'x',unit:'m'},{name:'x',unit:'s'}]).status,'invalid');
});
test('reserved constants and functions cannot be configured as variables', () => {
  for (const name of ['pi','e','sqrt','sin']) assert.equal(analyze('1',[{name,unit:'1'}]).status,'invalid',name);
});
test('trace IDs are unique, children precede parents, spans nest, rules are readable', () => {
  const formula='F = -m*(a + a)'; const r=analyze(formula,symbols);
  assert.equal(r.status,'consistent');
  const seen=new Set<string>();
  for (const node of r.nodes) {
    assert.ok(!seen.has(node.id)); assert.ok(node.rule.length>8);
    assert.ok(node.span.start>=0&&node.span.end<=formula.length);
    for (const childId of node.children) { assert.ok(seen.has(childId)); const child=r.nodes.find(n=>n.id===childId)!; assert.ok(child.span.start>=node.span.start&&child.span.end<=node.span.end); }
    seen.add(node.id);
  }
});
test('syntax errors are invalid and point to actual unexpected input', () => {
  for (const formula of ['','x +','(x','x)','x==t','x = t = m','(x=t)','foo(x)','x,t','2x','x t','x;globalThis.alert(1)','x[0]','x**2']) {
    const r=analyze(formula,symbols); assert.equal(r.status,'invalid',formula);
    assert.ok(r.diagnostics.length>0,formula);
    for (const d of r.diagnostics) assert.ok(d.span.start>=0&&d.span.end<=formula.length,formula);
  }
});
test('long source symbol lists unit text and token streams are bounded', () => {
  assert.equal(analyze('x'.repeat(2049),symbols).status,'invalid');
  assert.equal(analyze('1',Array.from({length:129},(_,i)=>({name:`x${i}`,unit:'m'}))).status,'invalid');
  assert.throws(()=>parseUnit('m'.repeat(129)),/limit|long|128/i);
  assert.equal(analyze(Array.from({length:260},()=> '1').join('+'),[]).status,'invalid');
});
test('recursive groups unary chains and powers are bounded without stack overflow', () => {
  for (const f of ['('.repeat(65)+'x'+')'.repeat(65),'-'.repeat(100)+'x',Array.from({length:100},()=> '2').join('^')]) {
    const r=analyze(f,symbols); assert.equal(r.status,'invalid',f); assert.ok(/limit|depth|nest|bounded/i.test(r.diagnostics[0]!.message),f);
  }
});
test('formatting is legible, exact and distinguishes blocked dimensions', () => {
  assert.equal(formatDimension(ONE),'1'); assert.equal(formatDimension(null),'—');
  assert.equal(formatDimension(FORCE),'L M T^-2');
  assert.equal(formatDimension(['1/2','0','-1','0','1','0','0']),'L^(1/2) T^-1 Θ');
});
test('analysis is deterministic and does not mutate symbol inputs', () => {
  const input=structuredClone(symbols); const before=structuredClone(input);
  assert.deepEqual(analyze('F=m*a',input),analyze('F=m*a',input)); assert.deepEqual(input,before);
});

test('dimension exponent bounds apply uniformly to multiplication and division', () => {
  assert.throws(()=>parseUnit('m^1000000*m'),/bounded|limit/i);
  assert.throws(()=>parseUnit('m^-1000000/m'),/bounded|limit/i);
  assert.equal(analyze('x^1000000*x',symbols).status,'invalid');
});
test('exact constant roots retain real signs and invert rational powers', () => {
  assert.deepEqual(rootDimension('x^((-8)^(1/3))'),['-2','0','0','0','0','0','0']);
  assert.deepEqual(rootDimension('x^((-8)^(2/3))'),['4','0','0','0','0','0','0']);
  assert.deepEqual(rootDimension('x^((2/3)^-2)'),['9/4','0','0','0','0','0','0']);
  assert.equal(analyze('x^((-4)^(1/2))',symbols).status,'invalid');
});
test('exponent arithmetic failure links to the failing child and blocks ancestors', () => {
  const formula='x^(1/0)'; const r=analyze(formula,symbols);
  assert.equal(r.diagnostics.length,1);
  assert.equal(formula.slice(r.diagnostics[0]!.span.start,r.diagnostics[0]!.span.end),'1/0');
  assert.equal(r.nodes.find(n=>n.id===r.diagnostics[0]!.nodeId)?.status,'error');
  assert.equal(r.nodes.at(-1)?.status,'blocked');
});
test('reserved constants are case-sensitive and E can represent energy', () => {
  assert.deepEqual(rootDimension('E'),ENERGY);
  assert.deepEqual(rootDimension('e',[]),ONE);
  assert.equal(analyze('PI',[]).status,'invalid');
});
test('all additional SI derived dimensions match independent fixtures', () => {
  const fixtures: [string,Dimension][]=[['F',['-2','-1','4','2','0','0','0']],['S',['-2','-1','3','2','0','0','0']],['Wb',['2','1','-2','-1','0','0','0']],['T',['0','1','-2','-1','0','0','0']],['H',['2','1','-2','-2','0','0','0']],['lm',['0','0','0','0','0','0','1']],['lx',['-2','0','0','0','0','0','1']],['Gy',['2','0','-2','0','0','0','0']],['kat',['0','0','-1','0','0','1','0']]];
  for(const [unit,expected] of fixtures) assert.deepEqual(parseUnit(unit),expected,unit);
});
test('diagnostics stay source bounded across seeded hostile token combinations', () => {
  const alphabet=['x','t','1','0','+','-','*','/','^','(',')','=','sin','sqrt',';','[',']','💥','\n'];
  let seed=0x12345678;
  for(let caseNo=0;caseNo<500;caseNo++) {
    let formula='';
    for(let i=0;i<20;i++) { seed=(Math.imul(seed,1664525)+1013904223)>>>0; formula+=alphabet[seed%alphabet.length]; }
    const result=analyze(formula,symbols);
    assert.ok(['consistent','inconsistent','invalid'].includes(result.status));
    for(const diagnostic of result.diagnostics) assert.ok(diagnostic.span.start>=0&&diagnostic.span.start<=diagnostic.span.end&&diagnostic.span.end<=formula.length,formula);
  }
});
