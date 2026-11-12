CREATE OR REPLACE FUNCTION public.dispose_equipment_quantity(
    p_equipment_id bigint,
    p_manager text,
    p_quantity integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_equipment public.equipment_items%ROWTYPE;
    v_manager_quantity integer;
    v_before jsonb;
    v_after jsonb;
    v_nickname varchar(30);
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'ログインが必要です。';
    END IF;

    IF NULLIF(btrim(p_manager), '') IS NULL
       OR p_quantity IS NULL
       OR p_quantity < 1 THEN
        RAISE EXCEPTION '廃棄する管理者と1以上の個数を指定してください。';
    END IF;

    SELECT *
    INTO v_equipment
    FROM public.equipment_items
    WHERE id = p_equipment_id
      AND disposed_on IS NULL
      AND category <> 'グラウンド'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION '備品が見つからないか、既に廃棄されています。';
    END IF;

    SELECT assignment.quantity
    INTO v_manager_quantity
    FROM public.equipment_assignments AS assignment
    WHERE assignment.equipment_id = p_equipment_id
      AND assignment.manager = btrim(p_manager);

    IF NOT FOUND OR p_quantity > v_manager_quantity THEN
        RAISE EXCEPTION '選択した管理者の割当数を超える個数は廃棄できません。';
    END IF;

    IF v_equipment.disposed_quantity::numeric + p_quantity > 9223372036854775807 THEN
        RAISE EXCEPTION '廃棄済み個数が上限を超えています。';
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

    UPDATE public.equipment_assignments
    SET quantity = quantity - p_quantity
    WHERE equipment_id = p_equipment_id
      AND manager = btrim(p_manager)
      AND quantity > p_quantity;

    IF NOT FOUND THEN
        DELETE FROM public.equipment_assignments
        WHERE equipment_id = p_equipment_id
          AND manager = btrim(p_manager);
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
    INTO v_after
    FROM public.equipment_assignments AS assignment
    WHERE assignment.equipment_id = p_equipment_id;

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
        changed_by_nickname,
        change_type
    )
    VALUES (
        p_equipment_id,
        CURRENT_DATE,
        v_before,
        v_after,
        v_equipment.balls_per_unit,
        v_equipment.balls_per_unit,
        auth.uid(),
        COALESCE(v_nickname, '不明'),
        'partial_disposal'
    );

    UPDATE public.equipment_items
    SET disposed_quantity = disposed_quantity + p_quantity,
        changed_on = CURRENT_DATE,
        disposed_on = CASE
            WHEN v_after = '[]'::jsonb THEN CURRENT_DATE
            ELSE NULL
        END
    WHERE id = p_equipment_id;
END;
$$;

REVOKE ALL ON FUNCTION
    public.dispose_equipment_quantity(bigint, text, integer)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION
    public.dispose_equipment_quantity(bigint, text, integer)
TO authenticated;
