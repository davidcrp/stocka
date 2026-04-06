import { corsHeaders } from '@supabase/supabase-js/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { email, confirmationUrl, fullName } = await req.json()

    if (!email || !confirmationUrl) {
      return new Response(JSON.stringify({ error: 'email and confirmationUrl are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const name = fullName || email.split('@')[0]

    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#22C55E,#16A34A);padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">DealPulse</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Sistema de Gestão de Veículos</p>
    </div>
    <div style="padding:32px 24px;">
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#18181b;">Olá, ${name}!</h2>
      <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.6;">
        Obrigado por criar sua conta no DealPulse. Para começar a usar o sistema, confirme seu email clicando no botão abaixo:
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${confirmationUrl}" style="display:inline-block;background:linear-gradient(135deg,#22C55E,#16A34A);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;box-shadow:0 2px 8px rgba(34,197,94,0.3);">
          Confirmar meu email
        </a>
      </div>
      <p style="margin:24px 0 0;font-size:13px;color:#a1a1aa;line-height:1.5;">
        Se você não criou esta conta, ignore este email. O link expira em 24 horas.
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
        subject: 'Confirme seu email - DealPulse',
        html: htmlContent,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Resend API error:', data)
      return new Response(JSON.stringify({ error: 'Failed to send email', details: data }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error sending confirmation email:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
