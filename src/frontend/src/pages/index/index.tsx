import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './index.scss';

export default function IndexPage() {
  const goStage = (isNew: boolean) => {
    void Taro.navigateTo({
      url: `/pages/stage/stage?scenarioId=hulaguan&isNew=${isNew ? '1' : '0'}`,
    });
  };

  return (
    <View className="idx">
      <Text className="idx__title">世界模拟器</Text>
      <Text className="idx__sub">虎牢关之战（MVP）</Text>
      <Button className="idx__btn idx__btn--primary" type="primary" onClick={() => goStage(true)}>
        新开剧本
      </Button>
      <Button className="idx__btn" onClick={() => goStage(false)}>
        继续体验
      </Button>
    </View>
  );
}
