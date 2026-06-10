const express = require('express');
const { Octokit } = require('@octokit/rest');
const app = express();
app.use(express.json());

// 你的 GitHub 配置
const GITHUB_OWNER = 'zgw-arch';
const GITHUB_REPO = 'comment-data'; // 刚才新建的仓库名
const FILE_PATH = 'comments.json';
const GITHUB_TOKEN = 'ghp_h1UjvpDJZLQch8n1YHWNOmr1XqmeRB3ujrEh'; // 刚才生成的Token

const octokit = new Octokit({ auth: GITHUB_TOKEN });

// 读取留言

async function getComments() {
  return [
    {
      "id": 1749699999999,
      "content": "测试留言（直接写死在代码里）",
      "author": "管理员",
      "time": "2026/6/11 06:50:00"
    }
  ];
}

// 保存留言
async function saveComments(comments) {
  try {
    const { data: file } = await octokit.rest.repos.getContent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: FILE_PATH,
    });
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: FILE_PATH,
      message: 'update comments',
      content: Buffer.from(JSON.stringify(comments)).toString('base64'),
      sha: file.sha,
    });
  } catch (err) {
    console.error('保存失败', err);
  }
}

// 获取所有留言
app.get('/api/comments', async (req, res) => {
  const comments = await getComments();
  res.json(comments);
});

// 提交留言
app.post('/api/comments', async (req, res) => {
  const comments = await getComments();
  const newComment = {
    id: Date.now(),
    content: req.body.content,
    author: req.body.author || '匿名',
    time: new Date().toLocaleString()
  };
  comments.push(newComment);
  await saveComments(comments);
  res.json(newComment);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`服务运行在端口 ${port}`));
