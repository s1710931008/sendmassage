const axios = require('axios');
const fs = require('fs').promises;
const moment = require('moment');
const db = require(__dirname + '/../model/dbOperations.js');
db.connectToDB();

async function saveSentMsgInfo(sentMsgInfo) {
    try {
        console.log(sentMsgInfo);
        await db.UptData("public.\"notification\"", sentMsgInfo);
        console.log("已成功儲存已發送訊息的資訊");
    } catch (error) {
        console.error('儲存已發送訊息的資訊時發生錯誤：', error);
    }
}

async function GetmsgInfo() {
    try {
        const selectSQL = `WITH RankedWarnings AS (
                            SELECT 
                                w."plantNo", w."SiteName", w.msg, w.created_at, w.dreams_at, counts.count,u.id AS user_id, u."userName", u."lineToken"
                            FROM public.warn w
                            JOIN (
                                SELECT "plantNo", COUNT(*) AS count
                                FROM public.warn
                                WHERE DATE(created_at) = CURRENT_DATE
                                GROUP BY "plantNo"
                            ) counts ON w."plantNo" = counts."plantNo"
                            LEFT JOIN "LinkSite" l ON l."plantNo" = w."plantNo"
                            LEFT JOIN public.user u ON u.id = l."UserId"
                            WHERE DATE(w.created_at) = CURRENT_DATE
                        )

                        SELECT DISTINCT 
                            "plantNo", "SiteName", msg, created_at, dreams_at, count,user_id, "userName", "lineToken"
                        FROM RankedWarnings
                        ORDER BY count DESC`;

        const result = await db.selectSQL(selectSQL);
        console.log(result);
        return result;

    } catch (error) {
        console.error('Error while retrieving records:', error);
    }
}

async function fetchAndSendMsgNotification() {
    try {
        const msgArray = await GetmsgInfo();
        let sentMsgInfo = [];  // Initialize as an empty array

        for (const msg of msgArray) {
            const token = msg.lineToken;
            console.log(`Sending message to token: ${token}`);

            const headers = {
                'Authorization': 'Bearer ' + token
            };
            const body = new URLSearchParams({
                'message': `伺服器名稱: ${msg.SiteName}, 訊息: 【 ${msg.msg} 】, 發報次數:【 ${msg.count} 】, Drams更新時間: ${moment(msg.dreams_at).tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss')}`
            });

            try {
                // Send the notification
                await axios.post('https://notify-api.line.me/api/notify', body, { headers: headers });
                console.log('已成功發送 LINE Notify');

                sentMsgInfo.push({
                    plantNo: msg.plantNo,
                    warnId: msg.warnId,
                    lineToken: msg.lineToken,
                    user_id: msg.user_id,
                    sent_at: moment().tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss'),
                    created_at: moment(msg.created_at).tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss')
                });
            } catch (error) {
                console.error('發送通知時發生錯誤：', error);
            }
        }
        // await saveSentMsgInfo(sentMsgInfo);
    } catch (error) {
        console.error('發生錯誤：', error);
    }
}

// Create an async function to run the main logic
(async () => {
    await fetchAndSendMsgNotification(); // Now we can use await here

    // Gracefully shut down and close the database connection pool
    process.on('SIGINT', async () => {
        console.log('Closing database connection...');
        await db.closeDB();
        process.exit(0);
    });
})();
