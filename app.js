const STORAGE_KEY = 'english-study-hub-v1';
const STOP_WORDS = new Set([
  'about', 'after', 'again', 'against', 'almost', 'along', 'also', 'although', 'always', 'among',
  'because', 'before', 'being', 'between', 'both', 'could', 'every', 'first', 'from', 'have',
  'however', 'just', 'many', 'might', 'more', 'most', 'other', 'over', 'same', 'such', 'than',
  'that', 'their', 'there', 'these', 'they', 'this', 'those', 'through', 'under', 'very', 'were',
  'what', 'when', 'where', 'which', 'while', 'with', 'would', 'your', 'into', 'onto', 'been',
  'them', 'then', 'some', 'each', 'like', 'only', 'make', 'made', 'does', 'did', 'much', 'well'
]);
const LOAD_MODE_LABEL = {
  proxy: '代理解析',
  video: '视频字幕',
  manual: '手动粘贴',
  bridge: '本地桥接',
};
const DEFAULT_PARSE_HINT =
  '如果链接存在登录限制或付费墙（如 WSJ）或视频无公开字幕，可切换到“手动粘贴”或“本地桥接”模式。';

const state = {
  article: null,
  favorites: [],
  vocab: {},
  history: [],
  lastAudio: null,
  lastScore: null,
  pendingSelection: '',
  loadMode: 'proxy',
};

const articleUrlInput = document.getElementById('articleUrlInput');
const loadArticleBtn = document.getElementById('loadArticleBtn');
const loadStatus = document.getElementById('loadStatus');
const parseHint = document.getElementById('parseHint');
const loadModeInputs = Array.from(document.querySelectorAll('input[name="loadMode"]'));
const manualModePanel = document.getElementById('manualModePanel');
const manualTitleInput = document.getElementById('manualTitleInput');
const manualTextInput = document.getElementById('manualTextInput');
const bridgeModePanel = document.getElementById('bridgeModePanel');
const bridgeEndpointInput = document.getElementById('bridgeEndpointInput');
const videoModePanel = document.getElementById('videoModePanel');
const videoLangInput = document.getElementById('videoLangInput');

const articleTitle = document.getElementById('articleTitle');
const articleInfo = document.getElementById('articleInfo');
const articleContent = document.getElementById('articleContent');
const selectionBar = document.getElementById('selectionBar');
const selectionPreview = document.getElementById('selectionPreview');
const collectSelectionBtn = document.getElementById('collectSelectionBtn');

const saveSessionBtn = document.getElementById('saveSessionBtn');

const playAudioBtn = document.getElementById('playAudioBtn');
const wordLookupResult = document.getElementById('wordLookupResult');
const favoriteList = document.getElementById('favoriteList');
const exportFavoritesBtn = document.getElementById('exportFavoritesBtn');
const vocabList = document.getElementById('vocabList');
const exportVocabBtn = document.getElementById('exportVocabBtn');

const aiEndpointInput = document.getElementById('aiEndpointInput');
const aiModelInput = document.getElementById('aiModelInput');
const aiKeyInput = document.getElementById('aiKeyInput');

const summaryInput = document.getElementById('summaryInput');
const scoreSummaryBtn = document.getElementById('scoreSummaryBtn');
const scoreResult = document.getElementById('scoreResult');
const historyList = document.getElementById('historyList');

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function setStatus(message, type = '') {
  loadStatus.textContent = message;
  loadStatus.className = `status ${type}`.trim();
}

function setParseHint(message, type = '') {
  parseHint.textContent = message || DEFAULT_PARSE_HINT;
  parseHint.className = `parse-hint ${type}`.trim();
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      favorites: state.favorites,
      vocab: state.vocab,
      history: state.history,
      aiEndpoint: aiEndpointInput.value.trim(),
      aiModel: aiModelInput.value.trim(),
      bridgeEndpoint: bridgeEndpointInput.value.trim(),
      videoLang: videoLangInput.value.trim() || 'en',
      loadMode: state.loadMode,
    })
  );
}

function loadPersistedState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    state.favorites = Array.isArray(parsed.favorites) ? parsed.favorites : [];
    state.vocab = parsed.vocab && typeof parsed.vocab === 'object' ? parsed.vocab : {};
    state.history = Array.isArray(parsed.history) ? parsed.history : [];

    if (parsed.aiEndpoint) aiEndpointInput.value = parsed.aiEndpoint;
    if (parsed.aiModel) aiModelInput.value = parsed.aiModel;
    if (parsed.bridgeEndpoint) bridgeEndpointInput.value = parsed.bridgeEndpoint;
    if (parsed.videoLang) videoLangInput.value = parsed.videoLang;

    if (parsed.loadMode && LOAD_MODE_LABEL[parsed.loadMode]) {
      state.loadMode = parsed.loadMode;
    }
  } catch {
    // Ignore corrupted local state.
  }
}

function setLoadMode(mode) {
  state.loadMode = LOAD_MODE_LABEL[mode] ? mode : 'proxy';

  loadModeInputs.forEach((input) => {
    input.checked = input.value === state.loadMode;
  });

  manualModePanel.classList.toggle('is-hidden', state.loadMode !== 'manual');
  bridgeModePanel.classList.toggle('is-hidden', state.loadMode !== 'bridge');
  videoModePanel.classList.toggle('is-hidden', state.loadMode !== 'video');
}

function getLoadMode() {
  const checked = loadModeInputs.find((input) => input.checked);
  return checked && LOAD_MODE_LABEL[checked.value] ? checked.value : 'proxy';
}

function renderFavorites() {
  if (!state.favorites.length) {
    favoriteList.innerHTML = '<li><p class="empty-note">还没有收藏内容。</p></li>';
    return;
  }

  favoriteList.innerHTML = state.favorites
    .slice()
    .reverse()
    .map(
      (item) => `
      <li>
        <div class="item-top">
          <strong>${escapeHtml(item.text)}</strong>
          <button class="remove-btn" type="button" data-remove-favorite="${item.id}">删除</button>
        </div>
        <p class="item-meta">${escapeHtml(item.articleTitle || '未知文章')} · ${formatDate(item.createdAt)}</p>
      </li>
    `
    )
    .join('');
}

function renderVocab() {
  const words = Object.values(state.vocab);

  if (!words.length) {
    vocabList.innerHTML = '<li><p class="empty-note">点击文章单词后，词汇会自动进入这里。</p></li>';
    return;
  }

  vocabList.innerHTML = words
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .map(
      (item) => `
      <li>
        <div class="item-top">
          <strong>${escapeHtml(item.word)}</strong>
          <button class="remove-btn" type="button" data-remove-word="${escapeHtml(item.word)}">删除</button>
        </div>
        <p class="item-meta">${escapeHtml(item.phonetic || '无音标')} · ${escapeHtml(item.definition || '无释义')}</p>
      </li>
    `
    )
    .join('');
}

function renderHistory() {
  if (!state.history.length) {
    historyList.innerHTML = '<li><p class="empty-note">保存学习记录后，会在这里展示。</p></li>';
    return;
  }

  historyList.innerHTML = state.history
    .slice()
    .reverse()
    .map(
      (item) => `
      <li>
        <div class="item-top">
          <strong>${escapeHtml(item.title || '未命名文章')}</strong>
        </div>
        <p class="item-meta">${formatDate(item.createdAt)} · 得分 ${item.score ?? '-'} · 词汇 ${item.vocabCount} · 收藏 ${item.favoriteCount}</p>
      </li>
    `
    )
    .join('');
}

function formatDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(
    2,
    '0'
  )} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function buildClickableParagraph(text) {
  const tokenReg = /([A-Za-z]+(?:['-][A-Za-z]+)*)/g;
  const chunks = text.split(tokenReg);

  return chunks
    .map((chunk) => {
      if (/^[A-Za-z]+(?:['-][A-Za-z]+)*$/.test(chunk)) {
        const normalized = chunk.toLowerCase();
        return `<span class="word-chip" data-word="${normalized}">${escapeHtml(chunk)}</span>`;
      }
      return escapeHtml(chunk);
    })
    .join('');
}

function renderArticle() {
  setPendingSelection('');

  if (!state.article) {
    articleTitle.textContent = '未加载';
    articleInfo.textContent = '加载后会显示文章来源、字数和解析结果。';
    articleContent.innerHTML = '<p class="empty-note">加载文章后，这里会显示可点击查词的正文内容。</p>';
    return;
  }

  articleTitle.textContent = state.article.title || '未命名文章';
  const modeLabel = LOAD_MODE_LABEL[state.article.loadMode] || '未知模式';
  articleInfo.textContent = `${state.article.siteName || '未知来源'} · ${state.article.wordCount} 词 · ${state.article.paragraphs.length} 段 · ${modeLabel}`;

  articleContent.innerHTML = state.article.paragraphs
    .map((p) => `<p>${buildClickableParagraph(p)}</p>`)
    .join('');
}

function normalizeParagraphs(text) {
  const normalized = text
    .replace(/\r\n?/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!normalized) return [];

  const blocks = normalized
    .split(/\n{2,}/)
    .map((line) => line.trim())
    .filter((line) => line.length > 30);
  if (blocks.length >= 2) return blocks.slice(0, 120);

  return normalized
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 45)
    .slice(0, 120);
}

function countEnglishWords(text) {
  return (text.match(/[A-Za-z]+/g) || []).length;
}

function createLoadError(message, code = 'LOAD_FAILED', hint = '') {
  const error = new Error(message);
  error.code = code;
  error.hint = hint;
  return error;
}

function getHostnameFromUrl(url) {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return '';
  }
}

function buildArticleFromText({ url = '', title = '', siteName = '', text = '', loadMode = 'proxy' }) {
  const normalizedText = text
    .replace(/\r\n?/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const paragraphs = normalizeParagraphs(normalizedText);

  if (!paragraphs.length || normalizedText.length < 120) {
    throw createLoadError('正文内容太少，无法用于学习。请换链接或改用手动粘贴模式。', 'TEXT_TOO_SHORT');
  }

  const fallbackTitle = title || getHostnameFromUrl(url) || '未命名文章';

  return {
    url,
    title: fallbackTitle,
    siteName: siteName || getHostnameFromUrl(url) || '手动输入',
    text: normalizedText,
    paragraphs,
    wordCount: countEnglishWords(normalizedText),
    loadMode,
    loadedAt: new Date().toISOString(),
  };
}

function detectBlockedOrPaywall(url, html, parsed, textContent, paragraphs) {
  const host = getHostnameFromUrl(url).toLowerCase();
  const lower = `${html.slice(0, 180000)}\n${parsed?.excerpt || ''}\n${textContent.slice(0, 6000)}`.toLowerCase();
  const hasPaywallMarker = [
    'paywall',
    'subscription',
    'subscribe',
    'sign in',
    'log in',
    'access denied',
    'captcha',
    'for subscribers',
    'member-only',
  ].some((keyword) => lower.includes(keyword));
  const wsjNotFoundShell =
    host.includes('wsj.com') && (lower.includes('"/not-found"') || lower.includes('"errorcode":"404"'));
  const wordCount = countEnglishWords(textContent);
  const tooShort = wordCount < 140 || paragraphs.length < 2;
  const heavyShell = html.length > 45000 && wordCount < 120;

  if (wsjNotFoundShell) {
    return {
      blocked: true,
      reason: '检测到站点返回的是受限壳页面（常见于 WSJ 未登录或反爬限制）。',
    };
  }

  if ((hasPaywallMarker && tooShort) || heavyShell) {
    return {
      blocked: true,
      reason: '检测到登录/订阅限制，代理拿到的不是完整正文。',
    };
  }

  return { blocked: false, reason: '' };
}

async function fetchArticleViaProxy(url) {
  const proxyUrl = `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`;
  const response = await fetch(proxyUrl, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw createLoadError(`抓取失败（${response.status}）。`, 'PROXY_HTTP_ERROR');
  }

  const html = await response.text();
  const dom = new DOMParser().parseFromString(html, 'text/html');

  let parsed = null;
  if (typeof Readability !== 'undefined') {
    try {
      parsed = new Readability(dom).parse();
    } catch {
      parsed = null;
    }
  }

  const title = parsed?.title || dom.title || url;
  const textContent = (parsed?.textContent || dom.body?.innerText || '').replace(/\s+\n/g, '\n').trim();
  const paragraphs = normalizeParagraphs(textContent);
  const gateCheck = detectBlockedOrPaywall(url, html, parsed, textContent, paragraphs);

  if (gateCheck.blocked) {
    throw createLoadError(
      `代理解析失败：${gateCheck.reason}`,
      'PAYWALL_OR_GATE',
      '请切换到“手动粘贴”或“本地桥接”模式继续学习。'
    );
  }

  return buildArticleFromText({
    url,
    title,
    siteName: parsed?.siteName || getHostnameFromUrl(url),
    text: textContent,
    loadMode: 'proxy',
  });
}

function buildArticleFromManual(title, text, sourceUrl = '') {
  if (!text || text.trim().length < 120) {
    throw createLoadError('手动正文内容太少，请至少粘贴一段完整文章。', 'MANUAL_TOO_SHORT');
  }

  return buildArticleFromText({
    url: sourceUrl,
    title: title || '手动粘贴文章',
    siteName: '手动粘贴',
    text,
    loadMode: 'manual',
  });
}

async function fetchArticleViaBridge(url, endpoint) {
  if (!endpoint) {
    throw createLoadError('请填写本地桥接 Endpoint。', 'BRIDGE_ENDPOINT_MISSING');
  }

  let normalizedEndpoint = endpoint;
  try {
    normalizedEndpoint = new URL(endpoint).toString();
  } catch {
    throw createLoadError('本地桥接 Endpoint 格式不正确。', 'BRIDGE_ENDPOINT_INVALID');
  }

  let response;
  try {
    response = await fetch(normalizedEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });
  } catch (error) {
    throw createLoadError(
      `无法连接本地桥接服务：${error.message || 'network error'}`,
      'BRIDGE_OFFLINE',
      '请先在本机运行 Playwright 桥接脚本，再重新加载。'
    );
  }

  if (!response.ok) {
    const raw = await response.text();
    throw createLoadError(`本地桥接接口失败（${response.status}）：${raw.slice(0, 150)}`, 'BRIDGE_HTTP_ERROR');
  }

  const payload = await response.json();
  if (!payload || typeof payload.text !== 'string') {
    throw createLoadError('本地桥接返回格式错误，缺少 text 字段。', 'BRIDGE_PAYLOAD_INVALID');
  }

  return buildArticleFromText({
    url: payload.url || url,
    title: payload.title || getHostnameFromUrl(url),
    siteName: payload.siteName || getHostnameFromUrl(url),
    text: payload.text,
    loadMode: 'bridge',
  });
}

async function fetchWithTimeout(url, init = {}, timeoutMs = 26000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function buildProxyUrl(sourceUrl, provider = 'allorigins') {
  if (provider === 'allorigins') {
    return `https://api.allorigins.win/raw?url=${encodeURIComponent(sourceUrl)}`;
  }
  return `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(sourceUrl)}`;
}

async function fetchTextViaProxy(sourceUrl, timeoutMs = 30000) {
  const providers = ['allorigins', 'codetabs'];
  let lastError = null;

  for (const provider of providers) {
    try {
      const response = await fetchWithTimeout(buildProxyUrl(sourceUrl, provider), {}, timeoutMs);
      if (!response.ok) {
        throw new Error(`${provider} http ${response.status}`);
      }
      const text = await response.text();
      if (!text.trim()) {
        throw new Error(`${provider} empty payload`);
      }
      return text;
    } catch (error) {
      lastError = error;
    }
  }

  throw createLoadError(`代理请求失败：${lastError?.message || 'unknown error'}`, 'VIDEO_PROXY_FAILED');
}

function extractYouTubeVideoId(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return '';
  }

  const host = url.hostname.toLowerCase();
  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0] || '';
    return /^[\w-]{11}$/.test(id) ? id : '';
  }

  if (!host.includes('youtube.com') && !host.includes('youtube-nocookie.com')) {
    return '';
  }

  const directParam = url.searchParams.get('v');
  if (directParam && /^[\w-]{11}$/.test(directParam)) {
    return directParam;
  }

  const segments = url.pathname.split('/').filter(Boolean);
  const marker = segments.findIndex((seg) => ['shorts', 'embed', 'live', 'v'].includes(seg));
  if (marker >= 0 && segments[marker + 1] && /^[\w-]{11}$/.test(segments[marker + 1])) {
    return segments[marker + 1];
  }

  return '';
}

function parseYouTubeCaptionTracks(html) {
  const marker = '"captionTracks":[';
  const start = html.indexOf(marker);
  if (start < 0) return [];

  const end = html.indexOf('],"audioTracks"', start);
  if (end < 0) return [];

  const jsonText = `{${html.slice(start, end + 1)}}`;

  try {
    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed.captionTracks)) return [];
    return parsed.captionTracks
      .map((track) => ({
        baseUrl: typeof track.baseUrl === 'string' ? track.baseUrl : '',
        languageCode: typeof track.languageCode === 'string' ? track.languageCode : '',
        kind: typeof track.kind === 'string' ? track.kind : '',
        name: track.name?.simpleText || '',
      }))
      .filter((track) => track.baseUrl);
  } catch {
    const fallback = [];
    const trackReg =
      /"baseUrl":"(https:\\\/\\\/www\.youtube\.com\\\/api\\\/timedtext[^"]+)".{0,480}?"languageCode":"([^"]+)"(?:.{0,180}?"kind":"([^"]+)")?/g;
    let matched;

    while ((matched = trackReg.exec(html))) {
      fallback.push({
        baseUrl: matched[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/'),
        languageCode: matched[2] || '',
        kind: matched[3] || '',
        name: '',
      });
    }

    return fallback;
  }
}

function pickYouTubeCaptionTrack(tracks, preferredLang = 'en') {
  if (!tracks.length) return null;
  const target = (preferredLang || 'en').toLowerCase();

  const scoreTrack = (track) => {
    const lang = (track.languageCode || '').toLowerCase();
    const isAsr = track.kind === 'asr';
    if (lang === target && !isAsr) return 100;
    if (lang === target && isAsr) return 96;
    if (lang.startsWith(`${target}-`) && !isAsr) return 94;
    if (lang.startsWith(`${target}-`) && isAsr) return 90;
    if (lang === 'en' && !isAsr) return 80;
    if (lang === 'en' && isAsr) return 75;
    if (!isAsr) return 60;
    return 50;
  };

  return tracks
    .slice()
    .sort((a, b) => scoreTrack(b) - scoreTrack(a))[0];
}

function decodeHtmlEntities(text) {
  const box = document.createElement('textarea');
  box.innerHTML = text;
  return box.value;
}

function mergeTranscriptLines(lines) {
  const cleaned = [];

  lines.forEach((line) => {
    const normalized = normalizeSelection(line).replace(/\[[^\]]+\]/g, '').trim();
    if (!normalized) return;
    if (cleaned.length && cleaned[cleaned.length - 1].toLowerCase() === normalized.toLowerCase()) return;
    cleaned.push(normalized);
  });

  if (!cleaned.length) return '';

  const paragraphs = [];
  let buffer = '';

  cleaned.forEach((line) => {
    const next = buffer ? `${buffer} ${line}` : line;
    if (next.length > 280) {
      if (buffer) paragraphs.push(buffer);
      buffer = line;
    } else {
      buffer = next;
    }
  });

  if (buffer) paragraphs.push(buffer);
  return paragraphs.join('\n\n');
}

function parseTranscriptXmlToText(xmlText) {
  const xml = new DOMParser().parseFromString(xmlText, 'text/xml');
  const nodes = Array.from(xml.querySelectorAll('text'));
  if (!nodes.length) return '';

  const lines = nodes
    .map((node) => decodeHtmlEntities(node.textContent || ''))
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  return mergeTranscriptLines(lines);
}

function cleanupSubtitleText(rawText) {
  const normalized = rawText.replace(/\r\n?/g, '\n');
  const withoutHeader = normalized.replace(/^WEBVTT[^\n]*\n+/i, '');
  const withoutTimestamp = withoutHeader
    .replace(/^\d+\s*$/gm, '')
    .replace(
      /^\d{1,2}:\d{2}(?::\d{2})?[.,]\d{1,3}\s*-->\s*\d{1,2}:\d{2}(?::\d{2})?[.,]\d{1,3}.*$/gm,
      ''
    )
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n');

  return mergeTranscriptLines(
    withoutTimestamp
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
  );
}

function extractYouTubeTitle(html, videoId) {
  const dom = new DOMParser().parseFromString(html, 'text/html');
  const title = (dom.querySelector('title')?.textContent || '').trim();
  if (!title) return `YouTube Video ${videoId}`;
  return title.replace(/\s*-\s*YouTube\s*$/i, '').trim();
}

function isLikelyBlockedPayload(text) {
  const lower = text.toLowerCase();
  return (
    lower.includes('<title>sorry') ||
    lower.includes('our systems have detected unusual traffic') ||
    lower.includes('to continue, please type the characters') ||
    lower.includes('captcha')
  );
}

function buildSimpleTimedtextUrl(videoId, lang = 'en', kind = '') {
  const params = new URLSearchParams({
    v: videoId,
    lang: lang || 'en',
    fmt: 'srv3',
  });
  if (kind === 'asr') params.set('kind', 'asr');
  return `https://www.youtube.com/api/timedtext?${params.toString()}`;
}

async function fetchTextDirectOrProxy(url, timeoutMs = 30000) {
  try {
    const direct = await fetchWithTimeout(url, {}, timeoutMs);
    if (direct.ok) {
      const text = await direct.text();
      if (text.trim() && !isLikelyBlockedPayload(text)) {
        return text;
      }
    }
  } catch {
    // Continue with proxy fallback.
  }

  return fetchTextViaProxy(url, timeoutMs);
}

async function fetchYouTubeTranscript(url, preferredLang = 'en') {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    throw createLoadError('不是有效的 YouTube 视频链接。', 'VIDEO_URL_INVALID');
  }

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const watchHtml = await fetchTextViaProxy(watchUrl, 35000);
  const tracks = parseYouTubeCaptionTracks(watchHtml);

  if (!tracks.length) {
    throw createLoadError(
      '未找到可用字幕轨道。该视频可能关闭了字幕或被平台限制。',
      'VIDEO_CAPTION_TRACK_MISSING',
      '请换一个带字幕的视频，或切换到“手动粘贴”模式。'
    );
  }

  const chosen = pickYouTubeCaptionTrack(tracks, preferredLang) || tracks[0];
  const subtitleCandidates = [];
  let signedSubtitleUrl = chosen.baseUrl;
  if (!/[?&]fmt=/.test(signedSubtitleUrl)) {
    signedSubtitleUrl += '&fmt=srv3';
  }
  subtitleCandidates.push(signedSubtitleUrl);
  subtitleCandidates.push(buildSimpleTimedtextUrl(videoId, chosen.languageCode || preferredLang, chosen.kind));
  if ((chosen.languageCode || '').toLowerCase() !== (preferredLang || 'en').toLowerCase()) {
    subtitleCandidates.push(buildSimpleTimedtextUrl(videoId, preferredLang || 'en', ''));
    subtitleCandidates.push(buildSimpleTimedtextUrl(videoId, preferredLang || 'en', 'asr'));
  }

  let transcriptText = '';
  for (const subtitleUrl of subtitleCandidates) {
    try {
      const subtitleXml = await fetchTextDirectOrProxy(subtitleUrl, 35000);
      if (!subtitleXml.trim() || isLikelyBlockedPayload(subtitleXml)) continue;
      transcriptText = parseTranscriptXmlToText(subtitleXml);
      if (transcriptText.length >= 120) break;
    } catch {
      // Try next subtitle candidate.
    }
  }

  const text = transcriptText;
  if (!text || text.length < 120) {
    throw createLoadError(
      '字幕提取失败或内容过少。',
      'VIDEO_TRANSCRIPT_EMPTY',
      '该视频可能没有公开字幕。请切换“手动粘贴”继续学习。'
    );
  }

  return buildArticleFromText({
    url: watchUrl,
    title: extractYouTubeTitle(watchHtml, videoId),
    siteName: `YouTube · ${chosen.languageCode || preferredLang}${chosen.kind === 'asr' ? ' (自动字幕)' : ''}`,
    text,
    loadMode: 'video',
  });
}

async function fetchSubtitleFileText(url) {
  const raw = await fetchTextViaProxy(url, 30000);
  return cleanupSubtitleText(raw);
}

async function fetchVideoTranscript(url, preferredLang = 'en') {
  const host = getHostnameFromUrl(url).toLowerCase();
  const isYouTube = host === 'youtu.be' || host.includes('youtube.com') || host.includes('youtube-nocookie.com');
  if (isYouTube) {
    return fetchYouTubeTranscript(url, preferredLang);
  }

  if (/\.(vtt|srt|txt)([?#].*)?$/i.test(url)) {
    const text = await fetchSubtitleFileText(url);
    if (!text || text.length < 120) {
      throw createLoadError('字幕文件解析结果过短。', 'SUBTITLE_TOO_SHORT');
    }
    return buildArticleFromText({
      url,
      title: '视频字幕文件',
      siteName: getHostnameFromUrl(url) || '字幕文件',
      text,
      loadMode: 'video',
    });
  }

  throw createLoadError(
    '当前仅支持 YouTube 视频链接，或可直接访问的 .srt/.vtt/.txt 字幕文件链接。',
    'VIDEO_UNSUPPORTED',
    '你可以换成 YouTube 链接，或把脚本粘贴到“手动粘贴”模式。'
  );
}

function shrinkText(text, max = 120) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

function normalizeSelection(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function getSelectedTextInArticle() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return '';

  const range = selection.getRangeAt(0);
  if (range.collapsed) return '';

  const containerNode = range.commonAncestorContainer;
  const container = containerNode.nodeType === Node.ELEMENT_NODE ? containerNode : containerNode.parentElement;
  if (!(container instanceof Element)) return '';
  if (!articleContent.contains(container)) return '';

  return normalizeSelection(selection.toString());
}

function setPendingSelection(text = '') {
  const normalized = normalizeSelection(text);
  state.pendingSelection = normalized;

  if (!normalized || normalized.length < 2) {
    selectionBar.classList.add('is-hidden');
    selectionPreview.textContent = '';
    return;
  }

  selectionPreview.textContent = `已选中：${shrinkText(normalized)}`;
  selectionBar.classList.remove('is-hidden');
}

function addFavorite(text) {
  if (!text) return;
  if (state.favorites.some((item) => item.text === text)) return;

  state.favorites.push({
    id: `fav_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    text,
    articleTitle: state.article?.title || '',
    createdAt: new Date().toISOString(),
  });

  persist();
  renderFavorites();
}

function extractOutputText(payload) {
  if (!payload || typeof payload !== 'object') return '';

  if (typeof payload.output_text === 'string') return payload.output_text;

  if (Array.isArray(payload.output)) {
    const texts = [];
    payload.output.forEach((item) => {
      if (Array.isArray(item.content)) {
        item.content.forEach((piece) => {
          if (typeof piece.text === 'string') texts.push(piece.text);
        });
      }
    });
    if (texts.length) return texts.join('\n');
  }

  if (Array.isArray(payload.choices) && payload.choices[0]?.message?.content) {
    return payload.choices[0].message.content;
  }

  return '';
}

function parseJsonSafely(text) {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    // Continue parsing from fenced block.
  }

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function collectKeywords(text, limit = 20) {
  const words = (text.toLowerCase().match(/[a-z]{4,}/g) || []).filter((word) => !STOP_WORDS.has(word));

  const freq = {};
  words.forEach((word) => {
    freq[word] = (freq[word] || 0) + 1;
  });

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function heuristicScore(articleText, summary) {
  const articleWords = (articleText.match(/[A-Za-z]+/g) || []).length;
  const summaryWords = (summary.match(/[A-Za-z]+/g) || []).length;

  const articleKeywords = collectKeywords(articleText, 24);
  const summaryKeywords = new Set(collectKeywords(summary, 24));

  const overlapCount = articleKeywords.filter((k) => summaryKeywords.has(k)).length;
  const coverage = articleKeywords.length ? overlapCount / articleKeywords.length : 0;
  const lengthRatio = articleWords ? summaryWords / articleWords : 0;
  const sentenceCount = summary.split(/[.!?。！？]/).filter((line) => line.trim()).length;

  const lengthScore = Math.max(0, Math.min(1, 1 - Math.abs(lengthRatio - 0.2) / 0.2));
  const structureScore = Math.max(0, Math.min(1, sentenceCount / 4));

  const score = Math.round((coverage * 0.55 + lengthScore * 0.3 + structureScore * 0.15) * 100);

  const strengths = [];
  const suggestions = [];

  if (coverage >= 0.45) strengths.push('关键信息覆盖率较好。');
  else suggestions.push('可以增加文章核心概念和关键词，避免只写感受。');

  if (lengthRatio >= 0.12 && lengthRatio <= 0.32) strengths.push('总结长度比较合适。');
  else suggestions.push('总结过长或过短，建议控制在原文 15%~30%。');

  if (sentenceCount >= 3) strengths.push('表达有一定结构层次。');
  else suggestions.push('建议至少写 3 句，按“观点-细节-结论”组织。');

  if (!strengths.length) strengths.push('能看出你已经抓住了文章的大方向。');

  return {
    mode: 'heuristic',
    score,
    strengths,
    suggestions,
    revisedSummary: '',
  };
}

async function scoreWithAi(articleText, summary) {
  const endpoint = aiEndpointInput.value.trim();
  const model = aiModelInput.value.trim();
  const apiKey = aiKeyInput.value.trim();

  if (!endpoint || !model || !apiKey) {
    throw new Error('AI 配置不完整');
  }

  const systemPrompt =
    'You are an English reading coach. Grade summary quality from 0-100. Return strict JSON only.';
  const userPrompt = `
Article:\n${articleText.slice(0, 12000)}\n\nUser summary:\n${summary}\n\nReturn JSON with keys:
score(number), strengths(string[]), suggestions(string[]), revisedSummary(string).
Keep feedback concise.
`;

  const payload = endpoint.includes('/chat/completions')
    ? {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
      }
    : {
        model,
        input: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI 请求失败: ${response.status} ${text.slice(0, 120)}`);
  }

  const raw = await response.json();
  const text = extractOutputText(raw);
  const parsed = parseJsonSafely(text);

  if (!parsed || typeof parsed.score !== 'number') {
    throw new Error('AI 返回格式不可解析');
  }

  return {
    mode: 'ai',
    score: Math.max(0, Math.min(100, Math.round(parsed.score))),
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 5) : [],
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 5) : [],
    revisedSummary: typeof parsed.revisedSummary === 'string' ? parsed.revisedSummary : '',
  };
}

function renderScoreResult(result, errorHint = '') {
  const gradeClass = result.score >= 80 ? 'good' : result.score >= 60 ? 'medium' : 'low';
  const modeLabel = result.mode === 'ai' ? 'AI 评分' : '智能评分';

  const strengthsHtml =
    result.strengths && result.strengths.length
      ? `<ul>${result.strengths.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`
      : '<p class="empty-note">暂无</p>';

  const suggestionsHtml =
    result.suggestions && result.suggestions.length
      ? `<ul>${result.suggestions.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`
      : '<p class="empty-note">暂无</p>';

  scoreResult.innerHTML = `
    <span class="score-badge ${gradeClass}">${modeLabel}：${result.score} / 100</span>
    ${errorHint ? `<p class="item-meta">${escapeHtml(errorHint)}</p>` : ''}
    <div class="score-block">
      <h4>做得好的地方</h4>
      ${strengthsHtml}
    </div>
    <div class="score-block">
      <h4>修改建议</h4>
      ${suggestionsHtml}
    </div>
    ${
      result.revisedSummary
        ? `<div class="score-block"><h4>参考改写</h4><p class="item-meta">${escapeHtml(result.revisedSummary)}</p></div>`
        : ''
    }
  `;
}

async function lookupWord(word) {
  if (!word) return;

  wordLookupResult.innerHTML = `<p class="empty-note">正在查询 <strong>${escapeHtml(word)}</strong> ...</p>`;

  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!response.ok) throw new Error('词典中未找到该单词');

    const data = await response.json();
    const entry = data[0] || {};
    const phonetic =
      entry.phonetic || (Array.isArray(entry.phonetics) && entry.phonetics.find((p) => p.text)?.text) || '无音标';
    const audio =
      (Array.isArray(entry.phonetics) && entry.phonetics.find((p) => p.audio && p.audio.trim())?.audio) || '';

    const meanings = (entry.meanings || [])
      .flatMap((m) => (m.definitions || []).map((d) => `${m.partOfSpeech || 'meaning'}: ${d.definition}`))
      .slice(0, 4);

    const example =
      (entry.meanings || [])
        .flatMap((m) => (m.definitions || []).map((d) => d.example).filter(Boolean))[0] || '暂无例句';

    state.lastAudio = audio || null;
    playAudioBtn.disabled = !audio;

    wordLookupResult.innerHTML = `
      <div class="word-title">
        <strong>${escapeHtml(entry.word || word)}</strong>
        <span class="phonetic">${escapeHtml(phonetic)}</span>
      </div>
      <ol class="meaning-list">
        ${meanings.map((line) => `<li>${escapeHtml(line)}</li>`).join('') || '<li>暂无英英释义</li>'}
      </ol>
      <p class="example-box"><strong>例句：</strong> ${escapeHtml(example)}</p>
    `;

    state.vocab[word.toLowerCase()] = {
      word: (entry.word || word).toLowerCase(),
      phonetic,
      definition: meanings[0] || '暂无释义',
      example,
      audio,
      updatedAt: new Date().toISOString(),
    };

    persist();
    renderVocab();
  } catch (error) {
    playAudioBtn.disabled = true;
    state.lastAudio = null;
    wordLookupResult.innerHTML = `<p class="empty-note">查词失败：${escapeHtml(error.message || 'unknown error')}</p>`;
  }
}

function exportVocabCsv() {
  const words = Object.values(state.vocab);
  if (!words.length) {
    alert('词汇本为空，先点击正文查词。');
    return;
  }

  const header = ['word', 'phonetic', 'definition', 'example', 'updatedAt'];
  const rows = words.map((item) => [item.word, item.phonetic, item.definition, item.example, item.updatedAt]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell || '').replaceAll('"', '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vocabulary-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportFavoritesCsv() {
  const favorites = state.favorites.slice();
  if (!favorites.length) {
    alert('收藏为空，先在文章中收藏一句话或短语。');
    return;
  }

  const header = ['text', 'articleTitle', 'createdAt'];
  const rows = favorites.map((item) => [item.text, item.articleTitle || '', item.createdAt]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell || '').replaceAll('"', '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `favorites-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function saveSession() {
  if (!state.article) {
    alert('请先加载文章。');
    return;
  }

  const record = {
    id: `session_${Date.now()}`,
    createdAt: new Date().toISOString(),
    url: state.article.url,
    title: state.article.title,
    score: state.lastScore?.score ?? null,
    vocabCount: Object.keys(state.vocab).length,
    favoriteCount: state.favorites.length,
    summary: summaryInput.value.trim().slice(0, 5000),
  };

  state.history.push(record);
  if (state.history.length > 80) {
    state.history = state.history.slice(-80);
  }

  persist();
  renderHistory();
  alert('已保存本次学习记录。');
}

async function handleLoadArticle() {
  const mode = getLoadMode();
  state.loadMode = mode;
  const url = articleUrlInput.value.trim();
  let normalizedUrl = '';
  let normalizedHost = '';

  if (mode !== 'manual' && !url) {
    setStatus('请输入文章链接。', 'error');
    return;
  }

  if (url && mode !== 'manual') {
    try {
      normalizedUrl = new URL(url).toString();
      normalizedHost = getHostnameFromUrl(normalizedUrl).toLowerCase();
    } catch {
      setStatus('链接格式不正确。', 'error');
      return;
    }
  } else if (url && mode === 'manual') {
    try {
      normalizedUrl = new URL(url).toString();
    } catch {
      normalizedUrl = '';
    }
  }

  loadArticleBtn.disabled = true;
  const isYouTubeUrl =
    normalizedHost === 'youtu.be' || normalizedHost.includes('youtube.com') || normalizedHost.includes('youtube-nocookie.com');
  setStatus(
    mode === 'manual'
      ? '正在载入手动粘贴内容...'
      : mode === 'video'
        ? '正在提取视频字幕...'
      : mode === 'bridge'
        ? '正在通过本地桥接抓取文章...'
        : '正在通过代理抓取并解析文章...'
  );
  setParseHint(DEFAULT_PARSE_HINT);

  try {
    if (mode === 'manual') {
      state.article = buildArticleFromManual(manualTitleInput.value.trim(), manualTextInput.value, normalizedUrl);
      setParseHint('已使用手动粘贴模式加载正文。', 'success');
      setStatus('手动内容加载成功。你可以开始查词和总结。', 'ok');
    } else if (mode === 'video') {
      state.article = await fetchVideoTranscript(normalizedUrl, videoLangInput.value.trim() || 'en');
      setParseHint('视频字幕提取成功。你可以像文章一样点击单词查词。', 'success');
      setStatus('视频脚本加载成功。你可以开始查词和总结。', 'ok');
    } else if (mode === 'bridge') {
      state.article = await fetchArticleViaBridge(normalizedUrl, bridgeEndpointInput.value.trim());
      setParseHint('已通过本地桥接模式加载正文。', 'success');
      setStatus('本地桥接解析成功。你可以点击单词查词。', 'ok');
    } else {
      if (isYouTubeUrl) {
        state.article = await fetchVideoTranscript(normalizedUrl, videoLangInput.value.trim() || 'en');
        setParseHint('检测到 YouTube 链接，已自动使用视频字幕模式。', 'success');
        setStatus('视频脚本加载成功。你可以开始查词和总结。', 'ok');
      } else {
        state.article = await fetchArticleViaProxy(normalizedUrl);
        setParseHint('代理解析成功。遇到受限站点时可切换到“手动粘贴”或“本地桥接”。', 'success');
        setStatus('文章解析成功。你可以点击单词查词。', 'ok');
      }
    }

    renderArticle();
    persist();
  } catch (error) {
    if (error.hint) {
      setParseHint(error.hint, 'warning');
    } else if (error.code === 'PAYWALL_OR_GATE') {
      setParseHint('当前链接受登录/付费墙限制，请切换到“手动粘贴”或“本地桥接”模式。', 'warning');
    } else {
      setParseHint(DEFAULT_PARSE_HINT);
    }
    setStatus(error.message || '文章解析失败。', 'error');
  } finally {
    loadArticleBtn.disabled = false;
  }
}

function bindEvents() {
  loadArticleBtn.addEventListener('click', handleLoadArticle);
  loadModeInputs.forEach((input) => {
    input.addEventListener('change', () => {
      setLoadMode(input.value);
      setParseHint(DEFAULT_PARSE_HINT);
      persist();
    });
  });

  articleUrlInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleLoadArticle();
    }
  });

  articleUrlInput.addEventListener('paste', () => {
    setTimeout(() => {
      const text = articleUrlInput.value.trim();
      if (getLoadMode() !== 'manual' && /^https?:\/\//i.test(text)) {
        handleLoadArticle();
      }
    }, 80);
  });

  articleContent.addEventListener('click', (event) => {
    const selectedText = getSelectedTextInArticle();
    if (selectedText.length > 1) {
      setPendingSelection(selectedText);
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) return;
    const chip = target.closest('.word-chip');
    if (!(chip instanceof HTMLElement)) return;
    const word = chip.dataset.word;
    if (!word) return;
    lookupWord(word);
  });

  document.addEventListener('selectionchange', () => {
    const selected = getSelectedTextInArticle();
    setPendingSelection(selected);
  });

  collectSelectionBtn.addEventListener('click', () => {
    const selected = state.pendingSelection || getSelectedTextInArticle();
    if (!selected || selected.length < 2) {
      alert('请先在文章区域选中一句话或短语。');
      return;
    }
    addFavorite(selected);
    setPendingSelection('');
    const selection = window.getSelection();
    selection?.removeAllRanges();
  });

  saveSessionBtn.addEventListener('click', saveSession);

  playAudioBtn.addEventListener('click', () => {
    if (!state.lastAudio) return;
    const audio = new Audio(state.lastAudio);
    audio.play().catch(() => {
      alert('播放失败，可能是浏览器拦截了自动音频。');
    });
  });

  favoriteList.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const id = target.dataset.removeFavorite;
    if (!id) return;

    state.favorites = state.favorites.filter((item) => item.id !== id);
    persist();
    renderFavorites();
  });

  vocabList.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const word = target.dataset.removeWord;
    if (!word) return;
    delete state.vocab[word.toLowerCase()];
    persist();
    renderVocab();
  });

  exportFavoritesBtn.addEventListener('click', exportFavoritesCsv);
  exportVocabBtn.addEventListener('click', exportVocabCsv);

  scoreSummaryBtn.addEventListener('click', async () => {
    if (!state.article) {
      alert('请先加载文章。');
      return;
    }

    const summary = summaryInput.value.trim();
    if (summary.length < 30) {
      alert('总结太短，至少写 30 个字符。');
      return;
    }

    scoreSummaryBtn.disabled = true;
    scoreResult.innerHTML = '<p class="empty-note">正在评分中...</p>';

    const heuristic = heuristicScore(state.article.text, summary);
    let finalResult = heuristic;
    let hint = '';

    if (aiKeyInput.value.trim()) {
      try {
        finalResult = await scoreWithAi(state.article.text, summary);
      } catch (error) {
        hint = `AI 调用失败，已使用内置智能评分：${error.message || 'unknown error'}`;
        finalResult = heuristic;
      }
    }

    state.lastScore = finalResult;
    renderScoreResult(finalResult, hint);
    persist();
    scoreSummaryBtn.disabled = false;
  });

  aiEndpointInput.addEventListener('change', persist);
  aiModelInput.addEventListener('change', persist);
  bridgeEndpointInput.addEventListener('change', persist);
  videoLangInput.addEventListener('change', persist);
}

function init() {
  loadPersistedState();
  setLoadMode(state.loadMode);
  setParseHint(DEFAULT_PARSE_HINT);
  renderArticle();
  renderFavorites();
  renderVocab();
  renderHistory();
  bindEvents();
}

init();
