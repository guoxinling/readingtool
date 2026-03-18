# English Study Hub

一个纯前端学习工具，聚焦你提出的 6 个核心需求：

1. 点击查词（音标、发音、英英释义、例句）
2. 收藏句子 / 短语
3. 用自己的话总结文章并获得评分与修改建议
4. 词汇导出 CSV
5. 历史学习记录存储
6. 粘贴文章链接后自动解析并展示

## 本地运行

```bash
cd /Users/guoxl/Documents/Playground/claw-nav-site
python3 -m http.server 5173
```

打开 [http://localhost:5173](http://localhost:5173)

## 文章导入模式

页面支持 4 种导入方式：

- `代理解析`：默认模式，直接抓取公开网页并自动抽取正文。
- `视频字幕`：提取视频字幕并转成可学习正文（优先支持 YouTube）。
- `手动粘贴`：复制文章正文到页面后加载，适合付费墙或登录内容。
- `本地桥接`：通过本机 Playwright 浏览器会话抓取正文，适合 WSJ 等站点。

> 说明：WSJ / FT / NYT 这类站点常有登录、订阅和反爬限制，默认代理模式可能拿不到正文。
> 说明：视频模式当前主要支持 YouTube 链接；若视频无公开字幕，可切换“手动粘贴”。

## 本地桥接（可选）

先安装依赖：

```bash
cd /Users/guoxl/Documents/Playground/claw-nav-site
npm i -D playwright
npx playwright install chromium
```

启动桥接服务：

```bash
HEADED=1 node tools/playwright-bridge.mjs --port 8787
```

然后在页面里切换到 `本地桥接` 模式，Endpoint 填：

```text
http://127.0.0.1:8787/extract
```

首次使用可先访问登录引导接口（浏览器打开目标站）：

```text
http://127.0.0.1:8787/open?url=https://www.wsj.com/
```

## GitHub Pages

仓库推送到 `main` 后会触发 Pages 工作流。

- 工作流文件：`.github/workflows/deploy-pages.yml`
- 预期地址：`https://guoxinling.github.io/readingtool/`

如果第一次工作流失败，请在仓库设置里启用：

- `Settings > Pages > Build and deployment > Source = GitHub Actions`

## AI 评分说明

- 默认使用内置智能评分（不需要 API Key）。
- 你也可以在页面“高级设置”填入自己的 AI Endpoint + Model + API Key。
- 若 AI 请求失败，会自动回退到内置智能评分。

## 数据存储

所有学习数据通过浏览器 `localStorage` 保存在本机，包括：

- 收藏句子
- 词汇本
- 历史学习记录
- AI Endpoint / Model 配置（不保存 API Key）
