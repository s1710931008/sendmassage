// //導入 postgresql
const db = require(__dirname + '/../model/dbOperations.js');

/**
 * 設備種類清單
 */
/*
(async () => {
    try {
      db.connectToDB();
        // Call the insertDataArry method with the table name, columns, and values
        const result =  await db.selectData("device_types");
        console.log(result)
    } catch (error) {
      console.error('Error while retrieving records:', error);
    } finally {
      // Close the database connection after all operations are done
      db.closeDB();
    }
  })();
*/

  /**
 * 設備種類清單
 */
(async () => {
    try {
      db.connectToDB();
        const selectSQL = `SELECT w.id as "warnId", w."plantNo", w."SiteName", w.msg, w.created_at, w.dreams_at,
       u.id AS user_id, u."userName", u."lineToken"
FROM public.warn w
LEFT JOIN public.notification n 
    ON n."plantNo" = w."plantNo" 
    AND DATE(n.created_at) = CURRENT_DATE            -- 只匹配今天的 notification 記錄
LEFT JOIN "LinkSite" l ON l."plantNo" = w."plantNo"  -- JOIN LinkSite
LEFT JOIN public.user u ON u.id = l."UserId"         -- JOIN user
WHERE w.created_at >= CURRENT_DATE                   -- 只選當天的 warn 記錄
AND n."plantNo" IS NULL;                             -- 只選取沒有對應 notification 的 warn 記錄`;
        // Call the insertDataArry method with the table name, columns, and values
        const result =  await db.selectSQL(selectSQL);
        console.log(result)
    } catch (error) {
      console.error('Error while retrieving records:', error);
    } finally {
      // Close the database connection after all operations are done
      db.closeDB();
    }
  })();