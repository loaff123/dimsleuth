/** Order: length, mass, time, electric current, temperature, amount, luminous intensity. */
export type Dimension = [string, string, string, string, string, string, string];
export interface Span { start: number; end: number }
export interface SymbolInput { name: string; unit: string }
export interface Diagnostic { code: string; message: string; span: Span; nodeId?: string; symbol?: string }
export interface TraceNode { id: string; kind: 'number'|'symbol'|'unary'|'binary'|'function'|'group'; label: string; span: Span; children: string[]; dimension: Dimension|null; status: 'valid'|'error'|'blocked'; rule: string }
export interface Analysis { formula: string; status: 'consistent'|'inconsistent'|'invalid'; nodes: TraceNode[]; diagnostics: Diagnostic[]; lhs: string|null; rhs: string|null; root: string|null; symbols: string[] }
export interface Project { schemaVersion: 1; title: string; formula: string; symbols: SymbolInput[] }
export interface Preset { id: string; title: string; titleZh: string; description: string; descriptionZh: string; project: Project; repair?: string }
