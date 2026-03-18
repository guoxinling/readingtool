# Claw Study Lab

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

## GitHub Pages

仓库推送到 `main` 后会触发 Pages 工作流。

- 工作流文件：`.github/workflows/deploy-pages.yml`
- 预期地址：`https://guoxinling.github.io/clawtab/`

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
