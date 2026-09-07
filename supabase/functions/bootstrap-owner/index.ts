// One-time bootstrap: creates the very first owner account. There is no owner
// yet at this point, so nothing else in the system could create it — this
// function is the sole exception. It refuses to run a second time once an
// owner profile already exists, so it's safe to leave deployed afterward.
//
// Protected by a shared secret (not just "no owner yet") so nobody can race to
// create a rogue owner account before the real one is ever set up.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const BOOTSTRAP_SECRET = 'brownie-bootstrap-9f3a7c1e';

Deno.serve(async (req: Request) => {
  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const { secret, organizationId, name, email, password } = body || {};

    if (secret !== BOOTSTRAP_SECRET) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { count } = await adminClient
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'owner');

    if (count && count > 0) {
      return new Response(JSON.stringify({ error: 'An owner already exists — bootstrap already done' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (createError || !created.user) {
      return new Response(JSON.stringify({ error: createError?.message || 'Falha ao criar usuário' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { error: profileError } = await adminClient.from('profiles').insert({
      id: created.user.id,
      organization_id: organizationId,
      role: 'owner',
      status: 'active',
      name,
      email
    });

    if (profileError) {
      await adminClient.auth.admin.deleteUser(created.user.id);
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, userId: created.user.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
