const cron = require('node-cron');
const { spawn } = require('child_process');
const moment = require('moment-timezone');
const fs = require('fs');

// 定義錯誤記錄函數
function logError(message) {
    fs.appendFile('error.log', `${moment().format('YYYY-MM-DD HH:mm:ss')} - ${message}\n`, (err) => {
        if (err) console.error('無法寫入錯誤日誌');
    });
}

// 定義執行函數，使用 spawn
function runScript(scriptName) {
    const process = spawn('sudo', ['node', scriptName]);

    process.stdout.on('data', (data) => {
        console.log(`標準輸出: ${data}`);
    });

    process.stderr.on('data', (data) => {
        console.error(`標準錯誤: ${data}`);
        logError(`標準錯誤: ${data}`);
    });

    process.on('error', (error) => {
        console.error(`執行錯誤: ${error.message}`);
        logError(`執行錯誤: ${error.message}`);
    });

    process.on('close', (code) => {
        console.log(`${scriptName} 進程退出，代碼: ${code}`);
    });
}

// 使用 cron 排程設定每天 17:00 執行 lineSendTotal.js
cron.schedule('0 17 * * *', () => {
    console.log(`正在執行 統計Drams 次數, 時間: ${moment().tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss')}...`);
    runScript('lineSendTotal.js');
}, {
    timezone: 'Asia/Taipei'
});

// 使用 cron 排程設定每 15 分鐘執行 lineSend.js
cron.schedule('*/15 * * * *', () => {
    console.log(`正在執行 LINE Notify, 時間: ${moment().tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss')}...`);
    runScript('lineSend.js');
}, {
    timezone: 'Asia/Taipei'
});

console.log('排程已設置，每天下午 17:00 執行 統計Drams次數，並每 15 分鐘執行 LINE Notify');
