import type { Dimension } from './types.ts';
import { add, subtract, multiply, rational, parseRational, serialize } from './rational.ts';
import type { Rational } from './rational.ts';
export type Vector = [Rational,Rational,Rational,Rational,Rational,Rational,Rational];
export function fromDimension(dimension: Dimension): Vector { return dimension.map(parseRational) as Vector; }
export function toDimension(vector: Vector): Dimension { return vector.map(serialize) as Dimension; }
export function vector(...values: number[]): Vector { return Array.from({length:7},(_,i)=>rational(BigInt(values[i]??0))) as Vector; }
function bounded(result: Rational): Rational {
  const absolute = result.n < 0n ? -result.n : result.n;
  if (absolute > 1_000_000n || result.d > 1_000_000n) throw new Error('Dimension exponent exceeds the bounded range (numerator and denominator at most 1000000).');
  return result;
}
export function combine(left: Vector, right: Vector, subtraction=false): Vector {
  return left.map((value,index)=>bounded((subtraction ? subtract : add)(value,right[index]!))) as Vector;
}
export function scale(input: Vector, factor: Rational): Vector {
  return input.map(value=>bounded(multiply(value,factor))) as Vector;
}
export function same(left: Vector, right: Vector): boolean { return left.every((value,i)=>value.n===right[i]!.n&&value.d===right[i]!.d); }
export function dimensionless(input: Vector): boolean { return input.every(value=>value.n===0n); }
export function formatDimension(dimension: Dimension|null): string {
  if (dimension === null) return '—';
  const names=['L','M','T','I','Θ','N','J'];
  const terms=dimension.flatMap((exponent,i)=>exponent==='0' ? [] : [exponent==='1' ? names[i]! : `${names[i]}^${exponent.includes('/') ? `(${exponent})` : exponent}`]);
  return terms.join(' ') || '1';
}
