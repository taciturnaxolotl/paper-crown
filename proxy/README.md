# Minecraft Proxy

A Bun-based proxy server that intercepts Minecraft packets and logs authentication data.

## Setup

```bash
bun install
bun start
```

## Configuration

- **Proxy Port**: 25565 (default Minecraft port)
- **Target Server**: localhost:25566

Players connect to the proxy on port 25565, and the proxy forwards traffic to the actual server on 25566.

## What It Logs

- Player connection details (username, UUID, IP)
- All authentication-related packets
- Login packets
- Encryption packets
- Session data

All logged packets show direction (Client->Server or Server->Client) with full packet data.
