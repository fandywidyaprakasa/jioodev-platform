#!/usr/bin/env node
/**
 * Dependency boundary checker for the JiooDev modular monolith.
 *
 * Enforced rules:
 * 1. shared/** must not import domain modules or app code.
 * 2. A module may only be imported through its public entries:
 *      @/modules/<module>          (server public API, index.ts)
 *      @/modules/<module>/client   (client/UI public API)
 *    Internal files are private.
 * 3. app/** and middleware.ts may only use a module's public entries.
 * 4. Domain modules must not import src/app (HTTP adapters).
 * 5. No runtime circular dependencies across src/**.
 *
 * Run with: pnpm check:boundaries
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const srcRoot = path.join(root, "src");
const extensions = [".ts", ".tsx", ".mts", ".js", ".jsx"];

const violations = [];
const graph = new Map();

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (extensions.includes(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function resolveFile(base) {
  const candidates = [base, ...extensions.map((ext) => `${base}${ext}`)];
  for (const candidate of candidates) {
    try {
      if (fs.statSync(candidate).isFile()) return candidate;
    } catch {
      // keep looking
    }
  }
  for (const ext of extensions) {
    const candidate = path.join(base, `index${ext}`);
    try {
      if (fs.statSync(candidate).isFile()) return candidate;
    } catch {
      // keep looking
    }
  }
  return null;
}

function resolveSpecifier(fromFile, specifier) {
  if (specifier.startsWith("@/")) {
    return resolveFile(path.join(srcRoot, specifier.slice(2)));
  }
  if (specifier.startsWith(".")) {
    return resolveFile(path.resolve(path.dirname(fromFile), specifier));
  }
  return null;
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function isTypeOnlyStatement(statement) {
  if (/^(?:import|export)\s+type\b/.test(statement)) return true;
  const named = statement.match(
    /^(?:import|export)\s+(?:[^"{]+\s+)?\{([\s\S]*?)\}\s+from/,
  );
  if (named) {
    const names = named[1]
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
    return names.length > 0 && names.every((name) => name.startsWith("type "));
  }
  return false;
}

function importsOf(file) {
  const source = fs.readFileSync(file, "utf8");
  const found = [];
  const patterns = [
    /import\s+(?:type\s+)?[\s\S]*?\sfrom\s+["']([^"']+)["']/g,
    /import\s+["']([^"']+)["']/g,
    /import\(\s*["']([^"']+)["']\s*\)/g,
    /export\s+(?:type\s+)?[\s\S]*?\sfrom\s+["']([^"']+)["']/g,
  ];
  const statements = [
    ...source.matchAll(
      /(?:import|export)\s+[\s\S]*?\sfrom\s+["'][^"']+["']/g,
    ),
  ].map((match) => match[0]);
  const typeOnlyBySpecifier = new Map();
  for (const statement of statements) {
    const specifier = statement.match(/from\s+["']([^"']+)["']/)?.[1];
    if (specifier) {
      typeOnlyBySpecifier.set(specifier, isTypeOnlyStatement(statement));
    }
  }
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1];
      found.push({
        specifier,
        typeOnly: typeOnlyBySpecifier.get(specifier) ?? false,
      });
    }
  }
  return found;
}

function classify(file) {
  const rel = relative(file);
  if (rel.startsWith("src/shared/")) return { kind: "shared" };
  if (rel.startsWith("src/modules/")) {
    const parts = rel.split("/");
    return { kind: "module", name: parts[2] };
  }
  if (rel.startsWith("src/app/") || rel === "src/middleware.ts") {
    return { kind: "app" };
  }
  return { kind: "other" };
}

function publicModuleImport(specifier) {
  const match = specifier.match(/^@\/modules\/([a-z0-9-]+)(?:\/(.*))?$/);
  if (!match) return null;
  return { module: match[1], entry: match[2] || "index" };
}

function isPublicEntry(entry) {
  return entry === "index" || entry === "client";
}

const files = walk(srcRoot);
for (const file of files) {
  graph.set(file, []);
}

for (const file of files) {
  const from = classify(file);
  const edges = graph.get(file);
  for (const { specifier, typeOnly } of importsOf(file)) {
    const target = resolveSpecifier(file, specifier);
    if (target) {
      edges.push({ target, typeOnly, specifier });
    }

    if (from.kind === "shared") {
      if (target && classify(target).kind === "module") {
        violations.push({
          file,
          rule: "shared-imports-module",
          message: `shared must not import a domain module (${specifier}).`,
        });
      }
      if (target && classify(target).kind === "app") {
        violations.push({
          file,
          rule: "shared-imports-app",
          message: `shared must not import app code (${specifier}).`,
        });
      }
    }

    if (from.kind === "module" && target) {
      const to = classify(target);
      if (to.kind === "app") {
        violations.push({
          file,
          rule: "module-imports-app",
          message: `module "${from.name}" must not import app code (${specifier}).`,
        });
      }
      if (to.kind === "module" && to.name !== from.name) {
        const parsed = publicModuleImport(specifier);
        if (!parsed || !isPublicEntry(parsed.entry)) {
          violations.push({
            file,
            rule: "module-private-import",
            message: `module "${from.name}" must import "${to.name}" through @/modules/${to.name} or @/modules/${to.name}/client (${specifier}).`,
          });
        }
      }
    }

    if (from.kind === "app" && target && classify(target).kind === "module") {
      const parsed = publicModuleImport(specifier);
      if (!parsed || !isPublicEntry(parsed.entry)) {
        violations.push({
          file,
          rule: "app-private-import",
          message: `app code must import modules through @/modules/<module> or @/modules/<module>/client (${specifier}).`,
        });
      }
    }
  }
}

const visiting = new Set();
const visited = new Set();
const stack = [];

function walkCycles(file) {
  if (visited.has(file)) return;
  visiting.add(file);
  stack.push(file);
  for (const edge of graph.get(file) ?? []) {
    if (edge.typeOnly) continue;
    if (visiting.has(edge.target)) {
      const start = stack.indexOf(edge.target);
      const cycle = [...stack.slice(start), edge.target].map(relative);
      violations.push({
        file,
        rule: "circular-dependency",
        message: `circular dependency: ${cycle.join(" -> ")}`,
      });
      continue;
    }
    walkCycles(edge.target);
  }
  stack.pop();
  visiting.delete(file);
  visited.add(file);
}

for (const file of files) walkCycles(file);

if (violations.length) {
  const unique = new Map();
  for (const violation of violations) {
    const key = `${violation.file}|${violation.rule}|${violation.message}`;
    unique.set(key, violation);
  }
  console.error(`Boundary check failed with ${unique.size} violation(s):\n`);
  for (const violation of unique.values()) {
    console.error(`- [${violation.rule}] ${relative(violation.file)}`);
    console.error(`  ${violation.message}`);
  }
  process.exit(1);
}

console.log(`Boundary check passed (${files.length} files scanned).`);
