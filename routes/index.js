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

router.get('/files', async (req, res) => {
  try {
    /** 預設值 */
    let page = parseInt(req.query.page) || 1;
    let pageSize = parseInt(req.query.pageSize) || 10; // Default pageSize is 10
    const offset = (page - 1) * pageSize;

    const { type, year, month } = req.query;

    let queryParams = [];
    let QuerySql = `WHERE 1=1`; // 初始條件

    if (type) {
      queryParams.push(type);
      QuerySql += ` AND type = $${queryParams.length}`;
    }
    if (year) {
      queryParams.push(year);
      QuerySql += ` AND year = $${queryParams.length}`;
    }
    if (month) {
      queryParams.push(month);
      QuerySql += ` AND month = $${queryParams.length}`;
    }

    // 添加 LIMIT 和 OFFSET
    queryParams.push(pageSize);
    queryParams.push(offset);

    const filesSQL = `
      SELECT id, filename, file_path, 
      to_char(uploaded_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Taipei', 'YYYY-MM-DD HH24:MI:SS') AS uploaded_at_taiwan,  
      year, month, type
      FROM public.files
      ${QuerySql}
      ORDER BY year, month DESC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `;
    const filesResult = await dbpg.selectNewSQL(filesSQL, queryParams);
    console.log(filesSQL);

    if (filesResult.length !== 0) {
      res.json({
        code: 200,
        data: filesResult,
      });
    } else {
      res.json({
        code: 404,
        msg: 'Data not found',
      });
    }
  } catch (err) {
    console.error('Error fetching files:', err);
    res.json({
      code: 500,
      msg: 'Internal Server Error',
    });
  }
});



router.put('/sendmsg/', async (req, res) => {
  try {
    const jsonArray = req.body;  // 從請求體中獲取資料
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
