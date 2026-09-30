-- ==============================================================================
-- Migration: Fix Stock Triggers & Single Source of Truth for Deductions
-- ==============================================================================

-- 1. Drop duplicate trigger on stock_moves
DROP TRIGGER IF EXISTS on_stock_move_insert ON public.stock_moves;

-- 2. Ensure apply_stock_move is the sole robust handler for stock moves
CREATE OR REPLACE FUNCTION public.apply_stock_move()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Deduct from source warehouse
  IF NEW.from_warehouse_id IS NOT NULL THEN
    INSERT INTO public.stock_levels (product_id, warehouse_id, quantity)
    VALUES (NEW.product_id, NEW.from_warehouse_id, -NEW.quantity)
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET quantity = public.stock_levels.quantity - NEW.quantity, updated_at = now();
  END IF;

  -- Add to destination warehouse
  IF NEW.to_warehouse_id IS NOT NULL THEN
    INSERT INTO public.stock_levels (product_id, warehouse_id, quantity)
    VALUES (NEW.product_id, NEW.to_warehouse_id, NEW.quantity)
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET quantity = public.stock_levels.quantity + NEW.quantity, updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stock_moves_apply ON public.stock_moves;
CREATE TRIGGER stock_moves_apply
AFTER INSERT ON public.stock_moves
FOR EACH ROW EXECUTE FUNCTION public.apply_stock_move();

-- 3. In process_pos_order_item_stock, only insert into stock_moves, letting stock_moves_apply do the decrement!
CREATE OR REPLACE FUNCTION public.process_pos_order_item_stock()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_warehouse_id uuid;
  v_branch_text text;
  v_product_id uuid;
  v_unit_price numeric;
BEGIN
  -- Resolve product_id
  v_product_id := NEW.product_id;
  IF v_product_id IS NULL AND NEW.sku IS NOT NULL THEN
    SELECT id, sale_price INTO v_product_id, v_unit_price FROM public.products WHERE sku = NEW.sku LIMIT 1;
  END IF;

  -- Retrieve order branch
  SELECT branch_id INTO v_branch_text FROM public.pos_orders WHERE id = NEW.order_id;
  
  -- Resolve warehouse UUID
  IF v_branch_text IS NOT NULL AND v_branch_text ~ '^[0-9a-fA-F-]{36}$' THEN
    v_warehouse_id := v_branch_text::uuid;
  ELSE
    SELECT id INTO v_warehouse_id FROM public.warehouses LIMIT 1;
  END IF;

  -- Record stock move (which fires stock_moves_apply exactly once to decrement stock_levels)
  IF v_product_id IS NOT NULL AND v_warehouse_id IS NOT NULL THEN
    INSERT INTO public.stock_moves (
      move_type,
      product_id,
      from_warehouse_id,
      to_warehouse_id,
      quantity,
      unit_cost,
      reference,
      moved_at
    ) VALUES (
      'out',
      v_product_id,
      v_warehouse_id,
      NULL,
      NEW.quantity,
      COALESCE(NEW.unit_price, v_unit_price, 0),
      'POS-SALE-' || NEW.sku,
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pos_order_item_stock ON public.pos_order_items;
CREATE TRIGGER trg_pos_order_item_stock
AFTER INSERT ON public.pos_order_items
FOR EACH ROW EXECUTE FUNCTION public.process_pos_order_item_stock();
