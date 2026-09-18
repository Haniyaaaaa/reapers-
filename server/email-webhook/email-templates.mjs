// Branded HTML builders for the two auth emails Reapers sends — dark theme, magenta/cyan
// accents, matching src/theme/palettes.ts. Table-based layout + inline styles throughout
// (required for Gmail/Outlook/Apple Mail, which strip <style> blocks and most modern CSS).
// Pure string builders, no dependencies — copy this file alongside your webhook handler.

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function shell({ kicker, heading, bodyHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0; padding:0; background-color:#0B0F1C; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0B0F1C;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#121729; border-radius:20px; border:1px solid rgba(255,255,255,0.08); overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#E91E8C,#8A4A84); padding:28px 32px;">
              <span style="font-size:22px; font-weight:800; letter-spacing:3px; color:#FFFFFF;">REAPERS</span>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 8px 32px;">
              <p style="margin:0 0 6px 0; font-size:12px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#2EE6D6;">${escapeHtml(kicker)}</p>
              <h1 style="margin:0 0 16px 0; font-size:24px; line-height:1.3; color:#FFFFFF; font-weight:700;">${escapeHtml(heading)}</h1>
            </td>
          </tr>
          ${bodyHtml}
          <tr>
            <td style="padding:20px 32px 28px 32px; border-top:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0; font-size:12px; line-height:1.6; color:#6E7690;">
                Didn't request this? You can safely ignore this email — nothing changes on your account.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** @param {{ token: string; confirmationUrl: string }} params */
export function buildConfirmSignupEmail({ token, confirmationUrl }) {
  const bodyHtml = `
          <tr>
            <td style="padding:0 32px 28px 32px;">
              <p style="margin:0 0 28px 0; font-size:15px; line-height:1.6; color:#A8B0C4;">
                Enter this code in the Reapers app to finish creating your account. It expires in 60 minutes.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background-color:#1A2438; border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:24px;">
                    <span style="font-family:'Courier New',Courier,monospace; font-size:36px; font-weight:700; letter-spacing:10px; color:#2EE6D6;">
                      ${escapeHtml(token)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px 32px;">
              <p style="margin:0 0 12px 0; font-size:13px; line-height:1.6; color:#6E7690;">Not on your device? You can also confirm by opening this link:</p>
              <a href="${escapeHtml(confirmationUrl)}" style="display:inline-block; font-size:13px; color:#2EE6D6; text-decoration:underline; word-break:break-all;">${escapeHtml(confirmationUrl)}</a>
            </td>
          </tr>`;
  return shell({ kicker: 'Welcome to the community', heading: 'Confirm your email', bodyHtml });
}

/** @param {{ token: string }} params */
export function buildResetPasswordEmail({ token }) {
  // Code-only by design — the app's ResetPasswordScreen.tsx has the user type this in
  // directly, and there's no deep-link route to send them to instead (auth-callback isn't
  // registered in linking.ts). Keep in sync with buildConfirmSignupEmail's code block so the
  // two auth emails read as one family.
  const bodyHtml = `
          <tr>
            <td style="padding:0 32px 32px 32px;">
              <p style="margin:0 0 28px 0; font-size:15px; line-height:1.6; color:#A8B0C4;">
                We got a request to reset the password on your Reapers account. Enter this code in the app to continue. It expires in 60 minutes, and no password is changed until you use it.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background-color:#1A2438; border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:24px;">
                    <span style="font-family:'Courier New',Courier,monospace; font-size:36px; font-weight:700; letter-spacing:10px; color:#2EE6D6;">
                      ${escapeHtml(token)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
  return shell({ kicker: 'Account security', heading: 'Reset your password', bodyHtml });
}
