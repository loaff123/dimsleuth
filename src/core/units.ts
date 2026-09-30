import { vector } from './dimensions.ts';
import type { Vector } from './dimensions.ts';
const UNITS = new Map<string, Vector>([
  ['m',vector(1)], ['s',vector(0,0,1)], ['kg',vector(0,1)], ['g',vector(0,1)],
  ['A',vector(0,0,0,1)], ['K',vector(0,0,0,0,1)], ['mol',vector(0,0,0,0,0,1)], ['cd',vector(0,0,0,0,0,0,1)],
  ['Hz',vector(0,0,-1)], ['N',vector(1,1,-2)], ['Pa',vector(-1,1,-2)], ['J',vector(2,1,-2)], ['W',vector(2,1,-3)],
  ['C',vector(0,0,1,1)], ['V',vector(2,1,-3,-1)], ['ohm',vector(2,1,-3,-2)], ['Ω',vector(2,1,-3,-2)],
  ['S',vector(-2,-1,3,2)], ['F',vector(-2,-1,4,2)], ['Wb',vector(2,1,-2,-1)], ['T',vector(0,1,-2,-1)], ['H',vector(2,1,-2,-2)],
  ['rad',vector()], ['sr',vector()], ['lm',vector(0,0,0,0,0,0,1)], ['lx',vector(-2,0,0,0,0,0,1)],
  ['Bq',vector(0,0,-1)], ['Gy',vector(2,0,-2)], ['Sv',vector(2,0,-2)], ['kat',vector(0,0,-1,0,0,1)],
  ['L',vector(3)], ['l',vector(3)], ['eV',vector(2,1,-2)], ['t',vector(0,1)],
  ['min',vector(0,0,1)], ['h',vector(0,0,1)], ['day',vector(0,0,1)], ['d',vector(0,0,1)],
]);
const PREFIXES=['da','Q','R','Y','Z','E','P','T','G','M','k','h','d','c','m','µ','μ','u','n','p','f','a','z','y','r','q'];
const PREFIXABLE=new Set(['m','s','g','A','K','mol','cd','Hz','N','Pa','J','W','C','V','ohm','Ω','S','F','Wb','T','H','rad','sr','lm','lx','Bq','Gy','Sv','kat','L','l','eV']);
export function unitDimension(name: string): Vector|null {
  const exact=UNITS.get(name); if (exact) return exact;
  for (const prefix of PREFIXES) {
    if (name.startsWith(prefix)) {
      const base=name.slice(prefix.length);
      if (PREFIXABLE.has(base)) return UNITS.get(base)!;
    }
  }
  return null;
}
export const OFFSET_TEMPERATURE = /(?:°\s*[CF]|\b(?:degC|degF|Celsius|Fahrenheit|celsius|fahrenheit)\b)/;
