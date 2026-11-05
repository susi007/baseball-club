-- =========================
-- 備品管理テーブル
-- =========================
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    amount INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    owner VARCHAR(100) NOT NULL
);

-- =========================
-- 収入管理テーブル
-- =========================
-- nameは収入の名目に使用します。既存レコードとの互換性のためNULLを許可します。
CREATE TABLE IF NOT EXISTS income (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    name VARCHAR(100),
    amount INTEGER NOT NULL,
    people INTEGER NOT NULL DEFAULT 1
);

-- 既存DBにも人数列を追加し、旧レコードのnameがNULLでも保持できるようにします。
ALTER TABLE income
    ADD COLUMN IF NOT EXISTS people INTEGER NOT NULL DEFAULT 1;
ALTER TABLE income
    ALTER COLUMN name DROP NOT NULL;