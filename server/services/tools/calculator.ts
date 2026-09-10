import { ToolDefinition, ToolExecutionResult } from './types.js';

/**
 * Safe Mathematical Expression Evaluator
 * Strictly rejects arbitrary code, eval(), and non-mathematical tokens.
 */
function evaluateSafeMath(expression: string): number {
  // Normalize symbols: convert unicode multiplication/division
  let expr = expression
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/\^/g, '**')
    .replace(/,/g, '')
    .trim();

  // Allowed tokens: numbers, decimals, standard operators, parentheses, Math functions and constants
  // Whitelist characters
  const validCharsPattern = /^[0-9+\-*/%().\s*^eEa-zA-Z_]+$/;
  if (!validCharsPattern.test(expr)) {
    throw new Error('Expression contains forbidden characters.');
  }

  // Whitelist safe function names
  const allowedMathTokens = new Set([
    'sqrt',
    'cbrt',
    'abs',
    'round',
    'floor',
    'ceil',
    'sin',
    'cos',
    'tan',
    'asin',
    'acos',
    'atan',
    'log',
    'log10',
    'log2',
    'exp',
    'pow',
    'pi',
    'e',
  ]);

  // Tokenize words
  const words = expr.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
  for (const word of words) {
    const lower = word.toLowerCase();
    if (!allowedMathTokens.has(lower)) {
      throw new Error(`Forbidden function or identifier: "${word}". Only safe mathematical functions are allowed.`);
    }
  }

  // Tokenizer and Recursive Descent Parser
  type Token =
    | { type: 'NUMBER'; value: number }
    | { type: 'OP'; value: string }
    | { type: 'LPAREN' }
    | { type: 'RPAREN' }
    | { type: 'COMMA' }
    | { type: 'FUNC'; name: string };

  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(expr[i + 1] || ''))) {
      let numStr = '';
      while (i < expr.length && /[0-9.eE]/.test(expr[i])) {
        // Handle scientific notation e.g. 1e5
        if ((expr[i] === 'e' || expr[i] === 'E') && (expr[i + 1] === '+' || expr[i + 1] === '-')) {
          numStr += expr[i] + expr[i + 1];
          i += 2;
          continue;
        }
        numStr += expr[i];
        i++;
      }
      const val = parseFloat(numStr);
      if (isNaN(val)) throw new Error(`Invalid number: ${numStr}`);
      tokens.push({ type: 'NUMBER', value: val });
      continue;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      let word = '';
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) {
        word += expr[i];
        i++;
      }
      const lower = word.toLowerCase();
      if (lower === 'pi') {
        tokens.push({ type: 'NUMBER', value: Math.PI });
      } else if (lower === 'e') {
        tokens.push({ type: 'NUMBER', value: Math.E });
      } else if (allowedMathTokens.has(lower)) {
        tokens.push({ type: 'FUNC', name: lower });
      } else {
        throw new Error(`Unsupported identifier: ${word}`);
      }
      continue;
    }

    if (ch === '(') {
      tokens.push({ type: 'LPAREN' });
      i++;
      continue;
    }

    if (ch === ')') {
      tokens.push({ type: 'RPAREN' });
      i++;
      continue;
    }

    if (ch === ',') {
      tokens.push({ type: 'COMMA' });
      i++;
      continue;
    }

    if (ch === '*' && expr[i + 1] === '*') {
      tokens.push({ type: 'OP', value: '**' });
      i += 2;
      continue;
    }

    if ('+-*/%'.includes(ch)) {
      tokens.push({ type: 'OP', value: ch });
      i++;
      continue;
    }

    throw new Error(`Unexpected character: "${ch}"`);
  }

  // Parser
  let pos = 0;

  function peek(): Token | undefined {
    return tokens[pos];
  }

  function consume(expectedType?: string, expectedValue?: string): Token {
    const token = tokens[pos];
    if (!token) throw new Error('Unexpected end of expression');
    if (expectedType && token.type !== expectedType) {
      throw new Error(`Expected token type ${expectedType}, found ${token.type}`);
    }
    if (expectedValue && 'value' in token && token.value !== expectedValue) {
      throw new Error(`Expected ${expectedValue}, found ${token.value}`);
    }
    pos++;
    return token;
  }

  // Grammar:
  // Expr = AddSub
  // AddSub = MulDiv (( '+' | '-' ) MulDiv)*
  // MulDiv = Power (( '*' | '/' | '%' ) Power)*
  // Power = Unary ( '**' Power )?
  // Unary = ( '+' | '-' ) Unary | Primary
  // Primary = NUMBER | FUNC '(' Expr (',' Expr)* ')' | '(' Expr ')'

  function parseExpr(): number {
    return parseAddSub();
  }

  function parseAddSub(): number {
    let left = parseMulDiv();
    while (peek() && peek()?.type === 'OP' && ('+-'.includes((peek() as any).value))) {
      const op = (consume('OP') as any).value;
      const right = parseMulDiv();
      if (op === '+') left += right;
      else if (op === '-') left -= right;
    }
    return left;
  }

  function parseMulDiv(): number {
    let left = parsePower();
    while (peek() && peek()?.type === 'OP' && ('*/%'.includes((peek() as any).value))) {
      const op = (consume('OP') as any).value;
      const right = parsePower();
      if (op === '*') left *= right;
      else if (op === '/') {
        if (right === 0) throw new Error('Division by zero.');
        left /= right;
      } else if (op === '%') {
        if (right === 0) throw new Error('Modulo by zero.');
        left %= right;
      }
    }
    return left;
  }

  function parsePower(): number {
    const base = parseUnary();
    if (peek() && peek()?.type === 'OP' && (peek() as any).value === '**') {
      consume('OP', '**');
      const exponent = parsePower(); // right-associative
      return Math.pow(base, exponent);
    }
    return base;
  }

  function parseUnary(): number {
    if (peek() && peek()?.type === 'OP') {
      const op = (peek() as any).value;
      if (op === '+') {
        consume('OP', '+');
        return parseUnary();
      }
      if (op === '-') {
        consume('OP', '-');
        return -parseUnary();
      }
    }
    return parsePrimary();
  }

  function parsePrimary(): number {
    const t = peek();
    if (!t) throw new Error('Unexpected end of expression');

    if (t.type === 'NUMBER') {
      consume('NUMBER');
      return t.value;
    }

    if (t.type === 'FUNC') {
      const funcToken = consume('FUNC') as { type: 'FUNC'; name: string };
      consume('LPAREN');
      const args: number[] = [];
      if (peek() && peek()?.type !== 'RPAREN') {
        args.push(parseExpr());
        while (peek() && peek()?.type === 'COMMA') {
          consume('COMMA');
          args.push(parseExpr());
        }
      }
      consume('RPAREN');

      switch (funcToken.name) {
        case 'sqrt':
          if (args[0] < 0) throw new Error('Cannot calculate square root of a negative number.');
          return Math.sqrt(args[0]);
        case 'cbrt':
          return Math.cbrt(args[0]);
        case 'abs':
          return Math.abs(args[0]);
        case 'round':
          return Math.round(args[0]);
        case 'floor':
          return Math.floor(args[0]);
        case 'ceil':
          return Math.ceil(args[0]);
        case 'sin':
          return Math.sin(args[0]);
        case 'cos':
          return Math.cos(args[0]);
        case 'tan':
          return Math.tan(args[0]);
        case 'asin':
          return Math.asin(args[0]);
        case 'acos':
          return Math.acos(args[0]);
        case 'atan':
          return Math.atan(args[0]);
        case 'log':
          if (args[0] <= 0) throw new Error('Logarithm input must be greater than zero.');
          return Math.log(args[0]);
        case 'log10':
          if (args[0] <= 0) throw new Error('Logarithm input must be greater than zero.');
          return Math.log10(args[0]);
        case 'log2':
          if (args[0] <= 0) throw new Error('Logarithm input must be greater than zero.');
          return Math.log2(args[0]);
        case 'exp':
          return Math.exp(args[0]);
        case 'pow':
          return Math.pow(args[0], args[1] ?? 1);
        default:
          throw new Error(`Unsupported function: ${funcToken.name}`);
      }
    }

    if (t.type === 'LPAREN') {
      consume('LPAREN');
      const res = parseExpr();
      consume('RPAREN');
      return res;
    }

    throw new Error(`Unexpected token: ${JSON.stringify(t)}`);
  }

  const result = parseExpr();
  if (pos < tokens.length) {
    throw new Error(`Unexpected extra token after expression: ${JSON.stringify(tokens[pos])}`);
  }

  if (!isFinite(result)) {
    throw new Error('Mathematical result is non-finite (infinite or NaN).');
  }

  return result;
}

export const calculatorTool: ToolDefinition = {
  name: 'calculator',
  displayName: 'Calculator',
  description: 'Evaluates mathematical calculations and expressions safely without arbitrary code execution.',
  requiredPermission: 'NONE',
  risk: 'LOW',
  category: 'utility',
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'Mathematical expression to evaluate, e.g. "125 * 48", "sqrt(144) + 10", "2^8"',
      },
    },
    required: ['expression'],
  },
  execute: (args): ToolExecutionResult => {
    const expr = String(args.expression || '').trim();
    if (!expr) {
      return {
        success: false,
        error: 'Missing required "expression" parameter.',
        displaySummary: 'Calculator error: No expression provided',
      };
    }

    try {
      const val = evaluateSafeMath(expr);
      // Format clean output (avoid floating point noise e.g. 0.0000000000000004)
      const rounded = Number.isInteger(val) ? val : Math.abs(val) < 1e12 ? Number(val.toFixed(8)) : val;
      return {
        success: true,
        result: rounded,
        displaySummary: `${expr} = ${rounded}`,
        sanitizedExecutionSummary: expr,
        sanitizedResultSummary: String(rounded),
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Calculation failed: ${err.message}`,
        displaySummary: `Calculator error: ${err.message}`,
        sanitizedExecutionSummary: expr,
        sanitizedResultSummary: `Error: ${err.message}`,
      };
    }
  },
};
