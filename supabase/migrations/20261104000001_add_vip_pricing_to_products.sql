-- ==============================================================================
-- Migration: 20261104000001_add_vip_pricing_to_products.sql
-- Description: Add VIP client pricing columns to public.products table
-- ==============================================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS vip_price numeric(14,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vip_client_ids jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS vip_valid_until date DEFAULT NULL;

COMMENT ON COLUMN public.products.vip_price IS 'Special discounted or contractual VIP price for specific clients';
COMMENT ON COLUMN public.products.vip_client_ids IS 'Array of client partner IDs or names eligible for the VIP price';
COMMENT ON COLUMN public.products.vip_valid_until IS 'Expiry date for the VIP price validity';

