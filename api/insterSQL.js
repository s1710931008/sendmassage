const db = require(__dirname + '/../model/dbOperations.js');

// 將 plantNo 列表
const plantNos = [
    "19867035011",
    "21733024906",
    "20732069941",
    "11735504911",
    "21687909908",
    "08408633930",
    "12435160852",
    "07614621293",
    "21901328001",
    "21662337903",
    "08612488287",
    "18331400016",
    "11572273846",
    "11572273835",
    "11572273824",
    "11572273813",
    "11572273802",
    "11572273799",
    "18331400038",
    "18331400049",
    "11563587879",
    "11563587868",
    "21587692905",
    "21687620900",
    "21460887900",
    "21587676905",
    "21662305905",
    "07383954557",
    "08753374415",
    "08377226521",
    "08408418702",
    "19867035033",
    "19867035055",
    "19867035044",
    "19164487243",
    "11563587937",
    "11563587904",
    "70867035055",
    "70901328001",
    "07286511317",
    "10326018902",
    "70901328012",
    "01844103048",
    "71901328012",
    "04847043886",
    "08377102247",
    "08421157065",
    "17302029024",
    "04673296882",
    "70381760207",
    "08342460555",
    "17443756465",
    "08650332757",
    "08377120568"
];

async function insertPlantNos() {
    try {
        await db.connectToDB(); // 連接到數據庫

        const batchSize = 100; // 設定批次大小
        for (let i = 0; i < plantNos.length; i += batchSize) {
            const batch = plantNos.slice(i, i + batchSize); // 分割批次
            const insertPromises = batch.map(plantNo => {
                return db.selectNewSQL('INSERT INTO public."LinkSite"("UserId", "plantNo") VALUES ($1, $2)', [2, plantNo])
                    .catch(err => console.error(`Error inserting plantNo ${plantNo}:`, err));
            });

            await Promise.all(insertPromises); // 等待當前批次的所有插入完成
            console.log(`Inserted plant numbers from index ${i} to ${i + batch.length - 1}.`);
        }

        console.log('All plant numbers inserted successfully.');
    } catch (err) {
        console.error('Error inserting plant numbers:', err);
    } finally {
        await db.closeDB(); // 關閉數據庫連接
    }
}

// 調用插入函數
insertPlantNos();
