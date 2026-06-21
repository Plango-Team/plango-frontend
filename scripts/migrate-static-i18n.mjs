import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  parseTemplate,
  TmplAstRecursiveVisitor,
  visitAll,
} from '@angular/compiler';

const root = process.cwd();
const appRoot = path.join(root, 'src', 'app');
const dictionaryPath = path.join(root, 'scripts', 'static-i18n-dictionary.json');
const arPath = path.join(root, 'public', 'i18n', 'ar.json');
const enPath = path.join(root, 'public', 'i18n', 'en.json');
const dictionary = JSON.parse(fs.readFileSync(dictionaryPath, 'utf8'));
const arCatalog = JSON.parse(fs.readFileSync(arPath, 'utf8'));
const enCatalog = JSON.parse(fs.readFileSync(enPath, 'utf8'));

arCatalog.legacy ??= {};
enCatalog.legacy ??= {};

const keyFor = (value) =>
  createHash('sha1').update(value, 'utf8').digest('hex').slice(0, 12);

for (const [arabic, english] of Object.entries(dictionary)) {
  const key = keyFor(arabic);
  arCatalog.legacy[key] = arabic;
  enCatalog.legacy[key] = english;
}

const htmlFiles = [];
const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    if (entry.isFile() && entry.name.endsWith('.html')) htmlFiles.push(fullPath);
  }
};
walk(appRoot);

const changedTemplates = [];

for (const file of htmlFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const parsed = parseTemplate(source, file, { preserveWhitespaces: true });
  const replacements = [];

  class Visitor extends TmplAstRecursiveVisitor {
    visitText(node) {
      const phrase = node.value.replace(/\s+/g, ' ').trim();
      if (!dictionary[phrase]) return;

      const start = node.sourceSpan.start.offset;
      const end = node.sourceSpan.end.offset;
      const original = source.slice(start, end);
      const phraseStart = original.indexOf(phrase);
      if (phraseStart < 0) return;

      const key = keyFor(phrase);
      replacements.push({
        start: start + phraseStart,
        end: start + phraseStart + phrase.length,
        value: `{{ 'legacy.${key}' | translate }}`,
      });
    }

    visitTextAttribute(node) {
      const phrase = node.value.replace(/\s+/g, ' ').trim();
      if (!dictionary[phrase] || !node.valueSpan) return;

      const key = keyFor(phrase);
      replacements.push({
        start: node.sourceSpan.start.offset,
        end: node.sourceSpan.end.offset,
        value: `[${node.name}]="'legacy.${key}' | translate"`,
      });
    }
  }

  visitAll(new Visitor(), parsed.nodes);
  if (!replacements.length) continue;

  let updated = source;
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    updated =
      updated.slice(0, replacement.start) +
      replacement.value +
      updated.slice(replacement.end);
  }

  fs.writeFileSync(file, updated);
  changedTemplates.push(file);
}

const componentFiles = new Set(
  changedTemplates
    .map((file) => file.replace(/\.html$/, '.ts'))
    .filter((file) => fs.existsSync(file)),
);

for (const file of componentFiles) {
  let source = fs.readFileSync(file, 'utf8');
  if (source.includes("from '@ngx-translate/core'")) continue;

  source = `import { TranslatePipe } from '@ngx-translate/core';\n${source}`;
  source = source.replace(
    /imports:\s*\[([\s\S]*?)\]/,
    (match, imports) =>
      imports.includes('TranslatePipe')
        ? match
        : `imports: [TranslatePipe${imports.trim() ? `, ${imports.trim()}` : ''}]`,
  );
  fs.writeFileSync(file, source);
}

fs.writeFileSync(arPath, `${JSON.stringify(arCatalog, null, 2)}\n`);
fs.writeFileSync(enPath, `${JSON.stringify(enCatalog, null, 2)}\n`);
console.log(`Migrated ${changedTemplates.length} templates.`);
