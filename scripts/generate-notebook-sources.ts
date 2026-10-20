import fs from 'fs';
import path from 'path';

export interface SourcePage {
  slug: string;
  filename: string;
  githubPath: string;
  category: 'Studio & Business' | 'MLTK Lore & ARG';
  title: string;
  description: string;
}

export const SOURCE_PAGES: SourcePage[] = [
  // Studio & Business Pages
  {
    slug: 'surface-home-page',
    filename: 'surface-home-page.html',
    githubPath: 'public/surface-home-page.html',
    category: 'Studio & Business',
    title: '3minsto9 Operations - Surface Home Page',
    description: 'Main public storefront and surface landing page for 3minsto9 Operations.',
  },
  {
    slug: 'studio-manifesto-page',
    filename: 'studio-manifesto-page.html',
    githubPath: 'public/studio-manifesto-page.html',
    category: 'Studio & Business',
    title: '3minsto9 Studio Manifesto & Mission',
    description: 'Studio manifesto, design philosophy, and core principles.',
  },
  {
    slug: 'releases',
    filename: 'releases.html',
    githubPath: 'public/releases.html',
    category: 'Studio & Business',
    title: 'Studio Releases & Physical Media',
    description: 'Catalog of 3minsto9 releases, physical media, puzzles, and interactive drops.',
  },
  {
    slug: 'studio-faq',
    filename: 'studio-faq.html',
    githubPath: 'public/studio-faq.html',
    category: 'Studio & Business',
    title: 'Frequently Asked Questions (FAQ)',
    description: 'Comprehensive studio FAQ covering gameplay, puzzles, shipping, and ARG lore.',
  },
  {
    slug: 'studio-press-kit',
    filename: 'studio-press-kit.html',
    githubPath: 'public/studio-press-kit.html',
    category: 'Studio & Business',
    title: 'Studio Press Kit & Media Assets',
    description: 'Official press kit, studio history, media contact details, and brand overview.',
  },
  {
    slug: 'studio-contact-us',
    filename: 'studio-contact-us.html',
    githubPath: 'public/studio-contact-us.html',
    category: 'Studio & Business',
    title: 'Studio Contact & Inquiries',
    description: 'Official contact portal for studio inquiries, media, and collaboration.',
  },
  {
    slug: 'studio-puzzles-explained',
    filename: 'studio-puzzles-explained.html',
    githubPath: 'public/studio-puzzles-explained.html',
    category: 'Studio & Business',
    title: 'Design Philosophy & Puzzles Explained',
    description: 'In-depth guide explaining puzzle design, ARG mechanics, and transmedia storytelling.',
  },
  {
    slug: 'studio-team',
    filename: 'studio-team.html',
    githubPath: 'public/studio-team.html',
    category: 'Studio & Business',
    title: 'Studio Team & Core Members',
    description: 'Profiles and key roles of the 3minsto9 development team.',
  },
  {
    slug: 'business-privacy-policy',
    filename: 'business-privacy-policy.html',
    githubPath: 'public/business-privacy-policy.html',
    category: 'Studio & Business',
    title: 'Business Privacy Policy',
    description: 'Official privacy policy for 3minsto9 Operations.',
  },
  {
    slug: 'business-terms-of-service',
    filename: 'business-terms-of-service.html',
    githubPath: 'public/business-terms-of-service.html',
    category: 'Studio & Business',
    title: 'Business Terms of Service',
    description: 'Official terms of service governing 3minsto9 products and website usage.',
  },

  // MLTK Lore & ARG Pages
  {
    slug: 'mltk-login-gate',
    filename: 'mltk-login-gate.html',
    githubPath: 'public/mltk-login-gate.html',
    category: 'MLTK Lore & ARG',
    title: 'MLTK Executive Portal Login Gate',
    description: 'Primary terminal gate for MLTK corporate authentication.',
  },
  {
    slug: 'mltk-surveillance-dashboard',
    filename: 'mltk-surveillance-dashboard.html',
    githubPath: 'public/mltk-surveillance-dashboard.html',
    category: 'MLTK Lore & ARG',
    title: 'MLTK Surveillance & Infrastructure Monitor',
    description: 'Corporate surveillance dashboard tracking active, rogue, and backdoor modules.',
  },
  {
    slug: '104.9-global-directives',
    filename: '104.9-global-directives.html',
    githubPath: 'public/104.9-global-directives.html',
    category: 'MLTK Lore & ARG',
    title: '104.9 Global Directives & Gretchen Dossier',
    description: 'Corporate directives, Gretchen dossier, decrypted audio transcripts, and hacker overlays.',
  },
  {
    slug: 'mltk-classified-document',
    filename: 'mltk-classified-document.html',
    githubPath: 'public/mltk-classified-document.html',
    category: 'MLTK Lore & ARG',
    title: 'MLTK Redacted Intelligence Briefing',
    description: 'Interactive redacted document detailing MLTK corporate secrets.',
  },
  {
    slug: 'nova-classified-archive',
    filename: 'nova-classified-archive.html',
    githubPath: 'public/nova-classified-archive.html',
    category: 'MLTK Lore & ARG',
    title: 'NOVA Classified Intelligence Archive',
    description: 'Classified archives detailing NOVA project files, incident reports, and corporate logs.',
  },
  {
    slug: 'nova-parent-directory',
    filename: 'nova-parent-directory.html',
    githubPath: 'public/nova-parent-directory.html',
    category: 'MLTK Lore & ARG',
    title: 'NOVA Systems Parent Directory',
    description: 'File index and structural directory for internal NOVA systems.',
  },
  {
    slug: 'ollies-radio-scanner',
    filename: 'ollies-radio-scanner.html',
    githubPath: 'public/ollies-radio-scanner.html',
    category: 'MLTK Lore & ARG',
    title: 'Ollie\'s 104.9 FM Radio Scanner',
    description: 'Interactive radio scanner intercepting frequencies and noise anomalies.',
  },
  {
    slug: 'secure-data-drop-page',
    filename: 'secure-data-drop-page.html',
    githubPath: 'public/secure-data-drop-page.html',
    category: 'MLTK Lore & ARG',
    title: 'Secure Data Drop & Decryption Node',
    description: 'Decryption terminal for submitting overrides and unlocking classified downloads.',
  },
  {
    slug: 'developer-blog',
    filename: 'developer-blog.html',
    githubPath: 'public/developer-blog.html',
    category: 'MLTK Lore & ARG',
    title: 'Dev Log & Team Rabbit Transcripts',
    description: 'Developer logs interspersed with Team Rabbit signal hijacks and lore drops.',
  },
  {
    slug: 'mltk-virtue-village-index',
    filename: 'mltk-virtue-village-index.html',
    githubPath: 'public/mltk-virtue-village-index.html',
    category: 'MLTK Lore & ARG',
    title: 'Virtue Village Corporate Directory',
    description: 'Interactive directory of Virtue Village personnel, facilities, and records.',
  },
  {
    slug: 'velvet-rope-landing-page',
    filename: 'velvet-rope-landing-page.html',
    githubPath: 'public/velvet-rope-landing-page.html',
    category: 'MLTK Lore & ARG',
    title: 'Velvet Rope VIP Access Terminal',
    description: 'Exclusive access gate for keycard holders and VIP ARG participants.',
  },
  {
    slug: 'team-rabbit-hack',
    filename: 'team-rabbit-hack.html',
    githubPath: 'public/team-rabbit-hack.html',
    category: 'MLTK Lore & ARG',
    title: 'Team Rabbit Broadcast Hijack',
    description: 'Emergency broadcast intercept from Team Rabbit exposing MLTK operations.',
  },
  {
    slug: 'arg-progress-dashboard',
    filename: 'arg-progress-dashboard.html',
    githubPath: 'public/arg-progress-dashboard.html',
    category: 'MLTK Lore & ARG',
    title: 'Neural Link ARG Progress Tracker',
    description: 'Public progress monitor tracking overall community ARG completion and phase unlocks.',
  },
  {
    slug: 'mltk-3d-map',
    filename: 'mltk-3d-map.html',
    githubPath: 'public/mltk-3d-map.html',
    category: 'MLTK Lore & ARG',
    title: 'MLTK Facility 3D Spatial Map',
    description: 'Interactive 3D structural model of MLTK corporate facilities.',
  },
  {
    slug: 'mltk-five-finger-wheel',
    filename: 'mltk-five-finger-wheel.html',
    githubPath: 'public/mltk-five-finger-wheel.html',
    category: 'MLTK Lore & ARG',
    title: 'MLTK Five Finger Wheel Interface',
    description: 'Specialized five-finger biometric control wheel interface.',
  },
  {
    slug: 'system-override',
    filename: 'system-override.html',
    githubPath: 'public/system-override.html',
    category: 'MLTK Lore & ARG',
    title: 'System Override Emergency Gate',
    description: 'Emergency system override console for administrative reset.',
  },
  {
    slug: 'mltk-privacy-policy',
    filename: 'mltk-privacy-policy.html',
    githubPath: 'public/mltk-privacy-policy.html',
    category: 'MLTK Lore & ARG',
    title: 'MLTK In-Universe Privacy Notice',
    description: 'Satirical corporate privacy notice for MLTK surveillance subjects.',
  },
  {
    slug: 'mltk-customer-service',
    filename: 'mltk-customer-service.html',
    githubPath: 'public/mltk-customer-service.html',
    category: 'MLTK Lore & ARG',
    title: 'MLTK Customer Service Portal',
    description: 'MLTK corporate customer support and inquiry form.',
  },
];

const BASE_LIVE_URL = process.env.BASE_URL || 'https://3minsto9.co.uk';
const RAW_GITHUB_BASE = 'https://raw.githubusercontent.com/3minsto9/329-Website/main';

export function htmlToPlainText(html: string): string {
  let text = html;
  // Remove script, style, and svg tags along with content
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<svg[\s\S]*?<\/svg>/gi, '');
  text = text.replace(/<!--[\s\S]*?-->/g, '');

  // Convert headings to Markdown style
  text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n\n# $1\n');
  text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n');
  text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n');
  text = text.replace(/<h[4-6][^>]*>([\s\S]*?)<\/h[4-6]>/gi, '\n\n#### $1\n');

  // Convert block elements to newlines
  text = text.replace(/<(p|div|section|article|li|tr|br)[^>]*>/gi, '\n');

  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/ +/g, ' ');

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Clean up excessive blank lines and spaces
  text = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');

  return text;
}

export function generateNotebookSourcesContent(
  baseUrl: string = BASE_LIVE_URL,
  publicDir: string = path.join(__dirname, '..', 'public')
) {
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');

  const studioPages = SOURCE_PAGES.filter((p) => p.category === 'Studio & Business');
  const mltkPages = SOURCE_PAGES.filter((p) => p.category === 'MLTK Lore & ARG');

  // 1. Generate NOTEBOOK_SOURCES.md
  const mdLines: string[] = [
    '# Google Gemini Notebook / NotebookLM Sources Guide',
    '',
    'This document contains a curated list of live website links and raw GitHub repository sources for **3minsto9 Operations** and the **MLTK Alternate Reality Game (ARG)**.',
    'You can copy-paste these URLs directly into **Google Gemini Notebook / NotebookLM** as web sources, or download the consolidated plain-text source bundles below.',
    '',
    '## Quick Links for NotebookLM Ingestion',
    `- **Live llms.txt Index:** \`${cleanBaseUrl}/llms.txt\``,
    `- **Live llms-full.txt Full Content:** \`${cleanBaseUrl}/llms-full.txt\``,
    `- **Downloadable Links File:** \`${cleanBaseUrl}/download/notebook-links.txt\``,
    `- **Downloadable Full Source Bundle:** \`${cleanBaseUrl}/download/notebook-full-content.txt\``,
    '',
    '---',
    '',
    '## 1. Studio & Business Pages',
    'Official company documentation, store information, FAQ, press kit, and philosophy.',
    '',
  ];

  for (const page of studioPages) {
    const liveUrl = `${cleanBaseUrl}/${page.slug}`;
    const rawUrl = `${RAW_GITHUB_BASE}/${page.githubPath}`;
    mdLines.push(`### ${page.title}`);
    mdLines.push(`${page.description}`);
    mdLines.push(`- **Live Web Page:** [${liveUrl}](${liveUrl})`);
    mdLines.push(`- **Raw GitHub Source (Fallback):** [${rawUrl}](${rawUrl})`);
    mdLines.push('');
  }

  mdLines.push('---');
  mdLines.push('');
  mdLines.push('## 2. MLTK In-Universe Lore & ARG Pages');
  mdLines.push('Corporate surveillance portals, classified archives, hacker intercepts, and interactive lore nodes.');
  mdLines.push('');

  for (const page of mltkPages) {
    const liveUrl = `${cleanBaseUrl}/${page.slug}`;
    const rawUrl = `${RAW_GITHUB_BASE}/${page.githubPath}`;
    mdLines.push(`### ${page.title}`);
    mdLines.push(`${page.description}`);
    mdLines.push(`- **Live Web Page:** [${liveUrl}](${liveUrl})`);
    mdLines.push(`- **Raw GitHub Source (Fallback):** [${rawUrl}](${rawUrl})`);
    mdLines.push('');
  }

  mdLines.push('---');
  mdLines.push('');
  mdLines.push('## How to Use in NotebookLM / Gemini Notebook');
  mdLines.push('1. Open [Google NotebookLM](https://notebooklm.google.com/).');
  mdLines.push('2. Create a new notebook or select an existing one.');
  mdLines.push('3. Click **Add Source** -> **Website / Link** or **Text File**.');
  mdLines.push('4. Either paste the live URLs listed above, or upload the downloaded `notebook-full-content.txt` file directly.');
  mdLines.push('5. If NotebookLM experiences issues crawling dynamic HTML elements, use the provided **Raw GitHub Source** links or download the single `.txt` bundle.');

  const notebookSourcesMd = mdLines.join('\n');

  // 2. Generate llms.txt
  const llmsTxtLines: string[] = [
    '# 3minsto9 ARG & Studio Sources',
    '> Curated source listing for Google Gemini Notebook, NotebookLM, and AI context indexers.',
    '',
    '## Studio & Business Pages',
  ];

  for (const page of studioPages) {
    const liveUrl = `${cleanBaseUrl}/${page.slug}`;
    const rawUrl = `${RAW_GITHUB_BASE}/${page.githubPath}`;
    llmsTxtLines.push(`- [${page.title}](${liveUrl}): ${page.description} (Raw Fallback: ${rawUrl})`);
  }

  llmsTxtLines.push('');
  llmsTxtLines.push('## MLTK Lore & ARG Pages');

  for (const page of mltkPages) {
    const liveUrl = `${cleanBaseUrl}/${page.slug}`;
    const rawUrl = `${RAW_GITHUB_BASE}/${page.githubPath}`;
    llmsTxtLines.push(`- [${page.title}](${liveUrl}): ${page.description} (Raw Fallback: ${rawUrl})`);
  }

  const llmsTxt = llmsTxtLines.join('\n') + '\n';

  // 3. Generate notebook-links.txt
  const linksLines: string[] = [
    `# 3minsto9 NotebookLM Direct Links Index (${cleanBaseUrl})`,
    '# Primary Live Hosted URLs:',
  ];

  for (const page of SOURCE_PAGES) {
    linksLines.push(`${cleanBaseUrl}/${page.slug}`);
  }

  linksLines.push('');
  linksLines.push('# Secondary Raw GitHub Fallback URLs:');

  for (const page of SOURCE_PAGES) {
    linksLines.push(`${RAW_GITHUB_BASE}/${page.githubPath}`);
  }

  const notebookLinksTxt = linksLines.join('\n') + '\n';

  // 4. Generate llms-full.txt / notebook-full-content.txt
  const fullContentLines: string[] = [
    '========================================================================',
    '3MINSTO9 ARG & STUDIO OPERATIONS - CONSOLIDATED SOURCE BUNDLE',
    '========================================================================',
    'This file contains the complete extracted plain-text and narrative content',
    'of all public Studio & Business pages and MLTK Lore & ARG pages.',
    'Optimized for direct ingestion into Google NotebookLM and Gemini.',
    '========================================================================',
    '',
  ];

  for (const page of SOURCE_PAGES) {
    const filePath = path.join(publicDir, page.filename);
    let extractedText: string;
    if (fs.existsSync(filePath)) {
      const htmlContent = fs.readFileSync(filePath, 'utf8');
      extractedText = htmlToPlainText(htmlContent);
    } else {
      extractedText = `[File ${page.filename} not found on disk]`;
    }

    fullContentLines.push('------------------------------------------------------------------------');
    fullContentLines.push(`PAGE TITLE: ${page.title}`);
    fullContentLines.push(`CATEGORY:   ${page.category}`);
    fullContentLines.push(`LIVE URL:   ${cleanBaseUrl}/${page.slug}`);
    fullContentLines.push(`RAW GITHUB: ${RAW_GITHUB_BASE}/${page.githubPath}`);
    fullContentLines.push('------------------------------------------------------------------------');
    fullContentLines.push('');
    fullContentLines.push(extractedText);
    fullContentLines.push('');
    fullContentLines.push('');
  }

  const fullContentTxt = fullContentLines.join('\n');

  return {
    notebookSourcesMd,
    llmsTxt,
    notebookLinksTxt,
    fullContentTxt,
  };
}

export function writeGeneratedFiles() {
  const rootDir = path.join(__dirname, '..');
  const publicDir = path.join(rootDir, 'public');

  const { notebookSourcesMd, llmsTxt, notebookLinksTxt, fullContentTxt } = generateNotebookSourcesContent(
    BASE_LIVE_URL,
    publicDir
  );

  fs.writeFileSync(path.join(rootDir, 'NOTEBOOK_SOURCES.md'), notebookSourcesMd, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'llms.txt'), llmsTxt, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'notebook-links.txt'), notebookLinksTxt, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'llms-full.txt'), fullContentTxt, 'utf8');

  console.log('Successfully generated NotebookLM source files:');
  console.log(' - NOTEBOOK_SOURCES.md');
  console.log(' - public/llms.txt');
  console.log(' - public/notebook-links.txt');
  console.log(' - public/llms-full.txt');
}

if (require.main === module) {
  writeGeneratedFiles();
}
