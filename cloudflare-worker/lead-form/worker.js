/**
 * Cloudflare Worker - free-call form on /servicii and /en/services, idea form on /fondatori
 *
 * Deploy via wrangler (from cloudflare-worker/lead-form/):
 *   npx wrangler deploy
 *
 * Add these secrets after deploying (same Resend account as the Cusdis webhook):
 *   npx wrangler secret put RESEND_API_KEY
 *   npx wrangler secret put NOTIFY_EMAIL   (the address you want leads sent to)
 *   npx wrangler secret put FROM_EMAIL     (e.g. leads@mirkea.com or onboarding@resend.dev for testing)
 *
 * Then set PUBLIC_LEADS_WORKER_URL=https://<your-worker>.workers.dev/ as a repo secret
 * and pass it to the build step in .github/workflows/deploy.yml.
 */

const ALLOWED_ORIGINS = ["https://mirkea.com", "http://localhost:4321"];

const FIELDS = [
  ["name", "Name"],
  ["company", "Company"],
  ["phone", "Phone"],
  ["email", "Email"],
  ["interest", "Interested in"],
  ["message", "Wants to solve"],
  ["hours_per_week", "Repetitive hours / week"],
  ["hourly_cost", "Cost per hour"],
  ["yearly_savings", "Calculator: savings / year"],
  ["idea", "Idea"],
  ["asking", "Who is asking for it"],
  ["stage", "What exists today"],
  ["link", "Link"],
  ["reply_by", "Prefers"],
  ["lang", "Page language"],
  ["page", "Page"],
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const headers = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers });
    }

    let lead;
    try {
      lead = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400, headers });
    }

    // Honeypot filled in: a bot. Answer OK so it doesn't retry.
    if (lead.website) {
      return new Response("OK", { status: 200, headers });
    }
    // Founders write first and may leave no phone; the free-call form needs one.
    const founder = lead.offer === "founder";
    if (!lead.name || !(founder ? lead.email : lead.phone)) {
      return new Response(founder ? "Name and email are required" : "Name and phone are required", { status: 400, headers });
    }

    const rows = FIELDS.filter(([key]) => lead[key])
      .map(
        ([key, label]) =>
          `<tr><td style="padding:4px 12px 4px 0;color:#666">${label}</td><td style="padding:4px 0">${escapeHtml(String(lead[key]).slice(0, 2000))}</td></tr>`,
      )
      .join("");

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: env.FROM_EMAIL,
        to: env.NOTIFY_EMAIL,
        reply_to: lead.email || undefined,
        subject: `${founder ? "New founder idea" : "New free-call request"}: ${String(lead.name).slice(0, 80)}${lead.company ? ` (${String(lead.company).slice(0, 80)})` : ""}`,
        html: `<p>${founder ? "Reply in writing within one working day." : "Call back within one working day."}</p><table>${rows}</table>`,
      }),
    });

    if (!emailRes.ok) {
      console.error("Resend error:", await emailRes.text());
      return new Response("Failed to send email", { status: 500, headers });
    }

    return new Response("OK", { status: 200, headers });
  },
};
