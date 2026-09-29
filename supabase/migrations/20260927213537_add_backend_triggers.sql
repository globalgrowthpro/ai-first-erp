-- ==============================================================================
-- Step 6: Trigger for Inventory (Auto-update stock_levels on stock_moves)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.update_stock_levels()
RETURNS TRIGGER AS $$
BEGIN
    -- Deduct from source warehouse if applicable
    IF NEW.from_warehouse_id IS NOT NULL THEN
        UPDATE public.stock_levels
        SET quantity = quantity - NEW.quantity, updated_at = now()
        WHERE product_id = NEW.product_id AND warehouse_id = NEW.from_warehouse_id;
        
        IF NOT FOUND THEN
            INSERT INTO public.stock_levels (product_id, warehouse_id, quantity)
            VALUES (NEW.product_id, NEW.from_warehouse_id, -NEW.quantity);
        END IF;
    END IF;

    -- Add to destination warehouse if applicable
    IF NEW.to_warehouse_id IS NOT NULL THEN
        UPDATE public.stock_levels
        SET quantity = quantity + NEW.quantity, updated_at = now()
        WHERE product_id = NEW.product_id AND warehouse_id = NEW.to_warehouse_id;
        
        IF NOT FOUND THEN
            INSERT INTO public.stock_levels (product_id, warehouse_id, quantity)
            VALUES (NEW.product_id, NEW.to_warehouse_id, NEW.quantity);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_stock_move_insert ON public.stock_moves;
CREATE TRIGGER on_stock_move_insert
AFTER INSERT ON public.stock_moves
FOR EACH ROW EXECUTE FUNCTION public.update_stock_levels();


-- ==============================================================================
-- Step 7: Trigger for Accounting (Auto-generate journal_entries on invoices)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.auto_post_sales_invoice()
RETURNS TRIGGER AS $$
DECLARE
    je_id uuid;
BEGIN
    -- For simplicity in this iteration, we create a journal entry when status is 'paid'
    IF NEW.status = 'paid' AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != 'paid')) THEN
        INSERT INTO public.journal_entries (entry_no, date, reference, description, status)
        VALUES ('JE-AUTO-' || floor(random() * 1000000)::text, now(), NEW.invoice_number, 'Auto generated for Sales Invoice ' || NEW.invoice_number, 'posted')
        RETURNING id INTO je_id;
        
        -- In a full implementation, you would lookup AR and Revenue accounts and insert into journal_lines here
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_sales_invoice_post ON public.sales_invoices;
CREATE TRIGGER on_sales_invoice_post
AFTER INSERT OR UPDATE ON public.sales_invoices
FOR EACH ROW EXECUTE FUNCTION public.auto_post_sales_invoice();
