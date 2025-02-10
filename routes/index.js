var express = require('express');
var router = express.Router();


//導入 postgresql
const dbpg = require(__dirname + '/../model/dbOperations.js');

const CONFIG = require(__dirname + '/../config/config');

//token
const jwt = require('jsonwebtoken')

//bcrypt
const bcrypt = require('bcryptjs')

//上傳檔案
const formidable = require('formidable');
const fs = require('fs');
const path = require('path');


// const moment = require('moment');
const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Taipei'); // 設定時區為台北

//CryptoJS 解密 AES 加密的密碼
const CryptoJS = require("crypto-js");

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});


router.post('/login', async (req, res) => {
  const clientIP = req.ip; // 獲取客戶端 IP
  const { username, password } = req.body;

  // password_hash = bcrypt.hashSync(password, CONFIG.saltRounds);
  // console.log("password_hash", password_hash)
  const decryptPassword = (encryptedPassword) => {
    const bytes = CryptoJS.AES.decrypt(encryptedPassword, 'IGP-Key');
    const originalPassword = bytes.toString(CryptoJS.enc.Utf8);
    return originalPassword;
  };

  let abc = decryptPassword(password)
  console.log(decryptPassword(password),password)
  

  try {
    // 查詢用戶資料（參數化查詢防止 SQL 注入）
    const selectSQL = 'SELECT * FROM public."usersWeb" WHERE email = $1';
    const results = await dbpg.selectNewSQL(selectSQL, [username]);

    // 如果查詢無結果，記錄日誌並回應 401
    if (!results || results.length === 0) {
      const formattedTime = moment().tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss');
      console.log(`查無資料，記錄失敗日誌: ${username}`);
      logger.write(`[Time: ${formattedTime}] ${clientIP} 登入失敗，無效的使用者名稱:${username}, 密碼:${password} \n`);
      return res.status(401).json({ message: '無效的使用者名稱或密碼' });
    }

    const user = results[0]; // 提取用戶資料

    // 比較密碼（使用非同步 bcrypt.compare）
    const passwordMatch = await bcrypt.compare(abc, user.password);

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
      { expiresIn: 60 * 60 * 24 * 1 } // 7 天有效期
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


router.get('/api/files', async (req, res) => {
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

    const totalSQL = `
    SELECT count(id) as total
    FROM public.files
    ${QuerySql}
  `;
    const totalResult = await dbpg.selectNewSQL(totalSQL, queryParams);
    const total = totalResult[0].total
    const pageTotal = Math.ceil(total / pageSize); // Calculate total pages
    // 添加 LIMIT 和 OFFSET
    queryParams.push(pageSize);
    queryParams.push(offset);


    const filesSQL = `
      SELECT id, filename, file_path, 
      to_char(uploaded_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Taipei', 'YYYY-MM-DD HH24:MI:SS') AS uploaded_at,  
      year, month, type
      FROM public.files
      ${QuerySql}
      ORDER BY year DESC, month DESC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `;
    const filesResult = await dbpg.selectNewSQL(filesSQL, queryParams);




    if (filesResult.length !== 0) {
      res.json({
        code: 200,
        total: Number(total),
        pageTotal: pageTotal,
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


router.get('/dropdown_moth', async (req, res) => {
  try {

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


    const filesSQL = `
      SELECT DISTINCT month
      FROM public.files
      ${QuerySql}
      order by month`;

    console.log(filesSQL, queryParams)
    const filesResult = await dbpg.selectNewSQL(filesSQL, queryParams);




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


router.get('/dropdown_year', async (req, res) => {
  try {

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


    const filesSQL = `
      SELECT DISTINCT year
      FROM public.files
      ${QuerySql}
      order by year`;

    console.log(filesSQL, queryParams)
    const filesResult = await dbpg.selectNewSQL(filesSQL, queryParams);




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

router.put('/edit', async (req, res) => {
  try {

    const data = [req.body];
    console.log(data)
    const results = await dbpg.UptData("public.\"files\"", data);


    if (results.length !== 0) {
      res.json({
        code: 200,
        results
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


router.post('/uploadsFiles', async (req, res) => {
  try {
    /**上傳檔案路徑目錄 */
    const uploadDir = path.join(__dirname, '../../RS-Vue3-Pleng/public/uploads/');
    /**判斷是否有目錄，如果沒有建立目錄 */
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      fs.chmodSync(uploadDir, 0o775);
    }

    // 檢查文件是否可以訪問並且未被鎖定
    function isFileUnlocked(filePath) {
      try {
        fs.accessSync(filePath, fs.constants.R_OK | fs.constants.W_OK);
        return true;
      } catch (err) {
        return false;
      }
    }

    // 等待文件釋放的函數
    async function waitForFileRelease(filePath, maxAttempts = 10, delay = 1000) {
      let attempts = 0;
      while (!isFileUnlocked(filePath) && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay));
        attempts++;
      }
      return isFileUnlocked(filePath);
    }

    const form = new formidable.IncomingForm();
    form.uploadDir = uploadDir; //檔案路徑
    form.keepExtensions = true;

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          reject(err);
        } else {
          resolve({ fields, files });
        }
      });
    });

    /**定義可上傳檔案 */
    const allowedTypes = ['application/pdf']; // PDF 文件
    const uploadedFiles = Object.values(files).flat();
    console.log("上傳的文件：", uploadedFiles); // 顯示上傳檔案資訊

    let savedFiles = [];
    for (const file of uploadedFiles) {
      if (!allowedTypes.includes(file.mimetype)) {
        fs.unlink(file.filepath, err => {
          if (err) {
            console.error(`刪除不允許類型文件失敗：${file.filepath}`, err);
          }
        });
        throw new Error(`不允許的文件類型：${file.mimetype}`);
      }

      // 檢查文件大小
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        // 刪除過大的文件
        fs.unlink(file.filepath, err => {
          if (err) {
            console.error(`刪除過大檔案失敗：${file.originalFilename}`, err);
          }
        });
        throw new Error(`文件過大：${file.originalFilename}`);
      }

      const originalFilePath = file.filepath; // 暫時上傳檔的文件路徑位置
      const originalFileName = file.originalFilename; // 保留原始上傳檔案名稱
      const targetFilePath = path.join(uploadDir, originalFileName); // 檔案路徑JOIN原始檔案名稱

      console.log(targetFilePath);

      try {
        // 等待文件釋放後再進行刪除
        const fileReleased = await waitForFileRelease(originalFilePath);
        if (fileReleased) {
          // 如果目標檔案已經存在，則直接覆蓋
          if (fs.existsSync(targetFilePath)) {
            console.log(`檔案已存在，進行覆蓋：${originalFileName}`);
            fs.unlinkSync(targetFilePath); // 刪除現有的檔案
          }
          fs.renameSync(originalFilePath, targetFilePath); // 移動文件
        } else {
          console.error(`文件仍在被佔用，無法刪除：${originalFilePath}`);
        }

        savedFiles.push(originalFileName); // 使用原始文件名
      } catch (err) {
        console.error(`處理文件失敗：${err.message}`);
        // 如果有錯誤發生，記得進行適當的錯誤處理，例如刪除已保存的文件等
        savedFiles.forEach(savedFilePath => {
          fs.unlink(savedFilePath, err => {
            if (err) {
              console.error(`刪除已保存文件失敗：${savedFilePath}`, err);
            }
          });
        });
        throw err; // 將錯誤向上拋出，讓 Express 處理
      }
    }

    // 返回成功訊息
    res.json({ code: 200, message: '文件上傳成功', files: savedFiles });

  } catch (error) {
    console.error('文件上傳失敗:', error.message);
    res.status(500).json({ error: `文件上傳失敗：${error.message}` });
  }
});



router.post('/uploadsFiles_', async (req, res) => {
  try {

    const data = [req.body];
    console.log(data)
    const results = await dbpg.UptData("public.\"files\"", data);


    if (results.length !== 0) {
      res.json({
        code: 200,
        results
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


router.delete('/delFile/:id', async (req, res) => {
  try {
    const sid = req.params.id;
    const uploadDir = path.join(__dirname, '../../RS-Vue3-Pleng/public/uploads/');
    const searchSQL = `SELECT file_path FROM public.files  WHERE id = $1`;
    const searchQuery = await dbpg.selectNewSQL(searchSQL, [sid]);


    if (searchQuery.length > 0) {
      const PDFfile = searchQuery[0].file_path;
      const filePath = uploadDir + PDFfile;

      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, err => {
          if (err) {
            console.error(`刪除過大檔案失敗：${PDFfile}`, err);
          } else {
            console.log(`文件已成功刪除：${PDFfile}`);
          }
        });
      }
    }

    const DelLevaeSQL = `DELETE FROM public.files  WHERE id = $1`;
    const DelLevaeQuery = await dbpg.deleteSQL(DelLevaeSQL, [sid]);
    console.log(DelLevaeQuery)
    if (DelLevaeQuery > 0) {
      res.json({
        code: 200,
        msg: "刪除成功"
      });
    } else {
      res.json({
        code: 404,
        msg: '刪除失敗',
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
