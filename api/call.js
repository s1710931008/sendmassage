// index.js
const cron = require('node-cron');
const { exec } = require('child_process');

// 定義執行函數
function runTotal() {
    exec('node lineSendTotal.js', (error, stdout, stderr) => {
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

function rungetWarn() {
    exec('node lineSend.js', (error, stdout, stderr) => {
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
    console.log('正在執行 total.js...');
    runTotal();
}, {
    timezone: 'Asia/Taipei'
});

// 使用 cron 排程設定每 15 分鐘執行 abc.js
cron.schedule('*/15 * * * *', () => {
    console.log('正在執行 lineSend.js...');
    rungetWarn();
}, {
    timezone: 'Asia/Taipei'
});

console.log('排程已設置，每天下午 17:00 執行 lineSendTotal.js，並每 15 分鐘執行  lineSend.js');
