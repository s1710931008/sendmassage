var express = require('express');
var router = express.Router();


//導入 postgresql
const dbpg = require(__dirname + '/../model/dbOperations.js');

const CONFIG = require(__dirname + '/../config/config');

//token
const jwt = require('jsonwebtoken')

//bcrypt
const bcrypt = require('bcryptjs')



// const moment = require('moment');
const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Taipei'); // 設定時區為台北

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});


router.post('/login', async (req, res) => {
  const clientIP = req.ip; // 獲取客戶端 IP
  const { name, password } = req.body;

  // password_hash = bcrypt.hashSync(password, CONFIG.saltRounds);
  // console.log("password_hash", password_hash)

  try {
    // 查詢用戶資料（參數化查詢防止 SQL 注入）
    const selectSQL = 'SELECT * FROM public."usersWeb" WHERE email = $1';
    const results = await dbpg.selectNewSQL(selectSQL, [name]);

    // 如果查詢無結果，記錄日誌並回應 401
    if (!results || results.length === 0) {
      const formattedTime = moment().tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss');
      console.log(`查無資料，記錄失敗日誌: ${name}`);
      logger.write(`[Time: ${formattedTime}] ${clientIP} 登入失敗，無效的使用者名稱:${name}, 密碼:${password} \n`);
      return res.status(401).json({ message: '無效的使用者名稱或密碼' });
    }

    const user = results[0]; // 提取用戶資料

    // 比較密碼（使用非同步 bcrypt.compare）
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      const formattedTime = moment().tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss');
      console.log(`密碼錯誤，記錄失敗日誌: ${name}, ${clientIP}`);
      // logger.write(`[Time: ${formattedTime}] ${clientIP} 登入失敗，無效的使用者名稱:${name}, 密碼:${password} \n`);
      return res.status(401).json({ message: '登入失敗，密碼不正確' });
    }

    // 密碼驗證成功，生成 JWT Token
    const tokenStr = jwt.sign(
      {
        id: user.id,
        username: user.username,
        clientIP: clientIP,
      },
      CONFIG.jwtSecretKey,
      { expiresIn: 60 * 60 * 24 * 7 } // 7 天有效期
    );

    // 更新登入時間與 Token
    const currentUTC = new Date().toUTCString();
    const TaiwanTimeNow = moment.utc(currentUTC).add(8, 'hours').format('YYYY-MM-DD HH:mm:ss');
    const expiresInTime = moment.utc(currentUTC).add(168, 'hours').format('YYYY-MM-DD HH:mm:ss');

    const loginData = [
      {
        id: user.id,
        last_login_time: TaiwanTimeNow,
        session_token: `Bearer ${tokenStr}`,
        token_expiry: expiresInTime,
      },
    ];


    // 記錄登入成功的日誌
    const formattedTime = moment().tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss');
    // logger.write(`[Time: ${formattedTime}] ${clientIP} 登入成功 UserName: ${user.email}, group_id: ${user.group_id}\n`);
    // token: `Bearer ${tokenStr}`,
    // 回應成功訊息
    return res.status(200).json({
      code: 200,
      token: `${tokenStr}`,
      userId: user.id,
      username: user.username
    });
  } catch (error) {
    console.error('登入過程中發生錯誤：', error);

    // 記錄異常錯誤
    const formattedTime = moment().tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss');
    // logger.write(`[Time: ${formattedTime}] 登入過程中發生錯誤: ${error.message}\n`);

    // 內部伺服器錯誤回應
    return res.status(500).json({ message: '伺服器發生錯誤，請稍後再試。' });
  }
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
