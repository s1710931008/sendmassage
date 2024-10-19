const cron = require('node-cron');
const { exec } = require('child_process');
const moment = require('moment-timezone'); // 引入 moment-timezone

// 定義執行函數
function executeScript(scriptName) {
    exec(`node ${scriptName}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`執行錯誤: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`標準錯誤: ${stderr}`);
            return;
        }
        console.log(`標準輸出: ${stdout}`);
    });
}

// 使用 cron 排程設定每天 17:00 執行 total.js
cron.schedule('0 17 * * *', () => {
    const currentTime = moment().tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss');
    console.log(`正在執行 統計Drams 次數, 時間: ${currentTime}...`);
    executeScript('lineSendTotal.js');
}, {
    timezone: 'Asia/Taipei'
});

// 使用 cron 排程設定每 5 分鐘執行 lineSend.js
cron.schedule('*/5 * * * *', () => {
    const currentTime = moment().tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss');
    console.log(`正在執行 LINE Notify, 時間: ${currentTime}...`);
    executeScript('lineSend.js');
}, {
    timezone: 'Asia/Taipei'
});

console.log('排程已設置，每天下午 17:00 執行 統計Drams次數，並每 5 分鐘執行 LINE Notify');