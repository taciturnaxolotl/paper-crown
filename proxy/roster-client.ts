import mc from "minecraft-protocol";
import { appendFileSync } from "fs";

type Player = {
  uuid: string;
  name: string;
  properties?: Record<string, unknown>;
  listed?: boolean;
  latency?: number;
  gameMode?: number;
};

const TARGET_HOST = "localhost";
const TARGET_PORT = 25566;
const MINECRAFT_VERSION = "1.20.4";
const LOG_FILE = "roster.log";
const RECONNECT_DELAY = 5000;

const roster = new Map<string, Player>();
let client: mc.Client;
let reconnectTimeout: NodeJS.Timeout | null = null;

function log(message: string) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  appendFileSync(LOG_FILE, logEntry);
  console.log(message);
}

function setupClient(client: mc.Client) {
  client.on("login", () => {
    log("✅ Joined server, tracking player list…");
  });

  client.on("packet", (data, meta) => {
    if (meta.state !== "play") return;

    switch (meta.name) {
      case "player_info": {
        const action = data.action;
        for (const item of data.data) {
          const uuid = item.UUID ?? item.uuid;
          const name = item.name ?? item.username ?? "";
          const entry = roster.get(uuid) ?? { uuid, name };

          if (action === 0) {
            roster.set(uuid, { ...entry, name });
            log(`➕ join: ${name} (${uuid})`);
          } else if (action === 1) {
            roster.set(uuid, { ...entry, gameMode: item.gamemode });
          } else if (action === 2) {
            roster.set(uuid, { ...entry, latency: item.ping });
          } else if (action === 4) {
            roster.delete(uuid);
            log(`➖ leave: ${name} (${uuid})`);
          }
        }
        break;
      }
      case "player_info_update": {
        const actions: string[] = data.actions;
        for (const v of data.values) {
          const uuid: string = v.uuid;
          const prev = roster.get(uuid);
          let name = prev?.name ?? v.name ?? v.profile?.name ?? "";
          let listed = prev?.listed;

          if (actions.includes("add_player")) {
            name = v.name ?? name;
            listed = true;
            roster.set(uuid, {
              uuid,
              name,
              listed,
              properties: v.properties,
              latency: v.latency,
              gameMode: v.gamemode,
            });
            log(`➕ join: ${name} (${uuid})`);
          }
          if (actions.includes("update_latency")) {
            roster.set(uuid, { ...(prev ?? { uuid, name }), latency: v.latency });
          }
          if (actions.includes("update_gamemode")) {
            roster.set(uuid, {
              ...(prev ?? { uuid, name }),
              gameMode: v.gamemode,
            });
          }
          if (actions.includes("remove_player")) {
            roster.delete(uuid);
            log(`➖ leave: ${name} (${uuid})`);
          }
        }
        break;
      }
    }
  });

  client.on("error", (err) => {
    log("❌ client error: " + err);
  });

  client.on("end", (reason) => {
    log("🔌 Disconnected: " + reason);
    scheduleReconnect();
  });

  client.on("kick_disconnect", (packet) => {
    const reason = JSON.parse(packet.reason);
    log("⚠️ Kicked from server: " + JSON.stringify(reason));
    scheduleReconnect();
  });
}

function scheduleReconnect() {
  if (reconnectTimeout) return;
  
  log(`🔄 Reconnecting in ${RECONNECT_DELAY / 1000} seconds...`);
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    connect();
  }, RECONNECT_DELAY);
}

function connect() {
  client = mc.createClient({
    host: TARGET_HOST,
    port: TARGET_PORT,
    username: "hepticWarbler",
    version: MINECRAFT_VERSION,
    keepAlive: true,
    auth: "offline",
  });
  
  setupClient(client);
}

connect();

setInterval(() => {
  const players = Array.from(roster.values());
  log("\n📋 Current players: " + players.length);
  players.forEach((p) => {
    log(
      `  - ${p.name} (${p.uuid}) | ping: ${p.latency}ms | mode: ${p.gameMode}`,
    );
  });
  log("");
}, 10000);
