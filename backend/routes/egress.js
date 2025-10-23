// routes/egress.js
/* eslint-disable no-console */
// ------------------------------------------------------
// LiveKit Egress 操作用エンドポイント群（堅牢化版）
//
// ポイント:
// - /egress/stop は ACTIVE/STARTING を優先停止。見つからなくても
//   直近が ENDING/COMPLETE なら 200（alreadyComplete=true）で成功扱い。
// - 複数同時Egressがあっても最新を停止（all=trueで全停止）
// - listEgress() の結果は Cloud 全件→ルームで絞り込み
// - インメモリ記録（egressStore）は補助。実態は LiveKit で照合
// - /egress/finishRoom は “停止要求を投げて即返す”。確定は webhook の egress_ended で。
// ------------------------------------------------------

const express = require('express');
const router = express.Router();
const { EgressClient } = require('livekit-server-sdk');

const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  console.warn('[egress] LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET が未設定の可能性があります。');
}

const lk = new EgressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

// 補助メモリ（任意）
const egressStore = new Map();

// ---- helpers ----
function isActiveStatus(s) {
  // ENDING も「生きてる」に含めて扱いやすくする
  return s === 'EGRESS_STARTING' || s === 'EGRESS_ACTIVE' || s === 'EGRESS_ENDING';
}

function cmpDescByStartedAt(a, b) {
  const ta = new Date(a.startedAt || 0).getTime();
  const tb = new Date(b.startedAt || 0).getTime();
  return tb - ta; // 新しい順
}

async function listByRoom(roomName) {
  const list = await lk.listEgress(); // Cloud は全件返る → こちらで絞る
  return (list.items || []).filter((it) => it.roomName === roomName);
}

async function listActiveForRoom(roomName) {
  return (await listByRoom(roomName))
    .filter((it) => isActiveStatus(it.status))
    .sort(cmpDescByStartedAt);
}

// ------------------------------------------------------
// POST /api/egress/start
// body: { roomName, mode="audio", layout="grid", prefix="", audioFormat="ogg" }
// ------------------------------------------------------
router.post('/egress/start', async (req, res) => {
  try {
    const {
      roomName,
      mode = 'audio',
      layout = 'grid',
      prefix = '',
      audioFormat = 'ogg',
    } = req.body || {};

    if (!roomName) return res.status(400).json({ error: 'roomName is required' });

    // サービス層は既存の実装を利用
    const { startRoomCompositeEgress } = require('../services/livekitEgress');
    const { egressId } = await startRoomCompositeEgress({
      roomName, mode, layout, prefix, audioFormat,
    });

    // 補助保存
    const now = new Date().toISOString();
    const rec = egressStore.get(roomName) || { history: [] };
    rec.current = { egressId, mode, layout, audioFormat, startedAt: now };
    rec.history.push(rec.current);
    egressStore.set(roomName, rec);

    res.json({ ok: true, egressId });
  } catch (e) {
    console.error('[egress/start] error', e);
    res.status(500).json({ error: 'failed to start egress', details: String(e?.message || e) });
  }
});

// ------------------------------------------------------
// GET /api/egress/active?roomName=...
// そのルームの “生きてる or 終了中(ENDING)” egress を新しい順で返す
// ------------------------------------------------------
router.get('/egress/active', async (req, res) => {
  try {
    const { roomName } = req.query;
    if (!roomName) return res.status(400).json({ error: 'roomName required' });

    const items = await listActiveForRoom(roomName);
    const mapped = items.map((it) => ({
      egressId: it.egressId,
      roomName: it.roomName,
      status: it.status, // EGRESS_STARTING / EGRESS_ACTIVE / EGRESS_ENDING / ...
      startedAt: it.startedAt?.toISOString?.() || it.startedAt,
      endedAt: it.endedAt?.toISOString?.() || it.endedAt,
      fileResults: it.fileResults ?? null,
    }));
    res.json({ roomName, items: mapped });
  } catch (e) {
    console.error('[egress/active] error', e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// ------------------------------------------------------
// POST /api/egress/stop
// body: { egressId?: string, roomName?: string, all?: boolean }
// 優先: egressId。無ければ roomName で解決。
// - all=true なら STARTING/ACTIVE/ENDING を全停止
// - all=false（既定）なら「最新の1件だけ」停止
//
// ★堅牢化ポイント:
//  - ACTIVE/STARTING が無くても、直近が ENDING/COMPLETE なら 200（alreadyComplete=true）で成功扱い
//  - それ以外で見つからなければ 409（互換のため）
// ------------------------------------------------------
router.post('/egress/stop', async (req, res) => {
  try {
    const { roomName, egressId, all = false } = req.body || {};
    let targetIds = [];

    if (egressId) {
      // ID 直指定
      targetIds = [egressId];
    } else {
      if (!roomName) {
        return res.status(400).json({ error: 'egressId or roomName required' });
      }
      const allByRoom = await listByRoom(roomName);
      // まずは「生きてる（ENDING含む）」を新しい順で抽出
      const live = allByRoom.filter((it) => isActiveStatus(it.status)).sort(cmpDescByStartedAt);

      if (live.length > 0) {
        targetIds = all ? live.map((it) => it.egressId) : [live[0].egressId];
      } else {
        // ACTIVE/STARTING/ENDING が1つも無い → 直近が ENDING/COMPLETE なら成功扱いで返す
        const last = [...allByRoom].sort(cmpDescByStartedAt)[0];
        if (last && (last.status === 'EGRESS_ENDING' || last.status === 'EGRESS_COMPLETE')) {
          return res.json({ ok: true, egressId: last.egressId, alreadyComplete: true });
        }
      }
    }

    if (targetIds.length === 0) {
      return res.status(409).json({ error: 'no active egress for the room' });
    }

    const stopped = [];
    for (const id of targetIds) {
      try {
        await lk.stopEgress(id);
        stopped.push(id);
      } catch (e) {
        // すでに ENDING/COMPLETE で止められない等は握り、次へ
        console.warn('[egress/stop] stop failed', id, e?.message || e);
      }
    }

    // 補助ストアの current を終了マーク（あるなら）
    if (req.body.roomName && egressStore.get(req.body.roomName)?.current) {
      const cur = egressStore.get(req.body.roomName).current;
      if (stopped.includes(cur.egressId)) {
        egressStore.get(req.body.roomName).current.stoppedAt = new Date().toISOString();
      }
    }

    return res.json({ ok: true, stoppedIds: stopped });
  } catch (e) {
    console.error('[egress/stop] error', e);
    return res.status(500).json({ error: 'failed to stop egress', details: String(e?.message || e) });
  }
});

// ------------------------------------------------------
// POST /api/egress/finishRoom
// body: { roomName: string, all?: boolean }
// - 与えられた roomName の “生きている(STARTING/ACTIVE/ENDING)” Egress を停止要求
// - 完了は待たない（Webhook の egress_ended で最終確定）
// - ACTIVE 系が無く、直近が ENDING/COMPLETE なら 200 alreadyComplete
// ------------------------------------------------------
router.post('/egress/finishRoom', async (req, res) => {
  try {
    const { roomName, all = true } = req.body || {};
    if (!roomName) {
      return res.status(400).json({ error: 'roomName is required' });
    }

    // そのルームの Egress を一覧
    const allByRoom = await listByRoom(roomName);

    // まずは「生きている（ENDING含む）」を新しい順で抽出
    const live = allByRoom.filter((it) => isActiveStatus(it.status)).sort(cmpDescByStartedAt);

    if (live.length === 0) {
      // ACTIVE/STARTING/ENDING が無い → 直近が ENDING/COMPLETE なら成功扱いで返す
      const last = [...allByRoom].sort(cmpDescByStartedAt)[0];
      if (last && (last.status === 'EGRESS_ENDING' || last.status === 'EGRESS_COMPLETE')) {
        return res.json({ ok: true, alreadyComplete: true, egressId: last.egressId });
      }
      // 何も無い（録音未開始等）
      return res.json({ ok: true, alreadyComplete: true });
    }

    // 停止対象: all=true なら全部、false なら最新1件
    const targetIds = all ? live.map((it) => it.egressId) : [live[0].egressId];

    // ★ 完了を待たず “要求だけ” 投げてすぐ返す
    const results = await Promise.all(targetIds.map(async (id) => {
      try { await lk.stopEgress(id); return { id, ok: true }; }
      catch (e) { console.warn('[finishRoom] stop failed', id, e?.message || e); return { id, ok: false, error: String(e?.message || e) }; }
    }));

    const stoppedIds = results.filter(r => r.ok).map(r => r.id);
    const failed = results.filter(r => !r.ok);

    return res.json({
      ok: true,
      roomName,
      stoppedIds,
      failed,
      note: 'Stop requested; completion will be notified via webhook (egress_ended).'
    });
  } catch (e) {
    console.error('[egress/finishRoom] error', e);
    return res.status(500).json({ error: 'failed to finish room egress', details: String(e?.message || e) });
  }
});

// ------------------------------------------------------
// GET /api/egress/status?roomName=...
// インメモリ記録 + LiveKit 実勢を返す
// ------------------------------------------------------
router.get('/egress/status', async (req, res) => {
  try {
    const { roomName } = req.query;
    if (!roomName) return res.status(400).json({ error: 'roomName required' });

    const mem = egressStore.get(roomName) || { current: null, history: [] };
    const list = await lk.listEgress();
    const cloud = (list.items || []).filter((it) => it.roomName === roomName);

    res.json({
      memory: mem,
      livekit: cloud.map((it) => ({
        egressId: it.egressId,
        roomName: it.roomName,
        status: it.status,              // EGRESS_STARTING / EGRESS_ACTIVE / EGRESS_ENDING / EGRESS_COMPLETE / EGRESS_FAILED
        startedAt: it.startedAt?.toISOString?.() || it.startedAt,
        endedAt: it.endedAt?.toISOString?.() || it.endedAt,
        fileResults: it.fileResults || null,
      })),
    });
  } catch (e) {
    console.error('[egress/status] error', e);
    res.status(500).json({ error: String(e) });
  }
});

module.exports = router;
