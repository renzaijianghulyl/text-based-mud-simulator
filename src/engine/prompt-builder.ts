import type {
  CumulativeState,
  CurrentNpc,
  KeyEvent,
  NpcCombatState,
  PlayerRoleProfile,
  RecentPhrase,
  SessionNpcsContext,
} from '../types';
import { PROMPT_DIRECTOR_MARKDOWN } from './prompt-director-markdown';
import { getScenarioNarrativeHint } from './scenario-narrative-hint';
import { formatEliminatedNpcLabels } from './eliminated-npcs';
import { formatNpcCombatPromptSection } from './npc-combat';
import { getEnsembleElasticPromptLine, getScenarioEnsembleHint } from './scenario-ensemble-hint';
import { buildEnsembleBeatsHint, buildScenarioEmotionalHint } from './scenario-emotional-hint';
import {
  buildDramaticRelationshipsHint,
  buildHistoricalContextHint,
  buildRelationshipHint,
} from './historical-context';
import {
  isOpeningRoundIntent,
  OPENING_PROMPT_DIRECTOR,
  readScenarioOpeningNarration,
  readScenarioOpeningPlayerHint,
} from './opening-intent';
import {
  CONTENT_SAFETY_PROMPT_BODY,
  CONTENT_SAFETY_PROMPT_TITLE,
} from './content-safety-prompt';

export interface PromptMemoryInput {
  recentSummaryLines: string[];
  recentPhrases: RecentPhrase[];
  keyEvents: KeyEvent[];
  cumulativeState: CumulativeState;
  /** 本局已退场卡司 id；缺省视为 [] */
  eliminatedNpcIds?: string[];
  /** 卡司 HP 本会话副本；缺省由引擎在 buildMemorySlice 前补全 */
  npcCombatById?: Record<string, NpcCombatState>;
}

export type PromptProfile = 'fast' | 'balanced' | 'rich' | 'auto';

/** 粗略按字符预算控制各段长度（中文场景约 2 字符 ≈ 1 token，仅作量级约束） */
const BUDGET_NPC = 280;
const BUDGET_RELATION = 200;
const BUDGET_KEY_EVENTS = 800;
const BUDGET_RECENT = 1200;
const BUDGET_RECENT_PHRASES = 400;
const BUDGET_CUMULATIVE = 400;
const BUDGET_ENVIRONMENT = 240;
const BUDGET_INTENT = 200;
/** 开局合成意图可能较长，单独放宽 clip */
const BUDGET_INTENT_OPENING = 400;
const BUDGET_OPENING_REF = 520;
/** 策划配置的首局情境锚点（openingPlayerHint） */
const BUDGET_OPENING_PLAYER_HINT = 220;
const BUDGET_PLAYER_ROLE = 900;
/** 历史背景与约束（剧本 historical-context.json） */
const BUDGET_HISTORICAL = 800;
/** 人物关系与称谓约束（当前主 NPC 视角） */
const BUDGET_RELATIONSHIP_HINT = 600;
/** 情感高潮引导（剧本 emotional-beats.json） */
const BUDGET_EMOTIONAL_HINT = 500;
/** 戏剧关系段（historical-context dramaticRelationships；小节标题按剧本区分） */
const BUDGET_DRAMATIC_REL_HINT = 420;
/** 群像节拍（emotional-beats ensemble / optional romance） */
const BUDGET_ENSEMBLE_BEATS_HINT = 480;
/** 已退场卡司导演禁令 + 名单 */
const BUDGET_ELIMINATED_DIRECTOR = 420;
/** 卡司 HP 副本表（全员 id 一行） */
const BUDGET_NPC_COMBAT = 880;
/** 虎牢关：收场弹性 + 地理锚软化（不修改剧本 JSON，引擎侧导演注） */
const BUDGET_HULAGUAN_ESCALATION = 400;
/** 赤壁：水战/火攻节奏与史演分层（引擎侧导演注） */
const BUDGET_CHIBI_ESCALATION = 420;
/** 玄武门：禁中政变节奏与未定局（引擎侧导演注） */
const BUDGET_XUANWU_MEN_ESCALATION = 420;
/** 商鞅变法：廷辩与条教节奏、未至史线收束勿写死（引擎侧导演注） */
const BUDGET_SHANG_YANG_BIAN_FA_ESCALATION = 420;
/** 当前主 NPC 为吕布时的单挑导演 */
const BUDGET_LV_BU_DUEL = 420;
/** narrative-prompt-guide-v3 建议的系统导演稿预算（+400 为 clip 上限；须覆盖「篇幅与信息密度」等中段导演约束） */
const BUDGET_SYSTEM = 5000;
/** 平台与内容安全段（置于【剧本类型】后）；宜完整注入避免裁断条文化约束 */
const BUDGET_CONTENT_SAFETY = 1600;
const DIRECTOR_CACHE = new Map<string, string[]>();

const ELIMINATED_CAST_DIRECTOR = `【导演：已退场与群像】若旁白或关键事件已明确某卡司阵亡/离场，或下列【本局已退场角色】非空，则该角色不得以生者身份再独立出一幕 dialogue（speaker 为其正名）；可写军报、尸首侧写、传闻、回忆。若【群像节拍】【卡司与点名】要求多人台词，须改由其他活人卡司承担，不得与已写死亡矛盾、不得令已退场者亲口对白「复活」。`;

const HULAGUAN_ESCALATION_FLEX = `【导演：收场与危机弹性（虎牢关）】对飞将级交锋允许多种收场：击退、双方退开、鸣金、挫其锐气式的非击杀战术结果、联军或亲兵介入将局面前推；不必以「玩家每轮濒死」为唯一压力手段。策划在 locations 等物料中的极简「必死」式提示须服从因果与铺垫：允许脱身、被拦、误会化解、转入军议或下一场景，避免无铺垫的「当场处决」每轮复读。`;

const CHIBI_ESCALATION_FLEX = `【导演：赤壁江战与史演分层】南北对垒、风向与火攻为叙事高压线，但未至决战勿写结局已定。苦肉诈降、蒋干盗书、草船借箭等宜作演义套层或军中流言，勿作史实拍板。允许多种阶段性收场：佯退、夜袭虚惊、军议僵持、斥候互骗、舟师试探；玩家压力不必只靠濒死单一路径。【卡司战斗状态】与 stateChanges.npcHp 须与叙事一致。`;

const XUANWU_MEN_ESCALATION_FLEX = `【导演：玄武门禁中与未定局】事变未至盖棺勿写死结局；伏兵、门阙、更鼓、敕意传闻、秦王府与东宫对位可层层加压。允许多种阶段性收场：门禁盘查、军议僵持、虚惊、斥候误报、内谒传话；勿把后世定评或贞观细节当作武德九年已发生事实。【卡司战斗状态】与 stateChanges.npcHp 须与叙事一致。`;

const SHANG_YANG_BIAN_FA_ESCALATION_FLEX = `【导演：战国变法与史线开放】未至孝公薨逝、车裂等史线收束勿写死结局；廷辩可往复数合，条教执行宜与因果铺垫一致。允许多种阶段性收场：立木争议暂息、朝堂僵持、宗室私议、太子侧压力未爆。勿将焚书、称帝、兵马俑等后世事作本朝已定。【卡司战斗状态】与 stateChanges.npcHp 须与叙事一致。对白气质可参考影视「大秦帝国」式雄辩峻切之节奏，须原创勿复刻具体台词。`;

const LV_BU_DUEL_DIRECTOR = `【导演：与吕布接战】普通过招宜偏中轻度玩家 HP 波动（见本条生命原则）；重度减血留给已叙事确认的踩红线或下杀手情境。卡司 HP 以【卡司战斗状态】为准：若吕布 id 在本副本中 hp 已明显偏低，须允许收束为撤退、昏厥被扶走、赤兔受惊拖离、鸣金等，并在 stateChanges.npcHp 中写清对其 id 的 delta，与旁白一致。`;

/** 不经过 clip，每轮完整注入；与累计状态中的 HP 呼应，表述为导演倾向而非死规则 */
const LIFE_CONFLICT_DIRECTOR_BLOCK = `【导演原则：生命、冲突与结局】
以下为叙事导向，请结合当前 HP、人设、关系与剧本情境灵活发挥，避免机械套用固定数值或套路。

HP 与氛围（倾向，非硬性档位）：
- 当前 HP 较高（如 >50）：可写为健康状态，互动如常。
- 约 30～50：可写为受伤，NPC 或环境可带警告、牵制感。
- 约 10～30：可写为重伤，NPC 可能威胁、犹豫或停手。
- 若本轮结束后玩家 HP≤0：须写死亡向叙事，旁白宜含动作、表情与环境层次，篇幅上达到「详写死亡过程」的强度（约百字量级或以上）；并在 narration 文本末尾追加「（游戏结束）」。若剧情上 NPC 要留活口，须在玩家 HP 仍大于 0 时收招或停手，避免与「已致死」相矛盾。

HP 增量幅度（仅供参考，须与 reason、因果一致）：
- 友好互动或治疗向：hp 常不变，或约 +5～+10。
- 轻度冲突（口角、试探、尚未触碰人设红线）：约 -5～-10。
- 中度冲突（明确动手、阵前数合、言语激怒但未踩侮辱性底线）：约 -10～-30。
- 重度冲突（仅当叙事已写清触碰人设底线/剧情红线，或一方下杀手且另一方无退路）：约 -50～-70；勿把「普通骂战或未确认踩红线」直接等同重度。
若本轮 stateChanges.hp 将导致应用后 HP≤0，必须在 narration 中写出死亡过程，再结束；勿在「已死亡」后再写饶恕或治疗。

NPC 在玩家血量很低时（例如不足 20 左右，依情境判断）：可依人设与情节在「继续致命攻击」「停手警告或饶恕」「治疗或拉拢」间择一或多层转折；可呼应是否触碰红线、玩家是否求饶、玩家是否对 NPC 有价值等，不作单一套路。

风格引例（仅供语气参考，勿照搬措辞）：
- 红线且将致死：如吕布式怒斥与致命一击后冷然离去，narration 末含「（游戏结束）」。
- 求饶得饶：戟停喉前、喝令滚离，HP 仍为正值。
- 有价值而拉拢：抛药或施救，hp 可小幅回升（如约 +10），叙事说明拉拢意图。`;

const NARRATIVE_DIVERSITY_DIRECTOR_BLOCK = `【导演原则：叙事多样性（软性约束）】
你是追求叙事变化的导演，不是复读机。以下为创作倾向，请按剧情自然选择，不要机械执行：

【感官多样性引导】（优先级高）
- 可按情境自然选 2-3 种感官细节，不必每轮凑满 5 种；优先避免连续 3 轮只有视觉描写。
- 战斗场景素材：
  · 听觉：金铁交鸣、战马嘶鸣、惨叫声、脚步声、呼吸急促、箭矢破空。
  · 嗅觉：血腥味、汗臭味、马匹气味、尘土味、烧焦味、铁锈味。
  · 触觉：兵刃震手麻感、汗水入眼刺痛、冷风刮过伤口的冰凉、肌肉紧绷酸胀。
  · 味觉：口中铁锈味（咬破嘴唇）、咸味（汗水入嘴角）。
- 营帐场景素材：
  · 听觉：烛火爆裂声、风声、远处马蹄声、铠甲碰撞声。
  · 嗅觉：皮革味、酒香、烛火味、陈旧木头味、汗味。
  · 触觉：帐布粗糙质感、兵刃冰冷触感、座椅硬度、酒杯光滑。
- 紧张时刻素材：
  · 听觉：耳鸣、心跳声、呼吸声变重。
  · 触觉：手心出汗、心跳加速、背后发凉、喉咙发干、指尖微颤。
  · 味觉：口中发苦、唾液减少、金属味。
- 比例仅供参考（非 KPI）：视觉 50-60%、听觉 15-20%、嗅觉 10-15%、触觉 10-15%、味觉约 5%。

【避免重复与同义替换】（优先级高）
- 优先避开最近 3 轮出现过的短语；若必须复用，请改写上下文或语气，避免整句照搬。
- 「旌旗猎猎」可替换为：旌旗翻滚、旌旗飘扬、旌旗舞动、旌旗招展、旌旗翻飞、旌旗呼啸、旌旗摆动、旌旗飘摇、旌旗翻卷、旗影翻涌。
- 「目光如电」可替换为：目光如炬、双眸生寒、眼神凌厉、目光锐利、眼中寒光、目光如刀、眼神冷冽、目光炯炯、眼中精光、目光森然。
- 「冷哼」可替换为：冷笑、嗤笑、哼了一声、冷嗤、轻哼、冷哼一声、冷笑一声、嗤之以鼻、哼道、冷声道。

【环境演进引导】（优先级中）
- 环境可随剧情自然变化，不是轮次硬推进；若剧情不需要，保持当前环境也可以。
- 时间可参考：清晨→上午→正午→下午→黄昏→夜晚；关键剧情可加速变化（如战斗正酣时天色转暗）。
- 天气可低频变化：晴→风沙→小雨→阴天→大风；变化前可先铺垫（如远处乌云聚集）。
- 光线随时段自然变化：晨曦微光、正午刺眼、黄昏残照、夜间烛火或月光。

【修辞手法建议】（优先级中）
- 可每 5-10 轮自然尝试 1 次修辞（供参考，不强制）：
  · 比喻：如同一头被惊扰的猛虎、仿佛在看一只俯首的蝼蚁、杀气如同实质寒冰。
  · 拟人：风沙拍打帐幕发出沉闷抗议、烛火在气流中剧烈摇曳似在挣扎。
  · 对比：方才还杀气腾腾此刻却静若止水、帐外狂风呼啸帐内却死一般寂静。
- 修辞服务叙事即可，不必为了修辞而修辞。

【导演的自我修养】（生成后快速自检）
- 这一轮是否只有视觉？是否可自然补 1 个听觉或触觉细节？
- 是否又复用了高频短语（如“冷哼”）？可否换成“嗤笑”或“冷声道”？
- 这个短语近 3 轮是否出现过？可参考【最近使用的表达】。
- 当前场景更适合比喻、拟人还是对比？
- 玩家当前情绪更贴近紧张、悲伤还是愤怒？可匹配对应感官细节。

【态度表达多样化】（软性建议）
- 避免连续使用同一种“态度模板”；可在不同轮次尝试：
  · 嘴硬心软：口头否认，行动支持。
  · 转移话题：不正面回应好意，但通过指令或安排间接接受。
  · 反向关心：用强硬语气表达保护或担忧。
  · 沉默行动：少说话，多用动作体现态度变化。
  · 借口掩饰：以任务、规矩或效率为理由表达真实立场。
- 优先根据当前关系阶段与 NPC 人设选择表达方式，不为花样而花样。`;

const RELATIONSHIP_DIRECTOR_BLOCK = `【导演原则：关系进展（软性约束）】
关系推进应由剧情驱动，而不是迎合式加速。请先叙事，再给关系增量。

【关系阶段与行为预设】（全局参考）
- 0～10（警惕期）：多为审视、防备、保持距离；小善意通常只带来轻微改善。
- 10～25（观察期）：可出现试探与有限接受；NPC 可能给小任务或小考验。
- 25～50（认可期）：开始给予机会与反馈，但仍会保留边界与底线。
- 50～80（信任期）：更愿意并肩行动、共享信息、在冲突中保护彼此。
- 80～100（深度信任）：更可能出现高风险互相托付，但仍受人设底线约束。

【关系变化原则】（先剧情后数值）
- 微小善意（礼貌回应、递水、短暂照应）：通常 +1～+3。
- 中等善意（主动帮助、承担风险、诚实解释）：通常 +3～+6。
- 重大善意（救命、关键牺牲、长期兑现承诺）：通常 +6～+12。
- 轻微冒犯（言辞不当、失礼）：通常 -1～-3。
- 中等冒犯（越界试探、触碰禁忌）：通常 -4～-10。
- 重大冒犯（背叛、严重羞辱、破坏底线）：通常 -10～-30。

【冒犯后回升节奏】（记忆连续性）
- 若前一轮发生中等或重大冒犯，下一轮即便解释或道歉，关系通常仅小幅回升（常见约 +1～+3）。
- 若出现重大剧情转折（如关键救援、实质性补偿、长期承诺兑现），可自然突破上述节奏。
- 重点是“逐步修复信任”，避免一轮内快速回到冒犯前状态。

【人设一致性优先】
- 不要为了配合玩家期待而跳过 NPC 的性格演化路径。
- 保持角色的底线、疑心、价值观与表达习惯连贯；关系上升也应体现在细微动作与语气变化中。`;

const TIME_CONSISTENCY_DIRECTOR_BLOCK = `【导演原则：时间连贯性（软性约束）】
主线场景中的昼夜、天色宜单向推进，并与【环境记忆】中的时间、天气相协调；叙事上宜避免无明显铺垫的「午后忽又晨雾」式矛盾。

【时间推进倾向】
- 可参考昼夜顺序感：清晨→上午→正午→下午→黄昏→夜晚；不必每轮点明整点，用光影、气温、人声、更鼓等侧面写出即可。
- 若写回忆、梦境或插叙，请用旁白标明，避免与当前【环境记忆】混为一谈。

【长会话】
- 可参考【累计状态】总轮次：战役或对话已持续较久时，宜让天色与劳顿感逐步加深，避免数十轮仍停留在同一「清晨」语感；不必与引擎轮次机械对齐。

【时间连贯自检】（仅在本轮要写时间、天色、时辰相关旁白时快速核对，不是每轮必做）
- 【环境记忆】若已偏午后或更晚，本轮主线是否仍写「晨雾未散」等明显更早的意象？→ 宜改写或交代因果。
- 总轮次已较高时，主线是否仍长期停留在破晓语感？→ 宜自然过渡到黄昏或夜禁。
- 上一轮已写暮色、夕阳，本轮是否又回到烈阳性「正午」？→ 宜保持推进感，或说明转折理由。`;

const COMBAT_VARIETY_DIRECTOR_BLOCK = `【导演原则：战斗多样性（软性约束）】
战争类剧本：避免长期只有「冲锋—接敌—负伤」同一拍子；可穿插战术与战况变化。非战争类：请将下列类比为谈判、比武、追逐、缉拿等，按【剧本类型】改写。

【战术变化倾向】
- 除正面接战外，可偶尔出现：迂回、侧击、佯动、诱敌、夜袭意图、暂时撤退重整、阵前挑将等；择剧情可用的 1～2 种即可，勿堆砌。

【战况阶段感】
- 可分轮交代小胜、小挫、僵持、援军讯息、阵型动摇等，不必每轮都有；隔若干轮让战场「动一下」即可。

【对手具体化】
- 避免通篇只有「敌兵」；可间歇写出敌方将校名号、旗色或阵型特征，增强画面（不必每轮点名）。

【战斗多样自检】
- 连续多轮是否只有同一套接战方式？→ 可考虑换战术或阶段性战果。
- 是否长期没有僵持、突破或撤退等阶段感？→ 可择一轮补充。`;

const NPC_EMOTION_DIRECTOR_BLOCK = `【导演原则：NPC 情感层次（软性约束）】
长会话中，NPC 除默认语气外，宜偶尔出现疲惫、犹疑、怒意或短促放松，须符合【NPC 人设】与【关系状态】。下列以忠义威严型武将为示例，其他角色请依人设自行换算。

【层次示例】（非必用清单）
- 疲惫：揉眉、声线压低、仍强撑门面。
- 犹豫：沉默片刻、欲言又止。
- 怒意：对敌或不义之事爆发，而非对玩家无由发作。
- 对可信对象的一瞬松懈：仅当关系与剧情已到。

【节奏】
- 不宜每轮变脸；有剧情支撑时再落笔。

【NPC 情感自检】
- 是否多轮只有单一威严表情？→ 可小幅加层次。
- 示弱或脆弱是否只在对的人、对的情境？→ 宜符合人设与关系。`;

const PLAYER_GROWTH_DIRECTOR_BLOCK = `【导演原则：玩家成长（软性约束）】
长会话中，玩家在场上的表现与 NPC 对玩家的观感可逐步变化；此为叙事印象，不依赖额外数值字段。

【成长维度】（择情选用）
- 武艺：从生疏到稳住阵脚、再到利落。
- 战术：从跟随冲锋到掩护侧翼、协同喊话。
- 声望与称谓：从疏远的「阁下」到可托付差事的语气（随关系与剧情）。
- 外化印象（长会话中宜间歇出现，不必每轮）：士卒窃议、敌军侧写、同袍态度等侧面写出「旁人对玩家的看法」。

【节奏】
- 渐进为宜，不必每轮升级；重大转折需剧情支撑。

【玩家成长自检】
- NPC 对玩家的称呼与差遣是否始终停留在初见？→ 长程宜有微小变化。
- 玩家是否始终是同一套战斗动作描写？→ 可展现熟练度或胆气变化。
- 成长是否只停在内心旁白？→ 可偶借士卒、敌军或同袍反应带出。`;

const CAMPAIGN_PACING_DIRECTOR_BLOCK = `【导演原则：战役节奏（软性约束）】
长战役（可参考【累计状态】总轮次与叙事体感）宜有张弛：高强对战与休整、军议可交替出现。以下为节奏感倾向，**勿与 totalRounds 逐段对齐**，不必按数字执行。

【长战役渐进参考】（仅为示意，非 KPI）
- 叙事上可反复经历：交锋加剧 ↔ 短暂僵持 ↔ 撤收或转入夜营 ↔ 晨间军议与再部署等；篇幅以剧情需要为准，勿强行凑段数。

【休整要有「可写内容」】
- 休整不是「跳到下一天」一句话带过；可择一二写出：士卒动静、营火炊烟、伤兵、辎重、远处斥候等侧面。
- 若剧情已长时间只有接战，宜考虑插入一轮偏休整或军议向的戏份（须符合因果，非机械插入）。

【休整内容示例】（非必用清单，择情选用）
- 功能性：喂马饱食、疗伤、整备。
- 复盘总结：如「今日之战，汝有何感悟？」（用语与称谓随【NPC 人设】改写）
- 情感交流：难得的笑意、低声调侃一句、士卒或同袍间的轻松片刻。
- 夜谈：月色、暂忘明日压力、往事闪回（回忆与当下宜通过旁白分清，避免与【环境记忆】时间线混淆）。

【人设与情境】
- 轻松或幽默须符合【NPC 人设】。枭雄型主公常见冷幽默、话里有话，而非舞台式「讲笑话」；若作语气类比，「如常见刻画中曹操式冷幽默」仅为风格提示，一切仍以【NPC 人设】为准，勿全剧本套用同一套台词。

【战役节奏自检】
- 是否已连续多轮只有厮杀而毫无收束、喘息或营中戏份？→ 可考虑插入休整向内容。
- 休整是否只有「喂马饱食」式一笔带过？→ 可考虑补复盘、夜谈或人物片刻（择一即可）。
- 从酣战直接切到「次日再战」且中间无过渡？→ 可考虑一夜景或军议作桥。`;

const NPC_DEPTH_DIRECTOR_BLOCK = `【导演原则：NPC 深度情感（软性约束）】
长会话中，在疲惫、放松之外，NPC 宜偶尔出现更深一层的情绪刻画，须符合【NPC 人设】与【关系状态】。下列以多疑、爱才、枭雄型主公或权谋型 NPC 为类型参考，其他角色请依人设换算。

【深度层次】（择情选用，需剧情支撑）
- 脆弱一瞬：长叹、沉默过久、肩背松懈（非崩溃式表演）。
- 往事闪回：一句带过早年抉择或旧怨，不必铺陈成列传。
- 自我诘问：自问是否过狠、是否走错一步（仍保持人物底色）。
- 冷幽默或反讽：话锋带刺，而非对玩家无由发作。

【信任与场合】
- 更深层的示弱、往事与质疑，宜出现在关系与剧情已建立信任的情境（可参考【关系状态】与关系阶段描述），而非对陌路之人倾泻；非硬性数值门槛。

【NPC 深度情感自检】
- 是否连续多轮只有疲惫、威严或放松轮换？→ 可择机增加一层深度（须与人设相合）。
- 脆弱与回忆是否过频或 OOC？→ 宜收敛，宁可少用而准。
- 幽默是否变成舞台式「讲笑话」而合不来人设？→ 宜改为话里有话或冷幽默式点到为止。`;

const PLAYER_ARC_DIRECTOR_BLOCK = `【导演原则：玩家角色弧光（软性约束）】
剧情推进多轮或面临重大抉择时，玩家宜有**可共情的内心层次**，不必写成全程冷静正确的「完美主角」；须与【玩家意图】、【剧本类型】相符。

【内心张力】（择情选用）
- 生死或诱敌前的恐惧、想退、掌心冷汗。
- 军令与人命、忠义与自保等道德张力（用泛化情境表述，勿硬套单一史实）。

【角色缺陷与犹豫】
- 可写声音微颤、迟疑再接令、片刻沉默；非每轮都必须脆弱。

【示例】（结构示意）
\`\`\`
旁白：你握紧令箭，掌心满是冷汗。
你："末将领命……"（声音微颤）
旁白：你知道，这一去，凶多吉少。
\`\`\`

【玩家弧光自检】（生成后快速核对）
- 玩家是否过于完美、从无犹豫？→ 关键抉择点可否加一点恐惧或挣扎（须合人设）。
- 是否长期无道德或情感张力？→ 若剧情已到，可否用泛化困境点一笔（勿为虐而虐）。`;

const SUSPENSE_THEME_DIRECTOR_BLOCK = `【导演原则：悬念与主题（软性约束）】
长会话中，叙事宜有**层次悬念**（伏笔—揭晓不必同轮完成），并可**偶发**价值碰撞；勿每轮说教，勿与引擎轮次机械对齐。

【悬念层次】（示意，非时间表）
- 短期：本计是否奏效、当场是否露馅。
- 中期：局势是否恶化、信任是否动摇。
- 长期：权力结构或大局是否另有隐情（可用侧写：眼神、未说完的话、神秘后手）。

【伏笔技巧】（择情选用）
- 侧写：肩上一沉、低声吩咐侧将、阵线异动——不必点名具体人物，须与【NPC 人设】与因果相符。

【主题深化】（偶发）
- 忠义与生存、权谋与底线等，用一两句交锋即可；须贴合时代与剧本，避免现代口号。

【悬念与主题自检】（生成后快速核对）
- 是否只有「当场成败」、长期伏线过于单薄？→ 可否用侧写埋一条后手或疑虑（有剧情再写）。
- 是否从未出现价值碰撞？→ 长程中可否偶发一句主题交锋（勿每轮）。`;

const EMOTION_DIRECTOR_BLOCK = `【导演原则：情感共鸣（软性约束）】
在剧情到点时，宜出现**情感峰值**（牺牲、相护、沉默中的震动等），须符合【NPC 人设】与【关系状态】；非每轮必催泪。

【情感时刻】（择情选用）
- 小人物侧写：无名士卒、老卒、亲兵挡在前等（勿堆砌名单）。
- 救赎或担当：玩家为信念或同袍做出的取舍（与 stateChanges 因果一致时再落笔）。

【示例】（结构示意，人名随剧本替换）
\`\`\`
旁白：箭矢破空，有人闷哼一声挡在你身前。
旁白：主将怔住，茶盏在案上微颤。
主将："……厚葬。"（转身，背影一僵）
旁白：无人看见，他袖中的手微微收紧。
\`\`\`

【情感共鸣自检】（生成后快速核对）
- 是否长期只有打斗与对白、无情感落点？→ 若剧情已到，可否有一场面的震动或沉默反应。
- 牺牲或相护是否突兀？→ 宜有前因或侧写铺垫。`;

const ENSEMBLE_CAST_DIRECTOR_BLOCK = `【导演原则：群像与点名（强倾向）】
与【卡司与点名】【群像与轮次弹性】一并阅读：战争/军议类场景宜让读者感到军营与关隘是活的，而不是只有「主 NPC + 玩家」二人转。

【点名与代答】
- 若【玩家意图】或对白中明确点名某一卡司角色（含其字、号、常见称呼，参见【卡司与点名】中的别名），该角色须在本轮 scenes 内亲自开口：至少一幕 type 为 dialogue，且 speaker 须写其正名（与卡司名单中的主名一致），不得仅由他人转述其态度了事。
- 禁止「代答」：当前主 NPC 不得用一句「某某尚未开口」「某某让你退下」等完全顶替该被点名者的立场与台词；若剧情需要其暂默，仍须给该 NPC 独立一幕（可为极短 dialogue 或 action 明确其在场与态度），不得整轮缺席。
- 职能人物（斥候、传令兵等）可用 speaker 写其职能称谓，但不宜每轮同名复读；与主名卡司冲突时仍以卡司正名为准。

【军议 / 大战 / 升帐 / 出战 / 追击 / 围城】
- 语义上出现上述类场景时，优先安排至少 2 名不同 speaker 的 dialogue（可分幕交错），避免同一幕内主公一人长篇包办所有谋士武将态度。
- 第三方发言宜占独立幕：先 action 写其上前、闯帐、急步等，再下一幕 dialogue，勿把多人台词挤在同一 content 长段里冒充一幕。

【与剧情推进的配合】
- 外部打断（军情、请战、献策）须因果成立；插入后仍给玩家反应空间，勿替玩家裁决。`;

const PLOT_PROGRESS_DIRECTOR_BLOCK = `【导演原则：剧情推进（软性约束）】
不要只做「玩家一句 → NPC 一句」的问答机；让剧情自然流动。玩家是世界的一部分，不必每轮都成为唯一焦点。

非战争类剧本：下列军情、闯帐等仅作类比，请按【剧本类型】换成传召、私访、江湖风波等合适形态。

【时间流逝】（倾向：偶尔自然带出）
- 可用一两句旁白暗示光阴推移，并与【环境记忆】中的时间、天气保持连贯，例如：帐外天色渐暗、烛影渐长、远处更鼓、风沙转急。
- 不必每轮都写；避免为凑数而硬宣告整点时辰。旁白暗示即可，不必与引擎轮次一一对应。

【事件触发】（倾向：间歇出现）
- 战争类示例：士兵来报、探马传信、远处挑战鼓声、营中骚动、天气骤变。
- 事件出现后宜留出空间让玩家反应，不要立刻替玩家决定结果。

【NPC 主动】（倾向：偶尔主动）
- 可自然插入提问、布置差事、收束场面或转移话题；须符合【NPC 人设】与当前关系阶段。
- 避免为「主动」而堆砌台词；主动后仍等待玩家意图。

【世界活性】（战争类示例：虎牢关）
- 背景里可有其他人物活动、军情起伏、远处声响；示例：性急武将闯帐、主公派人传话、阵前叫骂等——须与剧情因果相符，非每轮必现。
- 世界在转动：让读者感到关隘或军营是活的，而不是静止布景。

【剧情推进自检】（生成后快速想一遍）
- 本轮是否只有「玩家说 → NPC 应」？若偏单调，能否加一句时间或远处动静？
- NPC 是否长期完全被动？若合适，能否自然多问一句或给一个小任务？
- 世界是否像停住的舞台？若过于静止，能否用轻微背景事件打破？`;

function clip(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}…`;
}

function getPromptProfileFromEnv(): PromptProfile {
  const raw = process.env.PROMPT_PROFILE?.trim().toLowerCase();
  if (raw === 'fast' || raw === 'rich' || raw === 'balanced' || raw === 'auto') {
    return raw;
  }
  return 'balanced';
}

function getProfileBudgets(profile: PromptProfile) {
  const effectiveProfile: Exclude<PromptProfile, 'auto'> = profile === 'auto' ? 'balanced' : profile;
  if (effectiveProfile === 'fast') {
    return {
      keyEvents: 500,
      recent: 700,
      recentPhrases: 240,
      cumulative: 320,
      system: 1900,
      directorBlock: 900,
    };
  }
  if (effectiveProfile === 'rich') {
    return {
      keyEvents: BUDGET_KEY_EVENTS,
      recent: BUDGET_RECENT,
      recentPhrases: BUDGET_RECENT_PHRASES,
      cumulative: BUDGET_CUMULATIVE,
      system: BUDGET_SYSTEM + 700,
      directorBlock: 2600,
    };
  }
  return {
    keyEvents: 650,
    recent: 900,
    recentPhrases: 300,
    cumulative: 360,
    system: BUDGET_SYSTEM + 700,
    directorBlock: 1300,
  };
}

function directorBlockFrame(
  scenarioId: string,
  profile: PromptProfile,
  totalRounds: number
): string[] {
  const effectiveProfile: Exclude<PromptProfile, 'auto'> = profile === 'auto' ? 'balanced' : profile;
  const bucket = Math.floor(Math.max(totalRounds, 0) / 3);
  const key = `${scenarioId}|${effectiveProfile}|${bucket}`;
  const cached = DIRECTOR_CACHE.get(key);
  if (cached) {
    return cached;
  }
  const core = [
    LIFE_CONFLICT_DIRECTOR_BLOCK,
    NARRATIVE_DIVERSITY_DIRECTOR_BLOCK,
    RELATIONSHIP_DIRECTOR_BLOCK,
    TIME_CONSISTENCY_DIRECTOR_BLOCK,
    ENSEMBLE_CAST_DIRECTOR_BLOCK,
  ];
  const optional = [
    COMBAT_VARIETY_DIRECTOR_BLOCK,
    NPC_EMOTION_DIRECTOR_BLOCK,
    PLAYER_GROWTH_DIRECTOR_BLOCK,
    CAMPAIGN_PACING_DIRECTOR_BLOCK,
    NPC_DEPTH_DIRECTOR_BLOCK,
    PLAYER_ARC_DIRECTOR_BLOCK,
    SUSPENSE_THEME_DIRECTOR_BLOCK,
    EMOTION_DIRECTOR_BLOCK,
    PLOT_PROGRESS_DIRECTOR_BLOCK,
  ];
  let pickedOptional: string[] = [];
  if (effectiveProfile === 'rich') {
    pickedOptional = optional;
  } else if (effectiveProfile === 'fast') {
    const idx = bucket % optional.length;
    pickedOptional = [optional[idx]];
  } else {
    const start = (bucket * 2) % optional.length;
    pickedOptional = [optional[start], optional[(start + 1) % optional.length], optional[(start + 2) % optional.length]];
  }
  const frame = [...core, ...pickedOptional];
  DIRECTOR_CACHE.set(key, frame);
  return frame;
}

function getRelationshipLabel(score: number): string {
  if (score >= 80) return '生死之交';
  if (score >= 50) return '好友';
  if (score >= 20) return '友善';
  if (score > -20) return '陌生';
  if (score > -50) return '冷淡';
  if (score > -80) return '敌对';
  return '死敌';
}

function buildPlayerRoleBlocks(playerRoleProfile?: PlayerRoleProfile): { role: string; detail: string; hook: string } {
  if (!playerRoleProfile) {
    return {
      role: '未设定（按普通参战者处理）',
      detail: '（暂无）',
      hook: '若玩家后续补充身世、家事、关系与师承，请自然吸收进叙事，不要生硬改设定。',
    };
  }
  if (playerRoleProfile.mode === 'oc') {
    return {
      role: '原创角色',
      detail: `姓名：${playerRoleProfile.name}；背景：${playerRoleProfile.background}`,
      hook:
        '可从背景中自然抽取家世、旧怨、盟友、师承等线索推进剧情；先埋伏笔再兑现，不要一轮全部抖出。',
    };
  }
  return {
    role: '扮演武将',
    detail: `武将名：${playerRoleProfile.generalName}`,
    hook: '玩家以该武将身份参与剧情；称谓、立场、行事风格应与该武将历史形象及当前战局一致。',
  };
}

/**
 * 构建单轮叙事 prompt：注入人设、关系、关键事件、滚动摘要、累计状态、意图与系统指令。
 */
export function buildPrompt(
  npcs: SessionNpcsContext,
  memory: PromptMemoryInput,
  intent: string,
  scenarioId: string,
  profileInput?: PromptProfile,
  playerRoleProfile?: PlayerRoleProfile
): string {
  const profile = profileInput ?? getPromptProfileFromEnv();
  const budgets = getProfileBudgets(profile);
  const npc: CurrentNpc = npcs.current;
  const titlePart = npc.title ? `（${npc.title}）` : '';
  const equipBits: string[] = [];
  if (npc.equipment && npc.equipment.length > 0) {
    equipBits.push(npc.equipment.join('、'));
  }
  if (npc.mount) {
    equipBits.push(`坐骑「${npc.mount}」`);
  }
  const equipPart = equipBits.length > 0 ? `，装备「${equipBits.join('、')}」` : '';
  const npcBlock = clip(
    `${npc.name}${titlePart}：性格「${npc.personality}」${equipPart}`,
    BUDGET_NPC
  );

  const relLabel = getRelationshipLabel(npc.relationship);
  const relationBlock = clip(
    `玩家 → ${npc.name}：${relLabel}（数值 ${npc.relationship}）`,
    BUDGET_RELATION
  );

  const keyLines = memory.keyEvents
    .map((e) => `R${e.round}: ${e.event} → ${e.impact}`)
    .join('\n');
  const keyBlock = clip(keyLines.length > 0 ? keyLines : '（暂无）', budgets.keyEvents);

  const recentJoined = memory.recentSummaryLines.join('；');
  const recentBlock = clip(
    recentJoined.length > 0 ? recentJoined : '（暂无）',
    budgets.recent
  );

  const cs = memory.cumulativeState;
  const cumulativeBlock = clip(
    `HP: ${cs.hp}/${cs.maxHp}；总轮次: ${cs.totalRounds}` +
      (cs.status ? `；状态: ${cs.status}` : '') +
      (cs.totalRounds >= 15
        ? `；叙事参考：会话已进行约 ${cs.totalRounds} 轮，旁白可随剧情逐步推进昼夜与战况阶段，不必与轮次一一对应`
        : '') +
      (cs.totalRounds >= 25 ? `；长程：宜穿插休整、夜谈与军议` : ''),
    budgets.cumulative
  );
  const env = cs.environment;
  const environmentBlock = clip(
    env
      ? `时间：${env.time ?? '（未指定）'}；天气：${env.weather ?? '（未指定）'}；地点：${env.location ?? '（未指定）'}`
      : '（暂无）',
    BUDGET_ENVIRONMENT
  );
  const recentPhraseLines = memory.recentPhrases
    .map((item) => `- ${item.phrase}（第 ${item.round} 轮）`)
    .join('\n');
  const recentPhrasesBlock = clip(
    recentPhraseLines.length > 0 ? recentPhraseLines : '（暂无）',
    budgets.recentPhrases
  );

  const intentTrimmed = intent.trim();
  const intentBlock = clip(
    intentTrimmed,
    isOpeningRoundIntent(intent) ? BUDGET_INTENT_OPENING : BUDGET_INTENT
  );
  const eliminated = memory.eliminatedNpcIds ?? [];
  const eliminatedDirectorBlock = clip(
    eliminated.length > 0
      ? `${ELIMINATED_CAST_DIRECTOR}\n【本局已退场角色（禁止再以生者对白出场）】${formatEliminatedNpcLabels(
          scenarioId,
          eliminated
        )}`
      : ELIMINATED_CAST_DIRECTOR,
    BUDGET_ELIMINATED_DIRECTOR
  );
  const playerRoleBlocks = buildPlayerRoleBlocks(playerRoleProfile);
  const openingNarrationHint =
    isOpeningRoundIntent(intent) ? readScenarioOpeningNarration(scenarioId) : undefined;
  const openingPlayerHint =
    isOpeningRoundIntent(intent) ? readScenarioOpeningPlayerHint(scenarioId) : undefined;

  const ensembleRoster = getScenarioEnsembleHint(scenarioId, eliminated);
  const ensembleElastic = getEnsembleElasticPromptLine(cs.totalRounds, memory.recentSummaryLines, eliminated);

  const systemBlock = clip(PROMPT_DIRECTOR_MARKDOWN, budgets.system);
  const directorBlocks = directorBlockFrame(scenarioId, profile, cs.totalRounds);

  const scenarioTypeLine = getScenarioNarrativeHint(scenarioId);
  const contentSafetyBlock = clip(
    `${CONTENT_SAFETY_PROMPT_TITLE}\n${CONTENT_SAFETY_PROMPT_BODY}`,
    BUDGET_CONTENT_SAFETY
  );
  const historicalHint = buildHistoricalContextHint(scenarioId);
  const relationshipHint = buildRelationshipHint(scenarioId, npcs.current.id);
  const dramaticRelHint = buildDramaticRelationshipsHint(scenarioId, npcs.current.id);
  const dramaticRelationshipsSectionTitle =
    scenarioId === 'xuanwu-men'
      ? '【储位与宫廷戏剧关系】'
      : scenarioId === 'shang-yang-bian-fa'
        ? '【朝堂与变法戏剧关系】'
        : '【联军人物戏剧关系】';
  const ensembleBeatsHint = buildEnsembleBeatsHint(
    scenarioId,
    cs.totalRounds,
    memory.recentSummaryLines,
    eliminated
  );
  const emotionalHint = buildScenarioEmotionalHint(
    scenarioId,
    cs.totalRounds,
    memory.recentSummaryLines
  );

  const npcCombatRaw = formatNpcCombatPromptSection(
    scenarioId,
    memory.npcCombatById,
    BUDGET_NPC_COMBAT - 80
  );
  const npcCombatBlock = clip(npcCombatRaw, BUDGET_NPC_COMBAT);
  const hulaguanEscalationBlock =
    scenarioId === 'hulaguan' && !isOpeningRoundIntent(intent)
      ? clip(HULAGUAN_ESCALATION_FLEX, BUDGET_HULAGUAN_ESCALATION)
      : '';
  const chibiEscalationBlock =
    scenarioId === 'chibi' && !isOpeningRoundIntent(intent)
      ? clip(CHIBI_ESCALATION_FLEX, BUDGET_CHIBI_ESCALATION)
      : '';
  const xuanwuMenEscalationBlock =
    scenarioId === 'xuanwu-men' && !isOpeningRoundIntent(intent)
      ? clip(XUANWU_MEN_ESCALATION_FLEX, BUDGET_XUANWU_MEN_ESCALATION)
      : '';
  const shangYangBianFaEscalationBlock =
    scenarioId === 'shang-yang-bian-fa' && !isOpeningRoundIntent(intent)
      ? clip(SHANG_YANG_BIAN_FA_ESCALATION_FLEX, BUDGET_SHANG_YANG_BIAN_FA_ESCALATION)
      : '';
  const lvBuDuelBlock =
    npc.id === 'lv-bu' && !isOpeningRoundIntent(intent)
      ? clip(LV_BU_DUEL_DIRECTOR, BUDGET_LV_BU_DUEL)
      : '';

  return [
    '【剧本类型】',
    scenarioTypeLine,
    '',
    contentSafetyBlock,
    '',
    ...(isOpeningRoundIntent(intent)
      ? [
          '【开局旁白导演】',
          OPENING_PROMPT_DIRECTOR,
          '',
          ...(openingNarrationHint
            ? ['【剧本开场参考】', clip(openingNarrationHint, BUDGET_OPENING_REF), '']
            : []),
          ...(openingPlayerHint
            ? [
                '【首局情境提示】',
                '以下为策划锚点，请融入旁白氛围，勿逐字照抄；勿替玩家做决定。',
                clip(openingPlayerHint, BUDGET_OPENING_PLAYER_HINT),
                '',
              ]
            : []),
        ]
      : []),
    ...(historicalHint
      ? ['【历史背景与约束】', clip(historicalHint, BUDGET_HISTORICAL), '']
      : []),
    ...(hulaguanEscalationBlock ? [hulaguanEscalationBlock, ''] : []),
    ...(chibiEscalationBlock ? [chibiEscalationBlock, ''] : []),
    ...(xuanwuMenEscalationBlock ? [xuanwuMenEscalationBlock, ''] : []),
    ...(shangYangBianFaEscalationBlock ? [shangYangBianFaEscalationBlock, ''] : []),
    ...(relationshipHint
      ? ['【人物关系与称谓】', clip(relationshipHint, BUDGET_RELATIONSHIP_HINT), '']
      : []),
    ...(dramaticRelHint
      ? [dramaticRelationshipsSectionTitle, clip(dramaticRelHint, BUDGET_DRAMATIC_REL_HINT), '']
      : []),
    ...(ensembleBeatsHint
      ? ['【群像节拍】', clip(ensembleBeatsHint, BUDGET_ENSEMBLE_BEATS_HINT), '']
      : []),
    ...(emotionalHint
      ? ['【情感高潮引导】', clip(emotionalHint, BUDGET_EMOTIONAL_HINT), '']
      : []),
    eliminatedDirectorBlock,
    '',
    '【系统指令】',
    systemBlock,
    '',
    ...directorBlocks.flatMap((x) => [clip(x, budgets.directorBlock), '']),
    '',
    '【NPC 人设】',
    npcBlock,
    '',
    ...(lvBuDuelBlock ? [lvBuDuelBlock, ''] : []),
    ...(ensembleRoster
      ? ['【卡司与点名】', clip(ensembleRoster, BUDGET_NPC * 2), '']
      : []),
    '【群像与轮次弹性】',
    clip(ensembleElastic, BUDGET_NPC * 2),
    '',
    '【关系状态】',
    relationBlock,
    '',
    '【玩家身份】',
    clip(playerRoleBlocks.role, BUDGET_PLAYER_ROLE),
    '',
    '【玩家角色信息】',
    clip(playerRoleBlocks.detail, BUDGET_PLAYER_ROLE),
    '',
    '【身份剧情钩子】',
    clip(playerRoleBlocks.hook, BUDGET_PLAYER_ROLE),
    '',
    '【关键事件】',
    keyBlock,
    '',
    '【滚动摘要（最近至多 3 轮）】',
    recentBlock,
    '',
    '【累计状态】',
    cumulativeBlock,
    '',
    '【卡司战斗状态（本会话副本）】',
    npcCombatBlock,
    '',
    '【环境记忆】',
    environmentBlock,
    '',
    '【最近使用的表达】',
    recentPhrasesBlock,
    '',
    '【玩家意图】',
    intentBlock,
    '',
    '【输出格式（严格遵守）】',
    '只输出一个 JSON 对象，不要用 Markdown 代码块包裹。字段含义：',
    '- scenes：非空数组（3～6 幕为宜，最多 12 幕），每幕包含：',
    '  · type：narration / action / dialogue',
    '  · content：非空字符串，单幕文本（禁止标签式注释，直接写内容）；宜写足一幕信息量，避免整幕仅一两句带过（与导演稿「篇幅与信息密度」呼应，非硬性字数）。',
    '  · speaker：仅 dialogue 必填，示例：你 / 吕布',
    '  · 重要 dialogue 宜有情绪或立场层次（如先压后问、先冷后热），避免单句口号式带过。',
    '  · durationMs：可选数字（前端可忽略）',
    '  · 叙事顺序建议：narration -> action -> dialogue -> action -> dialogue（可按剧情调整）',
    '  · 若本局因死亡等原因结束，最后一幕 content 末尾须含「（游戏结束）」',
    '- stateChanges：对象，且必须包含数字字段 hp、relationship（可为负整数或 0）',
    '  · hp、relationship 表示「相对当前状态的增量」，不是绝对值。',
    `  · 应用后玩家 HP 须在 0～${memory.cumulativeState.maxHp} 之间；与 ${npc.name} 的关系须在 -100～100 之间。`,
    '  · 可选 reason：简短说明本轮数值变化原因',
    '  · 可选 eliminatedNpcs：字符串数组，每项须为剧本 npc id（如 hua-xiong）；仅当本局叙事确有卡司退场时填写，否则省略。',
    '  · 可选 npcHp：对象数组，每项为 { id, delta }；id 为剧本 npc id，delta 为相对【卡司战斗状态】中该 id 当前 hp 的增量；有卡司受伤/治疗/休整时填写，须与旁白一致，否则省略。',
    '示例：{"scenes":[{"type":"narration","content":"……"},{"type":"dialogue","speaker":"吕布","content":"……"}],"stateChanges":{"hp":0,"relationship":-5,"reason":"言语冒犯","npcHp":[{"id":"lv-bu","delta":-15}]}}',
  ].join('\n');
}
