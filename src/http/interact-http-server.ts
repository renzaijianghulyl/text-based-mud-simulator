/**
 * 本地 HTTP 入口：文件会话 + 引擎 `process`，无微信依赖。默认仅绑定 127.0.0.1，请勿直接暴露公网。
 */
import 'dotenv/config';
import * as http from 'http';
import { process as engineProcess } from '../engine/engine';
import { OPENING_ROUND_INTENT } from '../engine/opening-intent';
import { SessionNotFoundError } from '../errors';
import { getDefaultFileSessionStore } from '../sessions/file-session-store';
import type { PlayerRoleProfile, Session } from '../types';

const HOST = process.env.HTTP_INTERACT_HOST?.trim() || '127.0.0.1';
const PORT = Number(process.env.HTTP_INTERACT_PORT || '8787');

function serializeState(session: Session): Record<string, unknown> {
  return {
    player: session.player,
    playerRoleProfile: session.playerRoleProfile,
    npcs: session.npcs,
    relationships: session.relationships,
    currentRound: session.currentRound,
    scenarioId: session.scenarioId,
    cumulativeState: session.cumulativeState,
  };
}

function sanitizePlayerRoleProfile(input: unknown): PlayerRoleProfile | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const profile = input as Record<string, unknown>;
  const mode = typeof profile.mode === 'string' ? profile.mode : '';
  if (mode === 'oc') {
    const name = typeof profile.name === 'string' ? profile.name.trim() : '';
    const background = typeof profile.background === 'string' ? profile.background.trim() : '';
    if (!name || !background) return undefined;
    return { mode: 'oc', name, background };
  }
  if (mode === 'general') {
    const generalName = typeof profile.generalName === 'string' ? profile.generalName.trim() : '';
    if (!generalName) return undefined;
    return { mode: 'general', generalName };
  }
  return undefined;
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload, 'utf-8'),
  });
  res.end(payload);
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c as Buffer));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

interface InteractBody {
  userId?: string;
  scenarioId?: string;
  intent?: string;
  isNew?: boolean;
  npcId?: string;
  playerRoleProfile?: unknown;
}

async function handleInteract(body: InteractBody): Promise<{ status: number; payload: Record<string, unknown> }> {
  const userId = typeof body.userId === 'string' && body.userId.trim() ? body.userId.trim() : '';
  const scenarioId =
    typeof body.scenarioId === 'string' && body.scenarioId.trim() ? body.scenarioId.trim() : 'hulaguan';
  if (!userId) {
    return { status: 400, payload: { success: false, code: 'BAD_REQUEST', message: '缺少 userId' } };
  }

  const store = getDefaultFileSessionStore();

  if (body.isNew) {
    const playerRoleProfile = sanitizePlayerRoleProfile(body.playerRoleProfile);
    await store.deleteSession(userId, scenarioId).catch(() => undefined);
    const session = store.buildDemoSession(userId, scenarioId, body.npcId, playerRoleProfile);
    await store.saveSession(session);
    const loaded = await store.loadSession(userId, scenarioId);
    const result = await engineProcess(loaded, OPENING_ROUND_INTENT);
    await store.saveSession(result.state);
    return {
      status: 200,
      payload: {
        success: true,
        code: 'OK',
        narration: result.narration,
        dialogue: result.dialogue,
        scenes: result.scenes ?? [],
        changes: result.changes,
        state: serializeState(result.state),
      },
    };
  }

  const intent = typeof body.intent === 'string' ? body.intent : '';
  if (!intent.trim()) {
    return { status: 400, payload: { success: false, code: 'BAD_REQUEST', message: '缺少 intent（或设置 isNew 以新开局）' } };
  }

  try {
    const session = await store.loadSession(userId, scenarioId);
    const result = await engineProcess(session, intent);
    await store.saveSession(result.state);
    return {
      status: 200,
      payload: {
        success: true,
        code: 'OK',
        narration: result.narration,
        dialogue: result.dialogue,
        scenes: result.scenes ?? [],
        changes: result.changes,
        state: serializeState(result.state),
      },
    };
  } catch (e) {
    if (e instanceof SessionNotFoundError) {
      return {
        status: 404,
        payload: { success: false, code: 'SESSION_NOT_FOUND', message: '会话不存在，请先 isNew 新开或检查 userId/scenarioId' },
      };
    }
    throw e;
  }
}

async function handleSessionExists(
  body: InteractBody
): Promise<{ status: number; payload: Record<string, unknown> }> {
  const userId = typeof body.userId === 'string' && body.userId.trim() ? body.userId.trim() : '';
  const scenarioId =
    typeof body.scenarioId === 'string' && body.scenarioId.trim() ? body.scenarioId.trim() : 'hulaguan';
  if (!userId) {
    return { status: 400, payload: { success: false, code: 'BAD_REQUEST', message: '缺少 userId' } };
  }
  const exists = await getDefaultFileSessionStore().sessionExists(userId, scenarioId);
  return { status: 200, payload: { success: true, code: 'OK', exists } };
}

function setCors(res: http.ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const server = http.createServer(async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
      sendJson(res, 200, {
        ok: true,
        service: 'text-rpg-interact-http',
        endpoints: ['POST /v1/interact', 'POST /v1/session/exists'],
      });
      return;
    }

    if (req.method === 'POST' && (req.url === '/v1/interact' || req.url === '/interact')) {
      const raw = await readBody(req);
      let body: InteractBody = {};
      try {
        body = raw ? (JSON.parse(raw) as InteractBody) : {};
      } catch {
        sendJson(res, 400, { success: false, code: 'BAD_REQUEST', message: 'JSON 解析失败' });
        return;
      }
      const { status, payload } = await handleInteract(body);
      sendJson(res, status, payload);
      return;
    }

    if (req.method === 'POST' && req.url === '/v1/session/exists') {
      const raw = await readBody(req);
      let body: InteractBody = {};
      try {
        body = raw ? (JSON.parse(raw) as InteractBody) : {};
      } catch {
        sendJson(res, 400, { success: false, code: 'BAD_REQUEST', message: 'JSON 解析失败' });
        return;
      }
      const { status, payload } = await handleSessionExists(body);
      sendJson(res, status, payload);
      return;
    }

    sendJson(res, 404, { success: false, code: 'NOT_FOUND', message: '未知路径' });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    sendJson(res, 500, { success: false, code: 'INTERNAL', message });
  }
});

server.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`[http-interact] http://${HOST}:${PORT}  (POST /v1/interact)`);
});
