export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Access-Key');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持 POST 请求' });
  }

  // 检查环境变量
  const { GITHUB_TOKEN, GITHUB_REPO, WRITE_ACCESS_KEY } = process.env;
  
  if (!GITHUB_TOKEN || !GITHUB_REPO || !WRITE_ACCESS_KEY) {
    console.error('缺少必要的环境变量:', {
      hasToken: !!GITHUB_TOKEN,
      hasRepo: !!GITHUB_REPO, 
      hasKey: !!WRITE_ACCESS_KEY
    });
    return res.status(500).json({ error: '服务器配置错误' });
  }

  // 验证访问密钥
  const accessKey = req.headers['x-access-key'];
  if (!accessKey || accessKey !== WRITE_ACCESS_KEY) {
    return res.status(401).json({ error: '无效的访问密钥' });
  }

  // 验证请求数据
  const { title, content, tags, lang = 'zh-CN' } = req.body;
  
  if (!title || !title.trim()) {
    return res.status(400).json({ error: '标题不能为空' });
  }
  
  if (!content || !content.trim()) {
    return res.status(400).json({ error: '笔记内容不能为空' });
  }
  
  if (!tags || !Array.isArray(tags) || tags.length === 0) {
    return res.status(400).json({ error: '请至少选择一个标签' });
  }
  
  // 过滤和清理标签
  const cleanedTags = tags
    .map(tag => tag.trim())
    .filter(tag => tag && tag.length > 0)
    .slice(0, 10); // 限制最多10个标签
  
  if (cleanedTags.length === 0) {
    return res.status(400).json({ error: '请提供有效的标签' });
  }

  try {
    // 生成文件名和内容
    const now = new Date();
    
    // 转换为上海时区 (UTC+8)
    const shanghaiTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const dateStr = shanghaiTime.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = `${shanghaiTime.getFullYear()}/${(shanghaiTime.getMonth() + 1).toString().padStart(2, '0')}/${shanghaiTime.getDate().toString().padStart(2, '0')} ${shanghaiTime.getHours().toString().padStart(2, '0')}:${shanghaiTime.getMinutes().toString().padStart(2, '0')}`; // YYYY/MM/DD HH:mm

    const fileDateSegment = dateStr;
    const hours = shanghaiTime.getHours().toString().padStart(2, '0');
    const minutes = shanghaiTime.getMinutes().toString().padStart(2, '0');
    const timeSlug = `${hours}${minutes}`;
    const titleSlug = `${dateStr.replace(/-/g, '')}${hours}${minutes}`;
    const filenameBase = `note-${fileDateSegment}-${timeSlug}`;
    const filename = `${filenameBase}.md`;
    const filepath = `_notes/${filename}`;
    
    // 生成 Markdown 内容
    const markdownContent = createMarkdownContent({
      title: titleSlug,
      date: timeStr,
      tags: cleanedTags,
      lang,
      content: content.trim()
    });
    
    // 提交到 GitHub
    const commitResult = await commitToGitHub({
      token: GITHUB_TOKEN,
      repo: GITHUB_REPO,
      filepath,
      content: markdownContent,
      message: `feat: add note ${filenameBase}`
    });
    
    // 生成笔记 URL
    const noteUrl = `/notes/${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}/${timeSlug}/`;
    
    return res.status(200).json({
      success: true,
      message: '笔记发布成功',
      url: noteUrl,
      filename,
      commit: commitResult.sha
    });
    
  } catch (error) {
    console.error('创建笔记失败:', error);
    
    if (error.status === 422) {
      return res.status(400).json({ error: '文件已存在或路径无效' });
    }
    
    if (error.status === 403) {
      return res.status(403).json({ error: 'GitHub 权限不足，请检查 token 权限' });
    }
    
    return res.status(500).json({ 
      error: '服务器错误，请稍后重试',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// 生成文件名 slug
function generateSlug(title) {
  // 清理标题，移除特殊字符，保留中英文数字和空格
  const cleanTitle = title
    .trim()
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '') // 保留中英文数字空格
    .replace(/\s+/g, '-') // 空格替换为短横线
    .toLowerCase()
    .substring(0, 50); // 限制长度
  
  if (cleanTitle) {
    return cleanTitle;
  }
  
  // 如果清理后为空，使用时间戳
  return 'note-' + Date.now().toString().slice(-6);
}

// 创建 Markdown 内容
function createMarkdownContent({ title, date, tags, lang, content }) {
  const frontMatter = [
    '---',
    `title: ${title}`,
    'layout: default',
    'open_heart: true',
    `date: ${date}`,
    `tags: [${tags.map(tag => `"${tag}"`).join(', ')}]`
  ];
  
  // 只有当 lang 不为默认值时才添加
  if (lang && lang !== 'zh-CN') {
    frontMatter.push(`lang: ${lang}`);
  }
  
  frontMatter.push('---', '', content);
  
  return frontMatter.join('\n');
}

// 提交到 GitHub
async function commitToGitHub({ token, repo, filepath, content, message }) {
  const baseUrl = 'https://api.github.com';
  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'site-note-writer'
  };
  
  // 检查文件是否已存在
  let existingFile = null;
  try {
    const checkResponse = await fetch(`${baseUrl}/repos/${repo}/contents/${filepath}`, {
      headers
    });
    
    if (checkResponse.ok) {
      existingFile = await checkResponse.json();
    }
  } catch (error) {
    // 文件不存在，继续创建
  }
  
  // 如果文件已存在，生成新的文件名
  if (existingFile) {
    const timestamp = Date.now().toString().slice(-6);
    const parts = filepath.split('.');
    parts[0] += `-${timestamp}`;
    filepath = parts.join('.');
  }
  
  // 创建或更新文件
  const payload = {
    message,
    content: Buffer.from(content, 'utf8').toString('base64'),
    branch: 'main',
    author: {
      name: 'Bazinga',
      email: 'zjb15239430906@gmail.com'
    },
    committer: {
      name: 'Bazinga',
      email: 'zjb15239430906@gmail.com'
    }
  };

  if (existingFile) {
    payload.sha = existingFile.sha;
  }
  
  const response = await fetch(`${baseUrl}/repos/${repo}/contents/${filepath}`, {
    method: 'PUT',
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const errorObj = new Error(error.message || 'GitHub API 请求失败');
    errorObj.status = response.status;
    errorObj.details = error;
    throw errorObj;
  }
  
  return await response.json();
}
