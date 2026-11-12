WITH latest_disposal AS (
    SELECT DISTINCT ON (equipment_id)
        equipment_id,
        created_at,
        id
    FROM public.equipment_history
    WHERE change_type = 'disposal'
       OR (
           change_type = 'partial_disposal'
           AND after_state = '[]'::jsonb
       )
    ORDER BY equipment_id, created_at DESC, id DESC
)
DELETE FROM public.equipment_history AS history
USING latest_disposal AS disposal
WHERE history.equipment_id = disposal.equipment_id
  AND (history.created_at, history.id) <= (disposal.created_at, disposal.id);

CREATE OR REPLACE FUNCTION public.clear_equipment_history_on_disposal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF OLD.disposed_on IS NULL AND NEW.disposed_on IS NOT NULL THEN
        DELETE FROM public.equipment_history
        WHERE equipment_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION
    public.clear_equipment_history_on_disposal()
FROM PUBLIC;

DROP TRIGGER IF EXISTS equipment_clears_history_on_disposal
    ON public.equipment_items;

CREATE TRIGGER equipment_clears_history_on_disposal
    AFTER UPDATE OF disposed_on ON public.equipment_items
    FOR EACH ROW
    WHEN (OLD.disposed_on IS NULL AND NEW.disposed_on IS NOT NULL)
    EXECUTE FUNCTION public.clear_equipment_history_on_disposal();
