/** Exact bounded rational arithmetic. No floating point enters a dimension. */
export interface Rational { n: bigint; d: bigint }
const MAX_BITS = 256;
const MAX_POWER = 4096n;
const MAX_ROOT = 64n;
export const ZERO: Rational = { n: 0n, d: 1n };
export const ONE: Rational = { n: 1n, d: 1n };
function abs(n: bigint): bigint { return n < 0n ? -n : n; }
function bits(n: bigint): number { return abs(n).toString(2).length; }
function gcd(a: bigint, b: bigint): bigint {
  a = abs(a); b = abs(b);
  while (b !== 0n) { const next = a % b; a = b; b = next; }
  return a;
}
export function rational(n: bigint, d = 1n): Rational {
  if (d === 0n) throw new Error('Division by zero is not allowed in an exponent.');
  if (bits(n) > MAX_BITS * 2 || bits(d) > MAX_BITS * 2) throw new Error('Exact rational arithmetic exceeds the bounded size limit.');
  if (d < 0n) { n = -n; d = -d; }
  if (n === 0n) return ZERO;
  const g = gcd(n, d); n /= g; d /= g;
  if (bits(n) > MAX_BITS || bits(d) > MAX_BITS) throw new Error('Exact rational arithmetic exceeds the bounded 256-bit size limit.');
  return { n, d };
}
export function add(a: Rational, b: Rational): Rational { return rational(a.n * b.d + b.n * a.d, a.d * b.d); }
export function subtract(a: Rational, b: Rational): Rational { return rational(a.n * b.d - b.n * a.d, a.d * b.d); }
export function multiply(a: Rational, b: Rational): Rational { return rational(a.n * b.n, a.d * b.d); }
export function divide(a: Rational, b: Rational): Rational { return rational(a.n * b.d, a.d * b.n); }
export function negate(a: Rational): Rational { return { n: -a.n, d: a.d }; }
export function serialize(a: Rational): string { return a.d === 1n ? String(a.n) : `${a.n}/${a.d}`; }
export function parseRational(text: string): Rational {
  const parts = text.split('/');
  return rational(BigInt(parts[0]!), parts.length === 2 ? BigInt(parts[1]!) : 1n);
}
export function literal(text: string): Rational {
  const [decimal, exponentText = '0'] = text.toLowerCase().split('e');
  const exponent = Number(exponentText);
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 100) throw new Error('Numeric literal exponent exceeds the bounded range (-100 to 100).');
  const [whole = '', fraction = ''] = decimal!.split('.');
  const digits = (whole + fraction).replace(/^0+/, '') || '0';
  if (digits.length > 78) throw new Error('Numeric literal exceeds the bounded 256-bit size limit.');
  if (digits === '0') return ZERO;
  const shift = exponent - fraction.length;
  if (Math.abs(shift) > 100) throw new Error('Numeric literal precision exceeds the bounded range.');
  const coefficient = BigInt(digits);
  return shift >= 0 ? rational(coefficient * 10n ** BigInt(shift)) : rational(coefficient, 10n ** BigInt(-shift));
}
/** Compare an integer power with a cap, stopping before unbounded intermediates. */
function powerCompare(base: bigint, exponent: number, cap: bigint): number {
  let product = 1n;
  for (let i = 0; i < exponent; i++) {
    product *= base;
    if (product > cap) return 1;
  }
  return product === cap ? 0 : -1;
}
function exactRoot(value: bigint, degree: number): bigint {
  if (value === 0n || value === 1n || degree === 1) return value;
  let low = 0n;
  let high = 1n << BigInt(Math.ceil(bits(value) / degree));
  while (low <= high) {
    const midpoint = (low + high) / 2n;
    const comparison = powerCompare(midpoint, degree, value);
    if (comparison === 0) return midpoint;
    if (comparison < 0) low = midpoint + 1n; else high = midpoint - 1n;
  }
  throw new Error('Irrational constant powers are not allowed in an exponent; use exact rational arithmetic.');
}
export function power(base: Rational, exponent: Rational): Rational {
  if (abs(exponent.n) > MAX_POWER || exponent.d > MAX_ROOT) throw new Error('Constant power exceeds the bounded exponent limit (4096; root degree 64).');
  if (base.n === 0n && exponent.n <= 0n) throw new Error('Zero to a non-positive power is undefined in an exponent.');
  if (base.n < 0n && exponent.d % 2n === 0n) throw new Error('A negative constant has no real even root in an exponent.');
  const degree = Number(exponent.d);
  let numerator = exactRoot(abs(base.n), degree);
  const denominator = exactRoot(base.d, degree);
  if (base.n < 0n) numerator = -numerator;
  const integerExponent = abs(exponent.n);
  // Bound before exponentiation, including inputs that would allocate huge BigInts.
  if ((abs(numerator) > 1n && bits(numerator) * Number(integerExponent) > MAX_BITS + Number(integerExponent)) ||
      (denominator > 1n && bits(denominator) * Number(integerExponent) > MAX_BITS + Number(integerExponent))) {
    throw new Error('Constant power exceeds the bounded rational size limit.');
  }
  const n = numerator ** integerExponent; const d = denominator ** integerExponent;
  return exponent.n < 0n ? rational(d, n) : rational(n, d);
}
