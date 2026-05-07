import { View, Text, Input, Button, ScrollView, Image } from '@tarojs/components';
import Taro, { useLoad, useShareAppMessage } from '@tarojs/taro';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { callCloudFunctionWithTimeout } from '../../utils/cloud-call-function';
import { clearStashedPlayerRole, consumeStashedPlayerRole } from '../../utils/pending-role-bridge';
import { getNpcAvatar, getUserAvatar } from '../../assets/avatars/avatarMap';
import {
  getAfterOpeningIdleHintForStage,
  getIntentPromptHint,
  getScenarioTitle,
  resolveLoadingLines,
} from '../../config/scenarios';
import './stage.scss';

/** 需 ≤ 云函数控制台「超时时间」；云函数建议 ≥90s，此处与 120s 上限对齐，避免客户端先超时。 */
const CLOUD_CALL_TIMEOUT_MS = 120000;
const SHARE_BONUS_TIMEOUT_MS = 30000;
const STATE_SYNC_TIMEOUT_MS = 30000;
const TYPING_MS_PER_CHAR = 44;

const OPENING_GUIDE_ACTION =
  '【提示】请在输入框用中文描述行动；剧情会按「幕」逐段播放，点画面继续。';

/** 顶栏分享按钮文案：与「本局还可写…条行动」及说明弹窗一致 */
const SHARE_QUOTA_BTN_LABEL = '分享 +5 次行动';

function narrationGuideStorageKey(scenarioId: string): string {
  return `mud_narration_guide_${scenarioId}`;
}

/** 路由 isNew 在部分真机/基础库可能为数字或非字符串，不能仅用 === '1' */
function parseNewGameFlag(raw: unknown): boolean {
  if (raw === true || raw === 1) return true;
  const s = String(raw ?? '').trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes';
}

type LastInteractArgs = { text: string; isNew: boolean; sid: string };

function readNarrationGuideShown(scenarioId: string): boolean {
  try {
    const v = Taro.getStorageSync(narrationGuideStorageKey(scenarioId));
    return Boolean(v);
  } catch {
    return false;
  }
}

function writeNarrationGuideShown(scenarioId: string): void {
  try {
    Taro.setStorageSync(narrationGuideStorageKey(scenarioId), '1');
  } catch {
    /* ignore */
  }
}

/** 首幕旁白后拼接：代入感 + 操作提示 */
function buildOpeningGuideExtra(playerRoleLabel: string, npcName: string): string {
  const foe = (npcName || '当面对手').trim();
  const label = (playerRoleLabel || '').trim();
  if (label.startsWith('原创｜')) {
    const name = label.replace(/^原创｜\s*/, '').trim() || '你';
    return `\n\n你是「${name}」的原创身份，带着现世的认知与灵魂落在此局；乱世规矩与人心暗流，都会因你的选择而改变。\n\n${OPENING_GUIDE_ACTION}`;
  }
  if (label.startsWith('扮演｜')) {
    const who = label.replace(/^扮演｜\s*/, '').trim() || '这名武将';
    return `\n\n你正代入「${who}」的处境与立场，面对「${foe}」与变局；言行需合人物，但关键抉择仍在你手。\n\n${OPENING_GUIDE_ACTION}`;
  }
  return `\n\n${OPENING_GUIDE_ACTION}`;
}

export default function StagePage() {
  const scenarioId = useGameStore((s) => s.scenarioId);
  const intent = useGameStore((s) => s.intent);
  const scenes = useGameStore((s) => s.scenes);
  const currentSceneIndex = useGameStore((s) => s.currentSceneIndex);
  const playing = useGameStore((s) => s.playing);
  const loading = useGameStore((s) => s.loading);
  const hp = useGameStore((s) => s.hp);
  const rel = useGameStore((s) => s.rel);
  const round = useGameStore((s) => s.round);
  const npcName = useGameStore((s) => s.npcName);
  const playerRoleLabel = useGameStore((s) => s.playerRoleLabel);
  const intentQuotaGranted = useGameStore((s) => s.intentQuotaGranted);
  const intentQuotaRemaining = useGameStore((s) => s.intentQuotaRemaining);

  const setScenarioId = useGameStore((s) => s.setScenarioId);
  const setIntent = useGameStore((s) => s.setIntent);
  const setLoading = useGameStore((s) => s.setLoading);
  const applyInteractSuccess = useGameStore((s) => s.applyInteractSuccess);
  const applyCloudStateOnly = useGameStore((s) => s.applyCloudStateOnly);
  const resetScenes = useGameStore((s) => s.resetScenes);
  const nextScene = useGameStore((s) => s.nextScene);
  const replayScenesFromStart = useGameStore((s) => s.replayScenesFromStart);
  const [imageFailedMap, setImageFailedMap] = useState<Record<string, boolean>>({});
  const [displayedText, setDisplayedText] = useState('');
  const [typingDone, setTypingDone] = useState(false);
  const [phase, setPhase] = useState<'enter' | 'exit'>('enter');
  const [loadingLineIx, setLoadingLineIx] = useState(0);
  const [showOpeningGuide, setShowOpeningGuide] = useState(false);

  const lastInteractRef = useRef<LastInteractArgs | null>(null);
  const currentScene = scenes[currentSceneIndex];
  const isAtLastScene = playing && scenes.length > 0 && currentSceneIndex === scenes.length - 1;
  const lastSceneInputReady = isAtLastScene && typingDone && !loading;
  const intentExhausted = intentQuotaRemaining <= 0;
  const inputLocked =
    loading || (playing && !lastSceneInputReady) || (lastSceneInputReady && intentExhausted);

  useShareAppMessage(() => {
    const sid = useGameStore.getState().scenarioId;
    const title = getScenarioTitle(sid);
    void (async () => {
      try {
        const res = await callCloudFunctionWithTimeout({
          name: 'interact',
          data: { scenarioId: sid, action: 'intentShareBonus' },
          timeoutMs: SHARE_BONUS_TIMEOUT_MS,
        });
        const r = res.result as Record<string, unknown>;
        const st = r.state as Record<string, unknown> | undefined;
        if (st && typeof st === 'object') {
          useGameStore.getState().applyCloudStateOnly(st);
        }
        if (r.success === false) {
          Taro.showToast({ title: String(r.message ?? '领取失败'), icon: 'none' });
          return;
        }
        Taro.showToast({ title: '已增加 5 次行动', icon: 'success' });
      } catch {
        Taro.showToast({ title: '网络异常', icon: 'none' });
      }
    })();
    return {
      title: `${title} · 文字剧情`,
      path: `/pages/index/index?scenarioId=${encodeURIComponent(sid)}`,
    };
  });

  const scenarioTitle = useMemo(() => getScenarioTitle(scenarioId), [scenarioId]);
  const loadingLines = useMemo(
    () => resolveLoadingLines(scenarioId, npcName, scenarioTitle),
    [npcName, scenarioId, scenarioTitle]
  );

  useEffect(() => {
    if (!loading) {
      setLoadingLineIx(0);
      return;
    }
    const lines = loadingLines;
    const len = lines.length;
    const start = len > 1 ? Math.floor(Math.random() * len) : 0;
    setLoadingLineIx(start);
    const id = setInterval(() => {
      setLoadingLineIx((i) => {
        const max = len - 1;
        return i >= max ? max : i + 1;
      });
    }, 2000);
    return () => clearInterval(id);
  }, [loading, loadingLines]);

  const loadingMessage =
    loadingLines[Math.min(loadingLineIx, Math.max(0, loadingLines.length - 1))] ??
    '片场还在把戏码顺一顺，马上接你的下一句…';

  const callInteract = useCallback(
    async (text: string, isNew: boolean, sid: string) => {
      lastInteractRef.current = { text, isNew, sid };
      setLoading(true);
      try {
        const data: Record<string, unknown> = { scenarioId: sid, intent: text, isNew };
        if (isNew) {
          let pending = useGameStore.getState().pendingPlayerRoleProfile;
          if (!pending) {
            pending = consumeStashedPlayerRole();
          } else {
            clearStashedPlayerRole();
          }
          if (pending) data.playerRoleProfile = pending;
        }
        const res = await callCloudFunctionWithTimeout({
          name: 'interact',
          data,
          timeoutMs: CLOUD_CALL_TIMEOUT_MS,
        });
        const r = res.result as Record<string, unknown>;
        if (r.success === false) {
          const st = r.state as Record<string, unknown> | undefined;
          if (st && typeof st === 'object') {
            useGameStore.getState().applyCloudStateOnly(st);
          }
          Taro.showToast({ title: String(r.message ?? '失败'), icon: 'none' });
          return;
        }
        applyInteractSuccess(text, r);
        if (isNew) useGameStore.getState().clearPendingPlayerRoleProfile();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const isTimeout = msg.toLowerCase().includes('timeout');
        const title = isTimeout ? '响应超时' : '网络异常';
        const content = isTimeout
          ? '生成较慢或网络不稳，可检查网络后重试。'
          : '连接异常，请稍后重试。';
        Taro.showModal({
          title,
          content,
          confirmText: '重试',
          cancelText: '取消',
          success: (modal) => {
            if (modal.confirm && lastInteractRef.current) {
              const { text: t, isNew: n, sid: s } = lastInteractRef.current;
              void callInteract(t, n, s);
            }
          },
        });
      } finally {
        setLoading(false);
      }
    },
    [applyInteractSuccess, setLoading]
  );

  useLoad((opts) => {
    const routerP = (Taro.getCurrentInstance()?.router?.params ?? {}) as Record<string, unknown>;
    const q = { ...routerP, ...((opts ?? {}) as Record<string, unknown>) };
    const sid = typeof q.scenarioId === 'string' && q.scenarioId ? q.scenarioId : 'hulaguan';
    const isNew = parseNewGameFlag(q.isNew);
    if (!isNew) {
      setLoading(true);
    }
    setScenarioId(sid);
    resetScenes();
    if (isNew) {
      setShowOpeningGuide(!readNarrationGuideShown(sid));
    } else {
      setShowOpeningGuide(false);
    }
    if (isNew) {
      void callInteract('', true, sid);
      return;
    }
    void (async () => {
      try {
        const res = await callCloudFunctionWithTimeout({
          name: 'interact',
          data: { scenarioId: sid, action: 'getStateOnly' },
          timeoutMs: STATE_SYNC_TIMEOUT_MS,
        });
        const r = res.result as Record<string, unknown>;
        const st = r.state as Record<string, unknown> | undefined;
        if (st && typeof st === 'object') {
          useGameStore.getState().applyCloudStateOnly(st);
        }
        if (r.success === false) {
          Taro.showToast({ title: String(r.message ?? '读取进度失败'), icon: 'none' });
        }
      } catch {
        Taro.showToast({ title: '同步进度失败', icon: 'none' });
      } finally {
        setLoading(false);
      }
    })();
  });

  const onSend = () => {
    if (!intent.trim() || inputLocked) return;
    if (intentQuotaRemaining <= 0) {
      Taro.showModal({
        title: '行动次数已用尽',
        content: `本局「发送」次数已用完。请点击右上角「${SHARE_QUOTA_BTN_LABEL}」通过微信分享；分享成功后由服务端为本局增加 5 次行动（具体以服务端结果为准）。`,
        showCancel: false,
        confirmText: '知道了',
      });
      return;
    }
    void callInteract(intent.trim(), false, scenarioId);
  };

  const onQuotaHelpTap = useCallback(() => {
    Taro.showModal({
      title: '行动次数说明',
      content: `「行动次数」是本局你在输入框写好意图后、可点击「发送」的次数，与剧情回合数不是同一概念。需要更多次数时，请点击右上角「${SHARE_QUOTA_BTN_LABEL}」发起微信分享；分享流程完成后，服务端通常会为本局增加 5 次（以实际返回为准）。新开一局会重新计数。`,
      showCancel: false,
      confirmText: '知道了',
    });
  }, []);

  const intentPlaceholder = useMemo(
    () => `例如：先试探${(npcName || '对方').trim()}语气，再观察周遭动静`,
    [npcName]
  );

  const userAvatar = useMemo(() => getUserAvatar(), []);

  const displaySceneContent = useMemo(() => {
    if (!currentScene) return '';
    const base = currentScene.content;
    if (
      showOpeningGuide &&
      playing &&
      currentSceneIndex === 0 &&
      currentScene.type === 'narration' &&
      scenes[0]?.type === 'narration'
    ) {
      return `${base}${buildOpeningGuideExtra(playerRoleLabel, npcName)}`;
    }
    return base;
  }, [currentScene, currentSceneIndex, npcName, playerRoleLabel, playing, scenes, showOpeningGuide]);

  /** 末幕打字完成且非 loading：可输入；开局后若干回合叠加氛围引导（专有或通用） */
  const afterOpeningScenarioHint = useMemo(
    () =>
      lastSceneInputReady && round >= 2 && round <= 4 ? getAfterOpeningIdleHintForStage(scenarioId) : undefined,
    [lastSceneInputReady, round, scenarioId]
  );
  const roundEndIntentHint = useMemo(
    () => (lastSceneInputReady ? getIntentPromptHint(scenarioId, npcName, round) : ''),
    [lastSceneInputReady, npcName, scenarioId, round]
  );

  useEffect(() => {
    if (!showOpeningGuide || !playing || scenes.length === 0) return;
    if (scenes[0].type !== 'narration') {
      writeNarrationGuideShown(scenarioId);
      setShowOpeningGuide(false);
    }
  }, [playing, scenes, scenarioId, showOpeningGuide]);

  useEffect(() => {
    if (!showOpeningGuide || !playing) return;
    if (currentSceneIndex >= 1) {
      writeNarrationGuideShown(scenarioId);
      setShowOpeningGuide(false);
    }
  }, [currentSceneIndex, playing, scenarioId, showOpeningGuide]);

  useEffect(() => {
    try {
      if (round <= 0 && scenes.length === 0) return;
      Taro.setStorageSync(
        `mud_local_progress_${scenarioId}`,
        JSON.stringify({ round, hp, rel, npcName, savedAt: Date.now() })
      );
    } catch {
      /* ignore */
    }
  }, [round, hp, rel, npcName, scenarioId, scenes.length]);

  useEffect(() => {
    setPhase('enter');
    if (!currentScene) {
      setDisplayedText('');
      setTypingDone(true);
      return;
    }
    setDisplayedText('');
    setTypingDone(false);
    const full = displaySceneContent;
    let idx = 0;
    const timer = setInterval(() => {
      idx += 1;
      setDisplayedText(full.slice(0, idx));
      if (idx >= full.length) {
        clearInterval(timer);
        setTypingDone(true);
      }
    }, TYPING_MS_PER_CHAR);
    return () => clearInterval(timer);
  }, [currentSceneIndex, currentScene?.content, displaySceneContent]);

  const markAvatarFailed = useCallback((key: string) => {
    setImageFailedMap((prev) => ({ ...prev, [key]: true }));
  }, []);

  const onSceneTap = useCallback(() => {
    if (!playing || !currentScene) return;
    if (!typingDone) return;
    const atLast = scenes.length > 0 && currentSceneIndex === scenes.length - 1;
    if (atLast) return;
    setPhase('exit');
    setTimeout(() => {
      nextScene();
    }, 220);
  }, [currentScene, currentSceneIndex, nextScene, playing, scenes.length, typingDone]);

  const onReplayTap = useCallback((e: { stopPropagation?: () => void }) => {
    e.stopPropagation?.();
    replayScenesFromStart();
    setPhase('enter');
  }, [replayScenesFromStart]);

  return (
    <View className="st">
      <View className="st__bar">
        <View className="st__barLeft">
          <Text className="st__barLine">剧情进度 · 第 {round} 回合</Text>
          <View className="st__quotaLine">
            <Text className="st__barLine st__barLine--sub">
              本局还可写 {intentQuotaRemaining} / {intentQuotaGranted} 条行动
            </Text>
            <Button className="st__quotaHelpBtn" size="mini" onClick={onQuotaHelpTap}>
              ?
            </Button>
          </View>
        </View>
        <Text className="st__barItem st__barItem--center">{playerRoleLabel || '未选择身份'}</Text>
        <Button className="st__shareBtn" size="mini" openType="share">
          {SHARE_QUOTA_BTN_LABEL}
        </Button>
      </View>
      <View className="st__sceneHost">
        {loading ? (
          <View className="st__loadingOverlay">
            <Text className="st__loadingKicker">片场筹备中</Text>
            <View className="st__spinner" />
            <Text className="st__loadingText">{loadingMessage}</Text>
          </View>
        ) : null}
        {playing && currentScene ? (
          <View
            className={`scene scene--${currentScene.type} ${
              currentScene.type === 'dialogue'
                ? currentScene.speaker === '你'
                  ? 'scene--user'
                  : 'scene--npc'
                : ''
            } ${phase}`}
            onClick={onSceneTap}
          >
            {currentScene.type === 'dialogue' ? (
              <View
                className={`scene__dialogue ${currentScene.speaker === '你' ? 'scene__dialogue--user' : 'scene__dialogue--npc'}`}
              >
                {(() => {
                  const speaker = currentScene.speaker ?? npcName;
                  const avatar = speaker === '你' ? userAvatar : getNpcAvatar(speaker);
                  const avatarKey = `scene-${speaker}`;
                  const imageBroken = imageFailedMap[avatarKey] || !avatar.src;
                  return (
                    <>
                      <View className="st__avatarWrap">
                        {!imageBroken ? (
                          <Image
                            className="st__avatar"
                            src={avatar.src}
                            mode="aspectFill"
                            lazyLoad
                            onError={() => markAvatarFailed(avatarKey)}
                          />
                        ) : (
                          <View className="st__avatarFallback">
                            <Text>{avatar.fallbackText}</Text>
                          </View>
                        )}
                      </View>
                      <View className="scene__bubble">
                        <Text className="st__speaker">{speaker}：</Text>
                        <Text>{displayedText}</Text>
                      </View>
                    </>
                  );
                })()}
              </View>
            ) : (
              <View className="scene__center">
                <Text>{displayedText}</Text>
              </View>
            )}
            <Text
              className={`scene__hint ${isAtLastScene && typingDone ? 'scene__hint--lastReady' : ''}`}
            >
              第 {currentSceneIndex + 1}/{scenes.length} 幕 ·{' '}
              {isAtLastScene
                ? typingDone
                  ? '这一幕演完了：到下面写下一句「你想做什么」'
                  : '这一幕还在放映…'
                : typingDone
                  ? '点一下画面，看下一句'
                  : '这一幕还在放映…'}
            </Text>
            {typingDone && currentSceneIndex === scenes.length - 1 ? (
              <Button className="scene__replayBtn" size="mini" onClick={onReplayTap}>
                回放
              </Button>
            ) : null}
          </View>
        ) : (
          <ScrollView className="st__scroll" scrollY>
            <View className="st__scrollInner">
              <View className="st__msg st__msg--narration st__msg--idleColumn">
                <Text className="st__msgNarration st__msgNarration--idleTail">
                  这里还没有接上剧情胶片。请从首页开一局，或稍等本页加载完成。
                </Text>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
      {lastSceneInputReady && roundEndIntentHint ? (
        <View className="st__intentGuide">
          <Text className="st__intentGuideTag">下一步建议</Text>
          {afterOpeningScenarioHint ? (
            <Text className="st__intentGuideLead">{afterOpeningScenarioHint}</Text>
          ) : null}
          <Text className="st__intentGuideSub">{roundEndIntentHint}</Text>
        </View>
      ) : null}
      <View className="st__inputRow">
        <Input
          className="st__input"
          value={intent}
          onInput={(e) => setIntent(e.detail.value)}
          placeholder={intentPlaceholder}
          disabled={inputLocked}
        />
        <Button className="st__send" type="primary" size="mini" disabled={inputLocked} onClick={onSend}>
          发送
        </Button>
      </View>
    </View>
  );
}
