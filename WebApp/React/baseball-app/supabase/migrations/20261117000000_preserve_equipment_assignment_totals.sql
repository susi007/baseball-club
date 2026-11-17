CREATE OR REPLACE FUNCTION public.save_equipment_assignments(
    p_equipment_id bigint,
    p_changed_on date,
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

    IF p_changed_on IS NULL OR p_assignments IS NULL THEN
        RAISE EXCEPTION '変更日と管理者・個数を入力してください。';
    END IF;

    IF jsonb_typeof(p_assignments) IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION '変更日と管理者・個数を入力してください。';
    END IF;

    IF jsonb_array_length(p_assignments) = 0 THEN
        RAISE EXCEPTION '変更日と管理者・個数を入力してください。';
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

    IF (
        SELECT COALESCE(sum((entry.value ->> 'quantity')::bigint), 0)
        FROM jsonb_array_elements(v_before) AS entry(value)
    ) <> (
        SELECT COALESCE(sum((entry.value ->> 'quantity')::bigint), 0)
        FROM jsonb_array_elements(v_after) AS entry(value)
    ) THEN
        RAISE EXCEPTION '管理者への割当数の合計を備品の合計数と一致させてください。最新の備品情報を確認してください。';
    END IF;

    IF v_before IS DISTINCT FROM v_after
       OR v_equipment.changed_on IS DISTINCT FROM p_changed_on THEN
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
            v_equipment.balls_per_unit,
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
        SET changed_on = p_changed_on
        WHERE id = p_equipment_id;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION
    public.save_equipment_assignments(bigint, date, jsonb)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION
    public.save_equipment_assignments(bigint, date, jsonb)
TO authenticated;
