# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

这是一个基于 Jekyll 的个人网站，使用 Ruby 构建，部署在 Vercel 上。网站地址：https://site.bazinga.ink

## 常用命令

### 开发环境

```bash
# 安装依赖
bundle install

# 启动开发服务器（推荐）
./start

# 手动启动开发服务器
bundle exec jekyll serve -w --future

# 开发服务器（Vercel 本地模拟）
bundle exec jekyll serve --host 0.0.0.0 --port 3000
```

### 构建和部署

```bash
# 构建生产版本
bundle exec jekyll build

# Vercel 部署命令（自动执行）
bundle exec jekyll build  # buildCommand
_site/                    # outputDirectory
```

## 项目架构

### 核心技术栈
- **Jekyll** - 静态站点生成器 (github-pages gem)
- **Ruby** - 后端语言，使用 Bundler 管理依赖
- **Liquid** - Jekyll 模板引擎
- **SCSS** - CSS 预处理器（`assets/new.scss`）
- **OpenStories/OpenHeart** - 自定义 Web Components，用于故事展示和点赞功能
- **JavaScript ES6+** - 模块化前端脚本，包含分析、光标效果和交互功能

### 多语言和国际化架构
网站支持中英双语，通过以下方式实现：
- 主页面：`index.html` (英文) 和 `index-zh-CN.html` (中文)
- 国际化配置：`_config.yml` 的 `i18n` 部分定义了所有多语言字符串
- 语言检测：通过页面路径和 `lang` 参数控制语言显示

### 内容管理系统
网站采用分离的内容集合架构：
- **Posts** (`_posts/`): 博客文章，需要 `feature: 1` 才在主页显示
- **Notes** (`_notes/`): 短笔记，支持标签筛选
- **Stories** (`_stories/`): 图片故事，使用 UUID 命名
- **Data Files** (`_data/`): JSON/YAML 格式的结构化数据
  - `photos.json`: 照片数据
  - `film.json`: 胶片照片数据
  - `blogroll.yml`: 友情链接
  - `issues.yml`: 问题追踪

### RSS 订阅架构
网站提供多个独立的 RSS 源，位于 `/feeds/` 目录：
- `/feed.xml` - 主博客订阅
- `/notes.xml` - 笔记订阅
- `/photos.xml` - 照片订阅
- `/stories.xml` - 故事订阅
- `/film.xml` - 胶片照片订阅

### 部署架构
- **平台**: Vercel
- **构建流程**: vercel.json 定义了完整的构建和路由配置
- **路由配置**: 特殊处理 RSS 内容类型和页面重定向

## 内容创建详细指南

### 1. 博客文章 (Posts)

**文件位置**: `_posts/`
**命名格式**: `YYYY-MM-DD-title.md`

```yaml
---
title: 文章标题              # 必填
date: 2025-01-01 12:00:00    # 必填
feature: 1                   # 在主页显示（仅设为1时显示）
tags: [技术, 博客]           # 可选
---

文章正文内容...
```

**重要**: 只有设置 `feature: 1` 的文章才会在主页的 Recent Posts 部分显示。

### 2. 笔记 (Notes)

**文件位置**: `_notes/`
**命名格式**: `YYYY-MM-DD-title.md`

```yaml
---
date: 2025-01-01 12:00:00    # 必填：YAML 格式日期
tags: [技术, 生活]           # 必填：用于页面筛选
lang: zh-CN                  # 可选：语言标识
---

笔记内容...
```

### 3. 故事 (Stories)

**文件位置**: `_stories/`
**命名格式**: UUID 格式（如 `005dd577-dc04-4e80-f3cc-c9763b6d7500.md`）

```yaml
---
layout: story
date: 2025/7/31 1:41           # 必填：斜杠格式日期
tags: [Life, Highlight, Cook]  # 可选：Highlight 标签用于首页显示
title: Story                   # 可选
image: https://example.com/image.jpg  # 必填：图片URL
caption: |                     # 可选：图片说明
  图片描述文字
alt: |                        # 必填：图片 alt 文本
  图片替代文字描述
---

![alt文本](图片URL)

故事正文内容...
```

**UUID 生成**: 使用 `uuidgen` 命令或在线 UUID 生成器

### 4. 照片数据

**文件位置**: `_data/photos.json`

```json
[
  {
    "id": "photo-unique-id",
    "uploaded": "2025-01-01T00:00:00Z",
    "variants": [
      "https://example.com/image/thumbnail",
      "https://example.com/image/public"
    ],
    "meta": {
      "ratio": 1.5,              # 必填：宽高比
      "alt": "图片描述",         # 必填
      "caption": "说明文字",     # 可选
      "location": "拍摄地点"     # 可选
    }
  }
]
```

### 5. 胶片照片

**文件位置**: `_data/film.json`
**格式同 photos.json**

也可以创建独立的胶卷专辑页面：
- 在 `_pages/` 创建 `film-roll-XX.html`
- 使用特定的 HTML 结构展示胶卷照片集

## 开发注意事项

### 样式和脚本架构
- **主样式文件**：`assets/new.scss` - 包含所有网站样式
- **主脚本文件**：`assets/site.js` - 核心功能模块
- **根页面脚本**：`assets/root.js` - 主页特殊交互
- **模块化脚本**：
  - `umami.js` - 网站分析追踪
  - `cursor-effects.js` - 光标效果
  - `performance-tracking.js` - 性能监控
  - `journey-tracking.js` - 用户行为追踪
  - `content-health-scoring.js` - 内容健康度评估
  - `ab-testing.js` - A/B 测试功能

### 数据更新指南
- 博客链接：编辑 `_data/blogroll.yml`
- 问题跟踪：编辑 `_data/issues.yml`
- 照片数据：编辑 `_data/photos.json`
- 胶片照片数据：编辑 `_data/film.json`
- 故事数据：编辑 `_data/stories.json`

### UUID 生成
Stories 文件名使用 UUID 格式，生成方法：
```bash
# macOS/Linux
uuidgen | tr '[:upper:]' '[:lower:]'

# 或使用在线 UUID 生成器
```

### 图片处理要求
- Photos 和 Film photos 需要两个变体：`/thumbnail` 和 `/public`
- Stories 只需要 `/public` 变体
- 图片宽高比 (ratio) 必须准确计算

### 标签系统
- Notes 的标签用于页面筛选功能
- Stories 的标签用于分类展示，`Highlight` 标签用于首页显示
- 中文标签需要在 `_config.yml` 的 `i18n` 部分定义翻译

## 扩展内容创建指南

### Stories 模块

**文件位置**: `_stories/` 目录
**文件格式**: UUID 命名的 `.md` 文件（如 `0075717a-604f-44a2-1f30-244a92449d00.md`）

**文件内容格式**:
```yaml
---
layout: story
date: 2025/7/31 1:41           # 必填：日期时间
tags: [ Life, Highlight, Cook ] # 可选：标签数组
title: Story                   # 可选：标题
image: https://photos.muan.dev/cdn-cgi/imagedelivery/-wp_VgtWlgmh1JURQ8t1mg/UUID/public  # 必填：图片URL
caption: |                     # 可选：图片描述
  Couldn't source guanciale.
alt: |                        # 必填：图片alt文本
  a green plate of carbonara with bacon
---

![图片alt文本](图片URL)

正文内容，支持 Markdown 格式。
```

**展示链路**:
- 主页：通过 `{% include stories.html lang="en" %}` 显示
- 单独页面：每个故事有独立的 URL
- RSS 订阅：`/stories.xml`

**必填字段**: `layout`, `date`, `image`, `alt`
**可选字段**: `tags`, `title`, `caption`

### Photos 模块

**数据位置**: `_data/photos.json`
**页面位置**: `/photos.html`

**数据格式**:
```json
[
  {
    "id": "photo-unique-id",
    "uploaded": "2025-01-01T00:00:00Z",
    "variants": [
      "https://example.com/image/thumbnail",
      "https://example.com/image/public"
    ],
    "meta": {
      "ratio": 1.5,                    # 必填：图片宽高比
      "alt": "图片描述",               # 必填：alt文本
      "caption": "图片说明",           # 可选：说明文字
      "location": "拍摄地点"           # 可选：地点信息
    }
  }
]
```

**展示链路**:
- 主页：显示最新 10 张照片的缩略图
- 详细页面：`/photos` 显示所有照片
- 单张照片：通过 `#P{id}` 锚点定位

**必填字段**: `id`, `uploaded`, `variants`, `meta.ratio`, `meta.alt`
**可选字段**: `meta.caption`, `meta.location`

### Film Photos 模块

**数据位置**: `_data/film.json`
**页面位置**: `/film.html`
**专辑页面**: `_pages/film-roll-XX.html`

**数据格式**:
```json
[
  {
    "id": "film-unique-id",
    "uploaded": "2025-01-01T00:00:00Z",
    "variants": [
      "https://example.com/image/thumbnail",
      "https://example.com/image/public"
    ],
    "meta": {
      "ratio": 1.33,                   # 必填：图片宽高比
      "alt": "图片描述",               # 必填：alt文本
      "caption": "图片说明",           # 可选：说明文字
      "location": "拍摄地点",          # 可选：地点信息
      "camera": "相机型号",            # 可选：相机信息
      "film": "胶卷型号"               # 可选：胶卷信息
    }
  }
]
```

**胶卷专辑格式** (`_pages/film-roll-XX.html`):
```yaml
---
layout: default
title: Film#1
type: photos
has_open_heart: true
open_heart: 1
---

<div class="photos-wrapper" id="photos">
<figure class="figure-landscape" style="...">
  <div class="desc">
    March 2023
    <open-heart class="text-open-heart" href="..." emoji="❤️">
      <span class="on">(Liked.)</span><span class="off"><kbd>Like?</kbd></span>
    </open-heart><br>
    <u>Kodak Ektar with Vibe MAX 400 (13/54)</u>
  </div>
  <p>专辑描述文字</p>
</figure>

<figure class="figure-portrait">
  <a href="/images/film-roll-01/01.jpg">
    <img src="/images/film-roll-01/01.jpg" loading="lazy" alt="图片描述">
  </a>
  <figcaption>图片说明</figcaption>
</figure>
</div>
```

**展示链路**:
- 主页：显示最新 10 张胶片照片
- 详细页面：`/film` 显示所有胶片照片
- 专辑页面：独立的胶卷专辑页面

### Notes 模块

**文件位置**: `_notes/` 目录
**文件格式**: `YYYY-MM-DD-title.md`

**文件内容格式**:
```yaml
---
date: 2025-01-01 12:00:00    # 必填：日期时间
tags: [技术, 生活]           # 必填：标签数组
lang: zh-CN                  # 可选：语言标识
---

笔记正文内容，支持 Markdown 格式。
可以包含多段落、链接、代码块等。
```

**展示链路**:
- 主页：显示最新一条笔记
- 笔记页面：`/notes` 显示所有笔记，支持标签筛选
- 单条笔记：每条笔记有独立的 URL
- RSS 订阅：`/notes.xml`

**必填字段**: `date`, `tags`
**可选字段**: `lang`

### Recent Posts 模块

**文件位置**: `_posts/` 目录
**文件格式**: `YYYY-MM-DD-title.md`

**文件内容格式**:
```yaml
---
title: 文章标题              # 必填：文章标题
date: 2025-01-01 12:00:00    # 必填：发布日期
feature: 1                   # 可选：是否在主页显示（1为显示）
tags: [技术, 博客]           # 可选：标签
---

文章正文内容，支持完整的 Markdown 格式。
```

**展示链路**:
- 主页：显示带有 `feature: 1` 标记的文章
- 文章页面：每篇文章有独立的 URL
- RSS 订阅：`/feed.xml`

**必填字段**: `title`, `date`
**重要字段**: `feature: 1`（用于在主页显示）

### Web Components 和自定义功能

#### OpenHeart 点赞系统
- **用途**: 网站内容点赞功能
- **实现**: 使用 `open-heart-element` Web Component
- **存储**: 点赞数据存储在独立服务端
- **集成**: 在故事页面和胶卷专辑中使用

#### 内容分析系统
- **Umami 集成**: 网站访问和用户行为分析
- **性能监控**: 页面加载时间和性能指标追踪
- **A/B 测试**: 内容展示效果测试
- **内容健康度**: 自动评估内容质量和用户参与度

#### 动态功能
- **光标效果**: 基于页面类型的动态光标效果
- **分享功能**: 原生分享 API 集成
- **本地存储**: 用户偏好设置和缓存管理

