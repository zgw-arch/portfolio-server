const express = require('express');
const cors = require('cors');
const { Octokit } = require('@octokit/rest');
const app = express();

app.use(cors());
app.use(express.json());

// ========== 配置（Token 请用环境变量！）==========
const GITHUB_OWNER = 'zgw-arch';
const GITHUB_REPO = 'comment-data';
const FILE_PATH = 'comments.json';
// ⚠️ 生产环境必须用环境变量：process.env.GITHUB_TOKEN
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '你的Token';

const octokit = new Octokit({ auth: GITHUB_TOKEN });

// ========== 辅助函数：从 GitHub 读取文件 ==========
async function getFileContent() {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: FILE_PATH,
    });
    const content = Buffer.from(data.content, 'base64').toString('utf8');
    return { content: JSON.parse(content), sha: data.sha };
  } catch (err) {
    // 文件不存在时创建空数据
    if (err.status === 404) {
      return { content: { messages: [], visitCount: 0 }, sha: null };
    }
    throw err;
  }
}

// ========== 辅助函数：保存到 GitHub ==========
async function saveFileContent(data, sha) {
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
  const params = {
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    path: FILE_PATH,
    message: 'update data',
    content: content,
  };
  if (sha) params.sha = sha;
  
  await octokit.rest.repos.createOrUpdateFileContents(params);
}

// ========== 1. 访客统计 API ==========
app.get('/api/visit', async (req, res) => {
  try {
    const { content, sha } = await getFileContent();
    content.visitCount = (content.visitCount || 0) + 1;
    await saveFileContent(content, sha);
    res.json({ count: content.visitCount });
  } catch (err) {
    console.error('访客统计失败:', err);
    res.status(500).json({ error: '统计失败' });
  }
});

// ========== 2. 获取留言 ==========
app.get('/api/messages', async (req, res) => {
  try {
    const { content } = await getFileContent();
    res.json(content.messages || []);
  } catch (err) {
    console.error('获取留言失败:', err);
    res.status(500).json({ error: '获取失败' });
  }
});

// ========== 3. 提交留言 ==========
app.post('/api/messages', async (req, res) => {
  try {
    const { name, content: msgContent } = req.body;
    if (!name || !msgContent) {
      return res.status(400).json({ msg: '昵称和留言不能为空' });
    }

    const { content, sha } = await getFileContent();
    const messages = content.messages || [];
    
    messages.unshift({
      id: Date.now(),
      name: name.trim(),
      content: msgContent.trim(),
      time: new Date().toLocaleString('zh-CN')
    });

    content.messages = messages;
    await saveFileContent(content, sha);
    
    res.json({ msg: '留言成功' });
  } catch (err) {
    console.error('提交留言失败:', err);
    res.status(500).json({ msg: '提交失败' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`服务运行在端口 ${port}`));
