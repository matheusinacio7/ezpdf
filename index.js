#! /usr/bin/env node

import path from 'path';
import { URL } from 'url';
import fs from 'fs';
import cp from 'child_process';

import puppeteer from 'puppeteer';

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import remarkRehype from 'remark-rehype';
import rehypeDocument from 'rehype-document';
import rehypeFormat from 'rehype-format';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';

import yaml from 'yaml';

const __dirname = new URL('.', import.meta.url).pathname;
const CWD = process.cwd();

const TEMP_PATH = path.join(__dirname, 'temp');

const startServer = () => new Promise((resolve, _) => {
  const server = cp.spawn('npx', ['http-server', TEMP_PATH, '-c-1']);
  // server.on('exit', (code) => console.log('Server exited with code', code));
  server.stderr.on('data', (chunkBuffer) => {
    const serverMessage = chunkBuffer.toString('utf-8');
    if (serverMessage.includes('OutgoingMessage.prototype._headers is deprecated')) {
      return;
    }
    console.log('Server error:', serverMessage);
  });
  server.stdout.on('data', (chunkBuffer) => {
    const serverMessage = chunkBuffer.toString('utf-8');
    // console.log(`Server output:`,chunkBuffer.toString('utf-8'));
    if (serverMessage.includes('Available on')) {
      resolve(server);
    }
  });
});

async function spinBrowserAndPrint(fileName) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(
    'http://localhost:8080',
    {
      waitUntil: 'networkidle0',
    },
  );

  await page.pdf({
    path: `${fileName}.pdf`,
    format: 'a4',
    margin: {
      top: '20px',
      left: '20px',
      right: '20px',
      bottom: '20px',
    },
  });
  await browser.close();
}

async function convertMarkdownAndCreateTempFiles(fileName) {
  const linkNode = {
    type: 'element',
    tagName: 'link',
    properties: {
      rel: 'stylesheet',
      href: 'styles.css',
    },
    children: [],
  };

  const getGoogleFontsNodes = (fontList) => {
    const familySlug = fontList.map((fontName) => {
      let slug = 'family=';
      slug += fontName.replace(' ', '+');
      slug += ':wght@100;200;300;400;500;600;700;800;900';
      return slug;
    }).join('&');

    const nodes = [
      {
        type: 'element',
        tagName: 'link',
        properties: {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com',
        },
      },
      {
        type: 'element',
        tagName: 'link',
        properties: {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
      },
      {
        type: 'element',
        tagName: 'link',
        properties: {
          rel: 'stylesheet',
          href: `https://fonts.googleapis.com/css2?${familySlug}&display=swap`,
        },
      },
    ];

    return nodes;
  };

  let yamlConfigs = {};

  const processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter)
    .use(() => tree => {
      visit(
        tree,
        (node) => node.type ==='yaml',
        (yamlNode) => {
          yamlConfigs = yaml.parse(yamlNode.value);
        });
    })
    .use(remarkRehype)
    .use(rehypeDocument)
    .use(rehypeFormat)
    .use(() => (tree) => {
      visit(tree,
        (node) => node.tagName === 'head',
        (head) => {
          if (yamlConfigs.stylesheet) {
            head.children.push(linkNode);
          }

          if (yamlConfigs.google_fonts) {
            head.children = [...head.children, ...getGoogleFontsNodes(yamlConfigs.google_fonts)];
          }
        });
    })
    .use(() => tree => {
      // visit(tree, null, node => console.log(JSON.stringify(node)));
    })
    .use(rehypeStringify);

  const markdownContent = await fs.promises.readFile(path.join(CWD, `${fileName}.md`), 'utf-8');

  const htmlFile = await processor.process(markdownContent);

  await fs.promises.mkdir(TEMP_PATH);
  await fs.promises.writeFile(path.join(TEMP_PATH, 'index.html'), htmlFile.toString());
  if (yamlConfigs.stylesheet) {
    await fs.promises.copyFile(path.join(CWD, yamlConfigs.stylesheet), path.join(TEMP_PATH, 'styles.css'));
  }
}

async function clearTempFolder() {
  const files = await fs.promises.readdir(TEMP_PATH);
  files.forEach(async (fileName) => {
    await fs.promises.unlink(path.join(TEMP_PATH, fileName));
  });

  await fs.promises.rmdir(TEMP_PATH);
}

(async () => {
  const fileName = process.argv[2];

  if (!fileName) {
    throw new Error ('Must inform the name of the markdown file');
  }

  await convertMarkdownAndCreateTempFiles(fileName);

  const server = await startServer();

  await spinBrowserAndPrint(fileName);
  await clearTempFolder();
  console.log(`Successfully converted ${fileName}.md to ${fileName}.pdf`);

  server.kill();
})();
