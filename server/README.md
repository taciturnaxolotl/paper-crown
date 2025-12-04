# Minecraft Offline Server

Docker Compose setup for a Paper Minecraft server running in offline mode.

## Quick Start

```bash
docker compose up -d
```

## Server Details

- **Port**: 25566 (mapped from container's 25565)
- **Type**: Paper 1.20.4
- **Mode**: Offline (no authentication)
- **Memory**: 2GB
- **Data**: Persisted in `./data` directory

## Management

```bash
# Start server
docker compose up -d

# View logs
docker compose logs -f

# Stop server
docker compose down

# Access console
docker attach minecraft-offline
```

## With Proxy

When using with the proxy:
1. Start this server: `docker compose up -d`
2. Start the proxy in ../proxy: `bun start`
3. Connect to `localhost:25565` in Minecraft
4. Proxy logs auth packets and forwards to this server on 25566
