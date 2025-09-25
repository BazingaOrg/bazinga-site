// 完整的 Supabase 集成方案
// 在 Vercel 环境变量中设置:
// SUPABASE_URL=your-project-url
// SUPABASE_ANON_KEY=your-anon-key

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Supabase 操作函数
async function supabaseRequest(url, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${url}`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    throw new Error(`Supabase error: ${response.statusText}`);
  }

  return response.json();
}

// 获取 like 数量
async function getLikeCount(pageId) {
  try {
    const data = await supabaseRequest(`likes?page_id=eq.${encodeURIComponent(pageId)}`);
    return data.length > 0 ? data[0].count : 0;
  } catch (error) {
    console.error('Get like count error:', error);
    return 0;
  }
}

// 增加 like
async function incrementLike(pageId) {
  try {
    // 先尝试获取现有记录
    const existing = await supabaseRequest(`likes?page_id=eq.${encodeURIComponent(pageId)}`);
    
    if (existing.length > 0) {
      // 更新现有记录
      const newCount = existing[0].count + 1;
      await supabaseRequest(`likes?page_id=eq.${encodeURIComponent(pageId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ count: newCount })
      });
      return newCount;
    } else {
      // 创建新记录
      const result = await supabaseRequest('likes', {
        method: 'POST',
        body: JSON.stringify({ 
          page_id: pageId, 
          count: 1 
        })
      });
      return 1;
    }
  } catch (error) {
    console.error('Increment like error:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 检查环境变量
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Supabase configuration missing' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Missing id parameter' });
  }

  const cleanId = id.startsWith('/') ? id.substring(1) : id;

  try {
    switch (req.method) {
      case 'POST':
        const newCount = await incrementLike(cleanId);
        return res.status(200).json({ 
          success: true, 
          id: cleanId, 
          count: newCount 
        });

      case 'GET':
        const count = await getLikeCount(cleanId);
        return res.status(200).json({ 
          id: cleanId, 
          count 
        });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Likes API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}