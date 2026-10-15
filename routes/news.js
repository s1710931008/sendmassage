const express = require('express');
const router = express.Router();
const formidable = require('formidable');
const fs = require('fs');
const path = require('path');

const db = require(
    '../model/dbOperations.sqlite'
);


/**
 * GET /news
 * 公開 API
 * 不需要 Token
 *
 * 取得：
 * page
 * carousel
 * items
 */
router.get('/', function (req, res) {

    try {

        const data =
            db.getNViewData();

        return res.status(200).json({
            success: true,
            data
        });

    } catch (error) {

        console.error(
            'GET /news error:',
            error
        );

        return res.status(500).json({
            success: false,
            code: 'DATABASE_ERROR',
            message: 'Failed to load news'
        });

    }

});


/**
 * GET /news/items
 * 公開 News List
 * 不需要 Token
 */
router.get('/items', function (req, res) {

    try {

        const items =
            db.getNewsItems(false);

        return res.status(200).json({
            success: true,
            data: items
        });

    } catch (error) {

        console.error(
            'GET /news/items error:',
            error
        );

        return res.status(500).json({
            success: false,
            code: 'DATABASE_ERROR',
            message: 'Failed to load news list'
        });

    }

});

router.get('/items/:id', function (req, res) {
    try {
        const item = db.getNewsById(Number(req.params.id));
        if (!item || !item.isActive) return res.status(404).json({ success: false, code: 404, message: '找不到新聞' });
        return res.json({ success: true, code: 200, data: item });
    } catch (error) {
        console.error('GET /news/items/:id error:', error);
        return res.status(500).json({ success: false, code: 500, message: '新聞內容讀取失敗' });
    }
});

router.get('/admin/items', function (_req, res) {
    try {
        return res.json({ success: true, code: 200, data: db.getNewsItems(true) });
    } catch (error) {
        console.error('GET /news/admin/items error:', error);
        return res.status(500).json({ success: false, code: 500, message: '新聞列表讀取失敗' });
    }
});

router.post('/admin/upload', async function (req, res) {
    const uploadDir = path.join(__dirname, '../../public/uploads/news');
    fs.mkdirSync(uploadDir, { recursive: true });
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const form = new formidable.IncomingForm({
        uploadDir,
        keepExtensions: true,
        maxFileSize: 5 * 1024 * 1024,
        filter: ({ mimetype }) => allowedTypes.has(mimetype)
    });

    try {
        const files = await new Promise((resolve, reject) => {
            form.parse(req, (error, _fields, parsedFiles) => error ? reject(error) : resolve(parsedFiles));
        });
        const uploaded = Object.values(files).flat()[0];
        if (!uploaded) return res.status(400).json({ code: 400, message: '請選擇 JPG、PNG 或 WebP 圖片' });
        const extension = path.extname(uploaded.originalFilename || '').toLowerCase() || '.jpg';
        const fileName = `news-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension}`;
        fs.renameSync(uploaded.filepath, path.join(uploadDir, fileName));
        return res.status(201).json({ success: true, code: 201, data: { imageUrl: `/uploads/news/${fileName}` } });
    } catch (error) {
        console.error('POST /news/admin/upload error:', error);
        return res.status(400).json({ success: false, code: 400, message: '圖片上傳失敗，檔案需小於 5MB' });
    }
});

router.delete('/admin/upload', function (req, res) {
    try {
        const imageUrl = String(req.body.imageUrl || '');
        if (!imageUrl.startsWith('/uploads/news/')) {
            return res.json({ success: true, code: 200, message: '外部圖片網址已解除' });
        }
        const fileName = path.basename(imageUrl);
        const filePath = path.join(__dirname, '../../public/uploads/news', fileName);
        const inUse = db.getNewsItems(true).some(item => item.imageUrl === imageUrl && Number(item.id) !== Number(req.body.newsId));
        if (inUse) return res.status(409).json({ code: 409, message: '此圖片仍被其他新聞使用，無法刪除' });
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        if (req.body.newsId) db.updateNews(Number(req.body.newsId), { imageUrl: null });
        return res.json({ success: true, code: 200, message: '圖片已刪除' });
    } catch (error) {
        console.error('DELETE /news/admin/upload error:', error);
        return res.status(500).json({ success: false, code: 500, message: '圖片刪除失敗' });
    }
});

router.post('/admin/items', function (req, res) {
    try {
        if (!req.body.title?.trim()) return res.status(400).json({ code: 400, message: '請輸入新聞標題' });
        return res.status(201).json({ success: true, code: 201, data: db.createNews(req.body) });
    } catch (error) {
        console.error('POST /news/admin/items error:', error);
        return res.status(500).json({ success: false, code: 500, message: '新增新聞失敗' });
    }
});

router.put('/admin/items/:id', function (req, res) {
    try {
        if (!req.body.title?.trim()) return res.status(400).json({ code: 400, message: '請輸入新聞標題' });
        const item = db.updateNews(Number(req.params.id), req.body);
        if (!item) return res.status(404).json({ code: 404, message: '找不到新聞' });
        return res.json({ success: true, code: 200, data: item });
    } catch (error) {
        console.error('PUT /news/admin/items error:', error);
        return res.status(500).json({ success: false, code: 500, message: '修改新聞失敗' });
    }
});

router.delete('/admin/items/:id', function (req, res) {
    try {
        const item = db.getNewsById(Number(req.params.id));
        if (!item || !db.deleteNews(Number(req.params.id))) return res.status(404).json({ code: 404, message: '找不到新聞' });
        if (item.imageUrl?.startsWith('/uploads/news/')) {
            const stillUsed = db.getNewsItems(true).some(newsItem => newsItem.imageUrl === item.imageUrl);
            const imagePath = path.join(__dirname, '../../public/uploads/news', path.basename(item.imageUrl));
            if (!stillUsed && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        }
        return res.json({ success: true, code: 200, message: '新聞已刪除' });
    } catch (error) {
        console.error('DELETE /news/admin/items error:', error);
        return res.status(500).json({ success: false, code: 500, message: '刪除新聞失敗' });
    }
});


module.exports = router;
