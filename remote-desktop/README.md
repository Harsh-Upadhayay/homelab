# Remote Desktop

Auditable host setup for native remote desktop access.

## What This Manages

- Installs GNOME on the host.
- Starts XRDP for a native remote desktop session.
- Binds XRDP to localhost only, so it is reached through the existing
  Cloudflare SSH tunnel.

This folder intentionally does not manage a Docker/noVNC service anymore. XRDP
avoids x11vnc's physical-console mirroring bugs and gives a native macOS client
experience.

## First run

From this directory:

```bash
make install-gnome-xrdp
make verify-xrdp
```

## Connection

Recommended macOS SSH config:

```sshconfig
Host neovara
    HostName ssh.neovara.uk
    User neovara
    ProxyCommand cloudflared access ssh --hostname %h
    IdentityFile ~/.ssh/neovara.pem
    ServerAliveInterval 30
    ServerAliveCountMax 3

Host neovara-lan
    HostName 192.168.1.111
    User neovara
    IdentityFile ~/.ssh/neovara.pem
    ServerAliveInterval 30
    ServerAliveCountMax 3

Host neovara-rdp
    HostName ssh.neovara.uk
    User neovara
    ProxyCommand cloudflared access ssh --hostname %h
    IdentityFile ~/.ssh/neovara.pem
    LocalForward 127.0.0.1:3390 127.0.0.1:3389
    ExitOnForwardFailure yes
    ServerAliveInterval 30
    ServerAliveCountMax 3

Host neovara-lan-rdp
    HostName 192.168.1.111
    User neovara
    IdentityFile ~/.ssh/neovara.pem
    LocalForward 127.0.0.1:3390 127.0.0.1:3389
    ExitOnForwardFailure yes
    ServerAliveInterval 30
    ServerAliveCountMax 3
```

Start the Cloudflare tunnel from your Mac:

```bash
ssh -N neovara-rdp
```

Or start the LAN tunnel when you are at home:

```bash
ssh -N neovara-lan-rdp
```

Then connect Windows App, Microsoft Remote Desktop, or another RDP client to:

```text
localhost:3390
```

Login with the normal Linux account:

```text
user: neovara
password: your host user password
```

If the client was saved with an old password, delete the saved credential in
the RDP client and reconnect. XRDP uses PAM, so a stale RDP password fails even
when the SSH tunnel itself is healthy.

XRDP creates a remote GNOME session rather than scraping the dummy-HDMI console.
Resolution follows the RDP client window settings.

The installer disables GDM and GNOME's built-in remote desktop daemon for the
runtime path. XRDP starts the GNOME session on demand through its Xorg backend,
and the service listens only on `127.0.0.1:3389`.

## Useful Commands

```bash
systemctl status xrdp
make verify-xrdp
```

## Verification

```bash
make verify-xrdp
```

The verifier checks that XRDP is active, scoped to localhost, GNOME is
available, the user session starts GNOME, GDM is not running, and the old
x11vnc services are not running.
