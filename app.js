const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// 从Render环境变量读取，不在代码硬编码，绝对安全
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = "comment-data";
const FILE_PATH = "msg-store.json";
const BRANCH = "main";

// GitHub API 请求封装
async function getFileContent() {
  try {
    const res = await axios.get(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}?ref=${BRANCH}`,
      {
        headers: { Authorization: `token ${GITHUB_TOKEN}` }
      }
    );
    // base64解码
    const raw = Buffer.from(res.data.content, 'base64').toString('utf8');
    return {
      sha: res.data.sha,
      data: JSON.parse(raw)
    };
  } catch (err) {
    console.error("读取仓库文件失败", err);
    return { sha: null, data: { messages: [], visitCount: 0 } };
  }
}

async function saveFileToGithub(newData, oldSha) {
  const content = Buffer.from(JSON.stringify(newData, null, 2), 'utf8').toString('base64');
  const body = {
    message: "更新留言&访问统计",
    content,
    sha: oldSha,
    branch: BRANCH
  };
  await axios.put(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`,
    body,
    { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
  );
}

// 中间件
app.use(cors());
app.use(express.json());

// 1. 访客统计接口
app.get('/api/visit', async (req, res) => {
  const { sha, data } = await getFileContent();
  data.visitCount += 1;
  await saveFileToGithub(data, sha);
  res.json({ count: data.visitCount });
});

// 2. 获取全部留言
app.get('/api/messages', async (req, res) => {
  const { data } = await getFileContent();
  res.json(data.messages);
});

// 3. 提交留言接口
app.post('/api/messages', async (req, res) => {
  const { name, content } = req.body;
  if (!name || !content) {
    return res.status(400).json({ msg: "昵称和留言不能为空！" });
  }
  const { sha, data } = await getFileContent();
  data.messages.unshift({
    name,
    content,
    time: new Date().toLocaleString()
  });
  await saveFileToGithub(data, sha);
  res.json({ msg: "留言提交成功！" });
});

app.listen(PORT, () => {
  console.log("服务启动成功，数据同步至GitHub comment-data仓库");
});
