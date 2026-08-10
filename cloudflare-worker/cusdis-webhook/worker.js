/**
 * Cloudflare Worker - Cusdis comment notification webhook
 *
 * Deploy via wrangler (from cloudflare-worker/cusdis-webhook/):
 *   npx wrangler deploy
 *
 * Add these secrets after deploying:
 *   npx wrangler secret put RESEND_API_KEY
 *   npx wrangler secret put NOTIFY_EMAIL   (the address you want notified)
 *   npx wrangler secret put FROM_EMAIL     (e.g. comments@yourdomain.com or onboarding@resend.dev for testing)
 *
 * Then set the webhook URL in Cusdis dashboard to:
 *   https://<your-worker>.workers.dev/
 */

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const { by_nickname, by_email, content, page_id, page_title, project_title, approve_link } = payload.data || {};
    const pageUrl = `https://mirkea.com${page_id}`;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: env.FROM_EMAIL,
        to: env.NOTIFY_EMAIL,
        subject: `New comment on "${page_title}"`,
        html: `
          <p><strong>${by_nickname || "Anonymous"}</strong>${by_email ? ` (${by_email})` : ""} commented on
          <a href="${pageUrl}">${page_title}</a>:</p>
          <blockquote style="border-left:3px solid #ccc;padding-left:1em;color:#555;margin:1em 0">
            ${content}
          </blockquote>
          <p>
            <a href="https://cusdis.com/dashboard/project/6ac8e894-5dfe-4f38-a947-d077bec8edba" style="margin-right:1em">View in dashboard</a>
            <a href="${approve_link}">✓ Approve comment</a>
          </p>
        `,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.text();
      console.error("Resend error:", err);
      return new Response("Failed to send email", { status: 500 });
    }

    return new Response("OK", { status: 200 });
  },
};
