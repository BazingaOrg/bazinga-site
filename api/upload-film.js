// 生成统一的胶片命名和ID
function generateFilmNaming(originalFilename, altText) {
  const now = new Date();
  const shanghaiTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  const dateStr = shanghaiTime.toISOString().split('T')[0]; // YYYY-MM-DD
  const dateNum = dateStr.replace(/-/g, ''); // YYYYMMDD
  const hours = shanghaiTime.getUTCHours().toString().padStart(2, '0');
  const minutes = shanghaiTime.getUTCMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}${minutes}`; // HHmm

  // 生成描述性slug
  let description = altText || 'film';
  description = description
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '') // 保留中英文数字空格
    .replace(/\s+/g, '-') // 空格替换为短横线
    .substring(0, 30); // 限制长度

  if (!description) {
    description = 'film';
  }

  const fileExtension = originalFilename.split('.').pop() || 'jpg';
  const generatedFilename = `${dateStr}-${timeStr}-${description}.${fileExtension}`;
  const generatedId = `film-${dateNum}-${timeStr}`;

  return {
    generatedFilename,
    generatedId,
    description
  };
}

export default async function handler(req, res) {
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

  const { GITHUB_TOKEN, GITHUB_REPO, WRITE_ACCESS_KEY } = process.env;

  if (!GITHUB_TOKEN || !GITHUB_REPO || !WRITE_ACCESS_KEY) {
    console.error('缺少必要的环境变量:', {
      hasToken: !!GITHUB_TOKEN,
      hasRepo: !!GITHUB_REPO,
      hasKey: !!WRITE_ACCESS_KEY
    });
    return res.status(500).json({ error: '服务器配置错误' });
  }

  const accessKey = req.headers['x-access-key'];
  if (!accessKey || accessKey !== WRITE_ACCESS_KEY) {
    return res.status(401).json({ error: '无效的访问密钥' });
  }

  const {
    imageData,
    filename,
    filmData
  } = req.body;

  if (!imageData || !imageData.startsWith('data:image/')) {
    return res.status(400).json({ error: '无效的图片数据' });
  }

  if (!filename || !filename.trim()) {
    return res.status(400).json({ error: '文件名不能为空' });
  }

  if (!filmData || !filmData.id || !filmData.meta || !filmData.meta.alt || !filmData.meta.camera || !filmData.meta.film) {
    return res.status(400).json({ error: '胶片元数据不完整' });
  }

  try {
    const matches = imageData.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: '图片数据格式错误' });
    }

    const imageBuffer = matches[2];

    // 生成统一的文件名和ID
    const { generatedFilename, generatedId, description } = generateFilmNaming(filename, filmData.meta.alt || 'film');
    let imagePath = `images/film/${generatedFilename}`;
    const publicImagePath = `/${imagePath}`;

    // 更新 filmData 的 ID 与图片路径，确保数据引用最终落盘的文件
    filmData.id = generatedId;
    const existingVariants = Array.isArray(filmData.variants) ? filmData.variants.filter(Boolean) : [];
    filmData.filename = generatedFilename;

    const imageCommit = await commitToGitHub({
      token: GITHUB_TOKEN,
      repo: GITHUB_REPO,
      filepath: imagePath,
      content: imageBuffer,
      message: `feat: Upload film ${generatedId}`,
      isBinary: true
    });

    if (imageCommit?.content?.path) {
      imagePath = imageCommit.content.path;
    }

    const committedPublicPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    filmData.variants = [committedPublicPath, ...existingVariants.filter(variant => variant !== committedPublicPath)];

    const dataCommit = await updateFilmJson({
      token: GITHUB_TOKEN,
      repo: GITHUB_REPO,
      filmData
    });

    return res.status(200).json({
      success: true,
      message: '胶片上传成功',
      filmId: generatedId,
      filename: generatedFilename,
      imagePath,
      imageCommit: imageCommit.sha,
      dataCommit: dataCommit.sha
    });
  } catch (error) {
    console.error('上传胶片失败:', error);

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

async function commitToGitHub({ token, repo, filepath, content, message, isBinary = false }) {
  const baseUrl = 'https://api.github.com';
  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'site-film-uploader'
  };

  let existingFile = null;
  try {
    const checkResponse = await fetch(`${baseUrl}/repos/${repo}/contents/${filepath}`, {
      headers
    });

    if (checkResponse.ok) {
      existingFile = await checkResponse.json();
      const timestamp = Date.now().toString().slice(-6);
      const parts = filepath.split('.');
      parts[0] += `-${timestamp}`;
      filepath = parts.join('.');
    }
  } catch (error) {
    // ignore missing file
  }

  const payload = {
    message,
    content: isBinary ? content : Buffer.from(content, 'utf8').toString('base64'),
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
    const err = new Error(error.message || 'GitHub API 请求失败');
    err.status = response.status;
    err.details = error;
    throw err;
  }

  return await response.json();
}

async function updateFilmJson({ token, repo, filmData }) {
  const baseUrl = 'https://api.github.com';
  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'site-film-uploader'
  };

  const filmJsonPath = '_data/film.json';

  let existing = [];
  let existingFile = null;

  try {
    const response = await fetch(`${baseUrl}/repos/${repo}/contents/${filmJsonPath}`, {
      headers
    });

    if (response.ok) {
      existingFile = await response.json();
      const content = Buffer.from(existingFile.content, 'base64').toString('utf8');
      existing = JSON.parse(content);
    }
  } catch (error) {
    console.warn('无法读取现有 film.json，将创建新文件');
  }

  const index = existing.findIndex(item => item.id === filmData.id);
  if (index >= 0) {
    existing[index] = filmData;
  } else {
    existing.unshift(filmData);
  }

  const updated = JSON.stringify(existing, null, 2);

  const payload = {
    message: `feat: Add film metadata ${filmData.id}`,
    content: Buffer.from(updated, 'utf8').toString('base64'),
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

  const response = await fetch(`${baseUrl}/repos/${repo}/contents/${filmJsonPath}`, {
    method: 'PUT',
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const err = new Error(error.message || 'GitHub API 请求失败');
    err.status = response.status;
    err.details = error;
    throw err;
  }

  return await response.json();
}
