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

## One-time server setup

1. **Launch** a `t4g.nano`, Amazon Linux 2023 (arm64). Create/download a key pair.
2. **Security group:** allow inbound `22` (your IP only) and `80`/`443` (0.0.0.0/0).
   If you skip a domain/TLS, also allow `3000` and use `http://<ip>:3000`.
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
AUTH_EMAIL_ALLOWLIST=king@hoth.com,emward123@live.com,kingadamrex@gmail.com,alexsking77@gmail.com
BYPASS_AUTH=false
```

5. **Install the service:**

```bash
sudo cp /home/ec2-user/better-planner/deploy/better-planner.service \
        /etc/systemd/system/better-planner.service
# (deploy.sh copies the deploy/ folder up too; or scp it once)
sudo systemctl daemon-reload
sudo systemctl enable better-planner
```

## Build-time env (on your Mac)

`NEXT_PUBLIC_*` values are inlined at build, so set them before deploying.
In `better-planner/.env.local` set `NEXT_PUBLIC_SITE_URL` to the PUBLIC url:

```
NEXT_PUBLIC_SITE_URL=https://your-domain.com     # or http://<ec2-ip>:3000
```

Also add that exact URL to **Supabase → Auth → URL Configuration → Redirect URLs**
(`<url>/auth/callback` and `<url>/reset-password`), or auth callbacks will break.

## Deploy / redeploy

```bash
EC2_HOST=ec2-user@<ip> SSH_KEY=~/.ssh/your-key.pem ./deploy/deploy.sh
```

This builds locally, assembles the standalone bundle, rsyncs it up, and restarts
the service.

## TLS (recommended if you have a domain)

Run Caddy as a reverse proxy for automatic HTTPS:

```bash
sudo dnf install -y 'dnf-command(copr)'
sudo dnf copr enable -y @caddy/caddy
sudo dnf install -y caddy
echo 'your-domain.com {
    reverse_proxy localhost:3000
}' | sudo tee /etc/caddy/Caddyfile
sudo systemctl enable --now caddy
```

Point your domain's A record at the EC2 public IP (use an Elastic IP so it
doesn't change on reboot — Elastic IPs are free while attached to a running
instance).

## No-domain option

Skip Caddy, open port `3000` in the security group, set
`NEXT_PUBLIC_SITE_URL=http://<ec2-ip>:3000`, and use that URL. Works fine for 2
users; just no HTTPS.
