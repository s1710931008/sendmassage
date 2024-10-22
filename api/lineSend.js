const axios = require('axios');
const fs = require('fs').promises;
const moment = require('moment');
const db = require(__dirname + '/../model/dbOperations.js');
db.connectToDB();

async function saveSentMsgInfo(sentMsgInfo) {
    try {
        console.log(sentMsgInfo);
        //await db.UptData("public.\"notification\"", sentMsgInfo);
        console.log(`已成功儲存已發送訊息的資訊, 時間: ${moment().tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss')}`);
    } catch (error) {
        console.error('儲存已發送訊息的資訊時發生錯誤：', error);
    }
}

async function GetmsgInfo() {
    try {
        // const selectSQL = `SELECT w.id as "warnId", w."plantNo", w."SiteName", w.msg, w.created_at, w.dreams_at,
        //     u.id AS user_id, u."userName", u."lineToken"
        // FROM public.warn w
        // LEFT JOIN public.notification n 
        //     ON n."plantNo" = w."plantNo" 
        //     AND DATE(n.created_at) = CURRENT_DATE            
        // LEFT JOIN "LinkSite" l ON l."plantNo" = w."plantNo"  
        // LEFT JOIN public.user u ON u.id = l."UserId"         
        // WHERE w.created_at >= CURRENT_DATE                   
        // AND n."plantNo" IS NULL;`;
        const selectSQL =`SELECT DISTINCT ON (w."plantNo", u.id)  -- 確保根據 plantNo 和 user_id 獨特
                            w.id AS "warnId", w."plantNo", w."SiteName", w.msg, w.created_at, w.dreams_at,u.id AS user_id, 
                            u."userName", u."lineToken",l."UserId" AS "linkedUserId"  -- 新增 UserId 來自 LinkSite
                        FROM public.warn w
                        LEFT JOIN public.notification n 
                            ON n."plantNo" = w."plantNo" 
                            AND DATE(n.created_at) = CURRENT_DATE  -- 只匹配今天的 notification 記錄
                        LEFT JOIN "LinkSite" l 
                            ON l."plantNo" = w."plantNo"  -- JOIN LinkSite
                        LEFT JOIN public.user u 
                            ON u.id = l."UserId"         -- JOIN user
                        WHERE w.created_at >= CURRENT_DATE                   -- 只選當天的 warn 記錄
                        AND (n."plantNo" IS NULL OR l."UserId" != CAST(n.user_id AS INTEGER))  -- 確保正確比較
                        AND NOT EXISTS (                                   -- 檢查是否存在相同 plantNo 的 notification
                            SELECT 1
                            FROM public.notification n2
                            WHERE n2."plantNo" = w."plantNo"
                            AND DATE(n2.created_at) = CURRENT_DATE
                        ) 
                        ORDER BY w."plantNo", u.id, w.created_at DESC;  -- 依照 plantNo 和 user_id 及時間排序
                        `;

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
                'message': `異常通報\n案場名稱：${msg.SiteName}\n最後更新時間：${moment(msg.dreams_at).format('YYYY-MM-DD HH:mm:ss')}`
            });

            try {
                // Send the notification
                if(token){
                    await axios.post('https://notify-api.line.me/api/notify', body, { headers: headers });
                    console.log(`已成功發送 LINE Notify, 時間: ${moment().tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss')}`);
    
                    sentMsgInfo.push({
                        plantNo: msg.plantNo,
                        warnId: msg.warnId,
                        lineToken: msg.lineToken,
                        user_id: msg.user_id,
                        sent_at: moment().tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss'),
                        created_at: moment(msg.created_at).tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss')
                    });   
                }

            } catch (error) {
                console.error('發送通知時發生錯誤：', error);
            }
        }
        if(sentMsgInfo.length > 0){
            await saveSentMsgInfo(sentMsgInfo);
        }
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
    console.log(`關閉 LINE Notify, 時間: ${moment().tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss')}`);
})();
