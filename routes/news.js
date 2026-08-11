const express = require('express');
const router = express.Router();

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


module.exports = router;