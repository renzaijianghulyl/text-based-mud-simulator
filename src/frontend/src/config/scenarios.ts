/** 与云函数 buildDemoSession / 引擎支持的剧本 ID 保持一致；新增剧本时先接后端再追加。 */
export interface ScenarioOption {
  id: string;
  title: string;
  /**
   * 开局分镜播完后、前几回合输入区上方的氛围提示（与引擎无耦合）。
   * 未配置时使用 DEFAULT_AFTER_OPENING_IDLE_HINT（全剧本通用）。
   */
  afterOpeningIdleHint?: string;
  /**
   * 单条「下一步建议」模板（兼容旧配置）；占位：`{npcName}`、`{scenarioTitle}`。
   * 若同时配置了 intentPromptHints，则以 intentPromptHints 为准。
   */
  intentPromptHint?: string;
  /**
   * 多句轮换的「下一步建议」；未配置且未配 intentPromptHint 时使用 DEFAULT_INTENT_PROMPT_HINTS。
   * 文案须时代/题材中立，便于多剧本复用。
   */
  intentPromptHints?: string[];
  /** 云函数推理中轮播文案；未配置时使用全局通用池 */
  loadingHints?: string[];
}

/**
 * 全剧本通用：开局后前几回合输入区上方的附加引导（无专有地名/战役）。
 */
export const DEFAULT_AFTER_OPENING_IDLE_HINT =
  '周遭尚有可追寻的线索；你可用一句意图试探、观察或转向别处，再在下方输入并发送。';

/**
 * 全剧本通用：每轮分镜播完后的「下一步建议」轮换池。
 * 仅使用 {npcName}、{scenarioTitle}，不出现朝代、地名、战役、阵营专名。
 */
export const DEFAULT_INTENT_PROMPT_HINTS: string[] = [
  '「{npcName}」仍在场中；用一句话写下你想做的事或想说的话，点「发送」推进。',
  '局势尚未落定。在输入框用中文描述你的下一步，再点「发送」。',
  '你可以接话、试探、或把镜头转向别处——把意图写进输入框并发送即可。',
  '「{npcName}」似在等你开口。写清你的意图，点「发送」让剧情继续。',
  '此刻适合补一句观察、一句问话，或一个动作；输入后发送。',
  '《{scenarioTitle}》这一拍由你接：用中文写出意图，点「发送」。',
  '不必一次说尽；先写一小步意图，发送后再看对方如何回应。',
  '若暂无头绪，可从「你环顾四周」「你开口试探」这类小行动写起，再发送。',
];

/**
 * 等待云函数时的轮播提示：偏「片场筹备」口吻，避免模型/JSON/网络等技术词。
 * 与具体时代弱绑定，多剧本可复用。
 */
export const DEFAULT_LOADING_HINTS: string[] = [
  '导演在对讲机里交代：这一场先稳住气氛…',
  '场记正在核对：上一镜收束了吗、下一镜从哪句旁白起…',
  '灯光师在慢慢把营帐里的影子拉长，好让你进场时不突兀…',
  '副导演在排走位：谁先说、谁后接、留白留多少…',
  '化妆师在给台词「补一点血色」，听起来更像人在现场…',
  '录音师在调环境声：风声、马蹄、远处人语，一层层叠上去…',
  '编剧把便签贴满板子：这一回合，只推进一小步就好…',
  '制片在掐表：好戏值得多等几秒，别急着喊卡…',
  '群演在远处走位，主角的戏码还在最后一遍顺词…',
  '导演喊「再来一条更松的」：太紧会像念稿，松一点才像人在想…',
  '场务在铺沙土、摆旗角，镜头里要看得出「关前」的味道…',
  '剪辑师脑里已经在预剪：哪一句留悬念、哪一句让给你接…',
];

function applyIntentHintTemplate(template: string, npcName: string, scenarioTitle: string): string {
  return template.replace(/\{npcName\}/g, npcName).replace(/\{scenarioTitle\}/g, scenarioTitle);
}

export function resolveLoadingLines(scenarioId: string, npcName: string, scenarioTitle: string): string[] {
  const custom = SCENARIOS.find((s) => s.id === scenarioId)?.loadingHints?.filter((x) => typeof x === 'string' && x.trim());
  const pool = custom && custom.length > 0 ? [...custom] : [...DEFAULT_LOADING_HINTS];
  const n = (npcName || '对方面').trim();
  const t = (scenarioTitle || '本局').trim();
  pool.push(`导演正和「${n}」对词：这一句出口，观众信不信？`);
  pool.push(`《${t}》这一场还在顺戏，场记喊了「稍等」——马上接你的下一句。`);
  return pool;
}

export const SCENARIOS: ScenarioOption[] = [
  {
    id: 'hulaguan',
    title: '虎牢关之战',
    loadingHints: [
      '关隘方向的烟尘还在起，摄像大哥在等风小一点再开机…',
      '中军帐外有人递来新台词条：导演说「先听马蹄，再让人出声」。',
      '武行在套招：这一回合只比划气势，真打留到后面几场…',
      '史官在旁提醒：大事不虚、小事不拘——这场戏别写穿帮。',
    ],
    afterOpeningIdleHint:
      '联军大营附近人声嘈杂，关隘方向偶有金铁与马蹄声。你可以先打听军情、观察营地动静，或朝有动静处趋近。',
  },
  {
    id: 'chibi',
    title: '赤壁之战',
    loadingHints: [
      '江风把旗角拍在支架上啪啪响，场务在检查缆绳：这一镜从「浪涌」起…',
      '烟火师在等风向：导演说火戏别抢在台词前面…',
      '武指给楼船模型微调角度：让观众看出「北舟南寨」的压迫…',
      '史官按住演义话本：这一拍先稳住联盟线，别把结局剧透光了…',
    ],
    afterOpeningIdleHint:
      '南岸水寨栈桥人影匆匆，江北营火连成片。你可先打听风向与军议、观察舟师调度，或请见周瑜、鲁肃、诸葛亮等人物。',
  },
  {
    id: 'xuanwu-men',
    title: '玄武门之变',
    loadingHints: [
      '场务在铺宫道石板缝里的潮气：这一镜从「更鼓」起，别抢在台词前面…',
      '武行在套「门阙下」走位：甲叶声要轻，紧张感要重…',
      '副导演在对词：东宫线、秦王府线别串场，门禁口令要对上…',
      '史官按住后见之明：武德九年这一页，别把贞观写进来了…',
    ],
    afterOpeningIdleHint:
      '宫城北阙与禁苑侧近人影交错，远处或有辇声与内谒。你可先打听门禁、趋近玄武门阙下，或设法请见秦王府僚属、东宫属吏。',
    intentPromptHints: [
      '「{npcName}」仍在禁中语境里；用一句话写下你的试探、问话或趋避，点「发送」推进。',
      '门鼓与卫卒视线都是压力。写清你的下一步意图，再点「发送」。',
      '《{scenarioTitle}》这一拍由你接：可观察、可传话、可退避——输入中文意图后发送。',
    ],
  },
  {
    id: 'shang-yang-bian-fa',
    title: '商鞅变法',
    loadingHints: [
      '场记在核对竹简厚度：这一镜廷辩别一口气念完法条…',
      '副导演提醒：君臣剖白要有停顿，别像背课文…',
      '史官按住「一统天下」话头：孝公朝这一页先别剧透…',
      '道具在摆木表与金：立木那场戏，观众得先看见「信不信」…',
    ],
    afterOpeningIdleHint:
      '宫府廊庑与市肆人语交错，远处或有谒者唱名。你可先打听条教、趋近立木处，或请谒景监、旁听朝堂廷辩。',
    intentPromptHints: [
      '「{npcName}」仍在变法朝议语境里；用一句话写下你的问难、观察或缄默，点「发送」推进。',
      '牍声与目光都是压力。写清你的下一步意图，再点「发送」。',
      '《{scenarioTitle}》这一拍由你接：可廷辩、可退避、可传话——输入中文意图后发送。',
    ],
  },
];

/** @deprecated 请用 getAfterOpeningIdleHintForStage */
export function getAfterOpeningIdleHint(scenarioId: string): string | undefined {
  return SCENARIOS.find((s) => s.id === scenarioId)?.afterOpeningIdleHint;
}

/**
 * 开局后附加氛围句：有剧本专有配置则用配置，否则用全剧本通用句。
 */
export function getAfterOpeningIdleHintForStage(scenarioId: string): string {
  const custom = SCENARIOS.find((s) => s.id === scenarioId)?.afterOpeningIdleHint?.trim();
  return custom && custom.length > 0 ? custom : DEFAULT_AFTER_OPENING_IDLE_HINT;
}

export function getScenarioTitle(scenarioId: string): string {
  return SCENARIOS.find((s) => s.id === scenarioId)?.title ?? '对局';
}

/**
 * 按回合轮换「下一步建议」模板；未配置剧本走 DEFAULT_INTENT_PROMPT_HINTS。
 */
export function getIntentPromptHint(scenarioId: string, npcName: string, round: number): string {
  const focus = (npcName || '对方面').trim();
  const title = getScenarioTitle(scenarioId);
  const scenario = SCENARIOS.find((s) => s.id === scenarioId);

  let pool: string[];
  if (scenario?.intentPromptHints && scenario.intentPromptHints.length > 0) {
    pool = scenario.intentPromptHints;
  } else if (scenario?.intentPromptHint?.trim()) {
    pool = [scenario.intentPromptHint.trim()];
  } else {
    pool = DEFAULT_INTENT_PROMPT_HINTS;
  }

  const idx =
    pool.length > 0 ? Math.abs(Math.trunc(round)) % pool.length : 0;
  const raw = pool[idx] ?? DEFAULT_INTENT_PROMPT_HINTS[0];
  return applyIntentHintTemplate(raw, focus, title);
}
