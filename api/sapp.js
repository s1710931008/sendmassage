// npm install firebase-admin

const admin = require('firebase-admin');
const serviceAccount = require('./message-6153e-firebase-adminsdk-fmtjj-3aed97badf.json'); // 替換為你的 Firebase 服務帳戶憑證檔案

// 初始化 Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});


// 定義訊息
const message = {
//   token: 'fZ9lFMjjkkewq4ztXw9E1O:APA91bHaNu5AOv_MAkK-Eueq_7Ko1Rk9ZrTWyW9wZJQ1GJSznl0uBWUJ_iAN3YtkN0CsWCzwVqrS0L7juv49agDekLzYqW6lRslnb5CE212IVY-ihvh33450lGYYdZZ4KuXJ1gPuJptQ', // 替換為目標設備的 token
  token: 'BGJLb31soDCOLcdExo6AxpxvbdF6SgfSuJnfdykGJJQ9bd-vFcUfGFNbEEpb9suq98wkmtHQCeok_eg9xfaHvmk',
  notification: {
    title: '標題-測試',
    body: '測試-看看測試看看測試看看',
  },
};

// 發送推播通知
admin.messaging().send(message)
  .then((response) => {
    console.log('成功發送訊息：', response);
  })
  .catch((error) => {
    console.log('發送訊息時出錯：', error);
  });
