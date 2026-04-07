# Amazon SES Setup for SFCoC Hub

This app sends email via **Amazon Simple Email Service (SES)** instead of Resend. Follow these steps to configure SES and your environment.

**Production access:** The SES account used for this deployment already has **production access** (not sandbox), so sending is not limited to verified recipient addresses.

---

## 1. AWS Console: Verify your sender identity

SES will only send **from** addresses or domains you have verified.

1. Go to [AWS SES Console](https://console.aws.amazon.com/ses/) and choose the region you want to use (e.g. **us-east-1**).
2. In the left sidebar, open **Verified identities**.
3. Click **Create identity**.
4. Choose **Email address** or **Domain**:
   - **Email:** Verify the exact address you use as “from” (e.g. `announcements@siouxfallschurchofchrist.org`). You’ll receive a verification link.
   - **Domain:** Add the domain (e.g. `siouxfallschurchofchrist.org`) and add the DNS records SES gives you (TXT/CNAME) at your DNS provider. This allows any address at that domain (e.g. `announcements@...`, `noreply@...`) to be used as sender.
5. Wait until the identity status is **Verified**.

**Important:** The “from” addresses used in the app (e.g. in `src/app/api/email/route.ts` and other routes) must match a verified identity.

### DKIM (domain verification)

For **domain** identities, SES provides **DKIM** DNS records (usually three CNAME records). Add them at your DNS provider and wait until SES shows DKIM as **verified** / successful. DKIM signs outgoing mail for your domain, which improves deliverability and works with SPF and DMARC. If you have already completed DKIM verification in SES, you are in good shape for authenticated sending from that domain.

---

## 2. Leave SES sandbox (for production)

For this project, production access is already enabled; you can skip the request flow below unless you are onboarding a **new** SES account or environment.

In **sandbox** mode, you can only send to verified identities (e.g. your own test addresses).

- To send to **any** recipient (e.g. all church members), request **production access**:
  1. In SES, go to **Account dashboard**.
  2. Under **Sending statistics**, click **Request production access** (or use **Account dashboard** → **Request production access**).
  3. Fill out the form (use case: transactional + optional marketing for church announcements). Approval is often within 24–48 hours.

Until production is granted, only send to verified recipient addresses when testing.

---

## 3. IAM user and permissions

Create an IAM user (or use an existing one) that the app will use to call SES.

1. Go to [IAM → Users](https://console.aws.amazon.com/iam/home#/users) and **Create user** (e.g. `sfcoc-ses-sender`). Do **not** enable console login unless you need it.
2. Attach a policy that allows sending email with SES. Either:

**Option A – Inline policy (minimal)**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

**Option B – AWS managed policy**

Attach the managed policy **AmazonSESFullAccess** (broader; use only if you’re okay with full SES access for this user).

3. Create an **Access key** for the user (Programmatic access). Save the **Access key ID** and **Secret access key**; you’ll add them to your app’s environment.

---

## 4. Environment variables

Set these in your deployment (e.g. Vercel project settings or `.env.local` for local dev).

| Variable | Required | Description |
|----------|----------|-------------|
| `AWS_ACCESS_KEY_ID` | Yes* | IAM access key for the SES user. |
| `AWS_SECRET_ACCESS_KEY` | Yes* | IAM secret key for the SES user. |
| `AWS_REGION` | Yes | AWS region where SES is used (e.g. `us-east-1`). |
| `AWS_SES_REGION` | No | Overrides `AWS_REGION` for SES only if you need a different region. |
| `EMAIL_FROM` | No | Full RFC “from” for announcement mail (`/api/email`). Alias: `SES_FROM`. |
| `EMAIL_FROM_INFORMATION_HUB` | No | Admin broadcasts and account-status mail; falls back to `EMAIL_FROM` / `SES_FROM` if unset. |
| `EMAIL_FROM_SERVICE_ROLES` | No | Service-role assignment emails only. |
| `EMAIL_REPLY_TO` | Recommended | Single address where **Reply** should go (e.g. church office). Bulk sends use one SES message per recipient so **Reply-All** cannot expose the full list; this still directs normal replies to one monitored inbox. Verify this identity in SES if required. |

\* If the app runs on AWS (e.g. EC2, ECS, Lambda) and uses an IAM role, you can omit the key/secret and rely on the default credential chain. For Vercel or other hosts, you must set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.

These variables are read from the server environment at runtime (they are **not** listed in `next.config.js` `env`, so credentials are not inlined into the client bundle).

**Example (.env.local):**

```bash
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
EMAIL_REPLY_TO=office@siouxfallschurchofchrist.org
```

Remove any Resend-related variables (e.g. `RESEND_API_KEY`); they are no longer used.

---

## 5. App “from” addresses

Ensure every “from” address is a verified identity in SES. Defaults are in `src/lib/email/config.ts`. Override with env vars without code changes.

- **Announcements:** `getEmailFromAnnouncements()` — `src/app/api/email/route.ts`.
- **Admin + account status:** `getEmailFromInformationHub()` — `admin/send-email`, `auth/account-status-notification`.
- **Service role assignments:** `getEmailFromServiceRoles()` — `src/app/api/service-roles/send-assignment-email/route.ts`.

---

## 6. Optional: Sending limits and bounces

- **SES limits:** By default SES has sending rate limits (e.g. per-second and daily). The app batches recipients in groups of 50 per API call to respect SES limits. For higher volume, request a limit increase in **SES → Account dashboard**.
- **Bounces/complaints:** In SES you can set up **Configuration sets** and **Event publishing** (SNS) to log bounces and complaints. Optional but recommended for production.

---

## Summary checklist

- [ ] Verified sender identity (email or domain) in SES; for domains, DKIM DNS records added and verified in SES.
- [ ] Requested production access if the SES account is still in sandbox (not needed for this deployment — already on production access).
- [ ] Created IAM user with `ses:SendEmail` (and optionally `ses:SendRawEmail`).
- [ ] Set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION` in your environment.
- [ ] Removed `RESEND_API_KEY` (and any other Resend env) from env.
- [ ] Confirmed all “from” addresses in the app are verified in SES.

After that, the app will send all email through Amazon SES.
