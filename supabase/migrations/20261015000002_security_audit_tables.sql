-- ==============================================================================
-- Migration: 20261015000002_security_audit_tables.sql
-- Enterprise Security Audit Logs, Active Sessions, and Scoped API Keys
-- ==============================================================================

-- 1. Security Audit & Threat Feed Logs
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    severity text NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'info')),
    event_type text NOT NULL,
    ip_address text NOT NULL,
    actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_email text,
    details text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_resolved boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_sec_logs_created_at ON public.security_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sec_logs_severity ON public.security_audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_sec_logs_ip ON public.security_audit_logs(ip_address);

-- 2. User Active Sessions (Remote Kill & Device Fingerprinting)
CREATE TABLE IF NOT EXISTS public.user_active_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name text NOT NULL DEFAULT 'User',
    user_role text NOT NULL DEFAULT 'staff',
    device_type text NOT NULL DEFAULT 'desktop' CHECK (device_type IN ('desktop', 'mobile', 'pos_terminal')),
    browser text NOT NULL,
    os text NOT NULL,
    ip_address text NOT NULL,
    location text DEFAULT 'Local Office',
    last_active timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    is_current boolean NOT NULL DEFAULT false,
    is_revoked boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_lookup ON public.user_active_sessions(user_id, is_revoked);

-- 3. Scoped API Keys for Third-Party & Hardware Integrations
CREATE TABLE IF NOT EXISTS public.erp_api_keys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    prefix text NOT NULL,
    key_masked text NOT NULL,
    key_hash text,
    scopes text[] NOT NULL DEFAULT '{}',
    rate_limit_per_min integer NOT NULL DEFAULT 120,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz,
    last_used_at timestamptz,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired'))
);

-- 4. Enable Row Level Security (RLS) & Permissions
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_api_keys ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_audit_logs TO authenticated, anon, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_active_sessions TO authenticated, anon, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.erp_api_keys TO authenticated, anon, service_role;

-- Clean existing policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "allow_sec_logs_read" ON public.security_audit_logs;
    DROP POLICY IF EXISTS "allow_sec_logs_insert" ON public.security_audit_logs;
    DROP POLICY IF EXISTS "allow_sec_sessions_all" ON public.user_active_sessions;
    DROP POLICY IF EXISTS "allow_sec_keys_all" ON public.erp_api_keys;
END $$;

CREATE POLICY "allow_sec_logs_read" ON public.security_audit_logs FOR SELECT TO public USING (true);
CREATE POLICY "allow_sec_logs_insert" ON public.security_audit_logs FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "allow_sec_sessions_all" ON public.user_active_sessions FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "allow_sec_keys_all" ON public.erp_api_keys FOR ALL TO public USING (true) WITH CHECK (true);

-- End of Schema Definition (Clean Real Database State - No Mock Data)
