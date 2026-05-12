import { View, Text, Button, Input, Textarea, ScrollView } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useCallback, useState } from 'react';
import { CHIBI_GENERAL_ROSTER } from '../../config/chibi-roster';
import { HULAGUAN_GENERAL_ROSTER } from '../../config/hulaguan-roster';
import { XUANWU_MEN_GENERAL_ROSTER } from '../../config/xuanwu-men-roster';
import { SHANG_YANG_BIAN_FA_GENERAL_ROSTER } from '../../config/shang-yang-bian-fa-roster';
import { useGameStore } from '../../store/useGameStore';
import type { PlayerRoleProfile } from '../../types/player-role';
import { clearStashedPlayerRole, stashPlayerRoleBeforeNavigate } from '../../utils/pending-role-bridge';
import './create-character.scss';

type Step = 'choose' | 'oc' | 'general';

export default function CreateCharacterPage() {
  const [scenarioId, setScenarioId] = useState('hulaguan');
  const [step, setStep] = useState<Step>('choose');
  const [ocName, setOcName] = useState('');
  const [ocBackground, setOcBackground] = useState('');
  const [selectedGeneralName, setSelectedGeneralName] = useState<string | null>(null);

  const setPendingPlayerRoleProfile = useGameStore((s) => s.setPendingPlayerRoleProfile);
  const clearPendingPlayerRoleProfile = useGameStore((s) => s.clearPendingPlayerRoleProfile);
  const setLoading = useGameStore((s) => s.setLoading);

  useLoad(() => {
    const p = Taro.getCurrentInstance().router?.params ?? {};
    const sid = typeof p.scenarioId === 'string' && p.scenarioId ? p.scenarioId : 'hulaguan';
    setScenarioId(sid);
    clearPendingPlayerRoleProfile();
    clearStashedPlayerRole();
  });

  const goStageNew = useCallback(() => {
    void Taro.navigateTo({
      url: `/pages/stage/stage?scenarioId=${encodeURIComponent(scenarioId)}&isNew=1`,
    });
  }, [scenarioId]);

  const submitOc = useCallback(() => {
    const name = ocName.trim();
    const background = ocBackground.trim();
    if (!name) {
      void Taro.showToast({ title: '请填写姓名', icon: 'none' });
      return;
    }
    if (!background) {
      void Taro.showToast({ title: '请填写背景', icon: 'none' });
      return;
    }
    const profile: PlayerRoleProfile = { mode: 'oc', name, background };
    setPendingPlayerRoleProfile(profile);
    stashPlayerRoleBeforeNavigate(profile);
    setLoading(true);
    goStageNew();
  }, [ocName, ocBackground, setPendingPlayerRoleProfile, setLoading, goStageNew]);

  const submitGeneral = useCallback(() => {
    if (!selectedGeneralName) {
      void Taro.showToast({ title: '请选择一名武将', icon: 'none' });
      return;
    }
    const profile: PlayerRoleProfile = { mode: 'general', generalName: selectedGeneralName };
    setPendingPlayerRoleProfile(profile);
    stashPlayerRoleBeforeNavigate(profile);
    setLoading(true);
    goStageNew();
  }, [selectedGeneralName, setPendingPlayerRoleProfile, setLoading, goStageNew]);

  const roster =
    scenarioId === 'hulaguan'
      ? HULAGUAN_GENERAL_ROSTER
      : scenarioId === 'chibi'
        ? CHIBI_GENERAL_ROSTER
        : scenarioId === 'xuanwu-men'
          ? XUANWU_MEN_GENERAL_ROSTER
          : scenarioId === 'shang-yang-bian-fa'
            ? SHANG_YANG_BIAN_FA_GENERAL_ROSTER
            : [];

  return (
    <View className="cc">
      <Text className="cc__title">创建角色</Text>
      <Text className="cc__hint">新开剧本前请选择身份；信息将写入本局会话。</Text>

      {step === 'choose' ? (
        <View className="cc__btnRow">
          <Button className="cc__btn" type="primary" onClick={() => setStep('oc')}>
            原创角色
          </Button>
          <Button className="cc__btn" onClick={() => setStep('general')}>
            扮演武将
          </Button>
        </View>
      ) : null}

      {step === 'oc' ? (
        <View>
          <Text className="cc__sectionTitle">原创角色</Text>
          <Input
            className="cc__input"
            placeholder="姓名（必填）"
            value={ocName}
            onInput={(e) => setOcName(e.detail.value)}
          />
          <Text className="cc__sectionTitle">背景</Text>
          <Textarea
            className="cc__textarea"
            placeholder="背景（必填，可含性别、家事、关系等）"
            value={ocBackground}
            onInput={(e) => setOcBackground(e.detail.value)}
            maxlength={2000}
            autoHeight
          />
          <View className="cc__btnRow">
            <Button className="cc__btn" type="primary" onClick={submitOc}>
              开始剧本
            </Button>
            <Button className="cc__btn" onClick={() => setStep('choose')}>
              返回
            </Button>
          </View>
        </View>
      ) : null}

      {step === 'general' ? (
        <View>
          <Text className="cc__sectionTitle">选择武将</Text>
          {roster.length === 0 ? (
            <Text className="cc__hint">当前剧本暂无武将列表，请使用原创角色。</Text>
          ) : (
            <ScrollView className="cc__scroll" scrollY>
              {roster.map((g) => {
                const selected = selectedGeneralName === g.name;
                return (
                  <View
                    key={g.id}
                    className={`cc__row ${selected ? 'cc__row--selected' : ''}`}
                    onClick={() => setSelectedGeneralName(g.name)}
                  >
                    <Text className="cc__name">{g.name}</Text>
                  </View>
                );
              })}
            </ScrollView>
          )}
          <View className="cc__btnRow">
            <Button className="cc__btn" type="primary" disabled={roster.length === 0} onClick={submitGeneral}>
              开始剧本
            </Button>
            <Button className="cc__btn" onClick={() => setStep('choose')}>
              返回
            </Button>
          </View>
        </View>
      ) : null}
    </View>
  );
}
