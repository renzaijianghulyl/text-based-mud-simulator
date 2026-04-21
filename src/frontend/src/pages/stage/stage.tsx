import { View, Text, Input, Button, ScrollView } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useCallback, useState } from 'react';
import './stage.scss';

type Msg = { role: 'user' | 'narration' | 'dialogue'; text: string };
/** 需 ≤ 云函数控制台「超时时间」；云函数建议 ≥90s，此处与 120s 上限对齐，避免客户端先超时。 */
const CLOUD_CALL_TIMEOUT_MS = 120000;

const QUICK: { label: string; value: string }[] = [
  { label: '攻击', value: '挥刀攻向敌将' },
  { label: '对话', value: '上前搭话，试探口风' },
  { label: '投降', value: '我愿投降' },
  { label: '逃跑', value: '转身撤退' },
];

export default function StagePage() {
  const [scenarioId, setScenarioId] = useState('hulaguan');
  const [intent, setIntent] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [hp, setHp] = useState(100);
  const [maxHp, setMaxHp] = useState(100);
  const [rel, setRel] = useState(0);
  const [round, setRound] = useState(0);
  const [npcName, setNpcName] = useState('吕布');

  const callInteract = useCallback(
    async (text: string, isNew: boolean, sid: string) => {
      setLoading(true);
      try {
        const res = await Taro.cloud.callFunction({
          name: 'interact',
          data: { scenarioId: sid, intent: text, isNew },
          config: { timeout: CLOUD_CALL_TIMEOUT_MS },
        });
        const r = res.result as Record<string, unknown>;
        if (r.success === false) {
          Taro.showToast({ title: String(r.message ?? '失败'), icon: 'none' });
          return;
        }
        if (text.trim()) {
          setMessages((m) => [...m, { role: 'user', text }]);
        }
        if (typeof r.narration === 'string' && r.narration.length > 0) {
          setMessages((m) => [...m, { role: 'narration', text: r.narration as string }]);
        }
        if (typeof r.dialogue === 'string' && r.dialogue.length > 0) {
          setMessages((m) => [...m, { role: 'dialogue', text: r.dialogue as string }]);
        }
        const st = r.state as Record<string, unknown> | undefined;
        if (st?.player) {
          const p = st.player as { hp: number; maxHp: number };
          setHp(p.hp);
          setMaxHp(p.maxHp);
        }
        if (st?.npcs) {
          const cur = (st.npcs as { current: { name: string; relationship: number } }).current;
          setNpcName(cur.name);
          setRel(cur.relationship);
        }
        if (st?.currentRound !== undefined) {
          setRound(Number(st.currentRound));
        }
        setIntent('');
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const friendly = msg.toLowerCase().includes('timeout')
          ? '响应超时，请重试'
          : '网络异常，请稍后重试';
        Taro.showToast({ title: friendly, icon: 'none' });
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useLoad(() => {
    const p = Taro.getCurrentInstance().router?.params ?? {};
    const sid = typeof p.scenarioId === 'string' ? p.scenarioId : 'hulaguan';
    const isNew = p.isNew === '1' || p.isNew === 'true';
    setScenarioId(sid);
    if (isNew) {
      void callInteract('', true, sid);
    }
  });

  const onSend = () => {
    if (!intent.trim() || loading) return;
    void callInteract(intent.trim(), false, scenarioId);
  };

  return (
    <View className="st">
      <View className="st__bar">
        <Text className="st__barItem">HP {hp}/{maxHp}</Text>
        <Text className="st__barItem">与{npcName} {rel}</Text>
        <Text className="st__barItem">轮次 {round}</Text>
      </View>
      <ScrollView className="st__scroll" scrollY>
        <View className="st__scrollInner">
          {messages.map((msg, i) => (
            <View key={i} className={`st__msg st__msg--${msg.role}`}>
              <Text>{msg.text}</Text>
            </View>
          ))}
          {loading ? (
            <View className="st__msg st__msg--loading">
              <Text>生成中…</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
      <View className="st__quick">
        {QUICK.map((q) => (
          <Button
            key={q.value}
            className="st__quickBtn"
            size="mini"
            disabled={loading}
            onClick={() => {
              setIntent(q.value);
              void callInteract(q.value, false, scenarioId);
            }}
          >
            {q.label}
          </Button>
        ))}
      </View>
      <View className="st__inputRow">
        <Input
          className="st__input"
          value={intent}
          onInput={(e) => setIntent(e.detail.value)}
          placeholder="输入意图（中文）"
          disabled={loading}
        />
        <Button className="st__send" type="primary" size="mini" disabled={loading} onClick={onSend}>
          发送
        </Button>
      </View>
    </View>
  );
}
