const { analyze, referenceNames, CONFIG } = require('./scripts/repo-hygiene.js');

const file = (p, text = '') => ({
  path: p,
  size: Buffer.byteLength(text),
  content: Buffer.from(text),
});

describe('repo-hygiene', () => {
  it('builds clean-URL and encoded reference names', () => {
    expect(referenceNames('public/nova-log.html')).toEqual(
      expect.arrayContaining(['nova-log.html', 'nova-log'])
    );
    expect(referenceNames('public/My File.txt')).toEqual(
      expect.arrayContaining(['My File.txt', 'My%20File.txt'])
    );
  });

  it('flags public files nothing links to, but not linked, allowlisted or doc-only-ignored ones', () => {
    const result = analyze([
      file('public/linked.html', '<a href="/clean-url">x</a>'),
      file('public/clean-url.html', 'page'),
      file('public/orphan.png', 'png-bytes'),
      file('public/doc-only.pdf', 'pdf-bytes'),
      file('README.md', 'See public/doc-only.pdf'),
      file('public/robots.txt', 'User-agent: *'),
      file('server.ts', "res.sendFile('linked.html')"),
    ]);
    const orphanPaths = result.orphans.map((o) => o.path);
    expect(orphanPaths).toEqual(
      expect.arrayContaining(['public/orphan.png', 'public/doc-only.pdf'])
    );
    expect(orphanPaths).not.toContain('public/linked.html');
    expect(orphanPaths).not.toContain('public/clean-url.html');
    expect(orphanPaths).not.toContain('public/robots.txt');
  });

  it('groups identical files, ignoring the wiki boilerplate copy', () => {
    const result = analyze([
      file('a.css', 'body{}'),
      file('b.css', 'body{}'),
      file('wiki_boilerplate/a.css', 'body{}'),
      file('c.css', 'p{}'),
    ]);
    expect(result.duplicates).toEqual([{ size: 6, paths: ['a.css', 'b.css'] }]);
  });

  it('reports large, junk and conflicting-lockfile files', () => {
    const big = { path: 'public/huge.mp4', size: CONFIG.largeFileBytes + 1, content: null };
    const result = analyze([
      big,
      file('notes.txt.bak', 'x'),
      file('public/.DS_Store', 'x'),
      file('logo copy.svg', '<svg/>'),
      file('pnpm-lock.yaml', 'a'),
      file('package-lock.json', 'b'),
    ]);
    expect(result.largeFiles.map((f) => f.path)).toEqual(['public/huge.mp4']);
    expect(result.junkFiles.map((f) => f.path).sort()).toEqual(
      ['logo copy.svg', 'notes.txt.bak', 'public/.DS_Store'].sort()
    );
    expect(result.lockfileConflicts).toEqual([
      { dir: '.', lockfiles: ['package-lock.json', 'pnpm-lock.yaml'] },
    ]);
  });
});
