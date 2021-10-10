import fs from 'fs/promises';
import puppeteer from 'puppeteer';
import cp from 'child_process';

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import remarkRehype from 'remark-rehype';
import rehypeDocument from 'rehype-document';
import rehypeFormat from 'rehype-format';
import rehypeStringify from 'rehype-stringify';
import yaml from 'yaml';
import { visit } from 'unist-util-visit';

async function startServer() {
  const server = cp.spawn('npx', ['http-server', './temp', '-c-1']);
  server.on('exit', (code) => console.log('Server exited with code', code));
  return server;
}

async function spinBrowserAndPrint() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:8080');
  await page.pdf({
    path: 'test.pdf',
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
          crossorigin: '',
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
        });
    })
    .use(() => tree => {
      // visit(tree, null, node => console.log(JSON.stringify(node)));
    })
    .use(rehypeStringify);

  const markdownContent = await fs.readFile(`${fileName}.md`, 'utf-8');

  const htmlFile = await processor.process(markdownContent);

  await fs.mkdir('temp');
  await fs.writeFile('./temp/index.html', htmlFile.toString());
  await fs.writeFile('./temp/styles.css', '');
}

(async () => {
  const fileName = process.argv[2];

  if (!fileName) {
    throw new Error ('Must inform the name of the markdown file');
  }


  // const server = await startServer();
  // await spinBrowserAndPrint();

  // server.kill();
})();
