const STORAGE_KEY = 'english-study-hub-v1';
const STOP_WORDS = new Set([
  'about', 'after', 'again', 'against', 'almost', 'along', 'also', 'although', 'always', 'among',
  'because', 'before', 'being', 'between', 'both', 'could', 'every', 'first', 'from', 'have',
  'however', 'just', 'many', 'might', 'more', 'most', 'other', 'over', 'same', 'such', 'than',
  'that', 'their', 'there', 'these', 'they', 'this', 'those', 'through', 'under', 'very', 'were',
  'what', 'when', 'where', 'which', 'while', 'with', 'would', 'your', 'into', 'onto', 'been',
  'them', 'then', 'some', 'each', 'like', 'only', 'make', 'made', 'does', 'did', 'much', 'well'
]);

const state = {
  article: null,
  favorites: [],
  vocab: {},
  history: [],
  lastAudio: null,
  lastScore: null,
  pendingSelection: '',
};

const articleUrlInput = document.getElementById('articleUrlInput');
const loadArticleBtn = document.getElementById('loadArticleBtn');
const loadStatus = document.getElementById('loadStatus');

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
const clearFavoritesBtn = document.getElementById('clearFavoritesBtn');
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

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      favorites: state.favorites,
      vocab: state.vocab,
      history: state.history,
      aiEndpoint: aiEndpointInput.value.trim(),
      aiModel: aiModelInput.value.trim(),
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
  } catch {
    // Ignore corrupted local state.
  }
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
  articleInfo.textContent = `${state.article.siteName || '未知来源'} · ${state.article.wordCount} 词 · ${state.article.paragraphs.length} 段`;

  articleContent.innerHTML = state.article.paragraphs
    .map((p) => `<p>${buildClickableParagraph(p)}</p>`)
    .join('');
}

function normalizeParagraphs(text) {
  return text
    .split(/\n{2,}/)
    .map((line) => line.trim())
    .filter((line) => line.length > 40)
    .slice(0, 120);
}

async function fetchArticle(url) {
  const proxyUrl = `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`;
  const response = await fetch(proxyUrl, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`抓取失败（${response.status}）`);
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

  if (!paragraphs.length) {
    throw new Error('未能解析到正文内容，请换一个文章链接。');
  }

  const siteName = parsed?.siteName || new URL(url).hostname;
  const wordCount = (textContent.match(/[A-Za-z]+/g) || []).length;

  return {
    url,
    title,
    siteName,
    text: textContent,
    paragraphs,
    wordCount,
    loadedAt: new Date().toISOString(),
  };
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
  const url = articleUrlInput.value.trim();
  if (!url) {
    setStatus('请输入文章链接。', 'error');
    return;
  }

  let normalizedUrl = url;
  try {
    normalizedUrl = new URL(url).toString();
  } catch {
    setStatus('链接格式不正确。', 'error');
    return;
  }

  loadArticleBtn.disabled = true;
  setStatus('正在抓取并解析文章，请稍等...');

  try {
    state.article = await fetchArticle(normalizedUrl);
    renderArticle();
    setStatus('文章解析成功。你可以点击单词查词。', 'ok');
  } catch (error) {
    setStatus(error.message || '文章解析失败。', 'error');
  } finally {
    loadArticleBtn.disabled = false;
  }
}

function bindEvents() {
  loadArticleBtn.addEventListener('click', handleLoadArticle);

  articleUrlInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleLoadArticle();
    }
  });

  articleUrlInput.addEventListener('paste', () => {
    setTimeout(() => {
      const text = articleUrlInput.value.trim();
      if (/^https?:\/\//i.test(text)) {
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

  clearFavoritesBtn.addEventListener('click', () => {
    if (!state.favorites.length) return;
    state.favorites = [];
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
}

function init() {
  loadPersistedState();
  renderArticle();
  renderFavorites();
  renderVocab();
  renderHistory();
  bindEvents();
}

init();
