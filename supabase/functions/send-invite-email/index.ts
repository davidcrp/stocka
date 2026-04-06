const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { email, inviterName, dealershipName, role, signupUrl } = await req.json()

    if (!email || !signupUrl) {
      return new Response(JSON.stringify({ error: 'email and signupUrl are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const roleLabel = role === 'gestor' ? 'Gestor' : 'Vendedor'

    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#22C55E,#16A34A);padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">DealPulse</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Convite para a equipe</p>
    </div>
    <div style="padding:32px 24px;">
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#18181b;">Você foi convidado!</h2>
      <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.6;">
        <strong>${inviterName || 'Um administrador'}</strong> convidou você para fazer parte da equipe
        <strong>${dealershipName || 'no DealPulse'}</strong> como <strong>${roleLabel}</strong>.
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.6;">
        Crie sua conta para começar a usar o sistema imediatamente — sem precisar de aprovação.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${signupUrl}" style="display:inline-block;background:linear-gradient(135deg,#22C55E,#16A34A);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;box-shadow:0 2px 8px rgba(34,197,94,0.3);">
          Criar minha conta
        </a>
      </div>
      <p style="margin:24px 0 0;font-size:13px;color:#a1a1aa;line-height:1.5;">
        Este convite expira em 7 dias. Se você não conhece quem enviou, ignore este email.
      </p>
    </div>
    <div style="padding:16px 24px;border-top:1px solid #f4f4f5;text-align:center;">
      <p style="margin:0;font-size:12px;color:#a1a1aa;">© ${new Date().getFullYear()} DealPulse. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>`

    const response = await fetch(`${GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: 'DealPulse <onboarding@resend.dev>',
        to: [email],
        subject: `Você foi convidado para ${dealershipName || 'DealPulse'}`,
        html: htmlContent,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Resend API error:', data)
      return new Response(JSON.stringify({ error: 'Failed to send email', details: data }), {
        status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error sending invite email:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
