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


module.exports = router;
