const LOGO_URL =
  'https://res.cloudinary.com/dzjsztwqp/image/upload/v1751485185/SFCOC_Colored_lxaty4.png';

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || 'https://app.siouxfallschurchofchrist.org';

/** Same wrapper as admin broadcast emails: logo, body, footer with preferences link. */
export function wrapMemberEmailHtml(content: string): string {
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br />');
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${LOGO_URL}" alt="SFCOC Logo" style="width: 120px; height: auto;" />
      </div>
      <div style="color: #333; line-height: 1.6;">
        ${escaped}
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px;">
        You received this email from Sioux Falls Church of Christ.
        <a href="${BASE_URL}/settings" style="color: #E88B5F;">Manage your email preferences</a>
      </p>
    </div>
  `;
}
