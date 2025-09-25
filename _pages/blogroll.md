---
layout: default
title: Blogroll
type: static
---

<a href="/blogroll.xml">RSS</a>

This page is frequently updated. Only websites that are being actively updated are included (in theory), and blogs are ordered by addition time (oldest first).

---

{% if site.data.blogroll and site.data.blogroll.size > 0 %}
{% assign links = site.data.blogroll | sort: "added_at" %}
{%- for item in links %}
## [{{ item.title }}]({{ item.url }}) <code class="smol">({{ item.lang }})</code>
{{ item.description }}
{%- endfor %}
{% else %}
<div class="empty-state">
  <p><em>No blogs are currently listed in the blogroll.</em></p>
  <p class="smol">The blogroll is being updated. Check back later!</p>
</div>
{% endif %}
