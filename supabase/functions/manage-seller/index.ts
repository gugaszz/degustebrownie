// Edge Function: manage-seller
//
// Only the owner can create, delete, or reset the password of a seller account.
// This runs on the server with the SERVICE ROLE key (a Supabase secret, never
// shipped to the browser), so it is the one place allowed to call the Auth
// Admin API. The browser app calls this function while authenticated as the
// owner; it verifies that server-side before doing anything.
//
// Body: { action: 'create' | 'delete' | 'reset_password', ...fields }
//
// Deploy with: supabase functions deploy manage-seller

import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const callerClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const {
      data: { user: caller }
    } = await callerClient.auth.getUser();
    if (!caller) return json({ error: 'Not authenticated' }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role, organization_id')
      .eq('id', caller.id)
      .single();

    if (!callerProfile || callerProfile.role !== 'owner') {
      return json({ error: 'Only the owner can manage seller accounts' }, 403);
    }

    const body = await req.json();
    const action = body?.action;

    // ---------------------------------------------------------------
    if (action === 'create') {
      const { name, email, phone, password, commissionType, commissionValue } = body;
      if (!name || !email || !password || String(password).length < 4) {
        return json({ error: 'Nome, e-mail e senha (mín. 4 caracteres) são obrigatórios' }, 400);
      }

      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });
      if (createError || !created.user) return json({ error: createError?.message || 'Falha ao criar usuário' }, 400);

      const { data: profile, error: profileError } = await adminClient
        .from('profiles')
        .insert({
          id: created.user.id,
          organization_id: callerProfile.organization_id,
          role: 'seller',
          status: 'active',
          name,
          email,
          phone: phone || null,
          commission_type: commissionType || 'percentage_of_gross_profit',
          commission_value: commissionValue ?? 50
        })
        .select()
        .single();

      if (profileError) {
        await adminClient.auth.admin.deleteUser(created.user.id);
        return json({ error: profileError.message }, 400);
      }

      const { error: locationError } = await adminClient.from('inventory_locations').insert({
        organization_id: callerProfile.organization_id,
        type: 'seller',
        name: `Estoque - ${name}`,
        seller_id: created.user.id,
        active: true
      });
      if (locationError) return json({ success: true, profile, warning: locationError.message });

      return json({ success: true, profile });
    }

    // ---------------------------------------------------------------
    if (action === 'delete') {
      const { sellerId } = body;
      if (!sellerId) return json({ error: 'sellerId é obrigatório' }, 400);

      const { data: target } = await adminClient.from('profiles').select('role').eq('id', sellerId).single();
      if (!target) return json({ error: 'Vendedor não encontrado' }, 404);
      if (target.role === 'owner') return json({ error: 'Não é permitido excluir o administrador' }, 400);

      // Clean up their personal stock location first (its balances cascade with it),
      // so deleting the account never leaves an orphaned "Estoque - Nome" location behind.
      const { data: location } = await adminClient
        .from('inventory_locations')
        .select('id')
        .eq('seller_id', sellerId)
        .maybeSingle();
      if (location) {
        await adminClient.from('inventory_balances').delete().eq('location_id', location.id);
        await adminClient.from('inventory_locations').delete().eq('id', location.id);
      }

      await adminClient.from('profiles').delete().eq('id', sellerId);
      const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(sellerId);
      if (deleteAuthError) return json({ success: true, warning: deleteAuthError.message });

      return json({ success: true });
    }

    // ---------------------------------------------------------------
    if (action === 'reset_password') {
      const { userId, newPassword } = body;
      if (!userId || !newPassword || String(newPassword).length < 4) {
        return json({ error: 'userId e uma senha com pelo menos 4 caracteres são obrigatórios' }, 400);
      }
      const { error } = await adminClient.auth.admin.updateUserById(userId, { password: newPassword });
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    return json({ error: 'Ação desconhecida' }, 400);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
