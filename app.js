const categories = [
  { id: 'official', label: '官方资源', icon: '📘', desc: '官方文档、仓库、第一手入口', accent: '#1e4ed8', soft: '#dbe7ff' },
  { id: 'deploy', label: '部署教程', icon: '☁️', desc: '云部署与服务器上线指南', accent: '#0f766e', soft: '#d6f3ef' },
  { id: 'getting-started', label: '入门教程', icon: '🚀', desc: '新手从零到可用的步骤', accent: '#b45309', soft: '#ffe7c4' },
  { id: 'channel', label: '平台接入', icon: '🔌', desc: '飞书/钉钉/Telegram 等渠道', accent: '#0b7285', soft: '#d8f2f8' },
  { id: 'skills', label: '技能开发', icon: '🧩', desc: '技能编写、发布与调试', accent: '#92400e', soft: '#ffeac2' },
  { id: 'video', label: '视频内容', icon: '🎬', desc: '可视化教程与案例演示', accent: '#b42318', soft: '#ffe0dc' },
  { id: 'case', label: '案例实战', icon: '💡', desc: '自动化场景和落地经验', accent: '#14532d', soft: '#d9f6df' },
  { id: 'tools', label: '工具生态', icon: '🛠️', desc: '插件、辅助工具与社区项目', accent: '#115e59', soft: '#d4f8f4' }
];

const resources = [
  {
    title: 'OpenClaw 官方文档',
    desc: '安装、配置、API 与最佳实践的完整入口。',
    url: 'https://docs.openclaw.ai',
    source: 'OpenClaw',
    lang: 'en',
    category: 'official',
    featured: true,
    tags: ['文档', '必读']
  },
  {
    title: 'OpenClaw GitHub 主仓库',
    desc: '源码、Issue、版本发布与社区讨论。',
    url: 'https://github.com/openclaw/openclaw',
    source: 'GitHub',
    lang: 'en',
    category: 'official',
    featured: true,
    tags: ['源码', '更新']
  },
  {
    title: 'ClawHub Skills 市场',
    desc: '浏览与安装社区技能，快速扩展助手能力。',
    url: 'https://clawhub.com',
    source: 'ClawHub',
    lang: 'en',
    category: 'official',
    featured: true,
    tags: ['技能', '市场']
  },
  {
    title: 'DigitalOcean 一键部署 OpenClaw',
    desc: '通过一键模板快速完成云端部署。',
    url: 'https://www.digitalocean.com/community/tutorials/how-to-run-openclaw',
    source: 'DigitalOcean',
    lang: 'en',
    category: 'deploy',
    featured: true,
    tags: ['云部署', '一键']
  },
  {
    title: '腾讯云 OpenClaw 接入飞书',
    desc: 'Lighthouse 部署与飞书机器人配置全流程。',
    url: 'https://cloud.tencent.com/developer/article/2625073',
    source: '腾讯云',
    lang: 'zh',
    category: 'deploy',
    featured: true,
    tags: ['腾讯云', '飞书']
  },
  {
    title: '阿里云部署 OpenClaw 构建钉钉助手',
    desc: '国内服务器部署与钉钉机器人接入示例。',
    url: 'https://help.aliyun.com/zh/simple-application-server/use-cases/quickly-deploy-and-use-openclaw',
    source: '阿里云',
    lang: 'zh',
    category: 'deploy',
    featured: false,
    tags: ['阿里云', '钉钉']
  },
  {
    title: 'OpenClaw 安装部署图文详解',
    desc: '从环境准备到首次运行的完整步骤。',
    url: 'https://apifox.com/apiskills/openclaw-installation-and-usage-guide/',
    source: 'Apifox',
    lang: 'zh',
    category: 'getting-started',
    featured: true,
    tags: ['新手', '图文']
  },
  {
    title: 'Codecademy: OpenClaw Installation to First Chat',
    desc: '从安装到首个可用 AI 助手的英文课程。',
    url: 'https://www.codecademy.com/article/openclaw-installation-to-first-chat',
    source: 'Codecademy',
    lang: 'en',
    category: 'getting-started',
    featured: false,
    tags: ['课程', '英文']
  },
  {
    title: 'OpenClaw 连接 Telegram 教程',
    desc: '包含 BotFather 配置与权限常见坑位。',
    url: 'https://www.cnblogs.com/gyc567/p/19561281',
    source: '博客园',
    lang: 'zh',
    category: 'channel',
    featured: false,
    tags: ['Telegram', '接入']
  },
  {
    title: '企业微信接入 OpenClaw 全流程',
    desc: '企业微信机器人在团队中的接入方式。',
    url: 'https://cloud.tencent.com/developer/article/2625147',
    source: '腾讯云',
    lang: 'zh',
    category: 'channel',
    featured: false,
    tags: ['企业微信', '团队']
  },
  {
    title: 'ClawHub Skill 开发模板',
    desc: '技能目录结构、参数定义和发布流程。',
    url: 'https://github.com/openclaw/skills',
    source: 'GitHub',
    lang: 'en',
    category: 'skills',
    featured: true,
    tags: ['开发', '发布']
  },
  {
    title: '自定义技能实战：从需求到上线',
    desc: '完整演示一个可复用技能的开发过程。',
    url: 'https://juejin.cn/',
    source: '掘金',
    lang: 'zh',
    category: 'skills',
    featured: false,
    tags: ['实战', '开发']
  },
  {
    title: 'B 站：OpenClaw 新手 30 分钟上手',
    desc: '可视化演示安装、连平台、跑第一条任务。',
    url: 'https://www.bilibili.com/',
    source: 'Bilibili',
    lang: 'zh',
    category: 'video',
    featured: true,
    tags: ['视频', '入门']
  },
  {
    title: 'YouTube: OpenClaw Workflow Deep Dive',
    desc: '面向高级用户的工作流与自动化示例。',
    url: 'https://www.youtube.com/',
    source: 'YouTube',
    lang: 'en',
    category: 'video',
    featured: false,
    tags: ['Workflow', 'Advanced']
  },
  {
    title: '团队 AI 助手落地案例（SaaS 运营）',
    desc: '知识库 + 自动回复 + 周报产出的一体化方案。',
    url: 'https://medium.com/',
    source: 'Medium',
    lang: 'en',
    category: 'case',
    featured: false,
    tags: ['运营', '案例']
  },
  {
    title: 'OpenClaw 在内容团队的应用实践',
    desc: '选题生成、资料聚合、初稿写作协同流程。',
    url: 'https://www.53ai.com/',
    source: '53AI',
    lang: 'zh',
    category: 'case',
    featured: false,
    tags: ['内容', '协同']
  },
  {
    title: '浏览器自动化 Skill 与 Playwright 组合',
    desc: '用浏览器技能做数据抓取与表单自动化。',
    url: 'https://playwright.dev/',
    source: 'Playwright',
    lang: 'en',
    category: 'tools',
    featured: false,
    tags: ['自动化', '浏览器']
  },
  {
    title: 'Notion + OpenClaw 工作台模板',
    desc: '任务池、上下文记录和执行日志模板。',
    url: 'https://www.notion.so/',
    source: 'Notion',
    lang: 'en',
    category: 'tools',
    featured: false,
    tags: ['模板', '效率']
  }
];

const sourceDot = {
  OpenClaw: '#2563eb',
  GitHub: '#1f2937',
  ClawHub: '#10b981',
  DigitalOcean: '#0069ff',
  腾讯云: '#0052d9',
  阿里云: '#ff6a00',
  Apifox: '#e8432a',
  Codecademy: '#1557ff',
  博客园: '#3b82f6',
  掘金: '#1e80ff',
  Bilibili: '#fb7299',
  YouTube: '#ff0000',
  Medium: '#0f172a',
  '53AI': '#6366f1',
  Playwright: '#2e9b4d',
  Notion: '#111827'
};

const state = {
  query: '',
  category: 'all',
  featuredOnly: false
};

const searchInput = document.getElementById('searchInput');
const categoryChips = document.getElementById('categoryChips');
const featuredBtn = document.getElementById('featuredBtn');
const resetBtn = document.getElementById('resetBtn');
const resultCount = document.getElementById('resultCount');
const stats = document.getElementById('stats');
const spotlightGrid = document.getElementById('spotlightGrid');
const categorySections = document.getElementById('categorySections');

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function setupStats() {
  const zhCount = resources.filter((item) => item.lang === 'zh').length;
  const enCount = resources.filter((item) => item.lang === 'en').length;
  const sourceCount = new Set(resources.map((item) => item.source)).size;

  stats.innerHTML = [
    { value: `${resources.length}+`, label: '资源' },
    { value: `${zhCount}`, label: '中文' },
    { value: `${enCount}`, label: '英文' },
    { value: `${sourceCount}`, label: '来源' }
  ]
    .map(
      (item) => `
      <div class="stat">
        <strong>${item.value}</strong>
        <span>${item.label}</span>
      </div>
    `
    )
    .join('');
}

function setupCategoryChips() {
  const allCount = resources.length;
  const chips = [
    `<button class="chip ${state.category === 'all' ? 'active' : ''}" data-category="all">全部 (${allCount})</button>`
  ];

  for (const category of categories) {
    const count = resources.filter((item) => item.category === category.id).length;
    const active = state.category === category.id ? 'active' : '';

    chips.push(
      `<button class="chip ${active}" data-category="${category.id}">${category.label} (${count})</button>`
    );
  }

  categoryChips.innerHTML = chips.join('');

  categoryChips.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      state.category = button.dataset.category;
      render();
    });
  });
}

function getFilteredResources() {
  const q = state.query.trim().toLowerCase();

  return resources.filter((item) => {
    if (state.category !== 'all' && item.category !== state.category) {
      return false;
    }

    if (state.featuredOnly && !item.featured) {
      return false;
    }

    if (!q) {
      return true;
    }

    const bag = [item.title, item.desc, item.source, ...(item.tags || [])].join(' ').toLowerCase();
    return bag.includes(q);
  });
}

function renderCard(item, category) {
  const langLabel = item.lang === 'zh' ? '中文' : 'EN';
  const dot = sourceDot[item.source] || '#64748b';
  const tags = (item.tags || [])
    .slice(0, 3)
    .map((tag) => `<span class="tag">#${escapeHtml(tag)}</span>`)
    .join('');

  return `
    <a class="card" href="${item.url}" target="_blank" rel="noopener noreferrer" style="border-color:${category.soft};">
      <div class="card-top">
        <span class="card-lang" style="background:${category.soft};color:${category.accent};">${langLabel}${
    item.featured ? ' · TOP' : ''
  }</span>
        <span class="card-open">打开链接</span>
      </div>
      <h4>${escapeHtml(item.title)}</h4>
      <p>${escapeHtml(item.desc)}</p>
      <div class="tags">${tags}</div>
      <div class="card-foot">
        <span class="dot" style="background:${dot};"></span>
        <span>${escapeHtml(item.source)}</span>
      </div>
    </a>
  `;
}

function renderSpotlight(filtered) {
  if (state.query || state.category !== 'all' || state.featuredOnly) {
    spotlightGrid.parentElement.style.display = 'none';
    return;
  }

  spotlightGrid.parentElement.style.display = 'block';

  const picks = filtered.filter((item) => item.featured).slice(0, 4);

  spotlightGrid.innerHTML = picks
    .map((item) => {
      const category = categories.find((x) => x.id === item.category) || categories[0];
      return renderCard(item, category);
    })
    .join('');
}

function renderCategorySections(filtered) {
  if (!filtered.length) {
    categorySections.innerHTML = `
      <div class="empty">
        <strong>没有匹配结果</strong>
        换一个关键词试试，或点击“重置”恢复默认筛选。
      </div>
    `;
    return;
  }

  const sections = [];

  categories.forEach((category, index) => {
    const items = filtered.filter((item) => item.category === category.id);
    if (!items.length) {
      return;
    }

    const cards = items.map((item) => renderCard(item, category)).join('');

    sections.push(`
      <article class="category-box" style="animation-delay:${index * 70}ms;">
        <div class="category-head">
          <div class="category-icon" style="background:${category.soft};">${category.icon}</div>
          <div>
            <h3>${category.label}</h3>
            <p>${category.desc}</p>
          </div>
          <span class="category-count" style="background:${category.soft};color:${category.accent};">${items.length}</span>
        </div>
        <div class="resource-grid">${cards}</div>
      </article>
    `);
  });

  categorySections.innerHTML = sections.join('');
}

function render() {
  setupCategoryChips();

  featuredBtn.classList.toggle('active', state.featuredOnly);

  const filtered = getFilteredResources();
  resultCount.textContent = String(filtered.length);

  renderSpotlight(filtered);
  renderCategorySections(filtered);
}

searchInput.addEventListener('input', (event) => {
  state.query = event.target.value;
  render();
});

featuredBtn.addEventListener('click', () => {
  state.featuredOnly = !state.featuredOnly;
  render();
});

resetBtn.addEventListener('click', () => {
  state.query = '';
  state.category = 'all';
  state.featuredOnly = false;
  searchInput.value = '';
  render();
});

setupStats();
render();
