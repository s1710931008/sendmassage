var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var adminRouter = require('./routes/admin');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//導入 postgresql
const dbpg = require(__dirname + '/model/dbOperations.js');


// 在應用程式啟動時打開數據連接資料庫
app.use(async (req, res, next) => {
  try {
    await dbpg.connectToDB();
    next();
  } catch (error) {
    console.error('Error connecting to the database:', error);
    // 如果連接 postgresql 失敗時，需要回應連接失敗訊息
    res.status(500).json({
      code: 500,
      error: 'Internal Server Error',
    });
    // 如果連接 PostgreSQL 失敗時，需要處理錯誤並中止應用程式的啟動
    // process.exit(1);
  }
});

// 在應用程序關時，即刻關閉 postgresql 資料庫連接
let closing = false;


process.on('SIGINT', async () => {
  if (!closing) {
    closing = true;
    try {
      // 在 Ctrl+C 中斷前先關閉資料庫連接
      await dbpg.closeDB();
      console.log('Database connection closed!');
      process.exit(0);
    } catch (error) {
      console.error('Error closing the database connection:', error);
      process.exit(1);
    }
  }
});


app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/admin', adminRouter)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
