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
 *
 * Founder triage (/fondatori): each idea is checked by Claude before the page answers.
 * Run `npm install` here once, then add three more secrets:
 *   npx wrangler secret put ANTHROPIC_API_KEY
 *   npx wrangler secret put TRIAGE_PROMPT     (the screening prompt, kept outside this repo)
 *   npx wrangler secret put FOUNDER_CAL_URL   (the booking link shown to a fit)
 * Without them, founders just get "received, I'll reply by email" and no calendar link.
 */

import Anthropic from "@anthropic-ai/sdk";

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
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const TRIAGE_SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["fit", "not_yet"] },
    missing: {
      type: "array",
      items: {
        type: "string",
        enum: ["others", "product", "small_start", "revenue"],
      },
    },
    reason: { type: "string" },
  },
  required: ["verdict", "missing", "reason"],
  additionalProperties: false,
};

// Returns { verdict, missing, reason } or null when triage is off or fails: the lead is never lost over it.
async function triageFounder(lead, env) {
  if (!env.ANTHROPIC_API_KEY || !env.TRIAGE_PROMPT) return null;
  const client = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    timeout: 15000,
    maxRetries: 1,
  });
  const field = (key) => String(lead[key] || "").slice(0, 2000);
  try {
    const response = await client.messages.create({
      model: env.TRIAGE_MODEL || "claude-haiku-5-5",
      max_tokens: 2000,
      system: env.TRIAGE_PROMPT,
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: TRIAGE_SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: `<idea>${field("idea")}</idea>\n<who_else_has_the_problem>${field("asking")}</who_else_has_the_problem>\n<what_exists>${field("stage")}</what_exists>\n<link>${field("link")}</link>`,
        },
      ],
    });
    if (response.stop_reason !== "end_turn") return null;
    const text = response.content.find((block) => block.type === "text")?.text;
    const result = JSON.parse(text || "");
    return result.verdict === "fit" || result.verdict === "not_yet" ? result : null;
  } catch (error) {
    console.error("Triage failed:", error?.status || "", error?.message || error);
    return null;
  }
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
    // Resend refuses a reply-to like "a@b", which would lose the lead: only pass a plausible address.
    const validEmail = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(String(lead.email || "").trim());
    if (founder && lead.email && !validEmail) {
      return new Response("Invalid email", { status: 400, headers });
    }
    if (!lead.name || !(founder ? lead.email : lead.phone)) {
      return new Response(founder ? "Name and email are required" : "Name and phone are required", { status: 400, headers });
    }

    const triage = founder ? await triageFounder(lead, env) : null;
    const verdictLabel = !founder ? "" : !triage ? "Not triaged" : triage.verdict === "fit" ? "Fit" : "Not yet";
    const triageHtml = !founder
      ? ""
      : triage
        ? `<p><strong>Triage: ${verdictLabel}.</strong> ${escapeHtml(triage.reason)}${triage.missing.length ? ` Missing or unclear: ${triage.missing.join(", ")}.` : ""} ${triage.verdict === "fit" ? "The page showed the calendar link." : "The page asked the qualifying questions, no calendar link."}</p>`
        : "<p><strong>Triage: not run</strong> (no API key or the call failed). The page said you'll reply by email, no calendar link.</p>";

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
        reply_to: validEmail ? String(lead.email).trim() : undefined,
        subject: `${founder ? `[${verdictLabel}] New founder idea` : "New free-call request"}: ${String(lead.name).slice(0, 80)}${lead.company ? ` (${String(lead.company).slice(0, 80)})` : ""}`,
        html: `${triageHtml}<p>${founder ? "Reply in writing within one working day." : "Call back within one working day."}</p><table>${rows}</table>`,
      }),
    });

    if (!emailRes.ok) {
      console.error("Resend error:", await emailRes.text());
      return new Response("Failed to send email", { status: 500, headers });
    }

    if (founder) {
      // The page shows the calendar only to a fit; the link lives here, not in the page source.
      const verdict = triage?.verdict || "unknown";
      const body = { verdict, missing: triage?.missing || [] };
      if (verdict === "fit" && env.FOUNDER_CAL_URL) body.booking_url = env.FOUNDER_CAL_URL;
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }
    return new Response("OK", { status: 200, headers });
  },
};
