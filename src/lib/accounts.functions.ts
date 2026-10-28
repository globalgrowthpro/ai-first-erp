import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin-only: creates (or updates the password of) a real sign-in account.
 * Returns the auth user id so profile / role / page rows can be linked to it.
 */
export const upsertAuthAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; password?: string | undefined; nameAr?: string | undefined; nameEn?: string | undefined }) => {
    const email = String(input.email || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Invalid email");
    if (input.password && input.password.length < 6) throw new Error("Password too short");
    return { ...input, email };
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Find existing account by email
    let existingId: string | null = null;
    for (let page = 1; page <= 10 && !existingId; page++) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(error.message);
      const hit = list.users.find((u) => (u.email || "").toLowerCase() === data.email);
      if (hit) existingId = hit.id;
      if (list.users.length < 200) break;
    }

    if (existingId) {
      if (data.password) {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(existingId, {
          password: data.password,
        });
        if (error) throw new Error(error.message);
      }
      return { userId: existingId, created: false };
    }

    if (!data.password) throw new Error("Password required for new account");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name_ar: data.nameAr, full_name_en: data.nameEn },
    });
    if (error || !created.user) throw new Error(error?.message || "Create failed");
    return { userId: created.user.id, created: true };
  });
