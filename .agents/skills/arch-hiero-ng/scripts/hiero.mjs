#!/usr/bin/env node
// Builds ArchHiero diagrams by calling the WebMCP tools the app registers in the page, in a
// browser Playwright drives, and saves each diagram as SVG, draw.io, and PNG.
//
//   node hiero.mjs <diagram.mjs> [--url <app url>] [--out <folder>] [--scale <n>] [--headed]
//
// <diagram.mjs> default-exports an async function that's given { call, save, page }:
//   call(tool, input)  runs a WebMCP tool, such as call('get_diagram', { diagramId }), and
//                      returns its result, parsed from JSON when it is JSON. A tool error throws.
//   save(id, name)     saves the diagram as <out>/<name>.svg, .drawio, and .png, and returns
//                      what get_diagram says about it, with a summary of what to fix.
//   page               the Playwright page, should you need it.
//
// Each run starts in a fresh browser profile, so it starts with no diagrams: build each
// diagram from scratch in one run.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    url: { type: 'string', default: 'https://arch-hiero.vercel.app/' },
    out: { type: 'string', default: 'diagrams' },
    scale: { type: 'string', default: '1' },
    headed: { type: 'boolean', default: false },
  },
});
if (positionals.length !== 1) {
  console.error(
    'Usage: node hiero.mjs <diagram.mjs> [--url <url>] [--out <folder>] [--scale <n>] [--headed]',
  );
  process.exit(2);
}

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error(
    "Playwright isn't installed. Run `npm install` in this script's folder, then " +
      "`npx playwright install chromium` if Google Chrome isn't installed.",
  );
  process.exit(2);
}

/** Google Chrome when it's installed, else Playwright's own Chromium. */
async function launch() {
  try {
    return await chromium.launch({ channel: 'chrome', headless: !values.headed });
  } catch {
    return chromium.launch({ headless: !values.headed });
  }
}

const REQUIRED_TOOLS = [
  'get_diagram',
  'add_element',
  'resize_element',
  'move_element',
  'export_diagram',
];
const out = resolve(values.out);
mkdirSync(out, { recursive: true });

const browser = await launch();
try {
  const page = await browser.newPage({ viewport: { width: 1800, height: 1400 } });
  // Stand in for WebMCP, so the tools register in any browser: the app registers each tool with
  // navigator.modelContext when document.modelContext isn't there.
  await page.addInitScript(() => {
    window.__hieroTools = {};
    Object.defineProperty(navigator, 'modelContext', {
      value: { registerTool: (tool) => (window.__hieroTools[tool.name] = tool) },
    });
  });
  await page.goto(values.url);
  await page.waitForFunction(() => Object.keys(window.__hieroTools).length > 0, null, {
    timeout: 30_000,
  });
  const tools = await page.evaluate(() => Object.keys(window.__hieroTools));
  const missing = REQUIRED_TOOLS.filter((name) => !tools.includes(name));
  if (missing.length) {
    throw new Error(
      `${values.url} doesn't offer ${missing.join(', ')}. It needs a newer ArchHiero; ` +
        'pass --url for one that has them.',
    );
  }

  const call = async (name, input = {}) => {
    const result = await page.evaluate(
      async ([tool, args]) => {
        const found = window.__hieroTools[tool];
        return found
          ? found.execute(args)
          : { isError: true, content: [{ type: 'text', text: `There's no '${tool}' tool.` }] };
      },
      [name, input],
    );
    const text = result.content.map((part) => part.text).join('\n');
    if (result.isError) {
      throw new Error(`${name}: ${text}`);
    }
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  };

  const save = async (diagramId, name) => {
    const svg = await call('export_diagram', { diagramId, format: 'svg', download: false });
    const drawio = await call('export_diagram', { diagramId, format: 'drawio', download: false });
    writeFileSync(`${out}/${name}.svg`, svg);
    writeFileSync(`${out}/${name}.drawio`, drawio);
    const image = await browser.newPage({ deviceScaleFactor: Number(values.scale) });
    await image.setContent(`<body style="margin:0;background:#fff">${svg}</body>`);
    await image
      .locator('svg')
      .first()
      .screenshot({ path: `${out}/${name}.png` });
    await image.close();
    const diagram = await call('get_diagram', { diagramId });
    report(name, diagram);
    return diagram;
  };

  const script = await import(pathToFileURL(resolve(positionals[0])).href);
  await script.default({ call, save, page });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await browser.close();
}

/** Prints where the files went and what to look at: bent arrows and text that's cut off. */
function report(name, diagram) {
  const labelOf = (id) => diagram.elements.find((e) => e.id === id)?.label ?? id;
  const bent = (diagram.arrows ?? []).filter((a) => a.straight === false);
  const clipped = diagram.elements.filter((e) => e.clippedText);
  console.log(`Saved ${out}/${name}.svg, .drawio, and .png`);
  console.log(`  ${diagram.elements.length} elements, ${(diagram.arrows ?? []).length} arrows`);
  for (const arrow of bent) {
    console.log(`  Not straight: ${labelOf(arrow.sourceId)} -> ${labelOf(arrow.targetId)}`);
  }
  for (const element of clipped) {
    console.log(`  Cut off in '${element.label}': ${element.clippedText.join(' | ')}`);
  }
}
