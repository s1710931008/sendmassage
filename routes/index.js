var express = require('express');
var router = express.Router();
//token
const jwt = require('jsonwebtoken')

//導入 postgresql
const dbpg = require(__dirname + '/../model/dbOperations.js');

// const moment = require('moment');
const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Taipei'); // 設定時區為台北

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.put('/sendmsg/', async (req, res) => {
  try {
    const jsonArray = [req.body];  // 從請求體中獲取資料
    console.log(jsonArray);

    const contractsesults = await dbpg.UptData("public.\"warn\"", jsonArray);

    if (contractsesults.length !== 0) {
      res.json({
        code: 200,
        msg: 'Data INSERT successfully',
      });
    } else {
      res.json({
        code: 404,
        msg: 'Data INSERT failed',
      });
    }

  } catch (error) {
    console.error('Error while data found for Query:', error);
    res.status(500).json({
      code: 500,
      error: 'Internal Server Error',
    });
  }
});

module.exports = router;
