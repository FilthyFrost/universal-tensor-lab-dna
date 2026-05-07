// =====================================================================
// 🧪 DNA 常量字典 — 纯数据，无依赖
// =====================================================================

export const BASES = ['A', 'T', 'C', 'G'];
export const DNA_CODES = BASES.flatMap(a => BASES.map(b => `${a}${b}`));
export const GENE_NAMES = ["Element", "Chassis", "Head Tensor", "Side Tensor", "Dorsal Tensor", "Pattern"];

// params: ox, oy, oz (锚点), rad (半径), pow (尖锐度), sx, sy, sz (各向拉伸), cav (内凹腔体), tw (螺旋扭曲), wv (高频波), dr (下垂重力), blb (尖端圆球)
export const HEAD_TENSORS = {
    'AA': { n: '米老鼠耳', ox: 0.35, oy: 0.6, oz: 0.6, rad: 0.35, pow: 1.2, sx: 1.5, sy: 1.6, sz: -0.8, cav: 0.4, tw: 0, wv: 0, dr: 0, blb: 0 },
    'AT': { n: '六角恐龙鳃', ox: 0.4, oy: 0.4, oz: 0.4, rad: 0.35, pow: 1.8, sx: 1.8, sy: 0.2, sz: -0.5, cav: 0, tw: 0, wv: 8.0, dr: 0, blb: 0 },
    'AC': { n: '超长兔耳',  ox: 0.3, oy: 0.6, oz: 0.5, rad: 0.3, pow: 1.5, sx: 0.3, sy: 2.5, sz: -0.5, cav: 0.2, tw: 0, wv: 0, dr: 1.2, blb: 0 },
    'AG': { n: '恶魔尖角', ox: 0.3, oy: 0.5, oz: 0.7, rad: 0.25, pow: 2.0, sx: 0.4, sy: 1.8, sz: 0.5, cav: 0, tw: 0, wv: 0, dr: -0.8, blb: 0 },
    'TA': { n: '螺旋花朵', ox: 0.35, oy: 0.6, oz: 0.6, rad: 0.35, pow: 1.3, sx: 0.2, sy: 1.8, sz: 0.2, cav: 0, tw: 4.0, wv: 5.0, dr: 0, blb: 0 },
    'TT': { n: '多叉皇冠', ox: 0.25, oy: 0.7, oz: 0.4, rad: 0.4, pow: 1.5, sx: 0.8, sy: 1.5, sz: 0.8, cav: 0, tw: 0, wv: 10.0, dr: 0, blb: 0 },
    'TC': { n: '外星人触角', ox: 0.25, oy: 0.6, oz: 0.6, rad: 0.18, pow: 1.8, sx: 0.2, sy: 2.5, sz: 0.2, cav: 0, tw: 0, wv: 0, dr: 0.2, blb: 1.2 },
    'TG': { n: '摇曳火苗', ox: 0.3, oy: 0.6, oz: 0.6, rad: 0.35, pow: 2.5, sx: 0.2, sy: 2.2, sz: 0, cav: 0, tw: 0, wv: 15.0, dr: 0, blb: 0 },
    'CA': { n: '鲶鱼须髯', ox: 0.45, oy: 0.2, oz: 0.8, rad: 0.2, pow: 1.5, sx: 2.5, sy: 0.2, sz: 0.2, cav: 0, tw: 0, wv: 0, dr: 1.5, blb: 0 },
    'CT': { n: '大脑沟壑', ox: 0.3, oy: 0.7, oz: 0.5, rad: 0.4, pow: 1.2, sx: 1.0, sy: 1.0, sz: 1.0, cav: 0, tw: 0, wv: 18.0, dr: 0, blb: 0 },
    'CC': { n: '厚实猫耳', ox: 0.35, oy: 0.6, oz: 0.6, rad: 0.3, pow: 1.2, sx: 1.0, sy: 1.0, sz: -0.2, cav: 0.3, tw: 0, wv: 0, dr: 0, blb: 0 },
    'CG': { n: '水晶锐角', ox: 0.25, oy: 0.6, oz: 0.6, rad: 0.25, pow: 3.5, sx: 0.5, sy: 2.0, sz: 0.5, cav: 0, tw: 0, wv: 0, dr: 0, blb: 0 },
    'GA': { n: '下垂猎犬耳', ox: 0.4, oy: 0.5, oz: 0.5, rad: 0.35, pow: 1.2, sx: 1.2, sy: 0.2, sz: -0.5, cav: 0.1, tw: 0, wv: 0, dr: 2.5, blb: 0 },
    'GT': { n: '蛾子羽角', ox: 0.3, oy: 0.6, oz: 0.6, rad: 0.35, pow: 1.2, sx: 1.5, sy: 1.5, sz: -0.8, cav: 0, tw: 0, wv: 25.0, dr: 0, blb: 0 },
    'GC': { n: '大象弯鼻', ox: 0.2, oy: 0.4, oz: 0.8, rad: 0.25, pow: 1.5, sx: 0.2, sy: 0.2, sz: 2.5, cav: 0, tw: 0, wv: 0, dr: 1.5, blb: 0 },
    'GG': { n: '锤头鲨横骨', ox: 0.5, oy: 0.5, oz: 0.7, rad: 0.3, pow: 1.2, sx: 2.5, sy: 0.4, sz: 0.4, cav: 0, tw: 0, wv: 0, dr: 0, blb: 0 }
};

export const HEAD_CONTRACTS = {
    'AA': { firstRead: '两侧圆盘轮廓', protectedZone: 'front-wide', patternPolicy: 'protect-organ', markerPolicy: 'no-floating-ear-marker' },
    'AT': { firstRead: '侧后短鳃片', protectedZone: 'front-medium', patternPolicy: 'protect-organ', markerPolicy: 'none' },
    'AC': { firstRead: '长椭圆圆头兔耳，轻外倾', protectedZone: 'front-wide', patternPolicy: 'protect-organ', markerPolicy: 'no-floating-ear-marker' },
    'AG': { firstRead: '双短尖恶魔角', protectedZone: 'front-medium', patternPolicy: 'protect-organ', markerPolicy: 'none' },
    'TA': { firstRead: '头顶螺旋花瓣', protectedZone: 'front-medium', patternPolicy: 'protect-organ', markerPolicy: 'none' },
    'TT': { firstRead: '多叉皇冠尖端', protectedZone: 'front-medium', patternPolicy: 'protect-organ', markerPolicy: 'none' },
    'TC': { firstRead: '双外星触角加端部球感', protectedZone: 'front-medium', patternPolicy: 'protect-organ', markerPolicy: 'none' },
    'TG': { firstRead: '中线摇曳火苗', protectedZone: 'front-wide', patternPolicy: 'protect-organ', markerPolicy: 'none' },
    'CA': { firstRead: '口角多根鲶鱼须，短弧下垂', protectedZone: 'front-wide', patternPolicy: 'protect-organ', markerPolicy: 'none' },
    'CT': { firstRead: '头顶脑沟团块', protectedZone: 'front-medium', patternPolicy: 'protect-organ', markerPolicy: 'none' },
    'CC': { firstRead: '短三角猫耳，向外张开', protectedZone: 'front-wide', patternPolicy: 'protect-organ', markerPolicy: 'no-floating-ear-marker' },
    'CG': { firstRead: '双水晶锐角', protectedZone: 'front-medium', patternPolicy: 'protect-organ', markerPolicy: 'none' },
    'GA': { firstRead: '下垂猎犬耳', protectedZone: 'front-wide', patternPolicy: 'protect-organ', markerPolicy: 'none' },
    'GT': { firstRead: '蛾子羽角扇状边缘', protectedZone: 'front-medium', patternPolicy: 'protect-organ', markerPolicy: 'none' },
    'GC': { firstRead: '前下方长鼻加鼻孔', protectedZone: 'front-wide', patternPolicy: 'protect-organ', markerPolicy: 'nostrils-only' },
    'GG': { firstRead: '锤头鲨横向头骨', protectedZone: 'front-wide', patternPolicy: 'protect-organ', markerPolicy: 'none' }
};

export const HEAD_PRIMITIVES = {
    'AA': 'roundDiscPair', 'AT': 'sideGillFrill', 'AC': 'uprightOvalEarPair', 'AG': 'shortDevilHornPair',
    'TA': 'spiralPetalCrown', 'TT': 'forkedCrown', 'TC': 'antennaBulbPair', 'TG': 'singleFlame',
    'CA': 'catfishBarbelWhiskers', 'CT': 'brainFoldCap', 'CC': 'triEarPair', 'CG': 'crystalHornPair',
    'GA': 'houndEarPair', 'GT': 'mothAntennaFan', 'GC': 'sweptTubeTrunk', 'GG': 'hammerheadBar'
};

export const SIDE_PRIMITIVES = {
    'AA': 'none', 'AT': 'batMembrane', 'AC': 'leafBlade', 'AG': 'enginePod',
    'TA': 'angelFeatherFan', 'TT': 'lowFlipper', 'TC': 'gliderWing', 'TG': 'ruffleSkirt',
    'CA': 'sideBoneSpike', 'CT': 'bubblePod', 'CC': 'butterflyDoubleLobe', 'CG': 'spiralSideHorn',
    'GA': 'gillComb', 'GT': 'cloudFloatSac', 'GC': 'foldedPanelWing', 'GG': 'wideRibbonBand'
};

export const CATFISH_BARBEL_FIELDS = [
    { cx: 0.31, oy: 0.05, oz: 0.84, rx: 0.22, ry: 0.12, rz: 0.2, side: 0.24, down: -0.08, forward: 0.18, phase: 0.0 },
    { cx: 0.37, oy: -0.05, oz: 0.85, rx: 0.24, ry: 0.12, rz: 0.2, side: 0.34, down: -0.14, forward: 0.2, phase: 1.6 },
    { cx: 0.29, oy: -0.16, oz: 0.8, rx: 0.2, ry: 0.11, rz: 0.18, side: 0.2, down: -0.18, forward: 0.14, phase: 3.1 }
];

export const DORSAL_PRIMITIVES = {
    'AA': 'smooth', 'AT': 'anemoneBulbCrown', 'AC': 'branchingCoral', 'AG': 'pittedArmor',
    'TA': 'urchinSpineField', 'TT': 'craterMound', 'TC': 'jellyUmbrella', 'TG': 'oarfishRibbonSail',
    'CA': 'cerataFingerGarden', 'CT': 'glowingFaultVein', 'CC': 'molaClavusPlate', 'CG': 'spiralParasiteShell',
    'GA': 'shellCap', 'GT': 'sailfishBackSpear', 'GC': 'lionfishVenomRows', 'GG': 'mantaSoftCrest'
};

export const SIDE_TENSORS = {
    'AA': { n: '无侧翼', ox: 0, oy: 0, oz: 0, rad: 0, pow: 1, sx: 0, sy: 0, sz: 0, web: 0, twist: 0 },
    'AT': { n: '蝙蝠小翼', ox: 0.8, oy: 0, oz: 0, rad: 0.65, pow: 1.2, sx: 2.5, sy: -0.9, sz: 0, web: 0.5, twist: 0 },
    'AC': { n: '巨大树叶', ox: 0.8, oy: 0, oz: 0.2, rad: 0.7, pow: 1.2, sx: 2.2, sy: -0.8, sz: 1.5, web: 0, twist: 0 },
    'AG': { n: '战斗机引擎', ox: 0.8, oy: 0, oz: 0, rad: 0.4, pow: 1.5, sx: 2.0, sy: 0, sz: 0.8, web: 0, twist: 0 },
    'TA': { n: '天使羽翼', ox: 0.8, oy: 0.2, oz: -0.2, rad: 0.6, pow: 1.4, sx: 2.0, sy: 0.5, sz: -0.2, web: 1.5, twist: 0 },
    'TT': { n: '海龟脚蹼', ox: 0.8, oy: -0.2, oz: 0.3, rad: 0.6, pow: 1.2, sx: 2.0, sy: -0.5, sz: 1.0, web: 0, twist: -0.5 },
    'TC': { n: '飞鱼滑翔伞', ox: 0.8, oy: 0, oz: 0, rad: 0.8, pow: 1.0, sx: 3.0, sy: -0.5, sz: 0, web: 0.2, twist: 0 },
    'TG': { n: '波浪裙边', ox: 0.8, oy: -0.2, oz: 0, rad: 0.7, pow: 1.2, sx: 1.5, sy: 0, sz: 0, web: -2.0, twist: 0 },
    'CA': { n: '锋利骨刺', ox: 0.8, oy: 0, oz: 0, rad: 0.3, pow: 2.5, sx: 2.5, sy: 0, sz: 0, web: 0, twist: 0 },
    'CT': { n: '侧边水泡', ox: 0.8, oy: 0, oz: 0, rad: 0.4, pow: 0.8, sx: 1.0, sy: 1.0, sz: 1.0, web: 0, twist: 0 },
    'CC': { n: '蝴蝶翅膀', ox: 0.8, oy: 0.3, oz: 0, rad: 0.7, pow: 1.2, sx: 2.0, sy: 1.5, sz: 0, web: 0.3, twist: 0 },
    'CG': { n: '螺旋侧角', ox: 0.8, oy: 0, oz: 0, rad: 0.4, pow: 1.5, sx: 2.0, sy: 0, sz: 0, web: 0, twist: 5.0 },
    'GA': { n: '深海排鳃', ox: 0.8, oy: 0, oz: 0, rad: 0.6, pow: 1.2, sx: 1.2, sy: 0, sz: 0, web: 3.0, twist: 0 },
    'GT': { n: '云朵浮囊', ox: 0.8, oy: 0, oz: 0, rad: 0.5, pow: 1.2, sx: 1.5, sy: 1.0, sz: 1.5, web: 0.8, twist: 0 },
    'GC': { n: '机械折翼', ox: 0.8, oy: 0, oz: 0, rad: 0.6, pow: 1.5, sx: 2.0, sy: -0.5, sz: -0.5, web: 0, twist: 0 },
    'GG': { n: '超宽扁带', ox: 0.8, oy: -0.3, oz: 0, rad: 0.9, pow: 1.0, sx: 3.5, sy: 0, sz: 0.5, web: 0, twist: 0 }
};

export const BACK_TENSORS = {
    'AA': { n: '平滑无刺', type: 'smooth' }, 'AT': { n: '海葵球冠', type: 'garlic' },
    'AC': { n: '鹿角珊瑚', type: 'coral' },  'AG': { n: '蜂窝孔背', type: 'pitted' },
    'TA': { n: '海胆刺阵', type: 'fat_spikes' }, 'TT': { n: '深海喷孔', type: 'volcano' },
    'TC': { n: '水母伞盖', type: 'mushroom' }, 'TG': { n: '皇带鱼长帆', type: 'dorsal_fin' },
    'CA': { n: '裸鳃指簇', type: 'bubbles' }, 'CT': { n: '发光裂脊', type: 'crystals' },
    'CC': { n: '翻车鱼尾板', type: 'stegosaurus' }, 'CG': { n: '螺旋寄生壳', type: 'spiral' },
    'GA': { n: '甲壳盾背', type: 'shell' }, 'GT': { n: '旗鱼背枪', type: 'single_horn' },
    'GC': { n: '狮子鱼毒棘', type: 'dual_spikes' }, 'GG': { n: '蝠鲼肉冠', type: 'ridge' }
};

export const BODY_SHAPES = {
    'AA': {n:'水滴 (Teardrop)',sx:1.2,sy:1.0,sz:1.2}, 'AT': {n:'飞盘 (Pancake)',sx:2.0,sy:0.5,sz:1.2},
    'AC': {n:'胖豆 (Bean)',sx:1.4,sy:1.0,sz:1.2},     'AG': {n:'软条 (Slug)',sx:1.0,sy:0.8,sz:2.0},
    'TA': {n:'长方 (Brick)',sx:1.3,sy:0.9,sz:1.6},    'TT': {n:'圆球 (Sphere)',sx:1.2,sy:1.2,sz:1.2},
    'TC': {n:'海星 (Starfish)',sx:1.8,sy:0.6,sz:1.8}, 'TG': {n:'潜艇 (Sub)',sx:1.2,sy:0.8,sz:2.2},
    'CA': {n:'厚吐司 (Toast)',sx:1.5,sy:1.1,sz:1.2},  'CT': {n:'梭子 (Spindle)',sx:0.8,sy:0.8,sz:2.2},
    'CC': {n:'大头 (BigHead)',sx:1.5,sy:1.2,sz:1.0},  'CG': {n:'飞碟 (UFO)',sx:2.2,sy:0.4,sz:2.2},
    'GA': {n:'水饺 (Dumpling)',sx:1.6,sy:0.8,sz:1.2}, 'GT': {n:'葫芦 (Gourd)',sx:1.2,sy:1.1,sz:1.6},
    'GC': {n:'元宝 (Ingot)',sx:1.8,sy:1.0,sz:1.0},    'GG': {n:'巨兽 (Behemoth)',sx:1.8,sy:1.5,sz:1.8}
};

export const PALETTES = {
    'AA': {bg:'#f0fdf4', border:'#4ade80', name:'🍃 嫩芽草', b:['#4ade80','#22c55e'], a:['#fef08a','#d97706']},
    'AT': {bg:'#ecfdf5', border:'#34d399', name:'🧪 猛毒沼', b:['#34d399','#10b981'], a:['#818cf8','#4f46e5']},
    'AC': {bg:'#fff7ed', border:'#fb923c', name:'🔥 熔岩火', b:['#ef4444','#f97316'], a:['#fef08a','#991b1b']},
    'AG': {bg:'#fefce8', border:'#facc15', name:'⚡ 雷电星', b:['#facc15','#eab308'], a:['#1e40af','#9333ea']},
    'TA': {bg:'#f0f9ff', border:'#38bdf8', name:'💧 深海蓝', b:['#0ea5e9','#3b82f6'], a:['#e0f2fe','#fbcfe8']},
    'TT': {bg:'#eff6ff', border:'#60a5fa', name:'❄️ 极地冰', b:['#93c5fd','#60a5fa'], a:['#ffffff','#1e3a8a']},
    'TC': {bg:'#faf5ff', border:'#c084fc', name:'🦇 幽暗影', b:['#a855f7','#7e22ce'], a:['#fdf2f8','#1e293b']},
    'TG': {bg:'#fdf2f8', border:'#f472b6', name:'🌸 妖精粉', b:['#ec4899','#db2777'], a:['#fde047','#8b5cf6']},
    'CA': {bg:'#f8fafc', border:'#94a3b8', name:'⚙️ 机械钢', b:['#94a3b8','#64748b'], a:['#f59e0b','#ef4444']},
    'CT': {bg:'#f5f5f4', border:'#a8a29e', name:'🪨 荒野岩', b:['#a8a29e','#78716c'], a:['#84cc16','#14532d']},
    'CC': {bg:'#fff1f2', border:'#fb7185', name:'🍬 甜蜜糖', b:['#fb7185','#f43f5e'], a:['#2dd4bf','#0ea5e9']},
    'CG': {bg:'#fdf4ff', border:'#e879f9', name:'🔮 奥术紫', b:['#d946ef','#c026d3'], a:['#34d399','#facc15']},
    'GA': {bg:'#fffbeb', border:'#fde047', name:'🌟 圣光耀', b:['#fde047','#eab308'], a:['#ffffff','#fbbf24']},
    'GT': {bg:'#f0fdfa', border:'#2dd4bf', name:'🌊 浅湾青', b:['#2dd4bf','#14b8a6'], a:['#fef08a','#0f766e']},
    'GC': {bg:'#fff7ed', border:'#fdba74', name:'🏜️ 尘沙黄', b:['#fdba74','#f97316'], a:['#1e293b','#dc2626']},
    'GG': {bg:'#0f172a', border:'#334155', name:'🌌 虚空黑', b:['#334155','#1e293b'], a:['#22d3ee','#a855f7']}
};

export const PATTERNS = ['smooth','polka_dots','stripes','voronoi','zebra','gradient','smooth','polka_dots','stripes','voronoi','zebra','gradient','smooth','polka_dots','stripes','voronoi'];
