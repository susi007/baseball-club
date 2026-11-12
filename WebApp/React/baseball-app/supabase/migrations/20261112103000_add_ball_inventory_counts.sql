ALTER TABLE public.equipment_items
    ADD COLUMN IF NOT EXISTS balls_per_unit integer NOT NULL DEFAULT 1
    CHECK (balls_per_unit > 0);

ALTER TABLE public.equipment_history
    ADD COLUMN IF NOT EXISTS before_balls_per_unit integer NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS after_balls_per_unit integer NOT NULL DEFAULT 1;

DROP FUNCTION IF EXISTS public.save_equipment_assignments(bigint, date, jsonb);

CREATE OR REPLACE FUNCTION public.save_equipment_assignments(
    p_equipment_id bigint,
    p_changed_on date,
    p_balls_per_unit integer,
    p_assignments jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_equipment public.equipment_items%ROWTYPE;
    v_before jsonb;
    v_after jsonb;
    v_nickname varchar(30);
    v_purchased_unit_quantity numeric;
    v_expected_quantity numeric;
    v_assigned_quantity numeric;
    v_balls_per_unit integer;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'ログインが必要です。';
    END IF;

    SELECT *
    INTO v_equipment
    FROM public.equipment_items
    WHERE id = p_equipment_id
      AND disposed_on IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION '備品が見つからないか、既に廃棄されています。';
    END IF;

    IF p_changed_on IS NULL
       OR p_assignments IS NULL
       OR jsonb_typeof(p_assignments) IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION '変更日と管理者・個数を入力してください。';
    END IF;

    IF jsonb_array_length(p_assignments) = 0 THEN
        RAISE EXCEPTION '変更日と管理者・個数を入力してください。';
    END IF;

    IF v_equipment.category IN ('練習球', '公認球') THEN
        IF p_balls_per_unit IS NULL OR p_balls_per_unit < 1 THEN
            RAISE EXCEPTION '備品1単位あたりのボール数は1以上で入力してください。';
        END IF;
        v_balls_per_unit := p_balls_per_unit;
    ELSE
        v_balls_per_unit := 1;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements(p_assignments) AS entry(value)
        WHERE jsonb_typeof(entry.value) IS DISTINCT FROM 'object'
           OR NULLIF(btrim(entry.value ->> 'manager'), '') IS NULL
           OR jsonb_typeof(entry.value -> 'quantity') IS DISTINCT FROM 'number'
           OR (entry.value ->> 'quantity') !~ '^[1-9][0-9]*$'
           OR CASE
               WHEN (entry.value ->> 'quantity') ~ '^[1-9][0-9]*$'
               THEN (entry.value ->> 'quantity')::numeric > 2147483647
               ELSE false
           END
    ) THEN
        RAISE EXCEPTION '管理者と1以上の個数を正しく入力してください。';
    END IF;

    IF EXISTS (
        SELECT btrim(entry.value ->> 'manager')
        FROM jsonb_array_elements(p_assignments) AS entry(value)
        GROUP BY btrim(entry.value ->> 'manager')
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION '同じ管理者を複数行に登録できません。';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements(p_assignments) AS entry(value)
        WHERE NOT EXISTS (
            SELECT 1
            FROM public.profiles AS profile
            WHERE profile.nickname = btrim(entry.value ->> 'manager')
        )
        AND NOT EXISTS (
            SELECT 1
            FROM public.equipment_assignments AS assignment
            WHERE assignment.equipment_id = p_equipment_id
              AND assignment.manager = btrim(entry.value ->> 'manager')
        )
    ) THEN
        RAISE EXCEPTION '管理者には登録済みのニックネームを指定してください。';
    END IF;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'manager', assignment.manager,
                'quantity', assignment.quantity
            )
            ORDER BY assignment.manager
        ),
        '[]'::jsonb
    )
    INTO v_before
    FROM public.equipment_assignments AS assignment
    WHERE assignment.equipment_id = p_equipment_id;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'manager', btrim(entry.value ->> 'manager'),
                'quantity', (entry.value ->> 'quantity')::integer
            )
            ORDER BY btrim(entry.value ->> 'manager')
        ),
        '[]'::jsonb
    )
    INTO v_after
    FROM jsonb_array_elements(p_assignments) AS entry(value);

    SELECT COALESCE(sum(inventory.quantity::numeric), 0)
    INTO v_purchased_unit_quantity
    FROM public.inventory AS inventory
    WHERE inventory.name = v_equipment.name
      AND inventory.category <> 'グラウンド';

    v_expected_quantity :=
        v_purchased_unit_quantity *
        CASE
            WHEN v_equipment.category IN ('練習球', '公認球')
            THEN v_balls_per_unit
            ELSE 1
        END;

    SELECT COALESCE(sum((entry.value ->> 'quantity')::numeric), 0)
    INTO v_assigned_quantity
    FROM jsonb_array_elements(p_assignments) AS entry(value);

    IF v_assigned_quantity <> v_expected_quantity THEN
        RAISE EXCEPTION
            '管理者ごとの割当合計（%個）が購入済み合計（%個）と一致しません。',
            v_assigned_quantity,
            v_expected_quantity;
    END IF;

    IF v_before IS DISTINCT FROM v_after
       OR v_equipment.changed_on IS DISTINCT FROM p_changed_on
       OR v_equipment.balls_per_unit IS DISTINCT FROM v_balls_per_unit THEN
        SELECT nickname
        INTO v_nickname
        FROM public.profiles
        WHERE id = auth.uid();

        INSERT INTO public.equipment_history (
            equipment_id,
            changed_on,
            before_state,
            after_state,
            before_balls_per_unit,
            after_balls_per_unit,
            changed_by,
            changed_by_nickname
        )
        VALUES (
            p_equipment_id,
            p_changed_on,
            v_before,
            v_after,
            v_equipment.balls_per_unit,
            v_balls_per_unit,
            auth.uid(),
            COALESCE(v_nickname, '不明')
        );

        DELETE FROM public.equipment_assignments
        WHERE equipment_id = p_equipment_id;

        INSERT INTO public.equipment_assignments (
            equipment_id,
            manager,
            quantity
        )
        SELECT
            p_equipment_id,
            btrim(entry.value ->> 'manager'),
            (entry.value ->> 'quantity')::integer
        FROM jsonb_array_elements(p_assignments) AS entry(value);

        UPDATE public.equipment_items
        SET changed_on = p_changed_on,
            balls_per_unit = v_balls_per_unit
        WHERE id = p_equipment_id;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION
    public.save_equipment_assignments(bigint, date, integer, jsonb)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION
    public.save_equipment_assignments(bigint, date, integer, jsonb)
TO authenticated;

CREATE OR REPLACE FUNCTION public.add_purchased_equipment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_equipment_id bigint;
    v_balls_per_unit integer;
    v_assignment_quantity numeric;
    v_current_assignment_quantity integer;
    v_before jsonb;
    v_after jsonb;
    v_before_balls_per_unit integer;
    v_nickname varchar(30);
BEGIN
    IF NEW.category = 'グラウンド' THEN
        RETURN NEW;
    END IF;

    SELECT balls_per_unit
    INTO v_before_balls_per_unit
    FROM public.equipment_items
    WHERE name = NEW.name;
    v_before_balls_per_unit := COALESCE(v_before_balls_per_unit, 1);

    INSERT INTO public.equipment_items AS current_equipment (
        name,
        category,
        changed_on
    )
    VALUES (NEW.name, NEW.category, NEW.date)
    ON CONFLICT (name) DO UPDATE
        SET category = EXCLUDED.category,
            changed_on = GREATEST(current_equipment.changed_on, EXCLUDED.changed_on),
            balls_per_unit = CASE
                WHEN current_equipment.category = EXCLUDED.category
                THEN current_equipment.balls_per_unit
                ELSE 1
            END,
            disposed_on = NULL
    RETURNING id, balls_per_unit
    INTO v_equipment_id, v_balls_per_unit;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'manager', assignment.manager,
                'quantity', assignment.quantity
            )
            ORDER BY assignment.manager
        ),
        '[]'::jsonb
    )
    INTO v_before
    FROM public.equipment_assignments AS assignment
    WHERE assignment.equipment_id = v_equipment_id;

    v_assignment_quantity :=
        NEW.quantity::numeric *
        CASE
            WHEN NEW.category IN ('練習球', '公認球')
            THEN v_balls_per_unit
            ELSE 1
        END;

    SELECT quantity
    INTO v_current_assignment_quantity
    FROM public.equipment_assignments
    WHERE equipment_id = v_equipment_id
      AND manager = NEW.owner;

    IF COALESCE(v_current_assignment_quantity, 0)::numeric
       + v_assignment_quantity > 2147483647 THEN
        RAISE EXCEPTION '管理者に割り当てる個数が上限を超えています。';
    END IF;

    INSERT INTO public.equipment_assignments AS current_assignment (
        equipment_id,
        manager,
        quantity
    )
    VALUES (
        v_equipment_id,
        NEW.owner,
        v_assignment_quantity::integer
    )
    ON CONFLICT (equipment_id, manager) DO UPDATE
        SET quantity = current_assignment.quantity + EXCLUDED.quantity;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'manager', assignment.manager,
                'quantity', assignment.quantity
            )
            ORDER BY assignment.manager
        ),
        '[]'::jsonb
    )
    INTO v_after
    FROM public.equipment_assignments AS assignment
    WHERE assignment.equipment_id = v_equipment_id;

    SELECT nickname
    INTO v_nickname
    FROM public.profiles
    WHERE id = auth.uid();

    INSERT INTO public.equipment_history (
        equipment_id,
        changed_on,
        before_state,
        after_state,
        before_balls_per_unit,
        after_balls_per_unit,
        changed_by,
        changed_by_nickname
    )
    VALUES (
        v_equipment_id,
        NEW.date,
        v_before,
        v_after,
        v_before_balls_per_unit,
        v_balls_per_unit,
        auth.uid(),
        COALESCE(v_nickname, NEW.owner)
    );

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.add_purchased_equipment() FROM PUBLIC;
