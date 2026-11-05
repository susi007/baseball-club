
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabasePublishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const adminEmails = new Set(["susi007garu@gmail.com"]);

async function requireAdmin(req, res, next) {
    if (!supabaseUrl || !supabasePublishableKey) {
        return res.status(503).json({
            error: "認証設定がありません"
        });
    }

    const authorization = req.get("authorization");
    const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!accessToken) {
        return res.status(401).json({
            error: "ログインしてください"
        });
    }

    try {
        const response = await fetch(
            `${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`,
            {
                headers: {
                    apikey: supabasePublishableKey,
                    Authorization: `Bearer ${accessToken}`
                },
                signal: AbortSignal.timeout(10000)
            }
        );

        if (response.status === 401 || response.status === 403) {
            return res.status(401).json({
                error: "ログインし直してください"
            });
        }

        if (!response.ok) {
            console.error(`Supabase token verification failed: ${response.status}`);
            return res.status(503).json({
                error: "認証サービスを利用できません"
            });
        }

        const user = await response.json();
        if (!adminEmails.has(user.email?.toLowerCase())) {
            return res.status(403).json({
                error: "変更する権限がありません"
            });
        }

        next();
    } catch (error) {
        console.error("Supabase token verification failed", error);
        res.status(503).json({
            error: "認証サービスを利用できません"
        });
    }
}

// PostgreSQLへの接続設定
const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "baseballApp",
    password: process.env.DB_PASSWORD,
    port: 54327
});

// ① 備品一覧を取得
app.get("/api/inventory", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                id,
                TO_CHAR(date, 'YYYY-MM-DD') AS date,
                name,
                category,
                amount,
                quantity,
                owner
            FROM inventory
            ORDER BY id
        `);

        res.json(result.rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "取得に失敗しました"
        });
    }
});

// incomeテーブルの名目・日付・金額・人数を収入一覧として返します。
app.get("/api/income", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                id,
                TO_CHAR(date, 'YYYY-MM-DD') AS date,
                name,
                amount,
                people
            FROM income
            ORDER BY id
        `);

        res.json(result.rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "取得に失敗しました"
        });
    }
});

// ② 備品を登録
app.post("/api/inventory", requireAdmin, async (req, res) => {
    try {
        const {
            date,
            name,
            category,
            amount,
            quantity,
            owner
        } = req.body;

        if (
            !date ||
            !name?.trim() ||
            !category ||
            !owner?.trim() ||
            !Number.isInteger(amount) ||
            amount < 0 ||
            !Number.isInteger(quantity) ||
            quantity < 1
        ) {
            return res.status(400).json({
                error: "Invalid input"
            });
        }

        const result = await pool.query(
            `INSERT INTO inventory
            (date, name, category, amount, quantity, owner)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, TO_CHAR(date, 'YYYY-MM-DD') AS date,
                name, category, amount, quantity, owner`,
            [
                date,
                name.trim(),
                category,
                amount,
                quantity,
                owner.trim()
            ]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "登録に失敗しました"
        });
    }
});

// 収入フォームの名目・人数・金額を検証してDBに登録します。
app.post("/api/income", requireAdmin, async (req, res) => {
    try {
        const {
            date,
            name,
            amount,
            people
        } = req.body;

        if (
            !date ||
            !name?.trim() ||
            !Number.isInteger(amount) ||
            amount < 1 ||
            !Number.isInteger(people) ||
            people < 1
        ) {
            return res.status(400).json({
                error: "Invalid input"
            });
        }

        const result = await pool.query(
            `INSERT INTO income
            (date, name, amount, people)
            VALUES ($1, $2, $3, $4)
            RETURNING id, TO_CHAR(date, 'YYYY-MM-DD') AS date,
                name, amount, people`,
            [
                date,
                name.trim(),
                amount,
                people
            ]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "登録に失敗しました"
        });
    }
});

// ③ 備品を更新
app.put("/api/inventory/:id", requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const {
            date,
            name,
            category,
            amount,
            quantity,
            owner
        } = req.body;

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({
                error: "Invalid ID"
            });
        }

        if (
            !date ||
            !name?.trim() ||
            !category ||
            !owner?.trim() ||
            !Number.isInteger(amount) ||
            amount < 0 ||
            !Number.isInteger(quantity) ||
            quantity < 1
        ) {
            return res.status(400).json({
                error: "Invalid input"
            });
        }

        const result = await pool.query(
            `UPDATE inventory
            SET date = $1,
                name = $2,
                category = $3,
                amount = $4,
                quantity = $5,
                owner = $6
            WHERE id = $7
            RETURNING id, TO_CHAR(date, 'YYYY-MM-DD') AS date,
                name, category, amount, quantity, owner`,
            [
                date,
                name.trim(),
                category,
                amount,
                quantity,
                owner.trim(),
                id
            ]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                error: "対象の備品がありません"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "更新に失敗しました"
        });
    }
});

// ③ 収入を更新
app.put("/api/income/:id", requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const {
            date,
            name,
            amount,
            people
        } = req.body;

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({
                error: "Invalid ID"
            });
        }

        if (
            !date ||
            !name?.trim() ||
            !Number.isInteger(amount) ||
            amount < 1 ||
            !Number.isInteger(people) ||
            people < 1
        ) {
            return res.status(400).json({
                error: "Invalid input"
            });
        }

        const result = await pool.query(
            `UPDATE income
            SET date = $1,
                name = $2,
                amount = $3,
                people = $4
            WHERE id = $5
            RETURNING id, TO_CHAR(date, 'YYYY-MM-DD') AS date, name, amount, people`,
            [date, name.trim(), amount, people, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                error: "対象の収入がありません"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "更新に失敗しました"
        });
    }
});

// ④ 備品を削除
app.delete("/api/inventory/:id", requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({
                error: "Invalid ID"
            });
        }

        const result = await pool.query(
            "DELETE FROM inventory WHERE id = $1 RETURNING *",
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                error: "対象の備品がありません"
            });
        }

        res.json({ message: "削除しました" });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "削除に失敗しました"
        });
    }
});

// ④ 収入を削除
app.delete("/api/income/:id", requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({
                error: "Invalid ID"
            });
        }

        const result = await pool.query(
            "DELETE FROM income WHERE id = $1 RETURNING *",
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                error: "対象の収入がありません"
            });
        }

        res.json({ message: "削除しました" });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "削除に失敗しました"
        });
    }
});

// サーバー起動
const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
    console.log("サーバーを起動しました");
    console.log(`http://localhost:${port}`);
});
