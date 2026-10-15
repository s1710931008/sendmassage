const express = require('express');
const router = express.Router();
const db = require('../model/dbOperations.sqlite');

const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '');

router.get('/users', (_req, res) => {
  try {
    return res.json({ code: 200, data: db.getUsers() });
  } catch (error) {
    console.error('GET /admin/users:', error);
    return res.status(500).json({ code: 500, message: '帳號列表讀取失敗' });
  }
});

router.post('/users', (req, res) => {
  try {
    const { username, password, status = 1 } = req.body;
    if (!validEmail(username)) return res.status(400).json({ code: 400, message: '電子信箱格式不正確' });
    if (!password || password.length < 8) return res.status(400).json({ code: 400, message: '密碼至少需要 8 個字元' });
    return res.status(201).json({ code: 201, data: db.createUser({ username, password, status }) });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ code: 409, message: '此帳號已存在' });
    console.error('POST /admin/users:', error);
    return res.status(500).json({ code: 500, message: '新增帳號失敗' });
  }
});

router.put('/users/:id', (req, res) => {
  try {
    const { username, password, status = 1 } = req.body;
    if (!db.getUserById(req.params.id)) return res.status(404).json({ code: 404, message: '找不到帳號' });
    if (!validEmail(username)) return res.status(400).json({ code: 400, message: '電子信箱格式不正確' });
    if (password && password.length < 8) return res.status(400).json({ code: 400, message: '密碼至少需要 8 個字元' });
    return res.json({ code: 200, data: db.updateUser(req.params.id, { username, password, status }) });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ code: 409, message: '此帳號已存在' });
    console.error('PUT /admin/users:', error);
    return res.status(500).json({ code: 500, message: '修改帳號失敗' });
  }
});

router.delete('/users/:id', (req, res) => {
  try {
    if (Number(req.user?.id) === Number(req.params.id)) return res.status(400).json({ code: 400, message: '不能刪除目前登入的帳號' });
    const changes = db.deleteUser(req.params.id);
    if (!changes) return res.status(404).json({ code: 404, message: '找不到帳號' });
    return res.json({ code: 200, message: '帳號已刪除' });
  } catch (error) {
    console.error('DELETE /admin/users:', error);
    return res.status(500).json({ code: 500, message: '刪除帳號失敗' });
  }
});

module.exports = router;
