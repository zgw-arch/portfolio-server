const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const dataFile = path.join(__dirname, 'data.json');

// 全局中间件
app.use(cors());
app.use(express.json());

// 读取数据
function readData() {
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}
// 写入数据
function writeData(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
}

// 1. 访客统计接口
app.get('/api/visit', (req, res) => {
  const data = readData();
  data.visitCount++;
  writeData(data);
  res.json({ count: data.visitCount });
});

// 2. 获取所有留言
app.get('/api/messages', (req, res) => {
  const data = readData();
  res.json(data.messages);
});

// 3. 提交留言
app.post('/api/messages', (req, res) => {
  const { name, content } = req.body;
  if (!name || !content) {
    return res.status(400).json({ msg: "昵称和留言不能为空" });
  }
  const data = readData();
  // 新留言放在最顶部
  data.messages.unshift({
    name,
    content,
    time: new Date().toLocaleString()
  });
  writeData(data);
  res.json({ msg: "留言成功！" });
});

app.listen(PORT, () => {
  console.log("服务启动成功");
});
