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
        const selectSQL = `WITH RankedWarnings AS (
    SELECT 
        w."plantNo", w."SiteName", w.msg, w.created_at, w.dreams_at,counts.count,
        ROW_NUMBER() OVER (PARTITION BY w."plantNo" ORDER BY w.created_at DESC) AS rn
    FROM public.warn w
    JOIN (
        SELECT "plantNo", COUNT(*) AS count
        FROM public.warn
        WHERE DATE(created_at) = CURRENT_DATE  -- 只選取今天的 warn 記錄
        GROUP BY "plantNo"                       -- 根據 plantNo 分組
    ) counts ON w."plantNo" = counts."plantNo"
    WHERE DATE(w.created_at) = CURRENT_DATE  -- 只選取今天的 warn 記錄
)

SELECT 
    "plantNo",  "SiteName", msg, created_at, dreams_at, count
FROM RankedWarnings
WHERE rn = 1  -- 只選取每個 plantNo 的第一條記錄
ORDER BY count DESC;  -- 按計數降序排列
`;
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