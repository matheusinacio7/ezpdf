# ezPDF

## What's this?

This is a simple markdown to pdf parser that supports custom CSS stylesheets.

In the future, ezPDF will allow you to preview files and maybe even edit them in the Browser using markdown.

## How can I use it?

Run
```bash
npx ezpdf [filename]
```
Substituting [filename] for the name of the markdown file you want to print as PDF.

For example:
```bash
npx ezpdf mylittlefile.md
```

Will produce a file named `mylittlefile.pdf`

This **takes a while** (about 20~30 seconds) to run, because npx has to temporarily install the Chromium browser.

If you find yourself using the command repeatedly, you may consider installing the package either globally or locally.

### Installing locally
If you find yourself converting the same file, you should consider installing the package locally.

Run
```bash
npm install ezpdf
```

or

```bash
yarn add ezpdf
```

Then, you can use `npx` as usual (`npx ezpdf [filename]`) to run the package from the local `node_modules/bin`, and it will run much faster (under 1s usually).

### Installing globally

Alternatively, if you find yourself parsing multiple files over different folders, you may want to install the package globally.

In that case, run

```bash
npm install -g ezpdf
```

or

```bash
yarn global add ezpdf
```

Afterwards, you can run

```
ezpdf [filename]
```

awywhere to get the same performance as running from a local installation.

## How does it work?

ezPDF runs on 3 steps:

1. Converts the markdown file to HTML using an [unified](https://unifiedjs.com/) pipeline. During this step, it also extracts YAML configuration from the frontmatter to create the stylesheet and append links to the HTML file head;
2. Serves the HTML file locally on port 8080 using [http-server](https://github.com/http-party/http-server);
3. Navigates to the page using [puppeteer](https://pptr.dev/) and prints the PDF file through its headless Chromium browser.

Afterwards, it cleans up the temp folder created during the process.

## How can I contribute?

Thanks for the interest! Please, read the [CONTRIBUTING](CONTRIBUTING.md) file

## License

This project uses the classic MIT open-source license, which means you can use anything here for free for any commercial or non-commercial ends, but if you replicate parts of the code, the resulting project must also follow the same license.

It also means this software is provided "as is", with no warranty of any kind.

For more info, read [LICENSE.md](LICENSE.md)
