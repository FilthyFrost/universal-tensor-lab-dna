// =====================================================================
// 共享可变状态
// =====================================================================

// --- 当前渲染用 DNA 与表达 ---
export let currentDNA = [['A','C'],['T','A'],['G','C'],['C','T'],['A','G'],['T','C']];
export function setCurrentDNA(val) { currentDNA = val; }

export let currentExpression = [1, 1, 1, 1, 1, 1];
export function setCurrentExpression(val) { currentExpression = val; }

export let isWireframeMode = false;
export function setIsWireframeMode(val) { isWireframeMode = val; }

// --- Three.js 场景引用 ---
export let scene = null;
export let camera = null;
export let renderer = null;
export let controls = null;
export function setSceneGlobals(s, c, r, ctrl) { scene = s; camera = c; renderer = r; controls = ctrl; }

export let currentGroup = null;
export function setCurrentGroup(val) { currentGroup = val; }

export let floatWrapper = null;
export function setFloatWrapper(val) { floatWrapper = val; }

export let exportableModel = null;
export function setExportableModel(val) { exportableModel = val; }

// --- 游戏状态 ---
export let nextCreatureId = 1;
export function bumpCreatureId() { return nextCreatureId++; }

export const game = {
    coins: 120,
    researchPoints: 0,
    dayCount: 0,                 // 回合计数(跳过今天+战斗后递增)
    inventory: [],
    upgrades: { geneLock: false },
    lockedGeneIndex: -1,
    phase: 'idle',               // idle | revealing | arena | deploying | mixing
    totalBreeds: 0,
    catalysts: { expr: 0, mutate: 0 },
    useCatalyst: null,
    research: {},                // { gene_lock: true, ... }
    ancestors: [],               // retired creatures
    // 走私贩
    smuggler: {
        active: false,
        creatures: [],           // smuggler's current stock
        daysSinceVisit: 0,       // turns since last visit
    },
};

/*
 * Creature object shape:
 * {
 *   id: number,
 *   dna: string[6],
 *   expression: number[6],
 *   age: number,                  // 0=幼年 1=少年 2=青年 3=壮年 4=老年 5=暮年 ≥6=死亡
 *   injuries: string[],           // 永久受伤ID
 *   mutations: { head?, side?, back?, body? },
 *   defects: string[],            // 出生缺陷ID
 *   scarGenes: string[],          // 伤疤基因ID (从受伤父母继承)
 *   battleMemory: {               // 战斗记忆 → 影响后代表达
 *     damageDealt: number,
 *     damageTaken: number,
 *     healed: number,
 *     dodged: number,
 *     wins: number,
 *     losses: number,
 *   },
 *   baseValue: number,
 *   wins: number, losses: number,
 *   streak: number, maxStreak: number,
 *   cooldown: boolean,            // 重伤后需要休息1回合
 *   isNPC: boolean?,
 * }
 */

// --- 战斗状态 ---
export let arenaState = { step: 'closed' };
export function setArenaState(val) { arenaState = val; }

export let bScene = null;
export function setBScene(val) { bScene = val; }

export let battleSpeed = 1;
