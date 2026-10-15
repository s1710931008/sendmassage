const express = require('express');
const router = express.Router();

const db = require(
    '../model/dbOperations.sqlite'
);


/**
 * GET /about
 * 公開 API
 * 不需要 Token
 */
router.get('/', function (req, res) {

    try {

        const data =
            db.getAViewData();

        if (!data) {
            return res.status(404).json({
                success: false,
                code: 'ABOUT_NOT_FOUND',
                message: 'About data not found'
            });
        }

        return res.status(200).json({
            success: true,
            data
        });

    } catch (error) {

        console.error(
            'GET /about error:',
            error
        );

        return res.status(500).json({
            success: false,
            code: 'DATABASE_ERROR',
            message: 'Failed to load about data'
        });

    }

});

router.put('/admin', function (req, res) {
    try {
        const data = req.body;
        if (!data?.page?.englishTitle?.trim() || !data?.page?.title?.trim()) {
            return res.status(400).json({ success: false, code: 400, message: '請完整填寫頁面標題' });
        }
        const invalidEntry = (data.contentBlocks || []).flatMap(block => block.entries || []).some(entry => !entry.title?.trim() || !entry.paragraph?.trim());
        if (invalidEntry) return res.status(400).json({ success: false, code: 400, message: '段落標題與內容不能為空' });
        return res.json({ success: true, code: 200, data: db.updateAViewData(data) });
    } catch (error) {
        console.error('PUT /about/admin error:', error);
        return res.status(500).json({ success: false, code: 500, message: '關於頁面儲存失敗' });
    }
});


module.exports = router;
