import { View, Text, Button, Picker } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SCENARIOS } from '../../config/scenarios';
import { callCloudFunctionWithTimeout } from '../../utils/cloud-call-function';
import './index.scss';

const SESSION_CHECK_TIMEOUT_MS = 15000;

export default function IndexPage() {
  const [selectedScenarioId, setSelectedScenarioId] = useState(SCENARIOS[0].id);
  const [pickerIndex, setPickerIndex] = useState(0);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const scenarioRef = useRef(selectedScenarioId);
  scenarioRef.current = selectedScenarioId;

  const checkSession = useCallback(async (scenarioId: string) => {
    setChecking(true);
    try {
      if (process.env.TARO_ENV !== 'weapp') {
        setHasSession(false);
        return;
      }
      const res = await callCloudFunctionWithTimeout({
        name: 'interact',
        data: { scenarioId, checkSessionOnly: true },
        timeoutMs: SESSION_CHECK_TIMEOUT_MS,
      });
      const r = res.result as { success?: boolean; exists?: boolean };
      setHasSession(r.success !== false && r.exists === true);
    } catch {
      setHasSession(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void checkSession(selectedScenarioId);
  }, [selectedScenarioId, checkSession]);

  useDidShow(() => {
    void checkSession(scenarioRef.current);
  });

  const goStageContinue = () => {
    void Taro.navigateTo({
      url: `/pages/stage/stage?scenarioId=${selectedScenarioId}&isNew=0`,
    });
  };

  const goCreateCharacter = () => {
    void Taro.navigateTo({
      url: `/pages/create-character/create-character?scenarioId=${encodeURIComponent(selectedScenarioId)}`,
    });
  };

  const onPickerChange = (e: { detail: { value: string | number } }) => {
    const raw = e.detail.value;
    const i = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(i) || i < 0 || i >= SCENARIOS.length) return;
    setPickerIndex(i);
    setSelectedScenarioId(SCENARIOS[i].id);
  };

  const scenarioTitle = SCENARIOS[pickerIndex]?.title ?? '';

  return (
    <View className="idx">
      <Text className="idx__title">字间戏文</Text>
      <Text className="idx__sub">选择剧本后开始体验</Text>

      <View className="idx__pickerRow">
        <Text className="idx__pickerLabel">剧本</Text>
        <Picker mode="selector" range={SCENARIOS.map((s) => s.title)} value={pickerIndex} onChange={onPickerChange}>
          <View className="idx__pickerValue">{scenarioTitle}</View>
        </Picker>
      </View>

      {checking ? <Text className="idx__hint">正在检查存档…</Text> : null}

      <Button
        className="idx__btn idx__btn--primary"
        type="primary"
        disabled={checking}
        onClick={() => goCreateCharacter()}
      >
        新开剧本
      </Button>
      {!checking && hasSession ? (
        <Button className="idx__btn" onClick={() => goStageContinue()}>
          继续体验
        </Button>
      ) : null}

      <View className="idx__spacer">
        <Text className="idx__desc">
          互动阅读工具，体验历史剧情。输入意图与历史人物对话，你的每个选择，都会让您体验不同的历史方向
        </Text>
      </View>
      <Text className="idx__foot">
        剧情由云端生成，进度与存档随剧本与账号同步；建议在稳定网络下开局。
      </Text>
    </View>
  );
}
