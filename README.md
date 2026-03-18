# Claw 导航站（独立版）

这是一个纯静态导航站，不依赖 `openclaw101` 模板。

## 本地打开

方式 1：直接双击 `index.html`。

方式 2：起本地静态服务（推荐）：

```bash
cd /Users/guoxl/Documents/Playground/claw-nav-site
python3 -m http.server 5173
```

浏览器访问：

- http://localhost:5173

## 文件结构

- `index.html`: 页面结构
- `styles.css`: 视觉与响应式样式
- `app.js`: 数据、筛选、搜索、渲染逻辑

## 如何加链接

在 `app.js` 的 `resources` 数组中新增对象：

- `title`
- `desc`
- `url`
- `source`
- `lang` (`zh` / `en`)
- `category`
- `featured` (`true` / `false`)
- `tags`
