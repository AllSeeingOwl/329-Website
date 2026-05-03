import { test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import { Result } from 'axe-core';

const pages = [
  '/',
  '/index.html',
  '/surface-home-page.html',
  '/mltk-privacy-policy.html',
  '/mltk-admin.html',
  '/mltk-boot-sequence.html',
  '/mltk-surveillance-dashboard.html',
  '/secure-data-drop-page.html',
  '/404.html'
];

test.describe('Accessibility Checks', () => {
  const allViolations: (Result & { url: string })[] = [];
  let totalRulesChecked = 0;
  let totalRulesPassed = 0;

  for (const pageUrl of pages) {
    test(`Check ${pageUrl}`, async ({ page }) => {
      await page.goto(`http://localhost:3000${pageUrl}`);
      // Wait a bit to ensure typing effect finishes on those pages
      await page.waitForTimeout(1000);
      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

      accessibilityScanResults.violations.forEach(v => {
        allViolations.push({ url: pageUrl, ...v });
      });

      totalRulesChecked += accessibilityScanResults.passes.length + accessibilityScanResults.violations.length + accessibilityScanResults.incomplete.length + accessibilityScanResults.inapplicable.length;
      totalRulesPassed += accessibilityScanResults.passes.length + accessibilityScanResults.inapplicable.length; // We can count inapplicable as not failing
    });
  }

  test.afterAll(() => {
     const score = ((totalRulesPassed / totalRulesChecked) * 100).toFixed(2);
     let report = `# Accessibility Report\n\n`;
     report += `**Overall Score:** ${score}%\n\n`;
     report += `## Violations\n\n`;
     if (allViolations.length === 0) {
       report += `No violations found!\n`;
     } else {
       allViolations.forEach(v => {
         report += `### ${v.id} (${v.impact}) at ${v.url}\n`;
         report += `${v.description}\n`;
         report += `Help: [${v.help}](${v.helpUrl})\n\n`;
         v.nodes.forEach(node => {
           report += `- \`${node.html}\`\n`;
           report += `  - Target: ${node.target.join(', ')}\n`;
           report += `  - Failure Summary: ${node.failureSummary}\n\n`;
         });
       });
     }
     fs.writeFileSync('a11y_report.md', report);
  });
});
