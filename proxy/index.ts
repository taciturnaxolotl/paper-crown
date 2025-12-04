import mc from "minecraft-protocol";

const PROXY_PORT = 25565;
const TARGET_HOST = "one.strongcraft.org";
const TARGET_PORT = 25565;
const MINECRAFT_VERSION = "1.20.4";

const SPOOFED_USERNAME = "BobTheBomber917";
const SPOOFED_UUID = "4b5db0b0-3165-3ef2-956f-2ee9f25479aa";

const server = mc.createServer({
	"online-mode": false,
	port: PROXY_PORT,
	keepAlive: false,
	version: MINECRAFT_VERSION,
});

console.log(`Minecraft proxy listening on port ${PROXY_PORT}`);
console.log(`Forwarding to ${TARGET_HOST}:${TARGET_PORT}`);

mc.ping({
	host: TARGET_HOST,
	port: TARGET_PORT,
	version: MINECRAFT_VERSION,
})
	.then((res) => {
		return res as mc.NewPingResult;
	})
	.then((res) => {
		console.log("description:", res.description);
		console.log("players:", res.players);
		console.log("version:", res.version);
		console.log("latency:", res.latency);
	})
	.catch((err) => {
		console.error("Ping failed:", err);
	});

server.on("login", (client) => {
	console.log("\n=== NEW CLIENT CONNECTION ===");
	console.log(`Original Player: ${client.username}`);
	console.log(`Original UUID: ${client.uuid}`);
	console.log(`IP: ${client.socket.remoteAddress}`);
	console.log(`Spoofing as: ${SPOOFED_USERNAME} (${SPOOFED_UUID})`);

	console.log("\n=== CONNECTED USERS ===");
	console.log("=======================\n");

	const target = mc.createClient({
		host: TARGET_HOST,
		port: TARGET_PORT,
		username: SPOOFED_USERNAME,
		keepAlive: false,
		version: MINECRAFT_VERSION,
		auth: "offline",
	});

	target.on("connect", () => {
		console.log(`Connected to target server for ${client.username}`);
	});

	target.on("error", (err) => {
		console.error(`Target error for ${client.username}:`, err.message);
		client.end("Connection to server failed");
	});

	client.on("packet", (data, meta) => {
		if (
			meta.name.includes("auth") ||
			meta.name.includes("login") ||
			meta.name.includes("encryption") ||
			meta.name.includes("session")
		) {
			console.log("\n--- AUTH PACKET (Client -> Server) ---");
			console.log(`Packet: ${meta.name}`);
			console.log(`State: ${meta.state}`);
			console.log("Data:", JSON.stringify(data, null, 2));
			console.log("--------------------------------------");
		}

		if (target.state === mc.states.PLAY && meta.state === mc.states.PLAY) {
			target.write(meta.name, data);
		}
	});

	target.on("packet", (data, meta) => {
		if (
			meta.name.includes("auth") ||
			meta.name.includes("login") ||
			meta.name.includes("encryption") ||
			meta.name.includes("session") ||
			meta.name.includes("compress")
		) {
			console.log("\n--- AUTH PACKET (Server -> Client) ---");
			console.log(`Packet: ${meta.name}`);
			console.log(`State: ${meta.state}`);
			console.log("Data:", JSON.stringify(data, null, 2));
			console.log("--------------------------------------");
		}

		if (client.state === mc.states.PLAY && meta.state === mc.states.PLAY) {
			client.write(meta.name, data);
		}
	});

	client.on("end", () => {
		console.log(`Client ${client.username} disconnected`);
		target.end();
	});

	target.on("end", () => {
		console.log(`Target server disconnected for ${client.username}`);
		client.end("Server connection closed");
	});
});

server.on("error", (err) => {
	console.error("Server error:", err);
});

server.on("listening", () => {
	console.log("Server ready for connections");
});
