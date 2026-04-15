/**
 * FreeLang v9 — Main Entry Point
 * AI-Native Programming Language
 *
 * Usage:
 *   import { Interpreter, lex, parse } from 'freelang-v9';
 *   const interpreter = new Interpreter();
 *   const result = interpreter.run('(+ 1 2)');
 */

// Core Language
export { Interpreter } from './interpreter';
export { lex } from './lexer';
export { parse } from './parser';
export { ASTNode, Block, Literal, Variable, SExpr } from './ast';

// Execution Context & Types
export type {
  ExecutionContext,
  FreeLangFunction,
  FreeLangRoute,
  Intent,
  FreeLangMiddleware,
  ErrorHandler,
  TypeClassInfo,
  TypeClassInstanceInfo,
  ModuleInfo,
} from './interpreter-context';

// Scope Management
export { ScopeStack } from './interpreter-scope';

// Async Runtime
export { FreeLangPromise, resolvedPromise, rejectedPromise } from './async-runtime';
export type { PromiseState } from './async-runtime';

// Error Handling
export {
  ModuleError,
  ModuleNotFoundError,
  SelectiveImportError,
  InvalidModuleStructureError,
  FunctionRegistrationError,
  FunctionNotFoundError,
} from './errors';
export { suggestSimilar, formatError } from './error-formatter';

// Logger
export { Logger, StructuredLogger, getGlobalLogger } from './logger';

// Package version
export const VERSION = '9.3.0';
export const NAME = 'FreeLang v9';
export const DESCRIPTION = 'AI-Native Programming Language';

/**
 * Quick start helper
 */
export function quickRun(source: string, logger?: any): any {
  const { Interpreter } = require('./interpreter');
  const interpreter = new Interpreter(logger);
  return interpreter.run(source);
}
