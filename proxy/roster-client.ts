import mc from "minecraft-protocol";

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

const roster = new Map<string, Player>();

const client = mc.createClient({
  host: TARGET_HOST,
  port: TARGET_PORT,
  username: "hepticWarbler",
  version: MINECRAFT_VERSION,
  keepAlive: true,
  auth: "offline",
});

client.on("login", () => {
  console.log("✅ Joined server, tracking player list…");
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
          console.log(`➕ join: ${name} (${uuid})`);
        } else if (action === 1) {
          roster.set(uuid, { ...entry, gameMode: item.gamemode });
        } else if (action === 2) {
          roster.set(uuid, { ...entry, latency: item.ping });
        } else if (action === 4) {
          roster.delete(uuid);
          console.log(`➖ leave: ${name} (${uuid})`);
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
          console.log(`➕ join: ${name} (${uuid})`);
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
          console.log(`➖ leave: ${name} (${uuid})`);
        }
      }
      break;
    }
  }
});

setInterval(() => {
  const players = Array.from(roster.values());
  console.log("\n📋 Current players:", players.length);
  players.forEach((p) => {
    console.log(
      `  - ${p.name} (${p.uuid}) | ping: ${p.latency}ms | mode: ${p.gameMode}`,
    );
  });
  console.log("");
}, 10000);

client.on("error", (err) => {
  console.error("❌ client error:", err);
});

client.on("end", (reason) => {
  console.log("🔌 Disconnected:", reason);
});
