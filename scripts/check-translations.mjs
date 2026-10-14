import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const localesDir = path.resolve('src/i18n/locales');
const localeFiles = fs
  .readdirSync(localesDir)
  .filter((file) => file.endsWith('.ts'))
  .sort((left, right) => {
    if (left === 'en.ts') return -1;
    if (right === 'en.ts') return 1;
    return left.localeCompare(right);
  });
const placeholderPattern = /\{[a-zA-Z0-9_]+\}/g;
const extraPluralForms = /\.(zero|two|few|many)$/;
// Plural forms a language must provide on top of one/other.
const requiredPluralForms = new Map([['ru.ts', ['few', 'many']]]);
// No typographic dashes or curly quotes in UI text. CJK corner brackets and
// full-width punctuation are fine.
const bannedCharacters = new Map([
  ['–', 'en dash'],
  ['—', 'em dash'],
  ['‘', 'curly quote'],
  ['’', 'curly quote'],
  ['“', 'curly quote'],
  ['”', 'curly quote'],
  ['„', 'curly quote'],
]);
const errors = [];

const placeholders = (value) =>
  [...value.matchAll(placeholderPattern)]
    .map((match) => match[0])
    .sort()
    .join('|');

function readLocale(file) {
  const source = fs.readFileSync(path.join(localesDir, file), 'utf8');
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const values = new Map();
  const visit = (node) => {
    if (ts.isPropertyAssignment(node) && ts.isStringLiteralLike(node.name) && ts.isStringLiteralLike(node.initializer)) {
      if (values.has(node.name.text)) errors.push(`${file}: duplicate ${node.name.text}`);
      values.set(node.name.text, node.initializer.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return values;
}

const dictionaries = Object.fromEntries(localeFiles.map((file) => [file, readLocale(file)]));
const english = dictionaries['en.ts'];

// Plural keys are stored as <base>.one and <base>.other.
const pluralBases = new Set();
for (const key of english.keys()) {
  const match = key.match(/^(.+)\.(one|other)$/);
  if (!match) continue;
  if (english.has(`${match[1]}.one`) && english.has(`${match[1]}.other`)) pluralBases.add(match[1]);
  else errors.push(`en.ts: ${key} needs both ${match[1]}.one and ${match[1]}.other`);
}

// Scan the source for translation calls and for every string that can be a key.
const sourceLiterals = new Set();
const dynamicKeyPatterns = [];
const keyLike = /^[a-z_][a-z0-9_.-]*\.[a-z0-9_.-]*$/i;
const escapePattern = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function sourceFilesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return fullPath === localesDir ? [] : sourceFilesIn(fullPath);
    return entry.isFile() && fullPath.endsWith('.ts') ? [fullPath] : [];
  });
}

function calledFunctionName(expression) {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  return undefined;
}

// Literal keys passed directly, including both sides of `a ? 'x' : 'y'`.
function literalChoices(node) {
  if (ts.isStringLiteralLike(node)) return [node.text];
  if (ts.isParenthesizedExpression(node)) return literalChoices(node.expression);
  if (ts.isConditionalExpression(node)) return [...literalChoices(node.whenTrue), ...literalChoices(node.whenFalse)];
  return [];
}

const isConcatenation = (node) =>
  ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken;

// 'prefix.' + value + '.suffix' -> ['prefix.', null, '.suffix']
function concatenationParts(node) {
  if (isConcatenation(node)) return [...concatenationParts(node.left), ...concatenationParts(node.right)];
  if (ts.isParenthesizedExpression(node)) return concatenationParts(node.expression);
  return [ts.isStringLiteralLike(node) ? node.text : null];
}

const translationCalls = new Map([
  ['_t', { keyIndex: 0, plural: false }],
  ['_tp', { keyIndex: 0, plural: true }],
  ['ddLocalize', { keyIndex: 1, plural: false }],
  ['ddLocalizePlural', { keyIndex: 1, plural: true }],
]);

for (const file of sourceFilesIn(path.resolve('src'))) {
  const source = fs.readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const visit = (node) => {
    if (ts.isStringLiteralLike(node)) sourceLiterals.add(node.text);
    if (ts.isTemplateExpression(node) && keyLike.test(node.head.text)) {
      // `settings.area_order_${mode}_description` -> /^settings\.area_order_.*_description$/
      const parts = [node.head.text, ...node.templateSpans.map((span) => span.literal.text)];
      dynamicKeyPatterns.push(new RegExp(`^${parts.map(escapePattern).join('.*')}$`));
    }
    if (isConcatenation(node) && !isConcatenation(node.parent)) {
      const parts = concatenationParts(node);
      if (typeof parts[0] === 'string' && keyLike.test(parts[0])) {
        if (parts.includes(null)) {
          dynamicKeyPatterns.push(new RegExp(`^${parts.map((part) => (part === null ? '.*' : escapePattern(part))).join('')}$`));
        } else {
          sourceLiterals.add(parts.join(''));
        }
      }
    }
    if (ts.isCallExpression(node)) {
      const call = translationCalls.get(calledFunctionName(node.expression));
      const argument = call ? node.arguments[call.keyIndex] : undefined;
      for (const key of argument ? literalChoices(argument) : []) {
        if (call.plural ? pluralBases.has(key) : english.has(key)) continue;
        const position = sourceFile.getLineAndCharacterOfPosition(argument.getStart(sourceFile));
        errors.push(`${path.relative(process.cwd(), file)}:${position.line + 1}: unknown translation key ${key}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

for (const key of english.keys()) {
  const base = key.replace(/\.(one|other)$/, '');
  const used =
    sourceLiterals.has(key) ||
    sourceLiterals.has(base) ||
    dynamicKeyPatterns.some((pattern) => pattern.test(key) || pattern.test(base));
  if (!used) errors.push(`en.ts: unused translation key ${key}`);
}

for (const file of localeFiles) {
  const dictionary = dictionaries[file];
  for (const [key, value] of english) {
    if (!dictionary.has(key)) {
      errors.push(`${file}: missing ${key}`);
      continue;
    }
    if (!dictionary.get(key).trim()) errors.push(`${file}: empty ${key}`);
    if (placeholders(value) !== placeholders(dictionary.get(key))) errors.push(`${file}: placeholders differ for ${key}`);
  }

  for (const key of dictionary.keys()) {
    if (english.has(key)) continue;
    // Languages may add extra plural forms (few, many, ...) for plural keys.
    const base = key.replace(extraPluralForms, '');
    if (base === key || !pluralBases.has(base)) {
      errors.push(`${file}: unknown ${key}`);
      continue;
    }
    if (!dictionary.get(key).trim()) errors.push(`${file}: empty ${key}`);
    if (placeholders(english.get(`${base}.other`)) !== placeholders(dictionary.get(key))) {
      errors.push(`${file}: placeholders differ for ${key}`);
    }
  }

  for (const form of requiredPluralForms.get(file) || []) {
    for (const base of pluralBases) {
      if (!dictionary.has(`${base}.${form}`)) errors.push(`${file}: missing ${base}.${form}`);
    }
  }

  for (const [key, value] of dictionary) {
    for (const [character, name] of bannedCharacters) {
      if (value.includes(character)) {
        const code = character.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
        errors.push(`${file}: ${name} (U+${code}) in ${key}`);
      }
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`${localeFiles.length} locales complete (${english.size} keys each, ${pluralBases.size} plural keys).`);
