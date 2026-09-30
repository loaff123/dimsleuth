import type { Analysis, Diagnostic, Dimension, Span, SymbolInput, TraceNode } from './types.ts';
import { Parser, CoreError, NAME_PATTERN, CONSTANTS, FUNCTIONS } from './parser.ts';
import type { Ast } from './parser.ts';
import { vector, fromDimension, toDimension, combine, scale, same, dimensionless, formatDimension } from './dimensions.ts';
import type { Vector } from './dimensions.ts';
import { literal, add, subtract, multiply, divide, negate, power, rational, serialize } from './rational.ts';
import type { Rational } from './rational.ts';
import { unitDimension, OFFSET_TEMPERATURE } from './units.ts';
export type * from './types.ts';
export { formatDimension };

interface Evaluation { node: TraceNode; dimension: Vector|null; value: Rational|null }
class Evaluator {
  nodes: TraceNode[] = [];
  diagnostics: Diagnostic[] = [];
  referenced = new Set<string>();
  invalid = false;
  private configured: Map<string, Vector|null>;
  private unit: boolean;
  constructor(configured: Map<string,Vector|null>, unit=false) { this.configured=configured; this.unit=unit; }
  private diagnostic(code: string, message: string, ast: Ast, node: TraceNode, invalid: boolean, symbol?: string): void {
    this.diagnostics.push({code,message,span:{...ast.span},nodeId:node.id,...(symbol ? {symbol} : {})});
    if (invalid) this.invalid=true;
    node.status='error'; node.dimension=null; node.rule=message;
  }
  visit(ast: Ast, numeric=false): Evaluation {
    if (ast.kind === 'symbol' && !this.unit && !CONSTANTS.has(ast.label)) this.referenced.add(ast.label);
    const children=ast.children.map((child,index)=>this.visit(child,numeric || (ast.kind==='binary'&&ast.label==='^'&&index===1)));
    const node: TraceNode={id:`n${this.nodes.length+1}`,kind:ast.kind,label:ast.label,span:{...ast.span},children:children.map(child=>child.node.id),dimension:null,status:'valid',rule:''};
    let dimension: Vector|null=null;
    let value: Rational|null=null;
    const fail=(code: string,message: string,invalid=true,symbol?: string)=>this.diagnostic(code,message,ast,node,invalid,symbol);
    const blocked=children.some(child=>child.node.status!=='valid');
    if (blocked) {
      node.status='blocked'; node.rule='This operation is blocked because a child expression has an error.';
    } else {
      try {
        if (ast.kind === 'number') {
          value=literal(ast.label); dimension=vector(); node.rule='A numeric literal is dimensionless.';
        } else if (ast.kind === 'symbol') {
          if (numeric) fail('EXPONENT_LITERAL','An exponent must contain numeric literals and arithmetic only; symbols and constants are not allowed.',true,CONSTANTS.has(ast.label) ? undefined : ast.label);
          else if (this.unit) {
            dimension=unitDimension(ast.label);
            if (!dimension) fail('UNKNOWN_UNIT',`Unknown unit “${ast.label}”. Use a supported SI or common scaled unit.`,true,ast.label);
            else node.rule=`The unit ${ast.label} has dimension ${formatDimension(toDimension(dimension))}.`;
          } else if (CONSTANTS.has(ast.label)) {
            dimension=vector(); node.rule=`The constant ${ast.label} is dimensionless.`;
          } else if (!this.configured.has(ast.label)) fail('UNKNOWN_SYMBOL',`Unknown symbol “${ast.label}”. Assign it a unit before analyzing.`,true,ast.label);
          else {
            dimension=this.configured.get(ast.label)!;
            if (!dimension) { node.status='error'; node.rule=`The configured unit for ${ast.label} is invalid.`; }
            else node.rule=`The assigned unit gives ${ast.label} dimension ${formatDimension(toDimension(dimension))}.`;
          }
        } else if (ast.kind === 'group') {
          dimension=children[0]!.dimension; value=children[0]!.value;
          node.rule='Parentheses preserve the enclosed expression’s dimension.';
        } else if (ast.kind === 'unary') {
          dimension=children[0]!.dimension;
          if (numeric && children[0]!.value) value=ast.label==='-' ? negate(children[0]!.value) : children[0]!.value;
          node.rule='A unary sign changes a value’s sign without changing its dimension.';
        } else if (ast.kind === 'function') {
          if (numeric) fail('EXPONENT_LITERAL','An exponent must use numeric literals and arithmetic only; function calls are not supported.');
          else if (ast.label==='sqrt') {
            dimension=scale(children[0]!.dimension!,rational(1n,2n));
            node.rule='Square root divides every dimension exponent by two.';
          } else if (!dimensionless(children[0]!.dimension!)) fail('FUNCTION_DIMENSION',`${ast.label} requires a dimensionless argument; received ${formatDimension(toDimension(children[0]!.dimension!))}.`,false);
          else { dimension=vector(); node.rule=`${ast.label} accepts a dimensionless argument and returns a dimensionless result.`; }
        } else if (numeric) {
          const left=children[0]!.value!; const right=children[1]!.value!;
          if (ast.label==='+') value=add(left,right);
          else if (ast.label==='-') value=subtract(left,right);
          else if (ast.label==='*') value=multiply(left,right);
          else if (ast.label==='/') value=divide(left,right);
          else if (ast.label==='^') value=power(left,right);
          else throw new Error('Equality cannot be used inside an exponent.');
          dimension=vector(); node.rule=`Exact literal arithmetic gives the dimensionless exponent value ${serialize(value)}.`;
        } else {
          const left=children[0]!.dimension!; const right=children[1]!.dimension!;
          if (this.unit && (ast.label==='+'||ast.label==='-')) fail('UNIT_SYNTAX','Addition and subtraction are not supported in unit expressions.');
          else if (ast.label==='+'||ast.label==='-'||ast.label==='=') {
            if (!same(left,right)) {
              const operation=ast.label==='=' ? 'Equality' : ast.label==='+' ? 'Addition' : 'Subtraction';
              fail(ast.label==='=' ? 'EQUALITY_DIMENSION' : 'ADD_DIMENSION',`${operation} requires matching dimensions; left is ${formatDimension(toDimension(left))}, right is ${formatDimension(toDimension(right))}.`,false);
            } else {
              dimension=left;
              node.rule=ast.label==='=' ? 'Both sides of the equation have matching dimensions.' : 'Addition and subtraction require matching dimensions and preserve them.';
            }
          } else if (ast.label==='*'||ast.label==='/') {
            dimension=combine(left,right,ast.label==='/');
            node.rule=ast.label==='*' ? 'Multiplication adds the corresponding dimension exponents.' : 'Division subtracts the denominator’s dimension exponents.';
          } else {
            const exponent=children[1]!.value!;
            dimension=scale(left,exponent);
            node.rule=`Raising to ${serialize(exponent)} multiplies every dimension exponent by that exact rational.`;
          }
        }
      } catch (error) {
        fail(numeric ? 'EXPONENT_ARITHMETIC' : 'ARITHMETIC_LIMIT', error instanceof Error ? error.message : 'Exact arithmetic could not be evaluated safely.');
      }
    }
    if (node.status==='valid' && dimension) node.dimension=toDimension(dimension);
    else { dimension=null; value=null; }
    this.nodes.push(node);
    return {node,dimension,value};
  }
}

/** Parse a dimension-only SI unit expression. Affine temperature units are unsupported. */
export function parseUnit(unit: string): Dimension {
  if (typeof unit!=='string') throw new Error('Unit expression must be a string.');
  if (unit.length>128) throw new Error('Unit expression exceeds the limit of 128 characters.');
  if (OFFSET_TEMPERATURE.test(unit)) throw new Error('Offset temperature units such as degC/Celsius and degF/Fahrenheit are unsupported. Use K for a temperature dimension; C means coulomb.');
  const ast=new Parser(unit,true).parse();
  const evaluator=new Evaluator(new Map(),true);
  const result=evaluator.visit(ast);
  if (!result.dimension || evaluator.diagnostics.length) {
    const first=evaluator.diagnostics[0];
    throw new Error(first ? `${first.message} (unit characters ${first.span.start+1}–${first.span.end}).` : 'Unit expression could not be evaluated.');
  }
  return toDimension(result.dimension);
}

/** Analyze only dimensional consistency, never numerical or physical correctness. */
export function analyze(formula: string, symbols: SymbolInput[]): Analysis {
  const analysis: Analysis={formula,status:'invalid',nodes:[],diagnostics:[],lhs:null,rhs:null,root:null,symbols:[]};
  const configured=new Map<string,Vector|null>();
  const configSpan: Span={start:0,end:0};
  let invalid=false;
  const configError=(code: string,message: string,symbol?: string)=>{
    invalid=true; analysis.diagnostics.push({code,message,span:{...configSpan},...(symbol ? {symbol} : {})});
  };
  if (typeof formula!=='string') {
    analysis.formula=''; configError('INPUT_TYPE','Formula must be a string.'); return analysis;
  }
  if (!Array.isArray(symbols)) configError('INPUT_TYPE','Symbols must be an array of name/unit entries.');
  else if (symbols.length>128) configError('SYMBOL_LIMIT','The symbol list exceeds the limit of 128 entries.');
  else for (const entry of symbols) {
    if (!entry || typeof entry.name!=='string' || typeof entry.unit!=='string') { configError('SYMBOL_INPUT','Every symbol entry must have string name and unit fields.'); continue; }
    const {name,unit}=entry;
    const legal=NAME_PATTERN.test(name)&&!CONSTANTS.has(name)&&!FUNCTIONS.has(name);
    if (!legal) configError('SYMBOL_NAME',`Invalid or reserved symbol name “${name.slice(0,32)}”. Use an ASCII letter followed by letters, digits, or underscores, at most 32 characters.`,name);
    if (configured.has(name)) { configError('DUPLICATE_SYMBOL',`Symbol “${name}” is configured more than once.`,name); configured.set(name,null); continue; }
    try { const dimension=fromDimension(parseUnit(unit)); if (legal) configured.set(name,dimension); }
    catch (error) { configError('INVALID_UNIT',`Invalid unit for ${name}: ${error instanceof Error ? error.message : 'unsupported unit'}`,name); if (legal) configured.set(name,null); }
  }
  let ast: Ast;
  try { ast=new Parser(formula).parse(); }
  catch (error) {
    const diagnostic=error instanceof CoreError ? {code:error.code,message:error.message,span:{...error.span}} : {code:'SYNTAX',message:'The formula could not be parsed safely.',span:{start:0,end:formula.length}};
    analysis.diagnostics.push(diagnostic); return analysis;
  }
  const evaluator=new Evaluator(configured);
  const result=evaluator.visit(ast);
  analysis.nodes=evaluator.nodes;
  analysis.diagnostics.push(...evaluator.diagnostics);
  analysis.symbols=[...evaluator.referenced];
  analysis.root=result.node.id;
  if (ast.kind==='binary'&&ast.label==='=') {
    analysis.lhs=result.node.children[0]!; analysis.rhs=result.node.children[1]!;
  }
  analysis.status=invalid||evaluator.invalid ? 'invalid' : analysis.diagnostics.length ? 'inconsistent' : 'consistent';
  return analysis;
}
