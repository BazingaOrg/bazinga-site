// 生成统一的照片命名和ID
function generatePhotoNaming(originalFilename, altText) {
  const now = new Date();
  const shanghaiTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  const dateStr = shanghaiTime.toISOString().split('T')[0]; // YYYY-MM-DD
  const dateNum = dateStr.replace(/-/g, ''); // YYYYMMDD

  // 生成描述性slug
  let description = altText || 'photo';
  description = description
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '') // 保留中英文数字空格
    .replace(/\s+/g, '-') // 空格替换为短横线
    .substring(0, 30); // 限制长度

  if (!description) {
    description = 'photo';
  }

  // 生成序列号 (基于当天照片数量)
  const sequence = Math.floor(Math.random() * 999) + 1; // 1-999
  const sequenceStr = sequence.toString().padStart(3, '0');

  // 生成文件名和ID
  const fileExtension = originalFilename.split('.').pop() || 'jpg';
  const generatedFilename = `${dateStr}-${description}.${fileExtension}`;
  const generatedId = `photo-${dateNum}-${sequenceStr}`;

  return {
    generatedFilename,
    generatedId,
    description,
    sequence: sequenceStr
  };
}

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
  const { 
    imageData,     // base64图片数据 
    filename,      // 文件名
    photoData      // 照片元数据 (id, uploaded, variants, meta)
  } = req.body;
  
  if (!imageData || !imageData.startsWith('data:image/')) {
    return res.status(400).json({ error: '无效的图片数据' });
  }
  
  if (!filename || !filename.trim()) {
    return res.status(400).json({ error: '文件名不能为空' });
  }
  
  if (!photoData || !photoData.id || !photoData.meta || !photoData.meta.alt) {
    return res.status(400).json({ error: '照片元数据不完整' });
  }

  try {
    // 处理base64图片数据
    const matches = imageData.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: '图片数据格式错误' });
    }

    const imageType = matches[1];
    const imageBuffer = matches[2];

    // 生成统一的文件名和ID
    const { generatedFilename, generatedId, description } = generatePhotoNaming(filename, photoData.meta.alt || 'photo');
    const imagePath = `images/photos/${generatedFilename}`;

    // 更新photoData的ID和文件路径（保持与现有数据结构一致）
    photoData.id = generatedId;
    photoData.variants = [`/images/photos/${generatedFilename}`];
    
    // 上传图片文件到GitHub
    const imageCommitResult = await commitToGitHub({
      token: GITHUB_TOKEN,
      repo: GITHUB_REPO,
      filepath: imagePath,
      content: imageBuffer,
      message: `feat: Upload photo ${generatedId}`,
      isBinary: true
    });

    // 更新 photos.json 文件
    const photosJsonResult = await updatePhotosJson({
      token: GITHUB_TOKEN,
      repo: GITHUB_REPO,
      photoData: photoData
    });

    return res.status(200).json({
      success: true,
      message: '照片上传成功',
      photoId: generatedId,
      filename: generatedFilename,
      imagePath: imagePath,
      imageCommit: imageCommitResult.sha,
      dataCommit: photosJsonResult.sha
    });
    
  } catch (error) {
    console.error('上传照片失败:', error);
    
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

// 提交文件到 GitHub
async function commitToGitHub({ token, repo, filepath, content, message, isBinary = false }) {
  const baseUrl = 'https://api.github.com';
  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'site-photo-uploader'
  };
  
  // 检查文件是否已存在
  let existingFile = null;
  try {
    const checkResponse = await fetch(`${baseUrl}/repos/${repo}/contents/${filepath}`, {
      headers
    });
    
    if (checkResponse.ok) {
      existingFile = await checkResponse.json();
      // 如果文件已存在，生成新的文件名
      const timestamp = Date.now().toString().slice(-6);
      const parts = filepath.split('.');
      parts[0] += `-${timestamp}`;
      filepath = parts.join('.');
    }
  } catch (error) {
    // 文件不存在，继续创建
  }
  
  // 创建或更新文件
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
    const errorObj = new Error(error.message || 'GitHub API 请求失败');
    errorObj.status = response.status;
    errorObj.details = error;
    throw errorObj;
  }
  
  return await response.json();
}

// 更新 photos.json 文件
async function updatePhotosJson({ token, repo, photoData }) {
  const baseUrl = 'https://api.github.com';
  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'site-photo-uploader'
  };
  
  const photosJsonPath = '_data/photos.json';
  
  // 获取现有的 photos.json 文件
  let existingPhotos = [];
  let existingFile = null;
  
  try {
    const response = await fetch(`${baseUrl}/repos/${repo}/contents/${photosJsonPath}`, {
      headers
    });
    
    if (response.ok) {
      existingFile = await response.json();
      const content = Buffer.from(existingFile.content, 'base64').toString('utf8');
      existingPhotos = JSON.parse(content);
    }
  } catch (error) {
    // 文件不存在或解析错误，使用空数组
    console.warn('无法读取现有 photos.json，将创建新文件');
  }
  
  // 检查是否已存在相同ID的照片
  const existingIndex = existingPhotos.findIndex(photo => photo.id === photoData.id);
  if (existingIndex >= 0) {
    // 更新现有照片
    existingPhotos[existingIndex] = photoData;
  } else {
    // 添加新照片到数组开头
    existingPhotos.unshift(photoData);
  }
  
  // 生成更新的JSON内容
  const updatedContent = JSON.stringify(existingPhotos, null, 2);
  
  // 提交更新的 photos.json
  const payload = {
    message: `feat: Add photo metadata ${photoData.id}`,
    content: Buffer.from(updatedContent, 'utf8').toString('base64'),
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
  
  const response = await fetch(`${baseUrl}/repos/${repo}/contents/${photosJsonPath}`, {
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