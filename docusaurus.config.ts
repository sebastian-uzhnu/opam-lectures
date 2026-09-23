import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'ОПАМ',
  tagline: 'Основи програмування та алгоритмічні мови',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://sebastian-uzhnu.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'sebastian-uzhnu', // Usually your GitHub org/user name.
  projectName: 'opam-lectures', // Usually your repo name.

  onBrokenLinks: 'throw',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  // The whole site is written in Ukrainian, so the generated <html lang>
  // and the built-in theme strings should be Ukrainian too.
  i18n: {
    defaultLocale: 'uk',
    locales: ['uk'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],
          // Лабораторні та практичні роботи лишаються в репозиторії, але не
          // потрапляють на сайт: їх немає ні в меню, ні в пошуку, ні за прямим
          // посиланням. Щоб повернути — прибрати відповідний рядок.
          exclude: ['labs/**', 'practicals/**'],
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themes: [
    [
      // Offline/local full-text search. No external account or API key, and it
      // keeps working when GitHub Pages is the only thing serving the site.
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        // lunr-languages has no Ukrainian stemmer. The English tokenizer
        // alone splits on non-Latin characters and drops every Cyrillic word,
        // which left the index with only ~70 Latin tokens ("wpf", "linq", …)
        // and no Ukrainian search at all.
        //
        // Adding 'ru' pulls in a Cyrillic-aware tokenizer, so Ukrainian text
        // is indexed and inflected forms still match ("делегати" finds
        // "делегата"). The Russian stemmer is not a perfect fit for Ukrainian
        // morphology, but it is far better than dropping the language.
        // Its stop-word list is Russian, so it is disabled to avoid removing
        // Ukrainian words that happen to collide with it.
        language: ['en', 'ru'],
        removeDefaultStopWordFilter: ['ru'],
        hashed: true,
        indexBlog: false,
        docsRouteBasePath: '/docs',
        highlightSearchTermsOnTargetPage: true,
        searchResultLimits: 10,
        searchResultContextMaxLength: 60,
        explicitSearchResultPath: true,
      },
    ],
  ],

  headTags: [
    {
      tagName: 'link',
      attributes: {rel: 'preconnect', href: 'https://fonts.googleapis.com'},
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossorigin: 'anonymous',
      },
    },
  ],

  stylesheets: [
    {
      // Inter / Inter Tight / JetBrains Mono all ship full Cyrillic coverage,
      // which the site needs for Ukrainian body text and headings.
      href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Inter+Tight:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap',
      type: 'text/css',
    },
    {
      href: 'https://cdn.jsdelivr.net/npm/katex@0.13.24/dist/katex.min.css',
      type: 'text/css',
      integrity: 'sha384-odtC+0UGzzFL/6PNoE8rX/SPcQDXBJ+uRepguP4QkPCm2LBxH3FA3y+fKSiJ+AmM',
      crossorigin: 'anonymous',
    },
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    docs: {
      sidebar: {
        hideable: true,
        autoCollapseCategories: true,
      },
    },
    tableOfContents: {
      minHeadingLevel: 2,
      maxHeadingLevel: 4,
    },
    navbar: {
      title: 'ОПАМ',
      hideOnScroll: true,
      logo: {
        alt: 'ОПАМ',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Лекції',
        },
        {
          to: '/docs/intro',
          label: 'Про курс',
          position: 'left',
        },
        {
          href: 'https://github.com/sebastian-uzhnu',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Курс',
          items: [
            {
              label: 'Вступ до курсу',
              to: '/docs/intro',
            },
            {
              label: 'Лекції',
              to: '/docs/algorithms-and-flowcharts',
            },
          ],
        },
        {
          title: 'Соціальні мережі',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/sebastian-uzhnu',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Sebastian Bila. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.oneLight,
      darkTheme: prismThemes.oneDark,
      additionalLanguages: ['csharp', 'bash', 'json', 'xml-doc', 'sql'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
