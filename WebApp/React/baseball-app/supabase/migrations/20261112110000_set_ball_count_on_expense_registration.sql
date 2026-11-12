ALTER TABLE public.inventory
    ADD COLUMN IF NOT EXISTS balls_per_unit integer NOT NULL DEFAULT 1
    CHECK (balls_per_unit > 0);

CREATE OR REPLACE FUNCTION public.add_purchased_equipment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_equipment_id bigint;
    v_balls_per_unit integer;
    v_before_balls_per_unit integer;
    v_assignment_quantity numeric;
    v_current_assignment_quantity integer;
    v_before jsonb;
    v_after jsonb;
    v_nickname varchar(30);
BEGIN
    IF NEW.category = 'グラウンド' THEN
        RETURN NEW;
    END IF;

    IF NEW.category IN ('練習球', '公認球')
       AND (NEW.balls_per_unit IS NULL OR NEW.balls_per_unit < 1) THEN
        RAISE EXCEPTION '備品1単位あたりのボール数は1以上で入力してください。';
    END IF;

    SELECT balls_per_unit
    INTO v_before_balls_per_unit
    FROM public.equipment_items
    WHERE name = NEW.name
    FOR UPDATE;
    v_before_balls_per_unit := COALESCE(v_before_balls_per_unit, 1);

    INSERT INTO public.equipment_items AS current_equipment (
        name,
        category,
        changed_on,
        balls_per_unit
    )
    VALUES (
        NEW.name,
        NEW.category,
        NEW.date,
        CASE
            WHEN NEW.category IN ('練習球', '公認球')
            THEN NEW.balls_per_unit
            ELSE 1
        END
    )
    ON CONFLICT (name) DO UPDATE
        SET category = EXCLUDED.category,
            changed_on = GREATEST(current_equipment.changed_on, EXCLUDED.changed_on),
            balls_per_unit = CASE
                WHEN current_equipment.category = EXCLUDED.category
                    AND EXCLUDED.category IN ('練習球', '公認球')
                THEN current_equipment.balls_per_unit
                WHEN EXCLUDED.category IN ('練習球', '公認球')
                THEN EXCLUDED.balls_per_unit
                ELSE 1
            END,
            disposed_quantity = CASE
                WHEN current_equipment.disposed_on IS NOT NULL THEN 0
                ELSE current_equipment.disposed_quantity
            END,
            disposed_on = NULL
    RETURNING id, balls_per_unit
    INTO v_equipment_id, v_balls_per_unit;

    IF NEW.category IN ('練習球', '公認球')
       AND NEW.balls_per_unit <> v_balls_per_unit THEN
        RAISE EXCEPTION
            '同じ備品には登録済みの球数/単位（%球）を指定してください。',
            v_balls_per_unit;
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
