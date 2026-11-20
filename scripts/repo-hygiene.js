#!/usr/bin/env node
/**
 * Repo hygiene scan: finds files the repository probably doesn't need.
 *
 * Complements knip (which only follows JS/TS imports) with checks for:
 *   - orphaned files in public/ (pages, images, downloads nothing links to)
 *   - byte-for-byte duplicate files
 *   - large tracked files
 *   - stray/junk files (backups, editor swap files, OS metadata)
 *   - more than one package-manager lockfile in the same folder
 *
 * Report-only: it never deletes or changes anything.
 *
 * Usage:
 *   node scripts/repo-hygiene.js          # human-readable summary
 *   node scripts/repo-hygiene.js --json   # JSON (used by the weekly quality report)
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const CONFIG = {
  // Only files under this folder are checked for "nothing links to it".
  orphanRoot: 'public/',
  // Never reported as orphaned: served by convention (fetched by browsers,
  // crawlers or hosting without being linked) or kept on purpose.
  orphanAllow: [
    'public/CNAME',
    'public/robots.txt',
    'public/sitemap.xml',
    'public/llms.txt',
    'public/llms-full.txt',
    'public/manifest.json',
    'public/favicon.svg',
    'public/favicon.png',
    'public/favicon.ico',
    'public/404.html',
    'public/index.html',
    'public/sw.js',
    // Brand source SVGs and exports (see CLAUDE.md "Studio brand").
    'public/brand/',
    'public/vendor/',
  ],
  // Files whose contents don't count as a "reference": generated indexes that
  // list every file, lockfiles, and docs (a doc mention doesn't make a file used).
  referenceIgnore: [
    'pnpm-lock.yaml',
    'package-lock.json',
    'NOTEBOOK_SOURCES.md',
    'public/llms-full.txt',
    'wiki_boilerplate/',
  ],
  referenceIgnoreExtensions: ['.md'],
  // Duplicates involving these paths are expected (template copy of the site).
  duplicateIgnore: ['wiki_boilerplate/'],
  largeFileBytes: 500 * 1024,
  largeFileAllow: ['pnpm-lock.yaml', 'package-lock.json', 'wiki_boilerplate/'],
  junkPatterns: [
    /(^|\/)\.DS_Store$/,
    /(^|\/)Thumbs\.db$/,
    /(^|\/)desktop\.ini$/i,
    /\.(bak|orig|rej|tmp|swp|swo|old)$/i,
    /~$/,
    /(^|\/)[^/]* copy( \d+)?(\.[^/.]+)?$/i,
    /(^|\/)[^/]*\(\d+\)(\.[^/.]+)?$/,
    /\.log$/i,
  ],
  lockfiles: ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lockb', 'bun.lock'],
};

const TEXT_EXTENSIONS = new Set([
  '.html',
  '.htm',
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.jsx',
  '.css',
  '.json',
  '.xml',
  '.txt',
  '.yml',
  '.yaml',
  '.svg',
  '.webmanifest',
  '.toml',
  '.sh',
  '.md',
]);

const startsWithAny = (file, prefixes) =>
  prefixes.some((p) => (p.endsWith('/') ? file.startsWith(p) : file === p));

/** Names a file might be referenced by: its filename, URL-encoded filename, and (for pages) its clean URL. */
function referenceNames(file) {
  const base = path.posix.basename(file);
  const names = new Set([base, encodeURI(base), base.replace(/ /g, '+')]);
  const ext = path.posix.extname(base).toLowerCase();
  if (ext === '.html' || ext === '.htm') names.add(base.slice(0, -ext.length));
  return [...names].filter(Boolean);
}

/**
 * Pure analysis over an in-memory file list.
 * @param {{path: string, size: number, content: Buffer | null}[]} files
 */
function analyze(files, config = CONFIG) {
  const isText = (f) =>
    f.content !== null && TEXT_EXTENSIONS.has(path.posix.extname(f.path).toLowerCase());

  // Orphans
  const referenceSources = files
    .filter(isText)
    .filter((f) => !startsWithAny(f.path, config.referenceIgnore))
    .filter(
      (f) => !config.referenceIgnoreExtensions.includes(path.posix.extname(f.path).toLowerCase())
    )
    .map((f) => ({ path: f.path, text: f.content.toString('utf8') }));

  const orphans = files
    .filter((f) => f.path.startsWith(config.orphanRoot))
    .filter((f) => !startsWithAny(f.path, config.orphanAllow))
    .filter((f) => {
      const names = referenceNames(f.path);
      return !referenceSources.some(
        (src) => src.path !== f.path && names.some((n) => src.text.includes(n))
      );
    })
    .map((f) => ({ path: f.path, size: f.size }));

  // Duplicates
  const byHash = new Map();
  for (const f of files) {
    if (f.content === null || f.size === 0 || startsWithAny(f.path, config.duplicateIgnore))
      continue;
    const hash = crypto.createHash('sha256').update(f.content).digest('hex');
    if (!byHash.has(hash)) byHash.set(hash, []);
    byHash.get(hash).push(f);
  }
  const duplicates = [...byHash.values()]
    .filter((group) => group.length > 1)
    .map((group) => ({ size: group[0].size, paths: group.map((f) => f.path).sort() }))
    .sort((a, b) => b.size * b.paths.length - a.size * a.paths.length);

  // Large files
  const largeFiles = files
    .filter((f) => f.size >= config.largeFileBytes && !startsWithAny(f.path, config.largeFileAllow))
    .map((f) => ({ path: f.path, size: f.size }))
    .sort((a, b) => b.size - a.size);

  // Junk
  const junkFiles = files
    .filter((f) => config.junkPatterns.some((re) => re.test(f.path)))
    .map((f) => ({ path: f.path, size: f.size }));

  // Lockfile conflicts
  const locksByDir = new Map();
  for (const f of files) {
    const base = path.posix.basename(f.path);
    if (!config.lockfiles.includes(base)) continue;
    const dir = path.posix.dirname(f.path);
    if (!locksByDir.has(dir)) locksByDir.set(dir, []);
    locksByDir.get(dir).push(base);
  }
  const lockfileConflicts = [...locksByDir.entries()]
    .filter(([, locks]) => locks.length > 1)
    .map(([dir, locks]) => ({ dir, lockfiles: locks.sort() }));

  return {
    scannedFiles: files.length,
    orphans,
    duplicates,
    largeFiles,
    junkFiles,
    lockfileConflicts,
    totalFindings:
      orphans.length +
      duplicates.length +
      largeFiles.length +
      junkFiles.length +
      lockfileConflicts.length,
  };
}

/** Reads every git-tracked file from the working tree. */
function loadTrackedFiles(root) {
  const out = execFileSync('git', ['ls-files', '-z'], { cwd: root, maxBuffer: 64 * 1024 * 1024 });
  return out
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .map((p) => {
      const abs = path.join(root, p);
      try {
        const stat = fs.statSync(abs);
        if (!stat.isFile()) return null;
        return { path: p, size: stat.size, content: fs.readFileSync(abs) };
      } catch {
        return null; // deleted in the working tree but still in the index
      }
    })
    .filter(Boolean);
}

const formatBytes = (n) =>
  n >= 1024 * 1024
    ? `${(n / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(n / 1024))} KB`;

function formatText(result) {
  const lines = [
    `Scanned ${result.scannedFiles} tracked files; ${result.totalFindings} finding(s).`,
  ];
  const section = (title, items, fmt) => {
    lines.push('', `${title}: ${items.length}`);
    for (const item of items) lines.push(`  - ${fmt(item)}`);
  };
  section('Orphaned files in public/', result.orphans, (o) => `${o.path} (${formatBytes(o.size)})`);
  section(
    'Duplicate files',
    result.duplicates,
    (d) => `${d.paths.join(' = ')} (${formatBytes(d.size)} each)`
  );
  section('Large files', result.largeFiles, (f) => `${f.path} (${formatBytes(f.size)})`);
  section('Junk files', result.junkFiles, (f) => f.path);
  section(
    'Multiple lockfiles',
    result.lockfileConflicts,
    (c) => `${c.dir === '.' ? '(repo root)' : `${c.dir}/`}: ${c.lockfiles.join(', ')}`
  );
  return lines.join('\n');
}

if (require.main === module) {
  const root = path.join(__dirname, '..');
  const result = analyze(loadTrackedFiles(root));
  process.stdout.write(
    process.argv.includes('--json')
      ? `${JSON.stringify(result, null, 2)}\n`
      : `${formatText(result)}\n`
  );
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { analyze, referenceNames, formatText, formatBytes, CONFIG };
}
