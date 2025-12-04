import mc from 'minecraft-protocol';

const PROXY_PORT = 25565;
const TARGET_HOST = 'localhost';
const TARGET_PORT = 25566;

const SPOOFED_USERNAME = 'admin';
const SPOOFED_UUID = '36881d51-7477-3eb6-91a1-dfc11065590d';

const server = mc.createServer({
  'online-mode': false,
  port: PROXY_PORT,
  keepAlive: false,
  version: '1.20.4'
});

console.log(`Minecraft proxy listening on port ${PROXY_PORT}`);
console.log(`Forwarding to ${TARGET_HOST}:${TARGET_PORT}`);

server.on('login', (client) => {
  console.log('\n=== NEW CLIENT CONNECTION ===');
  console.log(`Original Player: ${client.username}`);
  console.log(`Original UUID: ${client.uuid}`);
  console.log(`IP: ${client.socket.remoteAddress}`);
  console.log(`Spoofing as: ${SPOOFED_USERNAME} (${SPOOFED_UUID})`);
  
  const target = mc.createClient({
    host: TARGET_HOST,
    port: TARGET_PORT,
    username: SPOOFED_USERNAME,
    keepAlive: false,
    version: '1.20.4',
    auth: 'offline'
  });

  target.on('connect', () => {
    console.log(`Connected to target server for ${client.username}`);
  });

  target.on('error', (err) => {
    console.error(`Target error for ${client.username}:`, err.message);
    client.end('Connection to server failed');
  });

  client.on('packet', (data, meta) => {
    if (meta.name.includes('auth') || 
        meta.name.includes('login') || 
        meta.name.includes('encryption') ||
        meta.name.includes('session')) {
      console.log('\n--- AUTH PACKET (Client -> Server) ---');
      console.log(`Packet: ${meta.name}`);
      console.log(`State: ${meta.state}`);
      console.log('Data:', JSON.stringify(data, null, 2));
      console.log('--------------------------------------');
    }

    if (target.state === mc.states.PLAY && meta.state === mc.states.PLAY) {
      target.write(meta.name, data);
    }
  });

  target.on('packet', (data, meta) => {
    if (meta.name.includes('auth') || 
        meta.name.includes('login') || 
        meta.name.includes('encryption') ||
        meta.name.includes('session') ||
        meta.name.includes('compress')) {
      console.log('\n--- AUTH PACKET (Server -> Client) ---');
      console.log(`Packet: ${meta.name}`);
      console.log(`State: ${meta.state}`);
      console.log('Data:', JSON.stringify(data, null, 2));
      console.log('--------------------------------------');
    }

    if (client.state === mc.states.PLAY && meta.state === mc.states.PLAY) {
      client.write(meta.name, data);
    }
  });

  client.on('end', () => {
    console.log(`Client ${client.username} disconnected`);
    target.end();
  });

  target.on('end', () => {
    console.log(`Target server disconnected for ${client.username}`);
    client.end('Server connection closed');
  });
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

server.on('listening', () => {
  console.log('Server ready for connections');
});
