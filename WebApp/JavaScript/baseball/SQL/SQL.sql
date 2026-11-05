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
-- 変更箇所: nameは旧DBとの互換用に任意で残し、peopleを追加します。
CREATE TABLE IF NOT EXISTS income (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    name VARCHAR(100),
    amount INTEGER NOT NULL,
    people INTEGER NOT NULL DEFAULT 1
);

-- 変更箇所: 既存DBにも人数列を追加し、旧name列を任意にして登録を可能にします。
ALTER TABLE income
    ADD COLUMN IF NOT EXISTS people INTEGER NOT NULL DEFAULT 1;
ALTER TABLE income
    ALTER COLUMN name DROP NOT NULL;