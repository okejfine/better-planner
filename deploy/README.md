# Cheapest EC2 deploy (max 2 concurrent users)

The app runs against managed Supabase, so EC2 only needs to run the Next.js
server. With Next's `standalone` output the runtime footprint is tiny, so the
smallest Graviton instance is plenty.

## Instance recommendation

| Choice | RAM | ~On-demand cost (us-east-1) | Notes |
|---|---|---|---|
| **t4g.nano** ✅ | 0.5 GB | ~$3/mo + ~$0.80 EBS | Cheapest. Fine because we build locally and only *run* here. Add swap (below). |
| t4g.micro | 1 GB | ~$6/mo | Free-tier eligible in some regions/promos. Comfortable. |

Pick **t4g.nano** for cheapest. Use Amazon Linux 2023 (arm64), 8 GB gp3 EBS.
Reserved/Savings Plan can drop the nano to ~$1.5–2/mo if you commit 1 year.

> Build on your Mac (Apple Silicon = arm64) and ship the artifact. The nano
> never compiles anything, so 0.5 GB RAM is enough.

## Current production URL

```
https://alexandmaclaine.com
```

Legacy (until DNS fully propagates): `http://ec2-100-28-145-224.compute-1.amazonaws.com`

Port `80`/`443` are served by Caddy (reverse proxy → `localhost:3000`).
EC2 public IP: `100.28.145.224` — point your domain's A records here.

## One-time server setup

1. **Launch** a `t4g.nano`, Amazon Linux 2023 (arm64). Create/download a key pair.
2. **Security group:** allow inbound `22` (your IP only), `80` (0.0.0.0/0), and
   `443` (0.0.0.0/0 — for future HTTPS).  
   *Do not expose port `3000` publicly once Caddy is running.*
3. SSH in and install Node + swap:

```bash
sudo dnf install -y nodejs                 # Node 18+ on AL2023
# 1 GB swap so the box never OOMs under a tiny load spike
sudo dd if=/dev/zero of=/swapfile bs=1M count=1024
sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

mkdir -p /home/ec2-user/better-planner
```

4. **Runtime secrets** — create `/home/ec2-user/better-planner/runtime.env`
   (server-side only; the `NEXT_PUBLIC_*` vars are baked in at build time):

```
SUPABASE_SERVICE_ROLE_KEY=eyJ...service-role...
ADMIN_EMAILS=king@hoth.com,alexsking77@gmail.com
BYPASS_AUTH=false
SITE_URL=https://alexandmaclaine.com
```

> **`SITE_URL` is required.**  The server uses it to build `emailRedirectTo`
> in magic-link emails.  Without it, links in emails will point at
> `localhost:3000` and fail.  When you get a custom domain, update this value
> (and the Supabase redirect URLs below) and redeploy.

5. **Install the service:**

```bash
sudo cp /home/ec2-user/better-planner/deploy/better-planner.service \
        /etc/systemd/system/better-planner.service
# (deploy.sh copies the deploy/ folder up too; or scp it once)
sudo systemctl daemon-reload
sudo systemctl enable better-planner
```

## Reverse proxy (no domain — HTTP only)

Install Caddy to proxy port `80` → `localhost:3000`.  This means users reach
the app at `http://ec2-100-28-145-224.compute-1.amazonaws.com` without needing
to specify a port.

```bash
sudo dnf install -y 'dnf-command(copr)'
sudo dnf copr enable -y @caddy/caddy
sudo dnf install -y caddy

sudo tee /etc/caddy/Caddyfile > /dev/null <<'EOF'
:80 {
    reverse_proxy localhost:3000
}
EOF

sudo systemctl enable --now caddy
```

Verify:

```bash
curl -I http://ec2-100-28-145-224.compute-1.amazonaws.com/
# Should return HTTP/1.1 200 (or 307 redirect to /login)
```

## Build-time env (on your Mac)

`NEXT_PUBLIC_*` values are inlined at build, so set them before deploying.
In `better-planner/.env.local`:

```
NEXT_PUBLIC_SITE_URL=https://alexandmaclaine.com
```

> `NEXT_PUBLIC_SITE_URL` is the build-time fallback.  `SITE_URL` in
> `runtime.env` takes precedence at runtime and is the authoritative value
> for auth email links.

## Supabase Auth configuration

In **Supabase → Auth → URL Configuration** set:

| Field | Value |
|---|---|
| Site URL | `https://alexandmaclaine.com` |
| Redirect URLs | `https://alexandmaclaine.com/auth/callback` |
|               | `https://alexandmaclaine.com/reset-password` |
|               | `https://www.alexandmaclaine.com/auth/callback` |
|               | `https://www.alexandmaclaine.com/reset-password` |

Without these entries Supabase will reject the `emailRedirectTo` URL in magic
links and the `redirectTo` URL in password-reset emails.

## Deploy / redeploy

```bash
EC2_HOST=ec2-user@ec2-100-28-145-224.compute-1.amazonaws.com \
SSH_KEY=~/.ssh/your-key.pem \
./deploy/deploy.sh
```

This builds locally, assembles the standalone bundle, rsyncs it up, and restarts
the service.

## TLS (custom domain)

Caddy auto-provisions Let's Encrypt certificates. The live Caddyfile:

```
alexandmaclaine.com, www.alexandmaclaine.com {
    reverse_proxy localhost:3000
}

http://ec2-100-28-145-224.compute-1.amazonaws.com {
    reverse_proxy localhost:3000
}
```

The EC2 hostname block is a fallback until DNS propagates; remove it once
`https://alexandmaclaine.com` is stable.

**DNS (at your registrar):**

| Host | Type | Value |
|---|---|---|
| `@` (apex) | A | `100.28.145.224` |
| `www` | A | `100.28.145.224` |

> **Note:** `alexandmaclaine.com` currently resolves to `74.208.236.206` — update
> both records to the EC2 IP above. Consider attaching an **Elastic IP** in AWS
> so the address survives instance reboots (free while the instance is running).

After DNS propagates:

1. Caddy obtains HTTPS certs automatically (`sudo systemctl reload caddy`).
2. Update **Supabase Site URL** and **Redirect URLs** (see table above).
3. Redeploy if you changed `NEXT_PUBLIC_SITE_URL` in `.env.local`.

## Verifying magic links end-to-end

After deploying (including Caddy + `SITE_URL` in runtime.env):

1. Open `http://ec2-100-28-145-224.compute-1.amazonaws.com/login`.
2. Enter your name and email; click **Send magic link**.
3. Open the email.  The link should start with
   `http://ec2-100-28-145-224.compute-1.amazonaws.com/auth/callback?code=…`
   (not `localhost`).
4. Click the link.  The browser should land on `/` (the calendar).
5. If the link bounces to `/login?error=callback`, check:
   - `SITE_URL` is set correctly in `runtime.env`.
   - The callback URL is listed in Supabase Redirect URLs.
