const { Pool } = require('pg');
const moment = require('moment-timezone');
//設定基本檔
const CONFIG = require(__dirname + '/../config/config');

let pool;

/**
 * 資料庫連線
 */
function connectToDB() {
  // 如果連線資訊不存在，則會創建一個新的連線
  if (!pool) {
    pool = new Pool({
      user: CONFIG.PG_USER,
      host: CONFIG.PG_HOST,
      database: CONFIG.PG_DATABASE,
      password: CONFIG.PG_PASSWORD,
      port: CONFIG.PG_PORT,
    });
    console.log('Connected to the database!');
  }
}

/*
const pool = new Pool({
    user: 'postgresigp',
    host: '34.81.112.21',
    database: 'postgresigp',
    password: 'ulcH7499P',
    port: 5433, // 預設 PostgreSQL 5432
});


// 連接到資料庫
async function connectToDB() {
    try {
      await pool.connect();
      console.log('Connected to the database!');
    } catch (error) {
      console.error('Error connecting to the database:', error);
    }
  }
*/


/**
 * 刪除資料庫 指定 row
 * @param {*} tableName 
 * @param {*} id 
 * @returns 
 */
async function MSGis_Noread(id) {
  try {
    const deleteQuery = `DELETE FROM message_status WHERE message_id = $1`;
    const result = await pool.query(deleteQuery, [id]);

    // Check if any rows were affected by the deletion
    if (result.rowCount > 0) {
      console.log(`Record with id ${id} deleted successfully`);
      return true; // Indicate success
    } else {
      console.log(`Record with id ${id} not found`);
      return false; // Indicate that the record was not found
    }
  } catch (error) {
    console.error('Error while deleting record:', error);
    return false; // Indicate failure
  }
}

/**
 * 合約到期
 * @param {*} siteId 
 * @returns 
 */
async function CheckContracts(siteId) {
  try {
    const softwareContractsSQL = `
      SELECT s.id, s.sites_id, s.company_id, s.location_id, s.salesperson_id, s.contract_number,
            s.start_date, s.end_date, s.capacity, status_id, t.name as "statusName"
      FROM public."softwareContracts" s
      JOIN "softwareContractsStatus" t ON t.id = s.status_id
      WHERE s.sites_id = $1`;

    const result = await pool.query(softwareContractsSQL, [siteId]);

    if (result.rows.length === 0) {
      console.log('No contracts found for the given site ID');
      return true; // No contracts found
    }

    const contract = result.rows[0];
    const end_date = moment(contract.end_date).tz('Asia/Taipei').format('YYYY-MM-DD');
    const systemCurrentDay = moment().tz('Asia/Taipei').format('YYYY-MM-DD');
    const contract_number = contract.contract_number;

    // Check if contract has expired
    if (end_date <= systemCurrentDay) {
      return (`雲端合約編號:${contract_number}，於 ${end_date} 到期`);
    }

    // return true; // Indicate success if the contract is not expired
  } catch (error) {
    console.error('Error while checking contracts:', error);
    return false; // Indicate failure
  }
}



/**
 * 刪除資料庫
 * @param {*} tableName 
 * @param {*} id 
 * @returns 
 */
async function DelSQL(tableName, id) {
  try {
    const deleteQuery = `DELETE FROM ${tableName} WHERE id = $1`;
    const result = await pool.query(deleteQuery, [id]);

    // Check if any rows were affected by the deletion
    if (result.rowCount > 0) {
      console.log(`Record with id ${id} deleted successfully`);
      return true; // Indicate success
    } else {
      console.log(`Record with id ${id} not found`);
      return false; // Indicate that the record was not found
    }
  } catch (error) {
    console.error('Error while deleting record:', error);
    return false; // Indicate failure
  }
}




/**
 * 插入數據
 * @param {*} tableName 
 * @param {*} columns 
 * @param {*} fieldValues 
 */
async function insertData(tableName, columns, fieldValues) {
  try {
    // 產生查詢的動態部分
    const columnString = columns.join(', ');
    //fieldValues map index 轉換 => $1,$2,$3
    const valuePlaceholders = fieldValues.map((_, index) => `$${index + 1}`).join(', ');
    const flattenedValues = [].concat(...valuesArray); // 將多維陣列壓平成一維

    // const insertQuery = `INSERT INTO ${tableName} (column1, column2, column3) VALUES ($1, $2, $3)`;
    const insertQuery = `INSERT INTO ${tableName} (${columnString}) VALUES (${valuePlaceholders})`;
    await pool.query(insertQuery, fieldValues);
    console.log('Data inserted successfully!');
  } catch (error) {
    console.error('Error while inserting data:', error);
  }
}


/**
 * Arry 插入數據
 * SQL query to insert the JSON array into the table
 * @param {*} tableName 
 * @param {*} columns 
 * @param {*} values 
 */
async function insertDataArry(tableName, columns, values) {
  // SQL query to insert data into the table
  const insertQuery = `INSERT INTO "${tableName}" (${columns.join(', ')}) VALUES (${values.map((_, index) => `$${index + 1}`).join(', ')})`;
  try {
    const result = await pool.query(insertQuery, values);
    console.log('Data inserted successfully:', result);
  } catch (error) {
    console.error('Error executing query:', error);
  } finally {
    //  pool.end();
  }

}


/**
 * 批次插入數據
 * @param {*} tableName 
 * @param {*} columns 
 * @param {*} valuesArray 
 */
async function insertDataAll(tableName, columns, valuesArray) {
  try {
    const columnString = columns.join(', ');
    //console.log('columnString=',columnString)
    const valuesPlaceholders = valuesArray.map((values, index) => `(${values.map((_, i) => `$${index * columns.length + i + 1}`).join(', ')})`).join(', ');
    //console.log('需寫入的 Index =',valuesPlaceholders)
    const insertQuery = `INSERT INTO ${tableName} (${columnString}) VALUES ${valuesPlaceholders}`;
    const flattenedValues = [].concat(...valuesArray); // 將多維陣列壓平成一維
    //console.log('將多維陣列壓平成一維:',flattenedValues)
    await pool.query(insertQuery, flattenedValues);

    console.log('Data inserted successfully!');
  } catch (error) {
    console.error('Error while inserting data:', error);
    return [];
  }
}

/**
 * 查詢數據
 * @param {*} tableName 
 * @returns 
 */
async function selectData(tableName) {
  try {
    const selectQuery = `SELECT * FROM ${tableName}`;
    const result = await pool.query(selectQuery);
    // console.log('Retrieved records:', result.rows);
    return result.rows;
  } catch (error) {
    console.error('Error while retrieving records:', error);
    return [];
  }
}

/**
 * 查詢數據 代SQL
 * @param {*} tableName 
 * @returns 
 */
async function selectSQL(SQLQuery) {
  try {
    // const selectQuery = `SELECT * FROM ${tableName}`;
    const selectQuery = SQLQuery;
    const result = await pool.query(selectQuery);
    // console.log('Retrieved records:', result.rows);
    return result.rows;
  } catch (error) {
    console.error('Error while retrieving records:', error);
    return [];
  }
}


/**
 * 刪除代錯誤 代SQL
 * @param {*} tableName 
 * @returns 
 */
async function DelDeviceSQL(SQLQuery) {
  try {
    // const selectQuery = `SELECT * FROM ${tableName}`;
    const selectQuery = SQLQuery;
    const result = await pool.query(selectQuery);
    // console.log('Retrieved records:', result.rows);
    return result.rows;
  } catch (error) {
    const errorCode = { errorCode: error.code };
    // console.error('Error while retrieving records:', error);
    // console.log(errorCode)

    return (errorCode);
  }
}


/**
 * 查詢數據 代SQL
 * 使用參數化查詢以防止 SQL 注入
 * @param {*} query 
 * @param {*} params 
 * @returns 
 */
async function selectNewSQL(query, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
}


/**
 * 查詢數據(帶分頁) 查詢數據
 * @param {*} tableName 
 * @param {*} pageSize 
 * @param {*} offset 
 * @returns 
 */
async function selectData1(tableName, pageSize, offset) {
  try {
    const selectQuery = `SELECT * FROM ${tableName} LIMIT $1 OFFSET $2`;
    const result = await pool.query(selectQuery, [pageSize, offset]);
    return result.rows;
  } catch (error) {
    console.error('Error while retrieving records:', error);
    return [];
  }
}


/**
 * 查詢數據（帶分頁和總記錄數量）
 * @param {*} tableName  表單名稱
 * @param {*} pageSize   目前頁數
 * @param {*} offset     偏移數
 * @returns  countQuery  回傳總數
 */
async function selectDataWithTotalCount(tableName, pageSize, offset) {
  try {
    // 獲取總記錄數量
    const countQuery = `SELECT COUNT(*) FROM ${tableName}`;
    const countResult = await pool.query(countQuery);
    const totalCount = parseInt(countResult.rows[0].count);

    // 獲取分頁數據
    const selectQuery = `SELECT * FROM ${tableName} LIMIT $1 OFFSET $2`;
    const result = await pool.query(selectQuery, [pageSize, offset]);

    return {
      data: result.rows,
      totalCount,
    };
  } catch (error) {
    console.error('Error while retrieving records with total count:', error);
    return {
      data: [],
      totalCount: 0,
    };
  }
}


/**
 * UPT Array 更新數據沒有ID存就新增資料
 * 更新日期：2023-12-28
 * 修正：
 * 1.資料庫沒有資料id可以取時，出顯Bug
 * 2.修正INSERT資料columns大小寫問題
 * @param {*} tableName 
 * @param {*} updateValues 
 */
async function UptData(tableName, updateValues) {
  try {
    let finalResult = [];

    for (const obj of updateValues) {
      const id = obj.id || await generateUniqueId(tableName);
      const columns = Object.keys(obj);
      const values = Object.values(obj);

      let result;

      //偵測陣列是否有加入id
      if (!obj.id) {
        //將 colums 取後最的 id 編號
        columns.push("id");
        //將 values 取得資料庫最後最大的 id row 最大值+1，加入
        values.push(id);
        // const columnsString = columns.join(', ');
        const columnsString = columns.map(col => `"${col}"`).join(', ');
        const valuesString = values.map((_, index) => `$${index + 1}`).join(', ');

        // 更新 row 名稱
        console.log(columnsString);
        // 更新 Values 輸入值
        console.log(values);

        result = await pool.query(`INSERT INTO ${tableName}(${columnsString}) VALUES(${valuesString}) RETURNING *`, values);
      } else {
        const setValues = columns.map((col, index) => `"${col}" = $${index + 1}`).join(', ');

        // 更新 row 名稱
        console.log(setValues);
        // 更新 Values 輸入值
        console.log(values);

        const updateQuery = `UPDATE ${tableName} SET ${setValues} WHERE id = $${columns.length + 1} RETURNING *`;

        const updateValues = values.concat(id);
        result = await pool.query(updateQuery, updateValues);
      }

      finalResult.push(result.rows[0]);
    }

    // Send the response outside the loop
    return finalResult; // Return the final result outside the loop
  } catch (error) {
    console.error('Error executing query', error);
    throw error; // Throw the error to handle it elsewhere
  }
}


/**
 * 修改  const Results = await dbpg.UptDataNew("workOrderContracts", contract_periodUPdateSQL, "contract_number");
 * @param {*} tableName 
 * @param {*} updateValues 
 * @param {*} idColumn 
 * @returns 
 */
 async function UptDataNew(tableName, updateValues, idColumn) {
  try {
    let finalResult = [];

    for (const obj of updateValues) {
      // 提取欄位和數值
      const columns = Object.keys(obj);
      const values = Object.values(obj);

      // 檢查 obj 是否包含 idColumn
      if (!obj[idColumn]) {
        throw new Error('缺少 ID 以進行 UPDATE 操作');
      }

      // 處理 UPDATE 操作
      const setValues = columns
        .filter(col => col !== idColumn) // 從 SET 子句中排除 idColumn
        .map((col, index) => `"${col}" = $${index + 1}`)
        .join(', ');

      // 查詢值應包含所有欄位的值以及 ID
      const queryValues = [...values.filter(val => val !== obj[idColumn]), obj[idColumn]];

      const query = `UPDATE "${tableName}" SET ${setValues} WHERE "${idColumn}" = $${queryValues.length} RETURNING *`;

      console.log(query);
      console.log(queryValues);

      const result = await pool.query(query, queryValues);
      finalResult.push(result.rows[0]);
    }

    return finalResult;
  } catch (error) {
    console.error('執行查詢時發生錯誤', error);
    throw error;
  }
}







/**
 * 建立資料庫 不用ID
 * @param {*} tableName 
 * @param {*} updateValues 
 * @returns 
 */
async function CreateData(tableName, updateValues) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN'); // 開始事務

    let finalResult = [];

    for (const obj of updateValues) {
      const columns = Object.keys(obj);
      const values = Object.values(obj);

      const columnsString = columns.map(col => `"${col}"`).join(', ');
      const valuesString = values.map((_, index) => `$${index + 1}`).join(', ');

      console.log(columnsString); // 調試：列名
      console.log(values); // 調試：值

      const result = await client.query(`INSERT INTO ${tableName}(${columnsString}) VALUES(${valuesString}) RETURNING *`, values);
      finalResult.push(result.rows[0]);
    }

    await client.query('COMMIT'); // 提交事務
    return finalResult;
  } catch (error) {
    await client.query('ROLLBACK'); // 發生錯誤時回滾事務
    console.error('執行查詢時出錯', error);
    throw error;
  } finally {
    client.release(); // 釋放客戶端連接
  }
}

/**
 * UPT Array 更新數據沒有ID存就新增資料
 * 更新日期：2023-12-13
 * @param {*} tableName 
 * @param {*} updateValues 
 */
async function UptDataBak(tableName, updateValues) {
  try {
    let finalResult = [];

    for (const obj of updateValues) {
      const id = obj.id || await generateUniqueId(tableName);
      const columns = Object.keys(obj);
      const values = Object.values(obj);

      let result;

      //偵測陣列是否有加入id
      if (!obj.id) {
        //將 colums 取後最的 id 編號
        columns.push("id");
        //將 values 取得資料庫最後最大的 id row 最大值+1，加入
        values.push(id);
        const columnsString = columns.join(', ');
        const valuesString = values.map((_, index) => `$${index + 1}`).join(', ');

        // 更新 row 名稱
        console.log(columnsString);
        // 更新 Values 輸入值
        console.log(values);

        result = await pool.query(`INSERT INTO ${tableName}(${columnsString}) VALUES(${valuesString}) RETURNING *`, values);
      } else {
        const setValues = columns.map((col, index) => `"${col}" = $${index + 1}`).join(', ');

        // 更新 row 名稱
        console.log(setValues);
        // 更新 Values 輸入值
        console.log(values);

        const updateQuery = `UPDATE ${tableName} SET ${setValues} WHERE id = $${columns.length + 1} RETURNING *`;

        const updateValues = values.concat(id);
        result = await pool.query(updateQuery, updateValues);
      }

      finalResult.push(result.rows[0]);
    }

    // Send the response outside the loop
    return finalResult; // Return the final result outside the loop
  } catch (error) {
    console.error('Error executing query', error);
    throw error; // Throw the error to handle it elsewhere
  }
}


// 生成唯一 id 的函数（你可以使用 uuid 或实现自己的逻辑）
async function generateUniqueId(tableName) {
  let maxId;
  let newId;
  try {
    // const maxId = await pool.query(`SELECT MAX(id) FROM ${tableName}`);
    const maxId = await pool.query(`SELECT id FROM ${tableName} ORDER BY id DESC LIMIT 1`);

    if (maxId.rows.length > 0) {
      const newId = maxId.rows[0].id + 1;
      return newId;
    } else {
      // 如果沒有任何資料，可能是該表格是空的，可以從 1 開始
      return 1;
    }

  } catch (error) {
    console.error('Error executing query', error);
  }

}



/**
 * Device Site 案場串列
 */
async function DeviceSite(GetSite_Id) {

  try {
    const NodesArray = [];
    const NodesQuery = await pool.query('SELECT * FROM public."Nodes" WHERE "Site_Id" = $1', [`${GetSite_Id}`]);
    const gatewayQuery = await pool.query('SELECT * FROM public."Gateways" WHERE "gatewaySN" = $1', [NodesQuery.rows[0].gateways_SN]);
    for (let i = 0; i < NodesQuery.rows.length; i++) {
      const devices = {
        Node: NodesQuery.rows[i],
        slave: [],
      };

      const devicesQuery = await pool.query('SELECT * FROM public."Devices" WHERE "Node_id" = $1', [NodesQuery.rows[i].id]);
      for (let a = 0; a < devicesQuery.rows.length; a++) {
        devices.slave.push(devicesQuery.rows[a]);

        const mppt = [];

        const MpptsQuery = await pool.query('SELECT * FROM public."MPPTs" WHERE "Devices_id" = $1', [devicesQuery.rows[a].id]);
        for (let j = 0; j < MpptsQuery.rows.length; j++) {
          mppt.push(MpptsQuery.rows[j]);
        }
        devicesQuery.rows[a].mppt = mppt;

        for (let j = 0; j < mppt.length; j++) {
          const SSC = [];
          const SSCQuery = await pool.query('SELECT * FROM public."SSC" WHERE "MPPTs_Id" = $1', [mppt[j].id]);
          if (SSCQuery.rows.length !== 0) {
            for (let k = 0; k < SSCQuery.rows.length; k++) {
              SSC.push(SSCQuery.rows[k]);
            }
            mppt[j].SSC = SSC; // 將 SSC 加到相對應的 mppt 下
          }
        }
      }

      NodesArray.push(devices);
    }

    const data = {
      Gateways: gatewayQuery.rows,
      Devices: NodesArray,
    };
    return (data)

    console.log(JSON.stringify(data, null, 2)); // 輸出為 JSON 格式
  } catch (err) {
    console.error('Error executing query', err);
    return []
  } finally {
    // 關閉資料庫連線
    // await pool.end();
  }
}


/**
 * Device Site 案場串列
 */
async function SiteNode(GetSite_Id) {

  try {
    const NodesArray = [];
    const NodesQuery = await pool.query('SELECT * FROM public."Nodes" WHERE "Site_Id" = $1', [`${GetSite_Id}`]);
    // const gatewayQuery = await pool.query('SELECT * FROM public."Gateways" WHERE "gatewaySN" = $1', [NodesQuery.rows[0].gateways_SN]);
    for (let i = 0; i < NodesQuery.rows.length; i++) {
      NodesArray.push(`G/${NodesQuery.rows[i].gateways_SN}/N/${NodesQuery.rows[i].NodeSN}PT${NodesQuery.rows[i].Rs485Port}/Val`)
    }
    return (NodesArray)

    console.log(JSON.stringify(NodesArray, null, 3)); // 輸出為 JSON 格式
  } catch (err) {
    console.error('Error executing query', err);
    return []
  } finally {
    // 關閉資料庫連線
    // await pool.end();
  }
}

/**
 * 更新數據
 * @param {*} tableName 
 * @param {*} updateValues 
 */
async function updateData(tableName, updateValues) {
  try {
    const updateQuery = `UPDATE ${tableName} SET column1 = $1, column2 = $2 WHERE condition_column = $3`;
    await pool.query(updateQuery, updateValues);
    // console.log('Data updated successfully!');
  } catch (error) {
    console.error('Error while updating data:', error);
  }
}

/**
 * 刪除SQL
 * @param {*} query 
 * @param {*} params 
 * @returns 
 */
async function deleteSQL(query, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result.rowCount; // 返回受影響的行數
  } finally {
    client.release();
  }
}


/**
 * 刪除數據
 * @param {*} tableName 
 * @param {*} conditionValue 
 */
async function deleteData(tableName, conditionValue) {
  try {
    const deleteQuery = `DELETE FROM ${tableName} WHERE condition_column = $1`;
    await pool.query(deleteQuery, [conditionValue]);
    console.log('Data deleted successfully!');
  } catch (error) {
    console.error('Error while deleting data:', error);
  }
}

/**
 * 刪除採用陣列方式
 * @param {*} tableName 
 * @param {*} conditionValues 
 * const idsToDelete = [1, 2, 3]; // Replace with your array of IDs
 * await deleteDataArray('your_table', idsToDelete);
 */
async function deleteDataArray(tableName, conditionValues) {
  try {
    // Create a parameterized string for the IN clause based on the length of the array
    const placeholders = conditionValues.map((_, index) => `$${index + 1}`).join(', ');

    const deleteQuery = `DELETE FROM ${tableName} WHERE id IN (${placeholders})`;
    const result = await pool.query(deleteQuery, conditionValues);

    console.log('Data deleted successfully!');
    return result.rowCount > 0;
  } catch (error) {
    console.error('Error while deleting data:', error);
  }
}


/**
 * 關閉資料庫連接
 * 
 */
async function closeDB() {
  try {
    if (pool) {
      await pool.end();
      console.log('Database connection closed!');
    } else {
      console.log('Pool is not defined. Database connection might not have been initialized.');
    }
  } catch (error) {
    console.error('Error while closing the database connection:', error);
  }
}


/**
 * group_permissions 權限網頁
 * @param {*} groupid 
 * @returns 
 */
async function group_permissions(groupid) {
  try {
    const permissionsSQL = `
    SELECT permission_id ,d.name, d.page_access, d.note
    FROM public.group_permissions n
    INNER JOIN "permissions" d ON n.permission_id = d.id
    where n.group_id=$1 ORDER BY permission_id ASC`;

    const permissionsResult = await pool.query(permissionsSQL, [groupid]);

    // if (userSiteAccessResults.rows.length > 0) {
    //   return userSiteAccessResults.rows;
    // }
    return permissionsResult.rows;

  } catch (error) {
    console.error('Error querying database:', error);
    throw error;
  }
}


/**
 * SiteUser Found 案場權限
 * 1.單選案場-查資料庫 user_site_access 以 Serach UserId
 * 2.公司別案場群組案場-查資料庫 investment_company_users 以 Serach UserId 
 * @param {*} UserId 
 * @returns 
 */
async function getUserSites_BAK0614(UserId) {
  try {
    // const userSiteAccessSQL = `
    //   SELECT d.id, d.investment_company_id, d.name, d.report_total_device, d.location_id, d.location_id, d.default_rate,"Location"."ZipCode", "CityName", "AreaName","longitude", "latitude"
    //   FROM "user_site_access" n
    //   INNER JOIN "Sites" d ON n.site_id = d.id
    //   INNER JOIN "Location" ON "Location".id = d.location_id
    //   WHERE n.user_id = $1
    //   ORDER BY "ZipCode" ASC`;

    const userSiteAccessSQL = `
    SELECT
        d.id, d.investment_company_id, d.name, d.report_total_device, d.location_id, d.bulk_sale_default_rate,
        f."ZipCode", f."CityName", f."AreaName", f."longitude", f."latitude", f."distinguish",
        e.name AS "Company"
    FROM
        "user_site_access" n
    INNER JOIN
        "Sites" d ON n.site_id = d.id
    INNER JOIN
        "Location" f ON f.id = d.location_id
    INNER JOIN
        "Company" e ON e.id = d.investment_company_id
    WHERE
        n.user_id = $1
    ORDER BY
        f."ZipCode" ASC
    `;

    const userSiteAccessResults = await pool.query(userSiteAccessSQL, [UserId]);

    if (userSiteAccessResults.rows.length > 0) {
      return userSiteAccessResults.rows;
    }

    // const investmentCompanySQL = `
    //   SELECT d.id, d.name, d.report_total_device, d.default_rate, "Location"."ZipCode", "CityName", "AreaName","longitude", "latitude"
    //   FROM "investment_company_users" n
    //   INNER JOIN "Sites" d ON n.investment_company_id = d.investment_company_id
    //   INNER JOIN "Location" ON "Location".id = d.location_id
    //   WHERE n.user_id = $1
    //   ORDER BY "ZipCode" ASC`;

    const investmentCompanySQL = `
    SELECT
        d.id, d.investment_company_id, d.name, d.report_total_device, d.bulk_sale_default_rate, 
        e.distinguish, e."ZipCode", e."CityName", e."AreaName", e."longitude", e."latitude",
        f.name AS "Company"
    FROM
        "company_users" n
    INNER JOIN
        "Sites" d ON n.company_id = d.investment_company_id
    INNER JOIN
        "Location" e ON e.id = d.location_id
    INNER JOIN
        "Company" f ON f.id = d.investment_company_id
    WHERE
        n.user_id = $1
    ORDER BY
        e."ZipCode" ASC
    `;

    const investmentCompanyResults = await pool.query(investmentCompanySQL, [UserId]);

    return investmentCompanyResults.rows || [];
  } catch (error) {
    console.error('Error querying database:', error);
    throw error;
  }
}

/**
 * 採用 groupId 分類權限
 * @param {*} groupId 
 * @param {*} UserId 
 * @returns 
 */
async function getUserSites(UserId, groupId) {
  const group_Id = groupId || null

  switch (group_Id) {
    case 999:
      try {
        const specificSQL1 = `
          SELECT ...
          FROM ...
          WHERE ...
        `;
        const results1 = await pool.query(specificSQL1, [UserId]);
        return results1.rows || [];
      } catch (error) {
        console.error('Error querying database:', error);
        throw error;
      }
    case 2:
      try {
        const combinedSQL = `
        SELECT
            s.id, s.investment_company_id, s.name, s.report_total_device, s.location_id, s.bulk_sale_default_rate,
            l."ZipCode", l."CityName", l."AreaName", l."longitude", l."latitude", l."distinguish",
            c.name AS "Company"
        FROM
            "Sites" s
        INNER JOIN
            "Location" l ON l.id = s.location_id
        INNER JOIN
            "Company" c ON c.id = s.investment_company_id
        LEFT JOIN
            "user_site_access" usa ON usa.site_id = s.id AND usa.user_id = $1
        LEFT JOIN
            "company_users" cu ON cu.company_id = s.investment_company_id AND cu.user_id = $1
        WHERE
            usa.user_id IS NOT NULL OR cu.user_id IS NOT NULL
        ORDER BY
            l."ZipCode" ASC
        `;

        const results = await pool.query(combinedSQL, [UserId]);

        return results.rows || [];
      } catch (error) {
        console.error('Error querying database:', error);
        throw error;
      }
    case 4:
    case 5:
      try {
        const combinedSQL = `
            SELECT 
            s.id, s.investment_company_id, s.name, s.report_total_device, s.location_id, s.bulk_sale_default_rate,
            l."ZipCode", l."CityName", l."AreaName", l."longitude", l."latitude", l."distinguish",
            c.name AS "Company"
          FROM public."Sites" s
          JOIN company_users o ON o.company_id = s."OM_Company_id"
          JOIN "Location" l ON l.id = s.location_id
          JOIN "Company" c ON c.id = s.investment_company_id
          JOIN users u ON u.id = o.user_id
          WHERE u.id = $1 AND u.group_id IN (4, 5)
          ORDER BY l."ZipCode" ASC`;

        const results = await pool.query(combinedSQL, [UserId]);

        return results.rows || [];
      } catch (error) {
        console.error('Error querying database:', error);
        throw error;
      }
    default:
      try {
        const combinedSQL = `
        SELECT
            s.id, s.investment_company_id, s.name, s.report_total_device, s.location_id, s.bulk_sale_default_rate,
            l."ZipCode", l."CityName", l."AreaName", l."longitude", l."latitude", l."distinguish",
            c.name AS "Company"
        FROM
            "Sites" s
        INNER JOIN
            "Location" l ON l.id = s.location_id
        INNER JOIN
            "Company" c ON c.id = s.investment_company_id
        LEFT JOIN
            "user_site_access" usa ON usa.site_id = s.id AND usa.user_id = $1
        LEFT JOIN
            "company_users" cu ON cu.company_id = s.investment_company_id AND cu.user_id = $1
        WHERE
            usa.user_id IS NOT NULL OR cu.user_id IS NOT NULL
        ORDER BY
            l."ZipCode" ASC
        `;

        const results = await pool.query(combinedSQL, [UserId]);

        return results.rows || [];
      } catch (error) {
        console.error('Error querying database:', error);
        throw error;
      }

  }
}

async function getUserSites0530(UserId) {
  try {
    const combinedSQL = `
    SELECT
        s.id, s.investment_company_id, s.name, s.report_total_device, s.location_id, s.bulk_sale_default_rate,
        l."ZipCode", l."CityName", l."AreaName", l."longitude", l."latitude", l."distinguish",
        c.name AS "Company"
    FROM
        "Sites" s
    INNER JOIN
        "Location" l ON l.id = s.location_id
    INNER JOIN
        "Company" c ON c.id = s.investment_company_id
    LEFT JOIN
        "user_site_access" usa ON usa.site_id = s.id AND usa.user_id = $1
    LEFT JOIN
        "company_users" cu ON cu.company_id = s.investment_company_id AND cu.user_id = $1
    WHERE
        usa.user_id IS NOT NULL OR cu.user_id IS NOT NULL
    ORDER BY
        l."ZipCode" ASC
    `;

    const results = await pool.query(combinedSQL, [UserId]);

    return results.rows || [];
  } catch (error) {
    console.error('Error querying database:', error);
    throw error;
  }
}


/**
 * SiteUser Found 案場權限
 * 1.單選案場-查資料庫 user_site_access 以 Serach UserId
 * 2.公司別案場群組案場-查資料庫 investment_company_users 以 Serach UserId 
 * 3.新增公司別清單
 * @param {*} UserId 
 * @returns 
 */
async function getUserSitesNew(UserId) {
  try {
    const userSiteAccessSQL = `
      SELECT
        d.id, d.investment_company_id, d.name, d.report_total_device, d.location_id, d.bulk_sale_default_rate,
        f."ZipCode", f."CityName", f."AreaName", f."longitude", f."latitude", f."distinguish",
        e.name AS "Company"
      FROM
        "user_site_access" n
      INNER JOIN
        "Sites" d ON n.site_id = d.id
      INNER JOIN
        "Location" f ON f.id = d.location_id
      INNER JOIN
        "Company" e ON e.id = d.investment_company_id
      WHERE
        n.user_id = $1
      ORDER BY
        f."ZipCode" ASC
    `;

    const userSiteAccessResults = await pool.query(userSiteAccessSQL, [UserId]);

    if (userSiteAccessResults.rows.length > 0) {
      return {
        siteInfo: userSiteAccessResults.rows,
        CompanyInfo: null
      };
    }

    const investmentCompanySQL = `
      SELECT
        d.id, d.name, d.report_total_device, d.bulk_sale_default_rate, 
        e.distinguish, e."ZipCode", e."CityName", e."AreaName", e."longitude", e."latitude",
        f.name AS "Company"
      FROM
        "company_users" n
      INNER JOIN
        "Sites" d ON n.company_id = d.investment_company_id
      INNER JOIN
        "Location" e ON e.id = d.location_id
      INNER JOIN
        "Company" f ON f.id = d.investment_company_id
      WHERE
        n.user_id = $1
      ORDER BY
        e."ZipCode" ASC
    `;

    const investmentCompanyResults = await pool.query(investmentCompanySQL, [UserId]);

    const companySQL = `
      SELECT DISTINCT d.id as "investment_company_id", d."name"
      FROM public.company_users c
      JOIN "Company" d ON d.id = c."company_id"
      WHERE c.user_id=$1;
    `;

    const companyResults = await pool.query(companySQL, [UserId]);

    let siteInfoData = null;
    let CompanyInfoData = null;

    if (investmentCompanyResults.rows.length > 0 || companyResults.rows.length > 0) {
      siteInfoData = investmentCompanyResults.rows.length > 0 ? investmentCompanyResults.rows : null;
      CompanyInfoData = companyResults.rows.length > 0 ? companyResults.rows : null;
    } else {
      const user_site_accessSQL = `
        SELECT
          d.id, d.name, d.report_total_device, d.bulk_sale_default_rate, 
          e.distinguish, e."ZipCode", e."CityName", e."AreaName", e."longitude", 
          e."latitude",  f.name AS "Company"
        FROM
          "user_site_access" n
        INNER JOIN
          "Sites" d ON n.site_id = d.id
        INNER JOIN
          "Location" e ON e.id = d.location_id
        INNER JOIN
          "Company" f ON f.id = d.investment_company_id
        WHERE
          n.user_id = $1
        ORDER BY
          e."ZipCode" ASC
      `;

      const user_site_accessResults = await pool.query(user_site_accessSQL, [UserId]);

      const user_siteCompanySQL = `
        SELECT DISTINCT d.id as "investment_company_id", d."name"
        FROM public.user_site_access c
        JOIN "Sites" s ON c.site_id = s.id
        JOIN "Company" d ON d.id = s.investment_company_id
        WHERE c.user_id=$1;
      `;

      const user_siteCompanyResults = await pool.query(user_siteCompanySQL, [UserId]);
      
      siteInfoData = user_siteCompanyResults.rows.length > 0 ? user_siteCompanyResults.rows : null;
      CompanyInfoData = user_siteCompanyResults.rows.length > 0 ? user_siteCompanyResults.rows : null;
    }

    return {
      siteInfo: siteInfoData,
      CompanyInfo: CompanyInfoData
    };
  } catch (error) {
    console.error('Error querying database:', error);
    throw error;
  }
}


/**
 * SiteUser Found 案場權限
 * 1.單選案場-查資料庫 user_site_access 以 Serach UserId
 * 2.公司別案場群組案場-查資料庫 investment_company_users 以 Serach UserId 
 * @param {*} UserId 
 * @returns 
 */
async function getUserSearchSites_BAK(UserId, CityName, Company, distinguish, queryWord) {
  try {
    let userSiteAccessSQL;
    let userSiteAccessParams;

    if (CityName === undefined && Company === undefined && distinguish === undefined && queryWord === undefined) {
      // If all parameters are null, set n.user_id to 1
      userSiteAccessSQL = `
        SELECT
          d.id, d.investment_company_id, d.name, d.report_total_device, d.location_id, d.bulk_sale_default_rate,
          f."ZipCode", f."CityName", f."AreaName", f."longitude", f."latitude", f."distinguish",
          e.name AS "Company"
        FROM
          "user_site_access" n
        INNER JOIN
          "Sites" d ON n.site_id = d.id
        INNER JOIN
          "Location" f ON f.id = d.location_id
        INNER JOIN
          "Company" e ON e.id = d.investment_company_id
        WHERE
          (n.user_id = $1)
        ORDER BY
          f."ZipCode" ASC
      `;
      userSiteAccessParams = [UserId];
    } else {
      // If any parameter is not null, use the parameters in the query
      userSiteAccessSQL = `
        SELECT
          d.id, d.investment_company_id, d.name, d.report_total_device, d.location_id, d.bulk_sale_default_rate,
          f."ZipCode", f."CityName", f."AreaName", f."longitude", f."latitude", f."distinguish",
          e.name AS "Company"
        FROM
          "user_site_access" n
        INNER JOIN
          "Sites" d ON n.site_id = d.id
        INNER JOIN
          "Location" f ON f.id = d.location_id
        INNER JOIN
          "Company" e ON e.id = d.investment_company_id
        WHERE
          (n.user_id = $1 AND (e.name LIKE $2 OR f."CityName" LIKE $3 OR f.distinguish LIKE $4 OR d.name LIKE $5 OR e.name LIKE $5))
        ORDER BY
          f."ZipCode" ASC
      `;
      userSiteAccessParams = [UserId, `%${Company}%`, `%${CityName}%`, `%${distinguish}%`, `%${queryWord}%`];
    }

    const userSiteAccessResults = await pool.query(userSiteAccessSQL, userSiteAccessParams);

    if (userSiteAccessResults.rows.length > 0) {
      return userSiteAccessResults.rows;
    }

    let investmentCompanySQL;
    let investmentCompanyParams;

    if (CityName === undefined && Company === undefined && distinguish === undefined && queryWord === undefined) {
      investmentCompanySQL = `
        SELECT
          d.id, d.name, d.report_total_device, d.bulk_sale_default_rate, 
          e.distinguish, e."ZipCode", e."CityName", e."AreaName", e."longitude", e."latitude",
          f.name AS "Company"
        FROM
          "company_users" n
        INNER JOIN
          "Sites" d ON n.company_id = d.investment_company_id
        INNER JOIN
          "Location" e ON e.id = d.location_id
        INNER JOIN
          "Company" f ON f.id = d.investment_company_id
        WHERE
          (n.user_id = $1)
        ORDER BY
          e."ZipCode" ASC`;
      investmentCompanyParams = [UserId];
    } else {
      investmentCompanySQL = `
        SELECT
          d.id, d.name, d.report_total_device, d.bulk_sale_default_rate, 
          e.distinguish, e."ZipCode", e."CityName", e."AreaName", e."longitude", e."latitude",
          f.name AS "Company"
        FROM
          "company_users" n
        INNER JOIN
          "Sites" d ON n.company_id = d.investment_company_id
        INNER JOIN
          "Location" e ON e.id = d.location_id
        INNER JOIN
          "Company" f ON f.id = d.investment_company_id
        WHERE
          (n.user_id = $1 AND (f.name LIKE $2 OR e."CityName" LIKE $3 OR e.distinguish LIKE $4 OR d.name LIKE $5 OR f.name LIKE $5))
        ORDER BY
          e."ZipCode" ASC`;
      investmentCompanyParams = [UserId, `%${Company}%`, `%${CityName}%`, `%${distinguish}%`, `%${queryWord}%`];
    }

    const investmentCompanyResults = await pool.query(investmentCompanySQL, investmentCompanyParams);

    return investmentCompanyResults.rows || [];
  } catch (error) {
    console.error('Error querying database:', error);
    throw error;
  }
}

async function getUserSearchSites(UserId, CityName, Company, distinguish, queryWord) {
  try {
    let userSiteAccessSQL;
    let userSiteAccessParams;

    /**帳號個別指定 site */
    if (CityName === undefined && Company === undefined && distinguish === undefined && queryWord === undefined) {
      // If all parameters are null, set n.user_id to 1
      userSiteAccessSQL = `
        SELECT
          d.id, d.investment_company_id, d.name, d.report_total_device, d.location_id, d.bulk_sale_default_rate,
          f."ZipCode", f."CityName", f."AreaName", f."longitude", f."latitude", f."distinguish",
          e.name AS "Company"
        FROM
          "user_site_access" n
        INNER JOIN
          "Sites" d ON n.site_id = d.id
        INNER JOIN
          "Location" f ON f.id = d.location_id
        INNER JOIN
          "Company" e ON e.id = d.investment_company_id
        WHERE
          (n.user_id = $1)
        ORDER BY
          f."ZipCode" ASC
      `;
      userSiteAccessParams = [UserId];
    } else {
      let CityNameQuery;
      let CityNameVal;
      if (CityName) {
        // CityNameQuery = `f."CityName" = ANY(ARRAY[$3])`;
        CityNameQuery = `f."CityName" = ANY($3::TEXT[])`
        CityNameVal = CityName.split(',');
      } else {
        CityNameQuery = `f."CityName" LIKE $3`;
        CityNameVal = `%${CityName}%`;
      }

      userSiteAccessSQL = `
        SELECT
          d.id, d.investment_company_id, d.name, d.report_total_device, d.location_id, d.bulk_sale_default_rate,
          f."ZipCode", f."CityName", f."AreaName", f."longitude", f."latitude", f."distinguish",
          e.name AS "Company"
        FROM
          "user_site_access" n
        INNER JOIN
          "Sites" d ON n.site_id = d.id
        INNER JOIN
          "Location" f ON f.id = d.location_id
        INNER JOIN
          "Company" e ON e.id = d.investment_company_id
        WHERE
          (n.user_id = $1 AND (e.name LIKE $2 OR ${CityNameQuery}  OR f.distinguish LIKE $4 OR d.name LIKE $5 OR e.name LIKE $5))
        ORDER BY
          f."ZipCode" ASC
      `;
      userSiteAccessParams = [UserId, `%${Company}%`, CityNameVal, `%${distinguish}%`, `%${queryWord}%`];
    }

    const userSiteAccessResults = await pool.query(userSiteAccessSQL, userSiteAccessParams);

    if (userSiteAccessResults.rows.length > 0) {
      return userSiteAccessResults.rows;
    }

    let investmentCompanySQL;
    let investmentCompanyParams;

    /**沒有指定個別就顯示所有 */
    if (CityName === undefined && Company === undefined && distinguish === undefined && queryWord === undefined) {
      investmentCompanySQL = `
        SELECT
          d.id, d.name, d.report_total_device, d.bulk_sale_default_rate, 
          e.distinguish, e."ZipCode", e."CityName", e."AreaName", e."longitude", e."latitude",
          f.name AS "Company"
        FROM
          "company_users" n
        INNER JOIN
          "Sites" d ON n.company_id = d.investment_company_id
        INNER JOIN
          "Location" e ON e.id = d.location_id
        INNER JOIN
          "Company" f ON f.id = d.investment_company_id
        WHERE
          (n.user_id = $1)
        ORDER BY
          e."ZipCode" ASC`;
      investmentCompanyParams = [UserId];
    } else {
      let CityNameQuery;
      let CityNameVal;
      if (CityName) {
        CityNameVal = CityName.split(',');
        CityNameQuery = `e."CityName" = ANY($3::TEXT[])`
      } else {
        CityNameQuery = `e."CityName" LIKE $3`;
        CityNameVal = `%${CityName}%`;
      }
      investmentCompanySQL = `
        SELECT
          d.id, d.name, d.report_total_device, d.bulk_sale_default_rate, 
          e.distinguish, e."ZipCode", e."CityName", e."AreaName", e."longitude", e."latitude",
          f.name AS "Company"
        FROM
          "company_users" n
        INNER JOIN
          "Sites" d ON n.company_id = d.investment_company_id
        INNER JOIN
          "Location" e ON e.id = d.location_id
        INNER JOIN
          "Company" f ON f.id = d.investment_company_id
        WHERE
          (n.user_id = $1 AND (f.name LIKE $2 OR ${CityNameQuery} OR e.distinguish LIKE $4 OR d.name LIKE $5 OR f.name LIKE $5))
        ORDER BY
          e."ZipCode" ASC`;
      investmentCompanyParams = [UserId, `%${Company}%`, CityNameVal, `%${distinguish}%`, `%${queryWord}%`];
    }

    const investmentCompanyResults = await pool.query(investmentCompanySQL, investmentCompanyParams);

    return investmentCompanyResults.rows || [];
  } catch (error) {
    console.error('Error querying database:', error);
    throw error;
  }
}


/**
 * 2024-06-14 原getUserSearchSitesNew 改為 BAK
 * @param {*} UserId 
 * @param {*} CityName 
 * @param {*} Company 
 * @param {*} distinguish 
 * @param {*} queryWord 
 * @param {*} page 
 * @param {*} pageSize 
 * @returns 
 */
async function getUserSearchSitesNew_Bak(UserId, CityName, Company, distinguish, queryWord, page, pageSize) {
  try {
    let userSiteAccessSQL;
    let userSiteAccessParams;

    /**帳號個別指定 site */
    if (CityName === undefined && Company === undefined && distinguish === undefined && queryWord === undefined) {
      // If all parameters are null, set n.user_id to 1
      userSiteAccessSQL = `
        SELECT
          d.id, d.investment_company_id, d.name, d.report_total_device, d.location_id, d.bulk_sale_default_rate,
          f."ZipCode", f."CityName", f."AreaName", f."longitude", f."latitude", f."distinguish",
          e.name AS "Company"
        FROM
          "user_site_access" n
        INNER JOIN
          "Sites" d ON n.site_id = d.id
        INNER JOIN
          "Location" f ON f.id = d.location_id
        INNER JOIN
          "Company" e ON e.id = d.investment_company_id
        WHERE
          (n.user_id = $1)
        ORDER BY
          f."ZipCode" ASC
          LIMIT $2 OFFSET $3
      `;
      userSiteAccessParams = [UserId, pageSize, page];
    } else {
      let CityNameQuery;
      let CityNameVal;
      if (CityName) {
        // CityNameQuery = `f."CityName" = ANY(ARRAY[$3])`;
        CityNameQuery = `f."CityName" = ANY($3::TEXT[])`
        CityNameVal = CityName.split(',');
      } else {
        CityNameQuery = `f."CityName" LIKE $3`;
        CityNameVal = `%${CityName}%`;
      }

      userSiteAccessSQL = `
        SELECT
          d.id, d.investment_company_id, d.name, d.report_total_device, d.location_id, d.bulk_sale_default_rate,
          f."ZipCode", f."CityName", f."AreaName", f."longitude", f."latitude", f."distinguish",
          e.name AS "Company"
        FROM
          "user_site_access" n
        INNER JOIN
          "Sites" d ON n.site_id = d.id
        INNER JOIN
          "Location" f ON f.id = d.location_id
        INNER JOIN
          "Company" e ON e.id = d.investment_company_id
        WHERE
          (n.user_id = $1 AND (e.name LIKE $2 OR ${CityNameQuery}  OR f.distinguish LIKE $4 OR d.name LIKE $5 OR e.name LIKE $5))
        ORDER BY
          f."ZipCode" ASC
          LIMIT $6 OFFSET $7
      `;
      userSiteAccessParams = [UserId, `%${Company}%`, CityNameVal, `%${distinguish}%`, `%${queryWord}%`, pageSize, page];
    }

    const userSiteAccessResults = await pool.query(userSiteAccessSQL, userSiteAccessParams);

    if (userSiteAccessResults.rows.length > 0) {
      return userSiteAccessResults.rows;
    }

    let investmentCompanySQL;
    let investmentCompanyParams;

    /**沒有指定個別就顯示所有 */
    if (CityName === undefined && Company === undefined && distinguish === undefined && queryWord === undefined) {
      investmentCompanySQL = `
        SELECT
          d.id, d.name, d.report_total_device, d.bulk_sale_default_rate, 
          e.distinguish, e."ZipCode", e."CityName", e."AreaName", e."longitude", e."latitude",
          f.name AS "Company"
        FROM
          "company_users" n
        INNER JOIN
          "Sites" d ON n.company_id = d.investment_company_id
        INNER JOIN
          "Location" e ON e.id = d.location_id
        INNER JOIN
          "Company" f ON f.id = d.investment_company_id
        WHERE
          (n.user_id = $1)
        ORDER BY
          e."ZipCode" ASC
          LIMIT $2 OFFSET $3
          `;
      investmentCompanyParams = [UserId, pageSize, page];
    } else {
      let CityNameQuery;
      let CityNameVal;
      if (CityName) {
        CityNameVal = CityName.split(',');
        CityNameQuery = `e."CityName" = ANY($3::TEXT[])`
      } else {
        CityNameQuery = `e."CityName" LIKE $3`;
        CityNameVal = `%${CityName}%`;
      }
      investmentCompanySQL = `
        SELECT
          d.id, d.name, d.report_total_device, d.bulk_sale_default_rate, 
          e.distinguish, e."ZipCode", e."CityName", e."AreaName", e."longitude", e."latitude",
          f.name AS "Company"
        FROM
          "company_users" n
        INNER JOIN
          "Sites" d ON n.company_id = d.investment_company_id
        INNER JOIN
          "Location" e ON e.id = d.location_id
        INNER JOIN
          "Company" f ON f.id = d.investment_company_id
        WHERE
          (n.user_id = $1 AND (f.name LIKE $2 OR ${CityNameQuery} OR e.distinguish LIKE $4 OR d.name LIKE $5 OR f.name LIKE $5))
        ORDER BY
          e."ZipCode" ASC
          LIMIT $6 OFFSET $7
          `;
      investmentCompanyParams = [UserId, `%${Company}%`, CityNameVal, `%${distinguish}%`, `%${queryWord}%`, pageSize, page];
    }

    const investmentCompanyResults = await pool.query(investmentCompanySQL, investmentCompanyParams);

    return investmentCompanyResults.rows || [];
  } catch (error) {
    console.error('Error querying database:', error);
    throw error;
  }
}


/**
 * 2024-06-14 原 getUserSearchSitesNew_New  改換為 getUserSearchSitesNew
 * 2024-07-10 新增:維運人員 gorup_id = 4,5 查詢條件
 * @param {*} group_id 
 * @param {*} UserId 
 * @param {*} CityName 
 * @param {*} Company 
 * @param {*} distinguish 
 * @param {*} queryWord 
 * @param {*} page 
 * @param {*} pageSize 
 * @returns 
 */
async function getUserSearchSitesNew(UserId, CityName, Company, distinguish, queryWord, page, pageSize, group_id) {
  const group_Id = group_id || null;
  switch (group_Id) {
    /**IGP 人員 */
    case 1:
      try {
        console.log("1")
        let investmentCompanySQL;
        let investmentCompanyParams;

        if (CityName === undefined && Company === undefined && distinguish === undefined && queryWord === undefined) {
          // 如果沒有任何過濾條件，執行默認查詢
          investmentCompanySQL = `
          SELECT 
            s.id, s.investment_company_id, s.name, s.report_total_device, s.location_id, s.bulk_sale_default_rate,
            l."ZipCode", l."CityName", l."AreaName", l."longitude", l."latitude", l."distinguish",
            c.name AS "Company"
          FROM public."Sites" s
          JOIN "Location" l ON l.id = s.location_id
          JOIN "Company" c ON c.id = s.investment_company_id
          JOIN users u ON u.id = u.id
          WHERE u.id = $1 AND u.group_id IN (1)
          ORDER BY l."ZipCode" ASC
          LIMIT $2 OFFSET $3`;
          investmentCompanyParams = [UserId, pageSize, page];
        } else {
          // 帶有過濾條件的查詢
          let CityNameQuery;
          let CityNameVal;

          if (CityName) {
            CityNameVal = CityName.split(',');
            CityNameQuery = `l."CityName" = ANY($3::TEXT[])`;
          } else {
            CityNameQuery = `l."CityName" LIKE $3`;
            CityNameVal = `%${CityName}%`;
          }

          investmentCompanySQL = `
          SELECT 
            s.id, s.investment_company_id, s.name, s.report_total_device, s.location_id, s.bulk_sale_default_rate,
            l."ZipCode", l."CityName", l."AreaName", l."longitude", l."latitude", l."distinguish",
            c.name AS "Company"
          FROM public."Sites" s
          JOIN "Location" l ON l.id = s.location_id
          JOIN "Company" c ON c.id = s.investment_company_id
          JOIN users u ON u.id = u.id
          WHERE u.id = $1 AND u.group_id IN (1) AND
            (c.name LIKE $2 OR ${CityNameQuery} OR l.distinguish LIKE $4 OR s.name LIKE $5 OR c.name LIKE $5)
          ORDER BY l."ZipCode" ASC
          LIMIT $6 OFFSET $7`;

          investmentCompanyParams = [
            UserId,
            `%${Company}%`,
            CityNameVal,
            `%${distinguish}%`,
            `%${queryWord}%`,
            pageSize,
            page
          ];
        }
        console.log(investmentCompanySQL, investmentCompanyParams)
        const investmentCompanyResults = await pool.query(investmentCompanySQL, investmentCompanyParams);
        return investmentCompanyResults.rows || [];
      } catch (error) {
        console.error('Error querying database:', error);
        throw error;
      }
    /**案場管理員 */
    case 2:
      try {
        let investmentCompanySQL;
        let investmentCompanyParams;

        if (CityName === undefined && Company === undefined && distinguish === undefined && queryWord === undefined) {
          // 如果沒有任何過濾條件，執行默認查詢
          investmentCompanySQL = `
          SELECT
              s.id, s.investment_company_id, s.name, s.report_total_device, s.location_id, s.bulk_sale_default_rate,
              l."ZipCode", l."CityName", l."AreaName", l."longitude", l."latitude", l."distinguish",
              c.name AS "Company"
          FROM "Sites" s
          INNER JOIN "Location" l ON l.id = s.location_id
          INNER JOIN "Company" c ON c.id = s.investment_company_id
          LEFT JOIN "user_site_access" usa ON usa.site_id = s.id AND usa.user_id = $1
          LEFT JOIN "company_users" cu ON cu.company_id = s.investment_company_id AND cu.user_id = $1
          WHERE usa.user_id IS NOT NULL OR cu.user_id IS NOT NULL
          ORDER BY l."ZipCode" ASC
          LIMIT $2 OFFSET $3`;
          investmentCompanyParams = [UserId, pageSize, page];
        } else {
          // 帶有過濾條件的查詢
          let CityNameQuery;
          let CityNameVal;

          if (CityName) {
            CityNameVal = CityName.split(',');
            CityNameQuery = `e."CityName" = ANY($3::TEXT[])`;
          } else {
            CityNameQuery = `e."CityName" LIKE $3`;
            CityNameVal = `%${CityName}%`;
          }

          investmentCompanySQL = `
          SELECT
              d.id, d.name, d.report_total_device, d.bulk_sale_default_rate, 
              e.distinguish, e."ZipCode", e."CityName", e."AreaName", e."longitude", e."latitude",
              f.name AS "Company"
          FROM "Sites" d
          INNER JOIN "Location" e ON e.id = d.location_id
          INNER JOIN "Company" f ON f.id = d.investment_company_id
          LEFT JOIN "user_site_access" usa ON usa.site_id = d.id AND usa.user_id = $1
          LEFT JOIN "company_users" cu ON cu.company_id = d.investment_company_id AND cu.user_id = $1          
          WHERE 
              (f.name LIKE $2 OR ${CityNameQuery} OR e.distinguish LIKE $4 OR d.name LIKE $5 OR f.name LIKE $5)
          ORDER BY e."ZipCode" ASC
          LIMIT $6 OFFSET $7;
          `;

          investmentCompanyParams = [
            UserId,
            `%${Company}%`,
            CityNameVal,
            `%${distinguish}%`,
            `%${queryWord}%`,
            pageSize,
            page
          ];
        }
        // console.log(investmentCompanySQL, investmentCompanyParams)
        const investmentCompanyResults = await pool.query(investmentCompanySQL, investmentCompanyParams);
        return investmentCompanyResults.rows || [];
      } catch (error) {
        console.error('Error querying database:', error);
        throw error;
      }
    /**OM 維運人員 */
    case 4:
    case 5:
      try {
        let investmentCompanySQL;
        let investmentCompanyParams;

        if (CityName === undefined && Company === undefined && distinguish === undefined && queryWord === undefined) {
          // 如果沒有任何過濾條件，執行默認查詢
          investmentCompanySQL = `
          SELECT 
            s.id, s.investment_company_id, s.name, s.report_total_device, s.location_id, s.bulk_sale_default_rate,
            l."ZipCode", l."CityName", l."AreaName", l."longitude", l."latitude", l."distinguish",
            c.name AS "Company",
            u.username
          FROM public."Sites" s
          JOIN company_users o ON o.company_id = s."OM_Company_id"
          JOIN "Location" l ON l.id = s.location_id
          JOIN "Company" c ON c.id = s.investment_company_id
          JOIN users u ON u.id = o.user_id
          WHERE u.id = $1 AND u.group_id IN (4, 5)
          ORDER BY l."ZipCode" ASC
          LIMIT $2 OFFSET $3`;
          investmentCompanyParams = [UserId, pageSize, page];
        } else {
          // 帶有過濾條件的查詢
          let CityNameQuery;
          let CityNameVal;

          if (CityName) {
            CityNameVal = CityName.split(',');
            CityNameQuery = `l."CityName" = ANY($3::TEXT[])`;
          } else {
            CityNameQuery = `l."CityName" LIKE $3`;
            CityNameVal = `%${CityName}%`;
          }

          investmentCompanySQL = `
          SELECT 
            s.id, s.investment_company_id, s.name, s.report_total_device, s.location_id, s.bulk_sale_default_rate,
            l."ZipCode", l."CityName", l."AreaName", l."longitude", l."latitude", l."distinguish",
            c.name AS "Company",
            u.username
          FROM public."Sites" s
          JOIN company_users o ON o.company_id = s."OM_Company_id"
          JOIN "Location" l ON l.id = s.location_id
          JOIN "Company" c ON c.id = s.investment_company_id
          JOIN users u ON u.id = o.user_id        
          WHERE u.id = $1 AND u.group_id IN (4, 5) AND
            (c.name LIKE $2 OR ${CityNameQuery} OR l.distinguish LIKE $4 OR s.name LIKE $5 OR c.name LIKE $5)
          ORDER BY l."ZipCode" ASC
          LIMIT $6 OFFSET $7
          `;

          investmentCompanyParams = [
            UserId,
            `%${Company}%`,
            CityNameVal,
            `%${distinguish}%`,
            `%${queryWord}%`,
            pageSize,
            page
          ];
        }
        
        // console.log(investmentCompanySQL, investmentCompanyParams)
        const investmentCompanyResults = await pool.query(investmentCompanySQL, investmentCompanyParams);
        return investmentCompanyResults.rows || [];
      } catch (error) {
        console.error('Error querying database:', error);
        throw error;
      }
    //未分類
    default:
      try {
        let investmentCompanySQL;
        let investmentCompanyParams;

        if (CityName === undefined && Company === undefined && distinguish === undefined && queryWord === undefined) {
          // 如果没有任何过滤条件，执行默认查询
          investmentCompanySQL = `
          SELECT
              s.id, s.investment_company_id, s.name, s.report_total_device, s.location_id, s.bulk_sale_default_rate,
              l."ZipCode", l."CityName", l."AreaName", l."longitude", l."latitude", l."distinguish",
              c.name AS "Company"
          FROM "Sites" s
          INNER JOIN "Location" l ON l.id = s.location_id
          INNER JOIN "Company" c ON c.id = s.investment_company_id
          LEFT JOIN "user_site_access" usa ON usa.site_id = s.id AND usa.user_id = $1
          LEFT JOIN "company_users" cu ON cu.company_id = s.investment_company_id AND cu.user_id = $1
          WHERE usa.user_id IS NOT NULL OR cu.user_id IS NOT NULL
          ORDER BY l."ZipCode" ASC
          LIMIT $2 OFFSET $3`;
          investmentCompanyParams = [UserId, pageSize, page];
        } else {
          // 构建带有过滤条件的查询
          let CityNameQuery;
          let CityNameVal;

          if (CityName) {
            CityNameVal = CityName.split(',');
            CityNameQuery = `e."CityName" = ANY($2::TEXT[])`;
          } else {
            CityNameQuery = `e."CityName" LIKE $2`;
            CityNameVal = `%${CityName}%`;
          }

          investmentCompanySQL = `
          SELECT
            d.id, d.name, d.report_total_device, d.bulk_sale_default_rate, 
            e.distinguish, e."ZipCode", e."CityName", e."AreaName", e."longitude", e."latitude",
            f.name AS "Company"
          FROM "Sites" d
          INNER JOIN "Location" e ON e.id = d.location_id
          INNER JOIN "Company" f ON f.id = d.investment_company_id          
          WHERE
            (f.name LIKE $1 OR ${CityNameQuery} OR e.distinguish LIKE $3 OR d.name LIKE $4 OR f.name LIKE $4)
          ORDER BY e."ZipCode" ASC
          LIMIT $5 OFFSET $6
          `;

          investmentCompanyParams = [
            `%${Company}%`,
            CityNameVal,
            `%${distinguish}%`,
            `%${queryWord}%`,
            pageSize,
            page
          ];
        }

        const investmentCompanyResults = await pool.query(investmentCompanySQL, investmentCompanyParams);
        // console.log(investmentCompanyResults)
        return investmentCompanyResults.rows || [];
      } catch (error) {
        console.error('Error querying database:', error);
        throw error;
      }
  }
}


async function getUserSearchSitesNew_BAK20240805(UserId, CityName, Company, distinguish, queryWord, page, pageSize, group_id) {
  const group_Id = group_id || null;
  switch (group_Id) {
    /**IGP 人員 */
    case 1:
      try {
        console.log("1")
        let investmentCompanySQL;
        let investmentCompanyParams;

        if (CityName === undefined && Company === undefined && distinguish === undefined && queryWord === undefined) {
          // 如果沒有任何過濾條件，執行默認查詢
          investmentCompanySQL = `
          SELECT 
            s.id, s.investment_company_id, s.name, s.report_total_device, s.location_id, s.bulk_sale_default_rate,
            l."ZipCode", l."CityName", l."AreaName", l."longitude", l."latitude", l."distinguish",
            c.name AS "Company"
          FROM public."Sites" s
          JOIN "Location" l ON l.id = s.location_id
          JOIN "Company" c ON c.id = s.investment_company_id
          JOIN users u ON u.id = u.id
          WHERE u.id = $1 AND u.group_id IN (1)
          ORDER BY l."ZipCode" ASC
          LIMIT $2 OFFSET $3`;
          investmentCompanyParams = [UserId, pageSize, page];
        } else {
          // 帶有過濾條件的查詢
          let CityNameQuery;
          let CityNameVal;

          if (CityName) {
            CityNameVal = CityName.split(',');
            CityNameQuery = `l."CityName" = ANY($3::TEXT[])`;
          } else {
            CityNameQuery = `l."CityName" LIKE $3`;
            CityNameVal = `%${CityName}%`;
          }

          investmentCompanySQL = `
          SELECT 
            s.id, s.investment_company_id, s.name, s.report_total_device, s.location_id, s.bulk_sale_default_rate,
            l."ZipCode", l."CityName", l."AreaName", l."longitude", l."latitude", l."distinguish",
            c.name AS "Company"
          FROM public."Sites" s
          JOIN "Location" l ON l.id = s.location_id
          JOIN "Company" c ON c.id = s.investment_company_id
          JOIN users u ON u.id = u.id
          WHERE u.id = $1 AND u.group_id IN (1) AND
            (c.name LIKE $2 OR ${CityNameQuery} OR l.distinguish LIKE $4 OR s.name LIKE $5 OR c.name LIKE $5)
          ORDER BY l."ZipCode" ASC
          LIMIT $6 OFFSET $7`;

          investmentCompanyParams = [
            UserId,
            `%${Company}%`,
            CityNameVal,
            `%${distinguish}%`,
            `%${queryWord}%`,
            pageSize,
            page
          ];
        }
        console.log(investmentCompanySQL, investmentCompanyParams)
        const investmentCompanyResults = await pool.query(investmentCompanySQL, investmentCompanyParams);
        return investmentCompanyResults.rows || [];
      } catch (error) {
        console.error('Error querying database:', error);
        throw error;
      }
    /**案場管理員 */
    case 2:
      try {
        let investmentCompanySQL;
        let investmentCompanyParams;

        if (CityName === undefined && Company === undefined && distinguish === undefined && queryWord === undefined) {
          // 如果沒有任何過濾條件，執行默認查詢
          investmentCompanySQL = `
          SELECT
              s.id, s.investment_company_id, s.name, s.report_total_device, s.location_id, s.bulk_sale_default_rate,
              l."ZipCode", l."CityName", l."AreaName", l."longitude", l."latitude", l."distinguish",
              c.name AS "Company"
          FROM "Sites" s
          INNER JOIN "Location" l ON l.id = s.location_id
          INNER JOIN "Company" c ON c.id = s.investment_company_id
          LEFT JOIN "user_site_access" usa ON usa.site_id = s.id AND usa.user_id = $1
          LEFT JOIN "company_users" cu ON cu.company_id = s.investment_company_id AND cu.user_id = $1
          WHERE usa.user_id IS NOT NULL OR cu.user_id IS NOT NULL
          ORDER BY l."ZipCode" ASC
          LIMIT $2 OFFSET $3`;
          investmentCompanyParams = [UserId, pageSize, page];
        } else {
          // 帶有過濾條件的查詢
          let CityNameQuery;
          let CityNameVal;

          if (CityName) {
            CityNameVal = CityName.split(',');
            CityNameQuery = `e."CityName" = ANY($3::TEXT[])`;
          } else {
            CityNameQuery = `e."CityName" LIKE $3`;
            CityNameVal = `%${CityName}%`;
          }

          investmentCompanySQL = `
          SELECT
            d.id, d.name, d.report_total_device, d.bulk_sale_default_rate, 
            e.distinguish, e."ZipCode", e."CityName", e."AreaName", e."longitude", e."latitude",
            f.name AS "Company"
          FROM "Sites" d
          INNER JOIN "Location" e ON e.id = d.location_id
          INNER JOIN "Company" f ON f.id = d.investment_company_id          
          WHERE u.id = $1 AND
            (f.name LIKE $2 OR ${CityNameQuery} OR e.distinguish LIKE $4 OR d.name LIKE $5 OR f.name LIKE $5)
          ORDER BY e."ZipCode" ASC
          LIMIT $6 OFFSET $7
          `;

          investmentCompanyParams = [
            UserId,
            `%${Company}%`,
            CityNameVal,
            `%${distinguish}%`,
            `%${queryWord}%`,
            pageSize,
            page
          ];
        }

        const investmentCompanyResults = await pool.query(investmentCompanySQL, investmentCompanyParams);
        return investmentCompanyResults.rows || [];
      } catch (error) {
        console.error('Error querying database:', error);
        throw error;
      }
    /**OM 維運人員 */
    case 4:
    case 5:
      try {
        let investmentCompanySQL;
        let investmentCompanyParams;

        if (CityName === undefined && Company === undefined && distinguish === undefined && queryWord === undefined) {
          // 如果沒有任何過濾條件，執行默認查詢
          investmentCompanySQL = `
          SELECT 
            s.id, s.investment_company_id, s.name, s.report_total_device, s.location_id, s.bulk_sale_default_rate,
            l."ZipCode", l."CityName", l."AreaName", l."longitude", l."latitude", l."distinguish",
            c.name AS "Company",
            u.username, u.id
          FROM public."Sites" s
          JOIN company_users o ON o.company_id = s."OM_Company_id"
          JOIN "Location" l ON l.id = s.location_id
          JOIN "Company" c ON c.id = s.investment_company_id
          JOIN users u ON u.id = o.user_id
          WHERE u.id = $1 AND u.group_id IN (4, 5)
          ORDER BY l."ZipCode" ASC
          LIMIT $2 OFFSET $3`;
          investmentCompanyParams = [UserId, pageSize, page];
        } else {
          // 帶有過濾條件的查詢
          let CityNameQuery;
          let CityNameVal;

          if (CityName) {
            CityNameVal = CityName.split(',');
            CityNameQuery = `l."CityName" = ANY($3::TEXT[])`;
          } else {
            CityNameQuery = `l."CityName" LIKE $3`;
            CityNameVal = `%${CityName}%`;
          }

          investmentCompanySQL = `
          SELECT 
            s.id, s.investment_company_id, s.name, s.report_total_device, s.location_id, s.bulk_sale_default_rate,
            l."ZipCode", l."CityName", l."AreaName", l."longitude", l."latitude", l."distinguish",
            c.name AS "Company",
            u.username, u.id
          FROM public."Sites" s
          JOIN company_users o ON o.company_id = s."OM_Company_id"
          JOIN "Location" l ON l.id = s.location_id
          JOIN "Company" c ON c.id = s.investment_company_id
          JOIN users u ON u.id = o.user_id        
          WHERE u.id = $1 AND u.group_id IN (4, 5) AND
            (c.name LIKE $2 OR ${CityNameQuery} OR l.distinguish LIKE $4 OR s.name LIKE $5 OR c.name LIKE $5)
          ORDER BY l."ZipCode" ASC
          LIMIT $6 OFFSET $7
          `;

          investmentCompanyParams = [
            UserId,
            `%${Company}%`,
            CityNameVal,
            `%${distinguish}%`,
            `%${queryWord}%`,
            pageSize,
            page
          ];
        }

        const investmentCompanyResults = await pool.query(investmentCompanySQL, investmentCompanyParams);
        return investmentCompanyResults.rows || [];
      } catch (error) {
        console.error('Error querying database:', error);
        throw error;
      }
    //未分類
    default:
      try {
        let investmentCompanySQL;
        let investmentCompanyParams;

        if (CityName === undefined && Company === undefined && distinguish === undefined && queryWord === undefined) {
          // 如果没有任何过滤条件，执行默认查询
          investmentCompanySQL = `
          SELECT
              s.id, s.investment_company_id, s.name, s.report_total_device, s.location_id, s.bulk_sale_default_rate,
              l."ZipCode", l."CityName", l."AreaName", l."longitude", l."latitude", l."distinguish",
              c.name AS "Company"
          FROM "Sites" s
          INNER JOIN "Location" l ON l.id = s.location_id
          INNER JOIN "Company" c ON c.id = s.investment_company_id
          LEFT JOIN "user_site_access" usa ON usa.site_id = s.id AND usa.user_id = $1
          LEFT JOIN "company_users" cu ON cu.company_id = s.investment_company_id AND cu.user_id = $1
          WHERE usa.user_id IS NOT NULL OR cu.user_id IS NOT NULL
          ORDER BY l."ZipCode" ASC
          LIMIT $2 OFFSET $3`;
          investmentCompanyParams = [UserId, pageSize, page];
        } else {
          // 构建带有过滤条件的查询
          let CityNameQuery;
          let CityNameVal;

          if (CityName) {
            CityNameVal = CityName.split(',');
            CityNameQuery = `e."CityName" = ANY($2::TEXT[])`;
          } else {
            CityNameQuery = `e."CityName" LIKE $2`;
            CityNameVal = `%${CityName}%`;
          }

          investmentCompanySQL = `
          SELECT
            d.id, d.name, d.report_total_device, d.bulk_sale_default_rate, 
            e.distinguish, e."ZipCode", e."CityName", e."AreaName", e."longitude", e."latitude",
            f.name AS "Company"
          FROM "Sites" d
          INNER JOIN "Location" e ON e.id = d.location_id
          INNER JOIN "Company" f ON f.id = d.investment_company_id          
          WHERE
            (f.name LIKE $1 OR ${CityNameQuery} OR e.distinguish LIKE $3 OR d.name LIKE $4 OR f.name LIKE $4)
          ORDER BY e."ZipCode" ASC
          LIMIT $5 OFFSET $6
          `;

          investmentCompanyParams = [
            `%${Company}%`,
            CityNameVal,
            `%${distinguish}%`,
            `%${queryWord}%`,
            pageSize,
            page
          ];
        }

        const investmentCompanyResults = await pool.query(investmentCompanySQL, investmentCompanyParams);
        return investmentCompanyResults.rows || [];
      } catch (error) {
        console.error('Error querying database:', error);
        throw error;
      }
  }
}

/**
 * site_list 使用
 * 2024-06-14 原 getUserSearchSitesNewPageTotal 改為 getUserSearchSitesNewPageTotal_BAK
 * @param {*} UserId 
 * @param {*} CityName 
 * @param {*} Company 
 * @param {*} distinguish 
 * @param {*} queryWord 
 * @returns 
 */
async function getUserSearchSitesNewPageTotal_BAK(UserId, CityName, Company, distinguish, queryWord) {
  try {
    let userSiteAccessSQL;
    let userSiteAccessParams;

    /**帳號個別指定 site */
    if (CityName === undefined && Company === undefined && distinguish === undefined && queryWord === undefined) {
      // If all parameters are null, set n.user_id to 1
      userSiteAccessSQL = `
      SELECT COUNT(d.id) AS "TotalRecords"
        FROM
          "user_site_access" n
        INNER JOIN
          "Sites" d ON n.site_id = d.id
        INNER JOIN
          "Location" f ON f.id = d.location_id
        INNER JOIN
          "Company" e ON e.id = d.investment_company_id
        WHERE
          (n.user_id = $1)
      `;
      userSiteAccessParams = [UserId];
    } else {
      let CityNameQuery;
      let CityNameVal;
      if (CityName) {
        // CityNameQuery = `f."CityName" = ANY(ARRAY[$3])`;
        CityNameQuery = `f."CityName" = ANY($3::TEXT[])`
        CityNameVal = CityName.split(',');
      } else {
        CityNameQuery = `f."CityName" LIKE $3`;
        CityNameVal = `%${CityName}%`;
      }

      userSiteAccessSQL = `
      SELECT COUNT(d.id) AS "TotalRecords"
        FROM
          "user_site_access" n
        INNER JOIN
          "Sites" d ON n.site_id = d.id
        INNER JOIN
          "Location" f ON f.id = d.location_id
        INNER JOIN
          "Company" e ON e.id = d.investment_company_id
        WHERE
          (n.user_id = $1 AND (e.name LIKE $2 OR ${CityNameQuery}  OR f.distinguish LIKE $4 OR d.name LIKE $5 OR e.name LIKE $5))
      `;
      userSiteAccessParams = [UserId, `%${Company}%`, CityNameVal, `%${distinguish}%`, `%${queryWord}%`];
    }

    const userSiteAccessResults = await pool.query(userSiteAccessSQL, userSiteAccessParams);
    userSiteAccessData = parseFloat(userSiteAccessResults.rows[0].TotalRecords)

    if (userSiteAccessData > 0) {
      return userSiteAccessResults.rows;
    }

    let investmentCompanySQL;
    let investmentCompanyParams;

    /**沒有指定個別就顯示所有 */
    if (CityName === undefined && Company === undefined && distinguish === undefined && queryWord === undefined) {
      investmentCompanySQL = `
      SELECT COUNT(d.id) AS "TotalRecords"
        FROM
          "company_users" n
        INNER JOIN
          "Sites" d ON n.company_id = d.investment_company_id
        INNER JOIN
          "Location" e ON e.id = d.location_id
        INNER JOIN
          "Company" f ON f.id = d.investment_company_id
        WHERE
          (n.user_id = $1)
          `;
      investmentCompanyParams = [UserId];
    } else {
      let CityNameQuery;
      let CityNameVal;
      if (CityName) {
        CityNameVal = CityName.split(',');
        CityNameQuery = `e."CityName" = ANY($3::TEXT[])`
      } else {
        CityNameQuery = `e."CityName" LIKE $3`;
        CityNameVal = `%${CityName}%`;
      }
      investmentCompanySQL = `
      SELECT COUNT(d.id) AS "TotalRecords"
        FROM
          "company_users" n
        INNER JOIN
          "Sites" d ON n.company_id = d.investment_company_id
        INNER JOIN
          "Location" e ON e.id = d.location_id
        INNER JOIN
          "Company" f ON f.id = d.investment_company_id
        WHERE
          (n.user_id = $1 AND (f.name LIKE $2 OR ${CityNameQuery} OR e.distinguish LIKE $4 OR d.name LIKE $5 OR f.name LIKE $5))
          `;
      investmentCompanyParams = [UserId, `%${Company}%`, CityNameVal, `%${distinguish}%`, `%${queryWord}%`];
    }

    const investmentCompanyResults = await pool.query(investmentCompanySQL, investmentCompanyParams);
    investmentCompanyData = parseFloat(investmentCompanyResults.rows[0].TotalRecords)
    return investmentCompanyData || [];
  } catch (error) {
    console.error('Error querying database:', error);
    throw error;
  }
}

/**
 * 2024-06-14 原 getUserSearchSitesNewPageTotal_New 改為 getUserSearchSitesNewPageTotal
 * 2024-07-10 新增:維運人員 gorup_id = 4,5 查詢條件
 * @param {*} UserId 
 * @param {*} CityName 
 * @param {*} Company 
 * @param {*} distinguish 
 * @param {*} queryWord 
 * @param {*} group_id 
 * @returns 
 */
async function getUserSearchSitesNewPageTotal(UserId, CityName, Company, distinguish, queryWord, group_id) {
  const group_Id = group_id || null;

  switch (group_Id) {
    case 1:
      try {
        let investmentCompanySQL;
        let investmentCompanyParams = [];

        if (CityName === undefined && Company === undefined && distinguish === undefined && queryWord === undefined) {
          // Query when no parameters are defined
          investmentCompanySQL = `
            SELECT COUNT(s.id) AS "TotalRecords"
            FROM "Sites" s
            JOIN "Location" l ON l.id = s.location_id
            JOIN "Company" c ON c.id = s.investment_company_id
            JOIN users u ON u.id = u.id
            WHERE u.id = $1 AND u.group_id IN (1)`;
          investmentCompanyParams = [UserId];
        } else {
          // Query when parameters are defined
          let CityNameQuery;
          let CityNameVal;

          if (CityName) {
            CityNameVal = CityName.split(',');
            CityNameQuery = `l."CityName" = ANY($3::TEXT[])`;
          } else {
            CityNameQuery = `l."CityName" LIKE $3`;
            CityNameVal = `%${CityName}%`;
          }

          investmentCompanySQL = `
            SELECT COUNT(s.id) AS "TotalRecords"
            FROM "Sites" s
			      JOIN "Location" l ON l.id = s.location_id
			      JOIN "Company" c ON c.id = s.investment_company_id
			      JOIN users u ON u.id = u.id
            WHERE u.id = $1 AND u.group_id IN (1) 
            AND (c.name LIKE $2 OR ${CityNameQuery} OR l.distinguish LIKE $4 OR s.name LIKE $5 OR c.name LIKE $5)
          `;
          investmentCompanyParams = [UserId, `%${Company}%`, CityNameVal, `%${distinguish}%`, `%${queryWord}%`];
        }

        // Log the constructed SQL and parameters (for debugging purposes)
        // console.log(investmentCompanySQL, investmentCompanyParams);

        // Execute the query
        const investmentCompanyResults = await pool.query(investmentCompanySQL, investmentCompanyParams);

        // Parse the result
        const investmentCompanyData = parseFloat(investmentCompanyResults.rows[0].TotalRecords);

        // Return the result or an empty array if no data found
        return investmentCompanyData || [];
      } catch (error) {
        // Log and throw any errors that occur
        console.error('Error querying database:', error.message);
        throw error;
      }
    case 2:
      try {
        let investmentCompanySQL;
        let investmentCompanyParams = [];

        if (CityName === undefined && Company === undefined && distinguish === undefined && queryWord === undefined) {
          // Query when no parameters are defined
          investmentCompanySQL = `
            SELECT COUNT(s.id) AS "TotalRecords"
            FROM "Sites" s
            INNER JOIN "Location" l ON l.id = s.location_id
            INNER JOIN "Company" c ON c.id = s.investment_company_id
            LEFT JOIN "user_site_access" usa ON usa.site_id = s.id AND usa.user_id = $1
            LEFT JOIN "company_users" cu ON cu.company_id = s.investment_company_id AND cu.user_id = $1
            WHERE usa.user_id IS NOT NULL OR cu.user_id IS NOT NULL
          `;
          investmentCompanyParams = [UserId];
        } else {
          // Query when parameters are defined
          let CityNameQuery;
          let CityNameVal;

          if (CityName) {
            CityNameVal = CityName.split(',');
            CityNameQuery = `e."CityName" = ANY($3::TEXT[])`;
          } else {
            CityNameQuery = `e."CityName" LIKE $3`;
            CityNameVal = `%${CityName}%`;
          }

          investmentCompanySQL = `
            SELECT COUNT(d.id) AS "TotalRecords"
            FROM "Sites" d
            INNER JOIN "Location" e ON e.id = d.location_id
            INNER JOIN "Company" f ON f.id = d.investment_company_id
            LEFT JOIN "user_site_access" usa ON usa.site_id = d.id AND usa.user_id = $1
            LEFT JOIN "company_users" cu ON cu.company_id = d.investment_company_id AND cu.user_id = $1
            WHERE (usa.user_id IS NOT NULL OR cu.user_id IS NOT NULL)
              AND (f.name LIKE $2 OR ${CityNameQuery} OR e.distinguish LIKE $4 OR d.name LIKE $5 OR f.name LIKE $5)
          `;
          investmentCompanyParams = [UserId, `%${Company}%`, CityNameVal, `%${distinguish}%`, `%${queryWord}%`];
        }

        // Log the constructed SQL and parameters (for debugging purposes)
        console.log(investmentCompanySQL, investmentCompanyParams);

        // Execute the query
        const investmentCompanyResults = await pool.query(investmentCompanySQL, investmentCompanyParams);

        // Parse the result
        const investmentCompanyData = parseFloat(investmentCompanyResults.rows[0].TotalRecords);

        // Return the result or an empty array if no data found
        return investmentCompanyData || [];
      } catch (error) {
        // Log and throw any errors that occur
        console.error('Error querying database:', error.message);
        throw error;
      }
    case 4:
    case 5:
      try {
        let investmentCompanySQL;
        let investmentCompanyParams = [];

        if (CityName === undefined && Company === undefined && distinguish === undefined && queryWord === undefined) {
          // Query when no parameters are defined
          investmentCompanySQL = `
            SELECT COUNT(s.id) AS "TotalRecords"
            FROM "Sites" s
            JOIN company_users o ON o.company_id = s."OM_Company_id"
            JOIN "Location" l ON l.id = s.location_id
            JOIN "Company" c ON c.id = s.investment_company_id
            JOIN users u ON u.id = o.user_id
            WHERE u.id = $1 AND u.group_id IN (4, 5)`;
          investmentCompanyParams = [UserId];
        } else {
          // Query when parameters are defined
          let CityNameQuery;
          let CityNameVal;

          if (CityName) {
            CityNameVal = CityName.split(',');
            CityNameQuery = `l."CityName" = ANY($3::TEXT[])`;
          } else {
            CityNameQuery = `l."CityName" LIKE $3`;
            CityNameVal = `%${CityName}%`;
          }

          investmentCompanySQL = `
            SELECT COUNT(s.id) AS "TotalRecords"
            FROM "Sites" s
            JOIN company_users o ON o.company_id = s."OM_Company_id"
			      JOIN "Location" l ON l.id = s.location_id
			      JOIN "Company" c ON c.id = s.investment_company_id
			      JOIN users u ON u.id = o.user_id
            WHERE u.id = $1 AND u.group_id IN (4, 5) 
            AND (c.name LIKE $2 OR ${CityNameQuery} OR l.distinguish LIKE $4 OR s.name LIKE $5 OR c.name LIKE $5)
          `;
          investmentCompanyParams = [UserId, `%${Company}%`, CityNameVal, `%${distinguish}%`, `%${queryWord}%`];
        }

        // Log the constructed SQL and parameters (for debugging purposes)
        // console.log(investmentCompanySQL, investmentCompanyParams);

        // Execute the query
        const investmentCompanyResults = await pool.query(investmentCompanySQL, investmentCompanyParams);

        // Parse the result
        const investmentCompanyData = parseFloat(investmentCompanyResults.rows[0].TotalRecords);

        // Return the result or an empty array if no data found
        return investmentCompanyData || [];
      } catch (error) {
        // Log and throw any errors that occur
        console.error('Error querying database:', error);
        throw error;
      }
    //未分類
    default:
      console.log("UserId", UserId, "CityName", CityName, "Company", Company, "distinguish", distinguish, "queryWord", queryWord)
      try {
        let investmentCompanySQL;
        let investmentCompanyParams = [];

        if (CityName === undefined && Company === undefined && distinguish === undefined && queryWord === undefined) {
          // Query when no parameters are defined
          investmentCompanySQL = `
            SELECT COUNT(s.id) AS "TotalRecords"
            FROM "Sites" s
            INNER JOIN "Location" l ON l.id = s.location_id
            INNER JOIN "Company" c ON c.id = s.investment_company_id
            LEFT JOIN "user_site_access" usa ON usa.site_id = s.id AND usa.user_id = $1
            LEFT JOIN "company_users" cu ON cu.company_id = s.investment_company_id AND cu.user_id = $1
            WHERE usa.user_id IS NOT NULL OR cu.user_id IS NOT NULL
          `;
          investmentCompanyParams = [UserId];
        } else {
          // Query when parameters are defined
          let CityNameQuery;
          let CityNameVal;

          if (CityName) {
            CityNameVal = CityName.split(',');
            CityNameQuery = `e."CityName" = ANY($3::TEXT[])`;
          } else {
            CityNameQuery = `e."CityName" LIKE $3`;
            CityNameVal = `%${CityName}%`;
          }

          investmentCompanySQL = `
            SELECT COUNT(d.id) AS "TotalRecords"
            FROM "Sites" d
            INNER JOIN "Location" e ON e.id = d.location_id
            INNER JOIN "Company" f ON f.id = d.investment_company_id
            LEFT JOIN "user_site_access" usa ON usa.site_id = d.id AND usa.user_id = $1
            LEFT JOIN "company_users" cu ON cu.company_id = d.investment_company_id AND cu.user_id = $1
            WHERE (usa.user_id IS NOT NULL OR cu.user_id IS NOT NULL)
              AND (f.name LIKE $2 OR ${CityNameQuery} OR e.distinguish LIKE $4 OR d.name LIKE $5 OR f.name LIKE $5)
          `;
          investmentCompanyParams = [UserId, `%${Company}%`, CityNameVal, `%${distinguish}%`, `%${queryWord}%`];
        }

        // Log the constructed SQL and parameters (for debugging purposes)
        console.log(investmentCompanySQL, investmentCompanyParams);

        // Execute the query
        const investmentCompanyResults = await pool.query(investmentCompanySQL, investmentCompanyParams);

        // Parse the result
        const investmentCompanyData = parseFloat(investmentCompanyResults.rows[0].TotalRecords);

        // Return the result or an empty array if no data found
        return investmentCompanyData || [];
      } catch (error) {
        // Log and throw any errors that occur
        console.error('Error querying database:', error.message);
        throw error;
      }
  }
}



/**
 * (查)案場 Node 純inv設備 
 * 資料庫:Nodes
 * @param {*} UserId 
 * @returns 
 */
async function getTotalSites(UserId) {
  try {
    const NodesSQL = `
    SELECT n.id, n."Site_Id", d."InstalledCapacity", d."slaveAddress" as slave, f."device_types_id"
    FROM public."Nodes" n
    INNER JOIN "Devices" d ON d."Node_id" = n."id"
    INNER JOIN "Brands" f ON f."id" = d."Brands_Id"
    WHERE n."Site_Id" = $1 AND f."device_types_id" = 1;
    `;

    const NodesSQLResults = await pool.query(NodesSQL, [UserId]);

    if (NodesSQLResults.rows.length > 0) {
      return NodesSQLResults.rows || [];
    }

  } catch (error) {
    console.error('Error querying database:', error);
    throw error;
  }
}

module.exports = {
  UptDataNew,            //更新new 可以入要改的id
  deleteSQL,             //刪除資訊
  CreateData,            //單純建立資料
  CheckContracts,        //檢查合約到期
  getUserSites0530,      //確認使用者擁有Site 更新 2024/5/30
  getUserSearchSitesNewPageTotal,//總頁數更新 2024/07/10
  getUserSearchSitesNew, //更新頁查 更新 2024/07/10
  DelDeviceSQL,          //刪除設備並代錯誤代碼
  MSGis_Noread,          //C-2-1_異常警告通知_標示未謮
  deleteDataArray,       //刪除資料採用陣列 ID 刪除
  getUserSitesNew,       //確認使用者擁有Site 及 投資公司
  DelSQL,                //單筆刪除資料庫
  selectNewSQL,          //SQL 使用參數化查詢以防止 SQL 注入
  getUserSearchSites,    //搜尋
  group_permissions,     //權限網頁
  getUserSites,           //(查)使用者可以讀取的樣案
  getTotalSites,          //(查)案場 Node 純inv設備 
  selectSQL,              //(查)SQL
  connectToDB,            //資料庫連線
  insertDataAll,
  insertData,
  UptDataBak,
  generateUniqueId,         //查ID
  insertDataArry,           //Array批次寫入資料
  selectData,
  UptData,                  //UPT Array 更新數據沒有ID存就新增資料
  selectData1,              //分頁帶頁數
  selectDataWithTotalCount, //分頁帶頁數+totalCount
  DeviceSite,               //案場串列
  SiteNode,                 //Node
  updateData,               //更新語法
  deleteData,               //刪除語法
  closeDB,                  // 將關閉資料庫連接的函數加入到匯出模組中
};
