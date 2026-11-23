import { DurableObject } from 'cloudflare:workers';

const MAX_COMETS = 40;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/github') return receivePush(request, env);
    if (url.pathname === '/api/comets') {
      if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
      return sky(env).fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};

function sky(env) {
  return env.SKY.get(env.SKY.idFromName('sky'));
}

async function receivePush(request, env) {
  if (request.method !== 'POST') return new Response(null, { status: 405 });
  const body = await request.text();
  if (!(await signedByGitHub(body, request.headers.get('X-Hub-Signature-256'), env.GITHUB_WEBHOOK_SECRET))) {
    return new Response('Bad signature', { status: 401 });
  }
  if (request.headers.get('X-GitHub-Event') !== 'push') return new Response(null, { status: 204 });

  const push = JSON.parse(body);
  if (push.repository.private || push.deleted || !push.head_commit) return new Response(null, { status: 204 });

  const [title, ...rest] = push.head_commit.message.split('\n');
  const count = push.commits.length;
  await sky(env).add({
    id: push.after,
    repo: push.repository.full_name,
    name: push.repository.name,
    branch: push.ref.replace('refs/heads/', ''),
    title: title.slice(0, 120),
    line: count > 1 ? `${count} commits` : rest.find((l) => l.trim() && !/^[\w-]+: /.test(l))?.trim().slice(0, 160) ?? '',
    url: count > 1 ? push.compare : push.head_commit.url,
    at: new Date().toISOString(),
  });
  return new Response(null, { status: 204 });
}

async function signedByGitHub(body, header, secret) {
  if (!secret || !header?.startsWith('sha256=')) return false;
  const hex = header.slice('sha256='.length);
  if (!/^[0-9a-f]{64}$/.test(hex)) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const signature = Uint8Array.from(hex.match(/../g), (b) => parseInt(b, 16));
  return crypto.subtle.verify('HMAC', key, signature, new TextEncoder().encode(body));
}

export class Sky extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async fetch() {
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    server.send(JSON.stringify({ comets: await this.recent() }));
    return new Response(null, { status: 101, webSocket: client });
  }

  async recent() {
    return (await this.ctx.storage.get('comets')) ?? [];
  }

  async add(comet) {
    const comets = [comet, ...(await this.recent()).filter((c) => c.id !== comet.id)].slice(0, MAX_COMETS);
    await this.ctx.storage.put('comets', comets);
    const message = JSON.stringify({ comets: [comet] });
    for (const ws of this.ctx.getWebSockets()) ws.send(message);
  }
}
