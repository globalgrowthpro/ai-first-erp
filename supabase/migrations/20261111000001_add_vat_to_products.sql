-- ==============================================================================
-- Migration: 20261111000001_add_vat_to_products.sql
-- Description: Add VAT (Value-Added Tax) column to public.products table
-- ==============================================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS vat numeric(14,2) DEFAULT 14.00;

COMMENT ON COLUMN public.products.vat IS 'Value-added tax (VAT) in EGP for the product, defaults to 14.00 EGP';

