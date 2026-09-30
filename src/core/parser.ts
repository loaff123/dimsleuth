import type { Span, TraceNode } from './types.ts';
export const FUNCTIONS = new Set(['sqrt', 'sin', 'cos', 'tan', 'exp', 'log']);
export const CONSTANTS = new Set(['pi', 'e']);
export const NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,31}$/;
export interface Ast { kind: TraceNode['kind']; label: string; span: Span; children: Ast[]; depth: number }
interface Token { kind: 'number' | 'name' | 'operator' | 'end'; text: string; span: Span }
export class CoreError extends Error {
  code: string;
  span: Span;
  constructor(code: string, message: string, span: Span) { super(message); this.name = 'CoreError'; this.code = code; this.span = span; }
}
function tokenize(source: string, unit: boolean): Token[] {
  const tokens: Token[] = [];
  let offset = 0;
  while (offset < source.length) {
    const point = String.fromCodePoint(source.codePointAt(offset)!);
    if (/\s/u.test(point)) { offset += point.length; continue; }
    const start = offset;
    const rest = source.slice(offset);
    const number = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(rest)?.[0];
    if (number) {
      offset += number.length;
      tokens.push({kind:'number',text:number,span:{start,end:offset}});
    } else {
      const name = (unit ? /^[A-Za-zµμΩ][A-Za-z0-9_µμΩ]*/ : /^[A-Za-z][A-Za-z0-9_]*/).exec(rest)?.[0];
      if (name) { offset += name.length; tokens.push({kind:'name',text:name,span:{start,end:offset}}); }
      else if ('+-*/^()='.includes(point)) {
        offset += point.length; tokens.push({kind:'operator',text:point,span:{start,end:offset}});
      } else throw new CoreError('SYNTAX', `Unsupported character “${point}”. Use explicit arithmetic operators and ${unit ? 'known unit names' : 'ASCII symbol names'}.`, {start,end:start+point.length});
    }
    if (tokens.length > 512) throw new CoreError('TOKEN_LIMIT','Input exceeds the limit of 512 tokens.',{start,end:offset});
  }
  tokens.push({kind:'end',text:'',span:{start:source.length,end:source.length}});
  return tokens;
}
/** A small recursive-descent grammar; input is never executed. */
export class Parser {
  private tokens: Token[];
  private position = 0;
  private nesting = 0;
  private unit: boolean;
  constructor(source: string, unit = false) {
    this.unit = unit;
    const limit = unit ? 128 : 2048;
    if (source.length > limit) throw new CoreError('SOURCE_LIMIT',`Input exceeds the limit of ${limit} characters.`,{start:limit,end:source.length});
    this.tokens = tokenize(source,unit);
  }
  private current(): Token { return this.tokens[this.position]!; }
  private consume(): Token { return this.tokens[this.position++]!; }
  private match(text: string): boolean { if (this.current().text !== text) return false; this.consume(); return true; }
  private expect(text: string): Token {
    const token = this.current();
    if (token.text !== text) throw new CoreError('SYNTAX',`Expected “${text}”${token.kind === 'end' ? ' before the end of the input' : `, found “${token.text}”`}.`,token.span);
    return this.consume();
  }
  private make(kind: Ast['kind'], label: string, span: Span, children: Ast[] = []): Ast {
    const depth = children.length ? Math.max(...children.map(child=>child.depth))+1 : 1;
    if (depth > 64) throw new CoreError('DEPTH_LIMIT','Expression depth exceeds the bounded limit of 64.',span);
    return {kind,label,span,children,depth};
  }
  private recur(fn: ()=>Ast): Ast {
    this.nesting++;
    if (this.nesting > 64) throw new CoreError('DEPTH_LIMIT','Expression nesting exceeds the bounded limit of 64.',this.current().span);
    try { return fn(); } finally { this.nesting--; }
  }
  parse(): Ast {
    let result = this.sum();
    if (this.match('=')) {
      if (this.unit) throw new CoreError('UNIT_SYNTAX','Equality is not supported in a unit expression.',this.tokens[this.position-1]!.span);
      const right = this.sum();
      result = this.make('binary','=',{start:result.span.start,end:right.span.end},[result,right]);
    }
    const trailing = this.current();
    if (trailing.kind !== 'end') throw new CoreError('SYNTAX',trailing.text === '=' ? 'Only one top-level equality is allowed.' : `Unexpected “${trailing.text}”; use an explicit operator between expressions.`,trailing.span);
    return result;
  }
  private sum(): Ast {
    let node = this.product();
    while (this.current().text === '+' || this.current().text === '-') {
      const op = this.consume(); const right = this.product();
      node = this.make('binary',op.text,{start:node.span.start,end:right.span.end},[node,right]);
    }
    return node;
  }
  private product(): Ast {
    let node = this.unary();
    while (this.current().text === '*' || this.current().text === '/') {
      const op = this.consume(); const right = this.unary();
      node = this.make('binary',op.text,{start:node.span.start,end:right.span.end},[node,right]);
    }
    return node;
  }
  private unary(): Ast {
    if (this.current().text === '+' || this.current().text === '-') {
      const op = this.consume(); const child = this.recur(()=>this.unary());
      return this.make('unary',op.text,{start:op.span.start,end:child.span.end},[child]);
    }
    return this.power();
  }
  private power(): Ast {
    const left = this.primary();
    if (!this.match('^')) return left;
    const right = this.recur(()=>this.unary());
    return this.make('binary','^',{start:left.span.start,end:right.span.end},[left,right]);
  }
  private primary(): Ast {
    const token = this.current();
    if (token.kind === 'number') { this.consume(); return this.make('number',token.text,token.span); }
    if (token.kind === 'name') {
      this.consume();
      if (this.match('(')) {
        if (!FUNCTIONS.has(token.text) || (this.unit && token.text !== 'sqrt')) throw new CoreError(this.unit ? 'UNIT_SYNTAX' : 'UNKNOWN_FUNCTION',`Unsupported ${this.unit ? 'unit ' : ''}function “${token.text}”.`,token.span);
        const child = this.recur(()=>this.sum()); const close = this.expect(')');
        return this.make('function',token.text,{start:token.span.start,end:close.span.end},[child]);
      }
      if (!this.unit && !NAME_PATTERN.test(token.text)) throw new CoreError('SYMBOL_NAME','Symbol names must start with an ASCII letter and contain at most 32 letters, digits, or underscores.',token.span);
      return this.make('symbol',token.text,token.span);
    }
    if (this.match('(')) {
      const child = this.recur(()=>this.sum()); const close = this.expect(')');
      return this.make('group','( )',{start:token.span.start,end:close.span.end},[child]);
    }
    throw new CoreError('SYNTAX', token.kind === 'end' ? 'Expected a number, symbol, or parenthesized expression before the end of the input.' : `Unexpected “${token.text}”; expected a number, symbol, or parenthesized expression.`,token.span);
  }
}
