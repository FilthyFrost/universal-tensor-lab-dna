// =====================================================================
// 🎮 游戏系统常量 — 6岁寿命 · 战斗记忆 · 伤疤基因 · 基因兼容 · 设施
// =====================================================================

// --- 稀有度 ---
export const COMMON_GENES = ['AA','AT','AC','AG','TA','TT','TC','TG'];
export const FINE_GENES = ['CA','CT','CC'];
export const RARE_GENES = ['CG','GA','GT','GC'];
export const LEGENDARY_GENES = ['GG'];
export const RARITY_COLORS = { common: '#94a3b8', fine: '#22c55e', rare: '#a855f7', legendary: '#f59e0b' };
export const RARITY_LABELS = { common: '普通', fine: '优良', rare: '稀有', legendary: '传说' };
export const RARITY_ORDER = ['common', 'fine', 'rare', 'legendary'];
export const GENE_LABELS = ['元素', '体型', '头部', '侧翼', '背部', '花纹'];
export const GEOMETRY_GENE_INDICES = [1, 2, 3, 4];

export function getGeneRarity(code) {
    if (code === 'GG') return 'legendary';
    if (RARE_GENES.includes(code)) return 'rare';
    if (FINE_GENES.includes(code)) return 'fine';
    return 'common';
}
export function getRarityIndex(rarity) { return RARITY_ORDER.indexOf(rarity); }

// --- 表达等级 (6级) ---
export const EXPR_TIERS = [
    { idx: 0, name: 'I',   label: '痕迹', mult: 0.3, visual: 0.15, color: '#475569' },
    { idx: 1, name: 'II',  label: '微弱', mult: 0.5, visual: 0.33, color: '#64748b' },
    { idx: 2, name: 'III', label: '显现', mult: 0.7, visual: 0.50, color: '#94a3b8' },
    { idx: 3, name: 'IV',  label: '标准', mult: 1.0, visual: 0.70, color: '#e2e8f0' },
    { idx: 4, name: 'V',   label: '强烈', mult: 1.4, visual: 0.85, color: '#a78bfa' },
    { idx: 5, name: 'VI',  label: '极限', mult: 2.0, visual: 1.00, color: '#fbbf24' }
];
export const EXPR_ROMAN = ['I','II','III','IV','V','VI'];
export function getExprTier(val) {
    const idx = Math.min(5, Math.max(0, Math.floor(val * 6)));
    return EXPR_TIERS[idx];
}
export const EXPR_DISTRIBUTIONS = {
    common:    [0.55, 0.25, 0.13, 0.05, 0.02, 0.00],
    fine:      [0.15, 0.30, 0.30, 0.18, 0.06, 0.01],
    rare:      [0.03, 0.10, 0.25, 0.35, 0.20, 0.07],
    legendary: [0.00, 0.03, 0.12, 0.30, 0.35, 0.20]
};
export function rollExprForRarity(rarity) {
    const dist = EXPR_DISTRIBUTIONS[rarity] || EXPR_DISTRIBUTIONS.common;
    const roll = Math.random();
    let cumul = 0;
    for (let i = 0; i < dist.length; i++) {
        cumul += dist[i];
        if (roll < cumul) { return (i + Math.random()) / 6; }
    }
    return 0.5;
}
export const GENE_BASE_SCORE = { common: 2, fine: 7, rare: 22, legendary: 70 };
export const COLOR_GENE_BONUS = { common: 0, fine: 4, rare: 12, legendary: 35 };

// =====================================================================
// 🧬 7属性系统
// =====================================================================

export const STAT_NAMES_7 = ['STR','DEX','CON','INT','SPD','CHA','LCK'];
export const STAT_LABELS_7 = ['力量','灵巧','体质','智力','速度','魅力','运气'];
export const STAT_ICONS_7 = ['⚔','🎯','🛡','🧠','💨','✨','🍀'];
export const STAT_GENE_MAP = { STR: 3, DEX: 5, CON: 1, INT: 4, SPD: 2, CHA: 0, LCK: -1 };

export const CHASSIS_ROLE = {
    'AA': { role: '刺客', bonus: { SPD: 2, DEX: 1, CON: -1 } },
    'AT': { role: '射手', bonus: { DEX: 2, SPD: 1, STR: -1 } },
    'AC': { role: '战士', bonus: { STR: 1, CON: 1, INT: -1 } },
    'AG': { role: '潜行', bonus: { SPD: 2, LCK: 1, CON: -2 } },
    'TA': { role: '骑士', bonus: { STR: 1, CON: 1, SPD: -1 } },
    'TT': { role: '坦克', bonus: { CON: 3, SPD: -2 } },
    'TC': { role: '法师', bonus: { INT: 2, CHA: 1, CON: -2 } },
    'TG': { role: '游侠', bonus: { SPD: 1, DEX: 1, LCK: 1, CON: -1 } },
    'CA': { role: '重甲', bonus: { CON: 2, STR: 1, SPD: -2 } },
    'CT': { role: '刺客', bonus: { DEX: 2, SPD: 1, CON: -1 } },
    'CC': { role: '术士', bonus: { INT: 2, CHA: 1, STR: -1 } },
    'CG': { role: '法师', bonus: { INT: 3, CHA: 1, CON: -2, STR: -1 } },
    'GA': { role: '战士', bonus: { STR: 2, CON: 1, INT: -1 } },
    'GT': { role: '辅助', bonus: { CHA: 2, INT: 1, STR: -2 } },
    'GC': { role: '重甲', bonus: { CON: 2, STR: 2, SPD: -2 } },
    'GG': { role: '英雄', bonus: { STR: 1, CON: 1, INT: 1, SPD: 1 } }
};

// =====================================================================
// 🕐 6岁寿命系统
// =====================================================================

export const AGE_STAGES = [
    { age: 0, name: '幼年', icon: '🍼', canBattle: false, canBlend: false, statMod: 0.50, blendExprMod: 0,    degradeChance: 0,    defectChance: 0 },
    { age: 1, name: '少年', icon: '🌱', canBattle: true,  canBlend: true,  statMod: 0.70, blendExprMod: 0.6,  degradeChance: 0,    defectChance: 0 },
    { age: 2, name: '青年', icon: '🌿', canBattle: true,  canBlend: true,  statMod: 0.85, blendExprMod: 0.8,  degradeChance: 0,    defectChance: 0 },
    { age: 3, name: '壮年', icon: '🔥', canBattle: true,  canBlend: true,  statMod: 1.00, blendExprMod: 1.0,  degradeChance: 0,    defectChance: 0 },
    { age: 4, name: '老年', icon: '🍂', canBattle: true,  canBlend: true,  statMod: 0.85, blendExprMod: 0.7,  degradeChance: 0.15, defectChance: 0.25 },
    { age: 5, name: '暮年', icon: '💀', canBattle: false, canBlend: true,  statMod: 0.60, blendExprMod: 0.5,  degradeChance: 0.30, defectChance: 0.50 },
];

export function getAgeStage(age) {
    if (age < 0) return AGE_STAGES[0];
    if (age >= AGE_STAGES.length) return AGE_STAGES[AGE_STAGES.length - 1];
    return AGE_STAGES[age];
}

// =====================================================================
// 🦠 突变系统
// =====================================================================

export const MUTATIONS = {
    head: [
        { id: 'horn_crown',   n: '尖刺角冠',   fx: { STR: 2, CHA: -1 }, passive: '近战反伤1' },
        { id: 'giant_brain',  n: '巨型脑沟',   fx: { INT: 3, SPD: -2 }, passive: '法力回复+1' },
        { id: 'echo_ear',     n: '回声耳膜',   fx: { LCK: 2, DEX: -1 }, passive: '闪避+8%' },
        { id: 'crystal_eye',  n: '水晶复眼',   fx: { DEX: 2, CHA: -2 }, passive: '暴击+10%' },
        { id: 'plated_skull', n: '骨板头颅',   fx: { CON: 2, INT: -1 }, passive: '护盾+2每回合' },
    ],
    side: [
        { id: 'blade_wing',   n: '刀锋翅膀',   fx: { STR: 2, CON: -1 }, passive: '荆棘1' },
        { id: 'gas_sac',      n: '气囊翅膀',   fx: { SPD: 1, STR: -2 }, passive: '闪避+10%' },
        { id: 'claw_arm',     n: '钩爪肢',     fx: { STR: 3, SPD: -1 }, passive: '攻击吸血10%' },
        { id: 'feather_fan',  n: '羽扇翼',     fx: { CHA: 2, STR: -1 }, passive: '队友治疗+20%' },
        { id: 'bone_spike',   n: '骨刺突',     fx: { STR: 1, DEX: 1, CHA: -2 }, passive: '多重攻击10%' },
    ],
    back: [
        { id: 'poison_spine', n: '毒棘阵列',   fx: { INT: 1, CHA: -2 }, passive: '攻击附毒' },
        { id: 'shell_armor',  n: '甲壳硬化',   fx: { CON: 3, SPD: -2 }, passive: '护盾+3每回合' },
        { id: 'flame_vent',   n: '火焰喷口',   fx: { STR: 2, CON: -1 }, passive: '攻击附灼烧' },
        { id: 'regen_fin',    n: '再生鳍',     fx: { CON: 1, STR: -1 }, passive: '每回合回复3HP' },
        { id: 'crystal_crest',n: '水晶脊',     fx: { INT: 2, LCK: 1, SPD: -1 }, passive: '法力回复+2' },
    ],
    body: [
        { id: 'thick_hide',   n: '厚皮体质',   fx: { CON: 2, DEX: -1 }, passive: '受伤-10%' },
        { id: 'nimble_body',  n: '灵活体质',   fx: { SPD: 2, CON: -2 }, passive: '闪避+12%' },
        { id: 'bulk_mass',    n: '巨型体质',   fx: { STR: 2, CON: 1, SPD: -3 }, passive: '击退效果' },
        { id: 'elastic_body', n: '弹性体质',   fx: { DEX: 2, STR: -1 }, passive: '反弹15%伤害' },
        { id: 'radiant_body', n: '辐射体质',   fx: { INT: 1, LCK: 1, CON: -1 }, passive: '突变率+5%' },
    ]
};

// =====================================================================
// 🩹 受伤 + 伤疤基因
// =====================================================================

export const INJURIES = [
    { id: 'broken_paw',   n: '断爪',     fx: { STR: -1 } },
    { id: 'torn_tendon',  n: '撕裂韧带', fx: { DEX: -1 } },
    { id: 'broken_rib',   n: '断肋',     fx: { CON: -2 } },
    { id: 'concussion',   n: '脑震荡',   fx: { INT: -1 } },
    { id: 'broken_leg',   n: '断腿',     fx: { SPD: -2 } },
    { id: 'disfigured',   n: '毁容',     fx: { CHA: -1 } },
    { id: 'jinxed',        n: '霉运',     fx: { LCK: -2 } },
];

// 伤疤基因: 受伤的父母可能传给后代的适应性突变 (buff+debuff)
export const SCAR_GENES = {
    'broken_paw':  { id: 'scar_paw',     n: '硬化爪',   fx: { STR: 1, SPD: -1 }, chance: 0.10 },
    'torn_tendon': { id: 'scar_tendon',  n: '韧带强化', fx: { DEX: 1, CON: -1 }, chance: 0.10 },
    'broken_rib':  { id: 'scar_rib',     n: '厚骨架',   fx: { CON: 2, DEX: -1 }, chance: 0.10 },
    'concussion':  { id: 'scar_skull',   n: '厚颅骨',   fx: { CON: 1, INT: -1 }, chance: 0.10 },
    'broken_leg':  { id: 'scar_leg',     n: '强化腿',   fx: { SPD: 1, STR: -1 }, chance: 0.10 },
    'disfigured':  { id: 'scar_face',    n: '威慑面容', fx: { STR: 1, CHA: -1 }, chance: 0.10 },
    'jinxed':      { id: 'scar_luck',    n: '逆境适应', fx: { LCK: 1, CHA: -1 }, chance: 0.10 },
};

// =====================================================================
// ⚠ 出生缺陷
// =====================================================================

export const BIRTH_DEFECTS = [
    { id: 'brittle_bone', n: '脆骨症',     fx: { CON: -2, SPD: -1 } },
    { id: 'weak_eyes',    n: '弱视',       fx: { DEX: -2 } },
    { id: 'slow_mind',    n: '迟钝',       fx: { INT: -2, LCK: -1 } },
    { id: 'frail_limbs',  n: '软骨病',     fx: { STR: -2, DEX: -1 } },
    { id: 'unstable_dna', n: 'DNA不稳定', fx: { CON: -1, CHA: -1, LCK: -1 } },
    { id: 'tiny_heart',   n: '心脏缺陷',   fx: { CON: -3 } },
    { id: 'no_ears',      n: '无耳',       fx: { DEX: -1, CHA: -2 } },
];

// =====================================================================
// 🧬 基因兼容性 (元素组合)
// =====================================================================

export const GENE_COMPAT = {
    synergy: [ // 协同: 后代表达额外+0.1
        { pair: ['AC','CA'], n: '锻造协同', desc: '火×钢: 力量系增强' },
        { pair: ['TA','TT'], n: '深海协同', desc: '水×冰: 体质系增强' },
        { pair: ['TC','CG'], n: '暗法协同', desc: '暗影×奥术: 智力系增强' },
        { pair: ['AA','AT'], n: '共生协同', desc: '草×毒: DOT增强' },
        { pair: ['GA','CC'], n: '圣糖协同', desc: '圣光×甜蜜: 治疗增强' },
        { pair: ['AG','TG'], n: '风暴协同', desc: '雷电×妖精: 速度增强' },
    ],
    conflict: [ // 冲突: 后代元素表达-0.1, 但5%概率独特突变
        { pair: ['AC','TT'], n: '热震荡', desc: '火×冰: 不稳定但可能变异' },
        { pair: ['GA','GG'], n: '光暗撕裂', desc: '圣光×虚空: 极不稳定' },
    ]
};

// =====================================================================
// 🤝 战场协同效果
// =====================================================================

export const SYNERGIES = [
    { type: 'element', match: 'same_element', n: '元素共鸣', desc: '同元素+15%全属性', fx: { allPercent: 0.15 } },
    { type: 'chassis', match: 'same_chassis', n: '体型共鸣', desc: '同体型CON+20%', fx: { CON_percent: 0.20 } },
    { type: 'combo', elements: ['AC','AG'], n: '熔岩雷暴', desc: '火+雷: 灼烧+麻痹', fx: { burnChance: 0.3, stunChance: 0.15 } },
    { type: 'combo', elements: ['TA','TT'], n: '冰封深海', desc: '水+冰: 减速×2', fx: { slowMult: 2 } },
    { type: 'combo', elements: ['TC','CG'], n: '暗影奥术', desc: '暗影+奥术: INT+30%', fx: { INT_percent: 0.30 } },
    { type: 'combo', elements: ['AA','AT'], n: '毒林共生', desc: '草+毒: DOT+50%', fx: { dotMult: 1.5 } },
    { type: 'combo', elements: ['CA','GC'], n: '钢沙风暴', desc: '钢+沙: 护盾+荆棘', fx: { shield: 3, thorns: 0.2 } },
    { type: 'combo', elements: ['GA','CC'], n: '圣糖祝福', desc: '圣光+甜蜜: 全队回2HP/回合', fx: { teamRegen: 2 } },
];

// =====================================================================
// 🏟️ 竞技场 — 3选1对手 + 分级奖励
// =====================================================================

export const ARENA_DIFFICULTY = [
    { key: 'weak',   label: '弱',   powerMult: [0.7, 0.9], rewardGold: [10, 20], rewardRP: 3,  catalystChance: 0.05 },
    { key: 'even',   label: '均衡', powerMult: [0.9, 1.1], rewardGold: [20, 35], rewardRP: 8,  catalystChance: 0.15 },
    { key: 'strong', label: '强',   powerMult: [1.1, 1.3], rewardGold: [35, 50], rewardRP: 15, catalystChance: 0.30 },
];

export const ARENA_LOSS_REWARD = { goldMin: 5, goldMax: 10, rp: 3 };

// 受伤等级 (被击倒时roll)
export const INJURY_TIERS = [
    { weight: 15, tier: 'none',   label: '无伤' },
    { weight: 50, tier: 'light',  label: '轻伤', statPenalty: 1, needsRest: false },
    { weight: 25, tier: 'heavy',  label: '重伤', statPenalty: 2, needsRest: true, healCost: 20 },
    { weight: 5,  tier: 'fatal',  label: '致命', death: true },
];

// =====================================================================
// 📋 设施费用
// =====================================================================

export const CLONER_BASE_COST = 5;
export const CLONER_VALUE_MULT = 0.8;   // 总费用 = base + baseValue × mult (降低让复制机可用)
export const CLONER_DEFECT_CHANCE = 0.30;

export const HEALER_COST_PER_INJURY = 15; // 从30降到15, 降低战败恢复成本

// 跳过今天时每只成年+生物的日报收入
export const DAILY_LAB_INCOME_PER_CREATURE = 2;

export const SMUGGLER_VISIT_CHANCE = 0.25;      // 每回合25%概率出现
export const SMUGGLER_MIN_INTERVAL = 3;          // 最少间隔3回合
export const SMUGGLER_PRICES = { fine: [30, 50], rare: [80, 120], legendary: [200, 200] };

export const FAILSAFE_CLEAN_REWARD = 5;

// =====================================================================
// 🔬 研究树
// =====================================================================

// Legacy: used by arena startGridBattle until full 3-pick-1 refactor
export const WAVE_TIERS = [
    { tier: 1, name: '训练场', waves: 3, npcPowerMin: 4,  npcPowerMax: 15,  baseReward: 8,  waveReward: 5 },
    { tier: 2, name: '竞技场', waves: 5, npcPowerMin: 15, npcPowerMax: 45,  baseReward: 15, waveReward: 10 },
    { tier: 3, name: '深渊',   waves: 7, npcPowerMin: 40, npcPowerMax: 120, baseReward: 30, waveReward: 20 },
];

export const RESEARCH_TREE = [
    { id: 'gene_lock',     n: '基因锁定',     cost: 30, desc: '繁殖时可锁定一个基因位', branch: 'breed' },
    { id: 'crispr',        n: 'CRISPR编辑',   cost: 80, desc: '解锁基因编辑(有风险)', branch: 'breed', requires: 'gene_lock' },
    { id: 'stabilizer',    n: '复制稳定剂',   cost: 50, desc: '复制机缺陷概率-50%', branch: 'breed' },
    { id: 'fertility',     n: '高效繁殖',     cost: 40, desc: '搅拌费用-30%', branch: 'breed' },
    { id: 'synergy_boost', n: '协同强化',     cost: 60, desc: '协同效果+50%', branch: 'battle' },
    { id: 'retire_shrine', n: '祖先祠堂',     cost: 45, desc: '退役生物提供全局加成', branch: 'breed' },
    { id: 'mutation_lab',  n: '突变实验室',   cost: 55, desc: '可主动诱发突变', branch: 'breed', requires: 'crispr' },
];
