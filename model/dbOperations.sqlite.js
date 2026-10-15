const Database = require('better-sqlite3');

// 設定基本檔
const CONFIG = require(
    __dirname + '/../config/config'
);

let db = null;


/**
 * SQLite 資料庫連線
 */
function connectToDB() {
    if (!db) {
        db = new Database(
            CONFIG.SQLITE_DB_PATH
        );

        db.pragma(
            'foreign_keys = ON'
        );

        db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE COLLATE NOCASE,
                password_hash TEXT NOT NULL,
                status INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);
        const newsColumns = db.prepare(`PRAGMA table_info(news_items)`).all().map(column => column.name);
        if (newsColumns.length && !newsColumns.includes('full_content')) db.exec(`ALTER TABLE news_items ADD COLUMN full_content TEXT`);

        const bcrypt = require('bcryptjs');
        db.prepare(`
            INSERT INTO users (username, password_hash, status)
            VALUES (?, ?, 1)
            ON CONFLICT(username) DO UPDATE SET
                password_hash = excluded.password_hash,
                status = 1
        `).run('kenny@lixma.com.tw', bcrypt.hashSync('80466612', 10));

        console.log(
            'Connected to SQLite:',
            CONFIG.SQLITE_DB_PATH
        );
    }

    return db;
}

function getFiles({ page = 1, pageSize = 10, type, year, month } = {}) {
    const database = connectToDB();
    const conditions = [];
    const params = [];
    if (type) { conditions.push('type = ?'); params.push(Number(type)); }
    if (year) { conditions.push('year = ?'); params.push(Number(year)); }
    if (month) { conditions.push('month = ?'); params.push(Number(month)); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const total = database.prepare(`SELECT COUNT(*) AS total FROM files ${where}`).get(...params).total;
    const data = database.prepare(`
        SELECT id, filename, file_path, uploaded_at, year, month, type
        FROM files ${where}
        ORDER BY year DESC, month DESC, id DESC LIMIT ? OFFSET ?
    `).all(...params, Number(pageSize), (Number(page) - 1) * Number(pageSize));
    return { data, total, pageTotal: Math.ceil(total / Number(pageSize)) };
}

function saveFile(item) {
    const database = connectToDB();
    if (item.id) {
        database.prepare(`UPDATE files SET filename = ?, file_path = ?, year = ?, month = ?, type = ? WHERE id = ?`)
            .run(item.filename, item.file_path, Number(item.year), Number(item.month), Number(item.type), Number(item.id));
        return Number(item.id);
    }
    const result = database.prepare(`
        INSERT INTO files (filename, file_path, uploaded_at, year, month, type)
        VALUES (?, ?, datetime('now', 'localtime'), ?, ?, ?)
    `).run(item.filename, item.file_path, Number(item.year), Number(item.month), Number(item.type));
    return Number(result.lastInsertRowid);
}

function deleteFile(id) {
    const database = connectToDB();
    const file = database.prepare('SELECT * FROM files WHERE id = ?').get(Number(id));
    if (!file) return null;
    database.prepare('DELETE FROM files WHERE id = ?').run(Number(id));
    return file;
}


// ============================================================
// News
// ============================================================

function mapNews(row) {
    return {
        id: row.id,
        sortOrder: row.sort_order,
        isActive: Boolean(
            row.is_active
        ),
        imageUrl: row.image_url,
        title: row.title,
        description: row.description,
        content: row.full_content,
        publishedAt: row.published_at,
        displayDate: row.display_date,
        linkUrl: row.link_url,
        openInNewTab: Boolean(
            row.open_in_new_tab
        ),
    };
}


/**
 * 取得 NView 完整資料
 */
function getNViewData() {
    const database =
        connectToDB();

    const page =
        database
            .prepare(`
                SELECT
                    eyebrow,
                    title
                FROM nview_page
                WHERE id = 1
            `)
            .get();

    const carousel =
        database
            .prepare(`
                SELECT
                    autoplay_ms
                FROM nview_carousel
                WHERE id = 1
            `)
            .get();

    const items =
        database
            .prepare(`
                SELECT
                    id,
                    sort_order,
                    is_active,
                    image_url,
                    title,
                    description,
                    full_content,
                    published_at,
                    display_date,
                    link_url,
                    open_in_new_tab
                FROM news_items
                WHERE is_active = 1
                ORDER BY
                    sort_order ASC,
                    published_at DESC,
                    id ASC
            `)
            .all()
            .map(mapNews);

    return {
        page,

        carousel: {
            autoplayMs:
                carousel?.autoplay_ms
                ?? 4000,
        },

        items,
    };
}

function findUserByUsername(username) {

    const db = connectToDB();

    return db.prepare(`
    SELECT
      id,
      username,
      password_hash,
      status
    FROM users
    WHERE username = ?
    LIMIT 1
  `).get(username);

}

function getUsers() {
    return connectToDB().prepare(`
        SELECT id, username, status, created_at
        FROM users ORDER BY id ASC
    `).all();
}

function getUserById(id) {
    return connectToDB().prepare(`
        SELECT id, username, status, created_at
        FROM users WHERE id = ?
    `).get(Number(id));
}

function createUser({ username, password, status = 1 }) {
    const bcrypt = require('bcryptjs');
    const result = connectToDB().prepare(`
        INSERT INTO users (username, password_hash, status)
        VALUES (?, ?, ?)
    `).run(username.trim().toLowerCase(), bcrypt.hashSync(password, 10), Number(status));
    return getUserById(result.lastInsertRowid);
}

function updateUser(id, { username, password, status = 1 }) {
    const database = connectToDB();
    if (password) {
        const bcrypt = require('bcryptjs');
        database.prepare(`
            UPDATE users SET username = ?, password_hash = ?, status = ? WHERE id = ?
        `).run(username.trim().toLowerCase(), bcrypt.hashSync(password, 10), Number(status), Number(id));
    } else {
        database.prepare(`UPDATE users SET username = ?, status = ? WHERE id = ?`)
            .run(username.trim().toLowerCase(), Number(status), Number(id));
    }
    return getUserById(id);
}

function deleteUser(id) {
    return connectToDB().prepare('DELETE FROM users WHERE id = ?').run(Number(id)).changes;
}

/**
 * 取得新聞清單
 */
function getNewsItems(
    includeInactive = false
) {
    const database =
        connectToDB();

    const sql =
        includeInactive
            ? `
                SELECT *
                FROM news_items
                ORDER BY
                    sort_order ASC,
                    published_at DESC,
                    id ASC
            `
            : `
                SELECT *
                FROM news_items
                WHERE is_active = 1
                ORDER BY
                    sort_order ASC,
                    published_at DESC,
                    id ASC
            `;

    return database
        .prepare(sql)
        .all()
        .map(mapNews);
}


/**
 * 取得單筆新聞
 */
function getNewsById(id) {
    const database =
        connectToDB();

    const row =
        database
            .prepare(`
                SELECT *
                FROM news_items
                WHERE id = ?
            `)
            .get(id);

    return row
        ? mapNews(row)
        : null;
}


/**
 * 新增新聞
 */
function createNews(item) {
    const database =
        connectToDB();

    const result =
        database
            .prepare(`
                INSERT INTO news_items(
                    sort_order,
                    is_active,
                    image_url,
                    title,
                    description,
                    full_content,
                    published_at,
                    display_date,
                    link_url,
                    open_in_new_tab
                )
                VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                )
            `)
            .run(
                item.sortOrder ?? 0,

                item.isActive === false
                    ? 0
                    : 1,

                item.imageUrl ?? null,
                item.title,
                item.description ?? null,
                item.content ?? null,
                item.publishedAt ?? null,
                item.displayDate ?? null,
                item.linkUrl ?? null,

                item.openInNewTab === false
                    ? 0
                    : 1
            );

    return getNewsById(
        Number(
            result.lastInsertRowid
        )
    );
}


/**
 * 更新新聞
 */
function updateNews(
    id,
    item
) {
    const database =
        connectToDB();

    const current =
        getNewsById(id);

    if (!current) {
        return null;
    }

    const next = {
        ...current,
        ...item
    };

    database
        .prepare(`
            UPDATE news_items
            SET
                sort_order = ?,
                is_active = ?,
                image_url = ?,
                title = ?,
                description = ?,
                full_content = ?,
                published_at = ?,
                display_date = ?,
                link_url = ?,
                open_in_new_tab = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `)
        .run(
            next.sortOrder ?? 0,
            next.isActive ? 1 : 0,
            next.imageUrl ?? null,
            next.title,
            next.description ?? null,
            next.content ?? null,
            next.publishedAt ?? null,
            next.displayDate ?? null,
            next.linkUrl ?? null,
            next.openInNewTab ? 1 : 0,
            id
        );

    return getNewsById(id);
}


/**
 * 停用新聞
 */
function disableNews(id) {
    const database =
        connectToDB();

    const result =
        database
            .prepare(`
                UPDATE news_items
                SET
                    is_active = 0,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `)
            .run(id);

    return result.changes > 0;
}


/**
 * 刪除新聞
 */
function deleteNews(id) {
    const database =
        connectToDB();

    const result =
        database
            .prepare(`
                DELETE FROM news_items
                WHERE id = ?
            `)
            .run(id);

    return result.changes > 0;
}


/**
 * 更新新聞頁面標題
 */
function updatePage(page) {
    const database =
        connectToDB();

    database
        .prepare(`
            UPDATE nview_page
            SET
                eyebrow = ?,
                title = ?
            WHERE id = 1
        `)
        .run(
            page.eyebrow,
            page.title
        );

    return getNViewData();
}


/**
 * 更新輪播時間
 */
function updateCarousel(
    autoplayMs
) {
    const database =
        connectToDB();

    database
        .prepare(`
            UPDATE nview_carousel
            SET autoplay_ms = ?
            WHERE id = 1
        `)
        .run(autoplayMs);

    return {
        autoplayMs
    };
}


// ============================================================
// About / AView
// ============================================================

/**
 * 取得 AView 完整資料
 *
 * 回傳格式維持：
 * {
 *   page: {},
 *   heroItems: [],
 *   contentBlocks: []
 * }
 */
function getAViewData(
    pageId = 'about-risingstar-energy'
) {
    const database =
        connectToDB();

    const pageRow =
        database
            .prepare(`
                SELECT
                    id,
                    english_title,
                    title
                FROM pages
                WHERE id = ?
            `)
            .get(pageId);

    if (!pageRow) {
        return null;
    }

    const heroRows =
        database
            .prepare(`
                SELECT
                    id,
                    sort_order,
                    circle_class,
                    icon_class
                FROM hero_items
                WHERE page_id = ?
                ORDER BY
                    sort_order ASC,
                    id ASC
            `)
            .all(pageId);

    const blockRows =
        database
            .prepare(`
                SELECT
                    id,
                    sort_order,
                    css_class,
                    title
                FROM content_blocks
                WHERE page_id = ?
                ORDER BY
                    sort_order ASC,
                    id ASC
            `)
            .all(pageId);

    const entryStatement =
        database
            .prepare(`
                SELECT
                    id,
                    sort_order,
                    heading_level,
                    title,
                    paragraph
                FROM content_entries
                WHERE block_id = ?
                ORDER BY
                    sort_order ASC,
                    id ASC
            `);

    const contentBlocks =
        blockRows.map(
            (block) => {
                const entries =
                    entryStatement
                        .all(block.id)
                        .map(
                            (entry) => ({
                                id: entry.id,
                                sortOrder:
                                    entry.sort_order,
                                headingLevel:
                                    entry.heading_level,
                                title:
                                    entry.title,
                                paragraph:
                                    entry.paragraph,
                            })
                        );

                const result = {
                    id: block.id,
                    sortOrder:
                        block.sort_order,
                    cssClass:
                        block.css_class,
                };

                if (block.title !== null) {
                    result.title =
                        block.title;
                }

                result.entries =
                    entries;

                return result;
            }
        );

    return {
        page: {
            id:
                pageRow.id,
            englishTitle:
                pageRow.english_title,
            title:
                pageRow.title,
        },

        heroItems:
            heroRows.map(
                (item) => ({
                    id:
                        item.id,
                    sortOrder:
                        item.sort_order,
                    circleClass:
                        item.circle_class,
                    iconClass:
                        item.icon_class,
                })
            ),

        contentBlocks,
    };
}

function updateAViewData(data, pageId = 'about-risingstar-energy') {
    const database = connectToDB();
    const transaction = database.transaction(() => {
        database.prepare(`UPDATE pages SET english_title = ?, title = ? WHERE id = ?`)
            .run(data.page.englishTitle.trim(), data.page.title.trim(), pageId);
        const updateBlock = database.prepare(`UPDATE content_blocks SET title = ? WHERE id = ? AND page_id = ?`);
        const updateEntry = database.prepare(`
            UPDATE content_entries SET title = ?, paragraph = ?, heading_level = ?, sort_order = ?
            WHERE id = ? AND block_id = ?
        `);
        for (const block of data.contentBlocks || []) {
            updateBlock.run(block.title || null, Number(block.id), pageId);
            for (const entry of block.entries || []) {
                updateEntry.run(entry.title.trim(), entry.paragraph.trim(), Number(entry.headingLevel) || 2, Number(entry.sortOrder) || 0, Number(entry.id), Number(block.id));
            }
        }
    });
    transaction();
    return getAViewData(pageId);
}


/**
 * 關閉 SQLite
 */
function closeDB() {
    if (db) {
        db.close();
        db = null;

        console.log(
            'SQLite database closed!'
        );
    }
}


module.exports = {
    connectToDB,

    // News
    getNViewData,
    getNewsItems,
    getNewsById,
    createNews,
    updateNews,
    disableNews,
    deleteNews,
    updatePage,
    updateCarousel,

    // About
    getAViewData,
    updateAViewData,
    // Login
    findUserByUsername,
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getFiles,
    saveFile,
    deleteFile,
    closeDB,
};
