const express = require('express');
const formidable = require('formidable');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const db = require('../model/dbOperations.sqlite');
const uploadDir = path.join(__dirname, '../../public/uploads');

router.get('/', (req, res) => res.render('index', { title: 'Rising Star API' }));

router.get('/files', (req, res) => {
  try {
    const result = db.getFiles({ page: Math.max(1, Number(req.query.page) || 1), pageSize: Math.min(100, Math.max(1, Number(req.query.pageSize) || 10)), type: req.query.type, year: req.query.year, month: req.query.month });
    return res.json({ code: 200, ...result });
  } catch (error) {
    console.error('GET /files:', error);
    return res.status(500).json({ code: 500, message: '無法讀取月報資料' });
  }
});

router.put('/edit', (req, res) => {
  try {
    const { id, filename, file_path, year, month, type } = req.body;
    if (!filename || !file_path || !year || !type) return res.status(400).json({ code: 400, message: '資料不完整' });
    const savedId = db.saveFile({ id, filename, file_path, year, month: month || 0, type });
    return res.json({ code: 200, data: { id: savedId } });
  } catch (error) {
    console.error('PUT /edit:', error);
    return res.status(500).json({ code: 500, message: '儲存失敗' });
  }
});

router.post('/uploadsFiles', async (req, res) => {
  fs.mkdirSync(uploadDir, { recursive: true });
  const form = new formidable.IncomingForm({ uploadDir, keepExtensions: true, maxFileSize: 5 * 1024 * 1024, filter: ({ mimetype }) => mimetype === 'application/pdf' });
  try {
    const files = await new Promise((resolve, reject) => form.parse(req, (error, _fields, parsed) => error ? reject(error) : resolve(parsed)));
    const uploaded = Object.values(files).flat()[0];
    if (!uploaded) return res.status(400).json({ code: 400, message: '請選擇 PDF 檔案' });
    const safeName = path.basename(uploaded.originalFilename || `report-${Date.now()}.pdf`);
    const target = path.join(uploadDir, safeName);
    if (uploaded.filepath !== target) fs.renameSync(uploaded.filepath, target);
    return res.json({ code: 200, message: '文件上傳成功', files: [safeName] });
  } catch (error) {
    console.error('POST /uploadsFiles:', error);
    return res.status(400).json({ code: 400, message: '上傳失敗，僅接受 5MB 以下 PDF' });
  }
});

router.post('/reports', async (req, res) => {
  fs.mkdirSync(uploadDir, { recursive: true });
  const form = new formidable.IncomingForm({ uploadDir, keepExtensions: true, maxFileSize: 5 * 1024 * 1024, filter: ({ mimetype }) => mimetype === 'application/pdf' });
  let uploaded;
  try {
    const parsed = await new Promise((resolve, reject) => form.parse(req, (error, fields, files) => error ? reject(error) : resolve({ fields, files })));
    uploaded = Object.values(parsed.files).flat()[0];
    const value = key => Array.isArray(parsed.fields[key]) ? parsed.fields[key][0] : parsed.fields[key];
    const year = Number(value('year')); const month = Number(value('month') || 0); const type = Number(value('type'));
    if (!uploaded) return res.status(400).json({ code: 400, message: '請選擇 PDF 檔案' });
    if (!year || ![1, 2].includes(type) || (type === 1 && (month < 1 || month > 12))) throw new Error('INVALID_FIELDS');
    const originalName = path.basename(uploaded.originalFilename || 'report.pdf');
    const storedName = `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`;
    fs.renameSync(uploaded.filepath, path.join(uploadDir, storedName));
    const id = db.saveFile({ filename: originalName, file_path: storedName, year, month, type });
    return res.status(201).json({ code: 201, message: '月報上傳成功', data: { id } });
  } catch (error) {
    if (uploaded?.filepath && fs.existsSync(uploaded.filepath)) fs.unlinkSync(uploaded.filepath);
    console.error('POST /reports:', error);
    return res.status(400).json({ code: 400, message: error.message === 'INVALID_FIELDS' ? '請完整填寫報表期別' : '上傳失敗，僅接受 5MB 以下 PDF' });
  }
});

router.put('/reports/:id', (req, res) => {
  try {
    const current = db.getFiles({ page: 1, pageSize: 10000 }).data.find(item => Number(item.id) === Number(req.params.id));
    if (!current) return res.status(404).json({ code: 404, message: '找不到報表' });
    const { year, month = 0, type } = req.body;
    if (!Number(year) || ![1, 2].includes(Number(type)) || (Number(type) === 1 && (Number(month) < 1 || Number(month) > 12))) return res.status(400).json({ code: 400, message: '報表期別不正確' });
    db.saveFile({ ...current, year, month, type });
    return res.json({ code: 200, message: '報表資料已更新' });
  } catch (error) {
    console.error('PUT /reports/:id:', error);
    return res.status(500).json({ code: 500, message: '報表修改失敗' });
  }
});

router.put('/reports/:id/file', async (req, res) => {
  fs.mkdirSync(uploadDir, { recursive: true });
  const current = db.getFiles({ page: 1, pageSize: 10000 }).data.find(item => Number(item.id) === Number(req.params.id));
  if (!current) return res.status(404).json({ code: 404, message: '找不到報表' });
  const form = new formidable.IncomingForm({ uploadDir, keepExtensions: true, maxFileSize: 5 * 1024 * 1024, filter: ({ mimetype }) => mimetype === 'application/pdf' });
  let uploaded;
  let newPath;
  try {
    const files = await new Promise((resolve, reject) => form.parse(req, (error, _fields, parsedFiles) => error ? reject(error) : resolve(parsedFiles)));
    uploaded = Object.values(files).flat()[0];
    if (!uploaded) return res.status(400).json({ code: 400, message: '請選擇 PDF 檔案' });
    const originalName = path.basename(uploaded.originalFilename || 'report.pdf');
    const storedName = `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`;
    newPath = path.join(uploadDir, storedName);
    fs.renameSync(uploaded.filepath, newPath);
    db.saveFile({ ...current, filename: originalName, file_path: storedName });
    const oldPath = path.join(uploadDir, path.basename(current.file_path));
    if (oldPath !== newPath && fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    return res.json({ code: 200, message: 'PDF 已更換', data: { filename: originalName, file_path: storedName } });
  } catch (error) {
    if (uploaded?.filepath && fs.existsSync(uploaded.filepath)) fs.unlinkSync(uploaded.filepath);
    if (newPath && fs.existsSync(newPath)) fs.unlinkSync(newPath);
    console.error('PUT /reports/:id/file:', error);
    return res.status(400).json({ code: 400, message: '更換失敗，僅接受 5MB 以下 PDF' });
  }
});

router.delete('/reports/:id', (req, res) => {
  try {
    const file = db.deleteFile(req.params.id);
    if (!file) return res.status(404).json({ code: 404, message: '找不到報表' });
    const diskPath = path.join(uploadDir, path.basename(file.file_path));
    if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
    return res.json({ code: 200, message: '報表與 PDF 已刪除' });
  } catch (error) {
    console.error('DELETE /reports/:id:', error);
    return res.status(500).json({ code: 500, message: '報表刪除失敗' });
  }
});

router.delete('/delFile/:id', (req, res) => {
  try {
    const file = db.deleteFile(req.params.id);
    if (!file) return res.status(404).json({ code: 404, message: '找不到檔案' });
    const diskPath = path.join(uploadDir, path.basename(file.file_path));
    if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
    return res.json({ code: 200, message: '刪除成功' });
  } catch (error) {
    console.error('DELETE /delFile:', error);
    return res.status(500).json({ code: 500, message: '刪除失敗' });
  }
});

module.exports = router;
