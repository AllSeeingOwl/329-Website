/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import {
  htmlToPlainText,
  generateNotebookSourcesContent,
  writeGeneratedFiles,
} from '../scripts/generate-notebook-sources';

// Import app after setting env vars
process.env.AUTH_PASSWORD = 'test_password_123';
process.env.ADMIN_PASSWORD = 'test_admin_password';
import app from '../server';

describe('NotebookLM Source Generator & Endpoints', () => {
  beforeAll(() => {
    // Ensure generated files exist before testing endpoints
    writeGeneratedFiles();
  });

  describe('HTML to Plain Text Converter', () => {
    it('should strip script, style, and HTML tags properly', () => {
      const html = `
        <html>
          <head>
            <style>body { color: red; }</style>
            <script>console.log('secret');</script>
          </head>
          <body>
            <h1>Title Text</h1>
            <p>Hello <b>World</b> &amp; Welcome!</p>
          </body>
        </html>
      `;
      const plain = htmlToPlainText(html);
      (expect as any)(plain).not.toContain('color: red');
      (expect as any)(plain).not.toContain('console.log');
      (expect as any)(plain).toContain('# Title Text');
      (expect as any)(plain).toContain('Hello World & Welcome!');
    });
  });

  describe('Source File Generation Utility', () => {
    it('should generate content for all defined source pages', () => {
      const { notebookSourcesMd, llmsTxt, notebookLinksTxt, fullContentTxt } =
        generateNotebookSourcesContent('https://test.3minsto9.co.uk');

      (expect as any)(notebookSourcesMd).toContain('Google Gemini Notebook / NotebookLM Sources Guide');
      (expect as any)(notebookSourcesMd).toContain('https://test.3minsto9.co.uk/surface-home-page');
      (expect as any)(notebookSourcesMd).toContain('https://test.3minsto9.co.uk/104.9-global-directives');

      (expect as any)(llmsTxt).toContain('# 3minsto9 ARG & Studio Sources');
      (expect as any)(llmsTxt).toContain('Studio & Business Pages');
      (expect as any)(llmsTxt).toContain('MLTK Lore & ARG Pages');

      (expect as any)(notebookLinksTxt).toContain('https://test.3minsto9.co.uk/surface-home-page');
      (expect as any)(notebookLinksTxt).toContain(
        'https://raw.githubusercontent.com/3minsto9/329-Website/main/public/surface-home-page.html'
      );

      (expect as any)(fullContentTxt).toContain('3MINSTO9 ARG & STUDIO OPERATIONS - CONSOLIDATED SOURCE BUNDLE');
      (expect as any)(fullContentTxt).toContain('PAGE TITLE:');
    });

    it('should create generated files on disk when writeGeneratedFiles is called', () => {
      writeGeneratedFiles();
      const rootDir = path.join(__dirname, '..');
      const publicDir = path.join(rootDir, 'public');

      (expect as any)(fs.existsSync(path.join(rootDir, 'NOTEBOOK_SOURCES.md'))).toBe(true);
      (expect as any)(fs.existsSync(path.join(publicDir, 'llms.txt'))).toBe(true);
      (expect as any)(fs.existsSync(path.join(publicDir, 'notebook-links.txt'))).toBe(true);
      (expect as any)(fs.existsSync(path.join(publicDir, 'llms-full.txt'))).toBe(true);
    });
  });

  describe('Express Endpoints & Downloads', () => {
    it('GET /llms.txt should return plain text with dynamic host', async () => {
      const res = await request(app)
        .get('/llms.txt')
        .set('Host', 'example.com')
        .expect(200);

      (expect as any)(res.headers['content-type']).toContain('text/plain');
      (expect as any)(res.text).toContain('example.com/surface-home-page');
      (expect as any)(res.text).toContain('# 3minsto9 ARG & Studio Sources');
    });

    it('GET /llms-full.txt should return plain text full content bundle', async () => {
      const res = await request(app)
        .get('/llms-full.txt')
        .set('Host', 'example.com')
        .expect(200);

      (expect as any)(res.headers['content-type']).toContain('text/plain');
      (expect as any)(res.text).toContain('3MINSTO9 ARG & STUDIO OPERATIONS - CONSOLIDATED SOURCE BUNDLE');
      (expect as any)(res.text).toContain('example.com/surface-home-page');
    });

    it('GET /download/notebook-links.txt should return downloadable text attachment', async () => {
      const res = await request(app)
        .get('/download/notebook-links.txt')
        .set('Host', 'example.com')
        .expect(200);

      (expect as any)(res.headers['content-type']).toContain('text/plain');
      (expect as any)(res.headers['content-disposition']).toContain('attachment; filename="3minsto9-notebooklm-links.txt"');
      (expect as any)(res.text).toContain('example.com/surface-home-page');
      (expect as any)(res.text).toContain('https://raw.githubusercontent.com');
    });

    it('GET /download/notebook-full-content.txt should return downloadable full content source attachment', async () => {
      const res = await request(app)
        .get('/download/notebook-full-content.txt')
        .set('Host', 'example.com')
        .expect(200);

      (expect as any)(res.headers['content-type']).toContain('text/plain');
      (expect as any)(res.headers['content-disposition']).toContain('attachment; filename="3minsto9-notebooklm-full-sources.txt"');
      (expect as any)(res.text).toContain('3MINSTO9 ARG & STUDIO OPERATIONS - CONSOLIDATED SOURCE BUNDLE');
    });

    it('GET /download/notebook-sources.txt alias should return full content source attachment', async () => {
      const res = await request(app)
        .get('/download/notebook-sources.txt')
        .set('Host', 'example.com')
        .expect(200);

      (expect as any)(res.headers['content-type']).toContain('text/plain');
      (expect as any)(res.headers['content-disposition']).toContain('attachment; filename="3minsto9-notebooklm-full-sources.txt"');
      (expect as any)(res.text).toContain('3MINSTO9 ARG & STUDIO OPERATIONS - CONSOLIDATED SOURCE BUNDLE');
    });
  });
});
