const express = require('express');
const router = express.Router();

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const CONFIG = require(
    '../config/config'
);

const db = require(
    '../model/dbOperations.sqlite'
);

/**
 * POST /login
 * SQLite 登入 API
 * 不需要 Token
 */
router.post('/', async function (req, res) {

    try {

        const {
            username,
            password
        } = req.body;


        // --------------------------------------------------------
        // 驗證輸入
        // --------------------------------------------------------
        if (!username || !password) {

            return res.status(400).json({
                success: false,
                code: 400,
                message: '帳號與密碼不能為空'
            });

        }


        // --------------------------------------------------------
        // SQLite 查詢使用者
        // --------------------------------------------------------
        const user =
            db.findUserByUsername(
                username
            );


        if (!user) {

            return res.status(401).json({
                success: false,
                code: 401,
                message: '帳號或密碼錯誤'
            });

        }


        // --------------------------------------------------------
        // 帳號狀態
        // --------------------------------------------------------
        if (
            user.status !== undefined &&
            Number(user.status) !== 1
        ) {

            return res.status(403).json({
                success: false,
                code: 403,
                message: '帳號已停用'
            });

        }


        // --------------------------------------------------------
        // 密碼驗證
        // --------------------------------------------------------
        const passwordHash =
            user.password_hash ||
            user.passwordHash;


        if (!passwordHash) {

            console.error(
                'User password hash not found:',
                username
            );

            return res.status(500).json({
                success: false,
                code: 500,
                message: '帳號資料格式錯誤'
            });

        }


        const passwordValid =
            await bcrypt.compare(
                password,
                passwordHash
            );


        if (!passwordValid) {

            return res.status(401).json({
                success: false,
                code: 401,
                message: '帳號或密碼錯誤'
            });

        }


        // --------------------------------------------------------
        // JWT
        // --------------------------------------------------------
        const token =
            jwt.sign(
                {
                    id: user.id,
                    username:
                        user.username ||
                        user.userName
                },
                CONFIG.jwtSecretKey,
                {
                    expiresIn: '8h'
                }
            );


        // --------------------------------------------------------
        // Response
        // --------------------------------------------------------
        return res.status(200).json({
            success: true,
            code: 200,
            token,

            data: {
                id: user.id,

                username:
                    user.username ||
                    user.userName
            }
        });


    } catch (error) {

        console.error(
            'POST /login SQLite error:',
            error
        );


        return res.status(500).json({
            success: false,
            code: 500,
            message: '登入失敗'
        });

    }

});


module.exports = router;
