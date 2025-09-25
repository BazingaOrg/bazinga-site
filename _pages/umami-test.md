---
layout: default
title: Umami 测试页面
feature: 1
---

# Umami 分析功能测试页面

这个页面用于测试 umami 分析功能的各个部分：

## 1. 页面访问追踪
✅ 此页面访问会被记录，包含语言信息：`{{ lang }}`

## 2. 语言切换追踪
<a href="/" srclang="en-US">切换到英文</a> | <a href="/zh-CN/" srclang="zh-CN">切换到中文</a>

## 3. 点赞功能追踪
{% if page.feature == 1 %}
<open-heart class="text-open-heart" href="https://site.bazinga.ink/like?id={{ page.url }}" emoji="❤️">
  <span class="on">已点赞</span><span class="off">点赞</span>
</open-heart>
{% endif %}

## 4. RSS 订阅链接追踪
- <a href="/feed.xml">博客 RSS</a>
- <a href="/notes.xml">笔记 RSS</a>
- <a href="/photos.xml">照片 RSS</a>
- <a href="/stories.xml">故事 RSS</a>

## 5. 外部链接追踪
- <a href="https://github.com">GitHub</a>
- <a href="https://google.com">Google</a>

## 6. 测试标签（仅笔记页面）
{% if page.collection == "notes" %}
<div class="note-tags">
  <span class="note-tag" data-tag="测试">测试</span>
  <span class="note-tag" data-tag="分析">分析</span>
  <span class="note-tag" data-tag="umami">umami</span>
</div>
{% endif %}

## 7. 测试照片链接
<div class="photos">
  <a href="/photos#Ptest-photo" class="image-link">
    <img src="https://via.placeholder.com/200" height="200" alt="测试照片" loading="lazy">
  </a>
</div>

## 8. 自定义事件测试按钮
<button onclick="testCustomEvent()">测试自定义事件</button>

<script>
function testCustomEvent() {
  if (typeof window.umami !== 'undefined' && window.umami.track) {
    window.umami.track('test_event', {
      event_name: '自定义测试事件',
      test_value: Math.random(),
      timestamp: new Date().toISOString()
    });
    alert('自定义事件已发送！');
  } else {
    alert('umami 未加载，可能被广告拦截器阻止');
  }
}
</script>

---

**页面信息：**
- 语言：`{{ lang }}`
- 页面类型：`{{ page.collection | default: "page" }}`
- URL：`{{ page.url }}`
- 时间：`{{ page.date | date: "%Y-%m-%d %H:%M" }}`