const axios = require('axios');
const fs = require('fs').promises;
const moment = require('moment');
const db = require(__dirname + '/../model/dbOperations.js');
const admin = require('firebase-admin');
const serviceAccount = require('./igpcloud-firebase-adminsdk-pav8m-0c755546a2.json'); // 替換為你的 Firebase 服務帳戶憑證檔案

// 初始化 Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

// 連接到資料庫
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

async function getMsgInfo() {
    try {
        const selectSQL = `
            WITH firebase_tokens AS (
                SELECT 
                    u.id AS user_id,
                    token ->> 'firebase_token' AS firebase_token
                FROM public.user u,
                json_array_elements(u."appToken") AS token
            )
            SELECT 
                w.id AS "warnId", w."plantNo", w."SiteName", w.msg, w.created_at, 
                w.dreams_at, ft.user_id, u."userName", ft.firebase_token
            FROM public.warn w
            LEFT JOIN public.notification n 
                ON n."plantNo" = w."plantNo" 
                AND DATE(n.created_at) = CURRENT_DATE            
            LEFT JOIN "LinkSite" l ON l."plantNo" = w."plantNo"  
            LEFT JOIN public.user u ON u.id = l."UserId"         
            LEFT JOIN firebase_tokens ft ON ft.user_id = u.id  
            WHERE w.created_at >= CURRENT_DATE                   
            AND n."plantNo" IS NULL;
        `;

        const result = await db.selectSQL(selectSQL);
        console.log(result);
        return result;
    } catch (error) {
        console.error('獲取訊息時發生錯誤：', error);
    }
}

async function sendNotification(message) {
    try {
        const response = await admin.messaging().send(message);
        console.log('成功發送訊息：', response);
    } catch (error) {
        console.error('發送訊息時出錯：', error);
    }
}

async function fetchAndSendMsgNotification() {
    try {
        const msgArray = await getMsgInfo();
        let sentMsgInfo = [];  // Initialize as an empty array

        for (const msg of msgArray) {
            let token = msg.firebase_token;
            if (!token) {
                console.warn(`用戶 ${msg.user_id} 沒有有效的 Firebase 令牌`);
                continue; // 如果沒有令牌，則跳過此用戶
            }

            console.log(`Sending message to token: ${token}`);

            // 定義訊息
            const message = {
                token: token,
                notification: {
                    title: 'Dreams 異常通知',
                    body: `伺服器名稱: ${msg.SiteName}, 訊息: 【 ${msg.msg} 】, 發生時間: ${moment(msg.created_at).tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss')}`,
                },
            };

            // 發送推播通知
            await sendNotification(message);

            sentMsgInfo.push({
                plantNo: msg.plantNo,
                warnId: msg.warnId,
                user_id: msg.user_id,
                lineToken: msg.firebase_token,
                sent_at: moment().tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss'),
                created_at: moment(msg.created_at).tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss'),
            });
        }

        await saveSentMsgInfo(sentMsgInfo);
    } catch (error) {
        console.error('發送通知時發生錯誤：', error);
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
    console.log('關閉 APP Notifications');
})();
