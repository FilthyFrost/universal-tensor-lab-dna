// =====================================================================
// 🎮 游戏逻辑 — 战斗记忆遗传 + 6岁寿命 + 三台设施 + 走私贩 + 3选1竞技场
// =====================================================================

import { PALETTES, HEAD_TENSORS, SIDE_TENSORS, BACK_TENSORS, BODY_SHAPES, BASES, PATTERNS } from './dna-constants.mjs';
import {
    COMMON_GENES, FINE_GENES, RARE_GENES, LEGENDARY_GENES, RARITY_ORDER,
    getGeneRarity, getRarityIndex, getExprTier, rollExprForRarity,
    GENE_BASE_SCORE, COLOR_GENE_BONUS,
    STAT_NAMES_7, STAT_GENE_MAP, CHASSIS_ROLE,
    MUTATIONS, INJURIES, BIRTH_DEFECTS, SCAR_GENES, GENE_COMPAT,
    SYNERGIES, ARENA_DIFFICULTY, ARENA_LOSS_REWARD, INJURY_TIERS,
    CLONER_BASE_COST, CLONER_VALUE_MULT, CLONER_DEFECT_CHANCE,
    HEALER_COST_PER_INJURY, SMUGGLER_PRICES,
    FAILSAFE_CLEAN_REWARD,
    getAgeStage
} from './game-constants.mjs';
import { game, bumpCreatureId } from './state.mjs';

// --- 特性名称 ---
export function getTraitName(idx, code) {
    if(idx===0) return PALETTES[code]?.name || code;
    if(idx===1) return BODY_SHAPES[code]?.n || code;
    if(idx===2) return HEAD_TENSORS[code]?.n || code;
    if(idx===3) return SIDE_TENSORS[code]?.n || code;
    if(idx===4) return BACK_TENSORS[code]?.n || code;
    if(idx===5) return PATTERNS[BASES.indexOf(code[0])*4+BASES.indexOf(code[1])] || code;
    return code;
}

export function normalizeDNACodes(codes) {
    if (!Array.isArray(codes) || codes.length !== 6) throw new Error('DNA must contain 6 two-base codes.');
    return codes.map(code => {
        if (typeof code === 'string' && code.length === 2) return [code[0], code[1]];
        if (Array.isArray(code) && code.length === 2) return code;
        throw new Error(`Invalid DNA code: ${code}`);
    });
}

// =====================================================================
// 📊 7属性计算
// =====================================================================

export function calcCreatureStats(creature) {
    const stats = {};
    for (let i = 0; i < STAT_NAMES_7.length; i++) {
        const statName = STAT_NAMES_7[i];
        const geneIdx = STAT_GENE_MAP[statName];
        let base;
        if (geneIdx === -1) {
            const avg = creature.dna.reduce((s, g) => s + GENE_BASE_SCORE[getGeneRarity(g)], 0) / 6;
            base = Math.round(avg * (creature.expression ? getExprTier(creature.expression[0]).mult : 1));
        } else {
            base = GENE_BASE_SCORE[getGeneRarity(creature.dna[geneIdx])];
            base = Math.round(base * (creature.expression ? getExprTier(creature.expression[geneIdx]).mult : 1));
        }
        stats[statName] = base;
    }

    // 体型职业加成
    const role = CHASSIS_ROLE[creature.dna[1]];
    if (role) for (const [s, v] of Object.entries(role.bonus)) stats[s] = (stats[s] || 0) + v;

    // 突变效果
    if (creature.mutations) for (const m of Object.values(creature.mutations)) {
        if (m?.fx) for (const [s, v] of Object.entries(m.fx)) stats[s] = (stats[s] || 0) + v;
    }

    // 伤疤基因效果
    if (creature.scarGenes) for (const sgId of creature.scarGenes) {
        const sg = Object.values(SCAR_GENES).find(s => s.id === sgId);
        if (sg) for (const [s, v] of Object.entries(sg.fx)) stats[s] = (stats[s] || 0) + v;
    }

    // 受伤效果
    if (creature.injuries) for (const injId of creature.injuries) {
        const inj = INJURIES.find(i => i.id === injId);
        if (inj) for (const [s, v] of Object.entries(inj.fx)) stats[s] = (stats[s] || 0) + v;
    }

    // 出生缺陷
    if (creature.defects) for (const defId of creature.defects) {
        const d = BIRTH_DEFECTS.find(x => x.id === defId);
        if (d) for (const [s, v] of Object.entries(d.fx)) stats[s] = (stats[s] || 0) + v;
    }

    // 年龄衰退
    const age = getAgeStage(creature.age ?? 3);
    for (const s of STAT_NAMES_7) stats[s] = Math.max(0, Math.round(stats[s] * age.statMod));

    // 派生
    stats.total = STAT_NAMES_7.reduce((s, k) => s + stats[k], 0);
    stats.maxHP = Math.max(1, stats.CON * 4);
    stats.maxMana = Math.max(1, stats.CHA * 3);
    stats.manaRegen = Math.max(0, stats.INT);
    stats.moveRange = Math.max(1, Math.floor(stats.SPD * 2 / 3));
    stats.critRate = 0.10 + (stats.LCK || 0) * 0.02;
    stats.dodgeRate = (stats.DEX || 0) * 0.008 + (stats.SPD || 0) * 0.005;
    stats.age = age;
    stats.role = role?.role || '通用';
    return stats;
}

// =====================================================================
// 💰 价值系统
// =====================================================================

export function calcComboMultiplier(dna) {
    const highCount = dna.filter(g => getGeneRarity(g) !== 'common').length;
    if (highCount >= 6) return { mult: 12, label: '完美连击!!!' };
    if (highCount >= 5) return { mult: 5,  label: '超级连击!!' };
    if (highCount >= 4) return { mult: 2.5, label: '大连击!' };
    if (highCount >= 3) return { mult: 1.5, label: '连击!' };
    return { mult: 1, label: '' };
}

export function calcBaseValue(dna, expression) {
    let total = 0;
    for (let i = 0; i < dna.length; i++) {
        const rarity = getGeneRarity(dna[i]);
        if (i === 0 || i === 5) { total += COLOR_GENE_BONUS[rarity]; }
        else { total += Math.round(GENE_BASE_SCORE[rarity] * (expression ? getExprTier(expression[i]).mult : 1)); }
    }
    return Math.round(total * calcComboMultiplier(dna).mult);
}

export function calcCreatureValue(creature) {
    const ageMod = getAgeStage(creature.age ?? 3).statMod;
    const injPenalty = (creature.injuries?.length || 0) * 0.1;
    return Math.max(2, Math.round(creature.baseValue * ageMod * (1 - injPenalty)));
}

export function getHighestRarity(dna) {
    for (const r of ['legendary', 'rare', 'fine']) if (dna.some(g => getGeneRarity(g) === r)) return r;
    return 'common';
}

export function calcBreedCost(parentA, parentB) {
    let cost = Math.max(5, Math.round((calcCreatureValue(parentA) + calcCreatureValue(parentB)) * 0.20));
    if (game.research.fertility) cost = Math.round(cost * 0.7);
    return cost;
}

// =====================================================================
// 🐣 生物创建
// =====================================================================

function emptyBattleMemory() {
    return { damageDealt: 0, damageTaken: 0, healed: 0, dodged: 0, wins: 0, losses: 0 };
}

export function generateExpressionForDNA(dna) {
    return dna.map(gene => rollExprForRarity(getGeneRarity(gene)));
}

export function createCreature(dna, expression, age) {
    const expr = expression || generateExpressionForDNA(dna);
    const id = bumpCreatureId();
    return {
        id, dna, expression: expr,
        age: age ?? 0,
        injuries: [], mutations: {}, defects: [], scarGenes: [],
        battleMemory: emptyBattleMemory(),
        baseValue: calcBaseValue(dna, expr),
        wins: 0, losses: 0, streak: 0, maxStreak: 0, cooldown: false
    };
}

export function generateWildDNA() {
    const dna = [];
    for (let i = 0; i < 6; i++) dna.push(COMMON_GENES[Math.floor(Math.random() * COMMON_GENES.length)]);
    if (Math.random() < 0.1) dna[Math.floor(Math.random() * 6)] = FINE_GENES[Math.floor(Math.random() * FINE_GENES.length)];
    return dna;
}

export function randomGeneOfRarity(rarity) {
    const pools = { common: COMMON_GENES, fine: FINE_GENES, rare: RARE_GENES, legendary: LEGENDARY_GENES };
    return pools[rarity][Math.floor(Math.random() * pools[rarity].length)];
}

function stepMutate(gene, direction) {
    const idx = getRarityIndex(getGeneRarity(gene));
    const newIdx = Math.max(0, Math.min(RARITY_ORDER.length - 1, idx + direction));
    return randomGeneOfRarity(RARITY_ORDER[newIdx]);
}

// =====================================================================
// 🧬 遗传算法 — 战斗记忆遗传
// =====================================================================

function inheritGene(geneA, geneB, upgradeChance) {
    const rarA = getRarityIndex(getGeneRarity(geneA));
    const rarB = getRarityIndex(getGeneRarity(geneB));
    const better = rarA >= rarB ? geneA : geneB;
    const weaker = rarA >= rarB ? geneB : geneA;
    const roll = Math.random();
    if (roll < 0.42) return better;
    if (roll < 0.60) return weaker;
    if (roll < 0.72) return randomGeneOfRarity(getGeneRarity(Math.random() < 0.5 ? better : weaker));
    if (roll < 0.72 + upgradeChance) return stepMutate(better, +1);
    if (roll < 0.72 + upgradeChance + 0.08) return stepMutate(weaker, -1);
    return better;
}

// 战斗记忆影响表达 (核心创新)
function inheritExpressionWithMemory(exprA, exprB, geneIdx, parentA, parentB) {
    let base = Math.random() < 0.5 ? exprA : exprB;
    base += (Math.random() - 0.5) * 0.15;

    const memA = parentA.battleMemory || {};
    const memB = parentB.battleMemory || {};
    const mem = {
        damageDealt: (memA.damageDealt || 0) + (memB.damageDealt || 0),
        damageTaken: (memA.damageTaken || 0) + (memB.damageTaken || 0),
        healed: (memA.healed || 0) + (memB.healed || 0),
        dodged: (memA.dodged || 0) + (memB.dodged || 0),
        wins: (memA.wins || 0) + (memB.wins || 0)
    };

    // gene[1]体型→CON, gene[2]头部→SPD, gene[3]侧翼→STR, gene[4]背部→INT, gene[5]花纹→DEX
    const memoryMap = {
        1: Math.min(0.15, mem.damageTaken / 200),
        2: Math.min(0.15, mem.dodged / 20),
        3: Math.min(0.15, mem.damageDealt / 200),
        4: Math.min(0.15, mem.healed / 100),
        5: Math.min(0.10, (mem.damageDealt + mem.dodged) / 300)
    };
    base += memoryMap[geneIdx] || 0;
    base += Math.min(0.05, mem.wins * 0.01); // 胜场加成
    return Math.max(0, Math.min(0.999, base));
}

// 基因兼容性检查
export function checkGeneCompatibility(parentA, parentB) {
    const elemA = parentA.dna[0], elemB = parentB.dna[0];
    for (const s of GENE_COMPAT.synergy) {
        if ((s.pair[0] === elemA && s.pair[1] === elemB) || (s.pair[1] === elemA && s.pair[0] === elemB))
            return { type: 'synergy', ...s };
    }
    for (const c of GENE_COMPAT.conflict) {
        if ((c.pair[0] === elemA && c.pair[1] === elemB) || (c.pair[1] === elemA && c.pair[0] === elemB))
            return { type: 'conflict', ...c };
    }
    return { type: 'neutral' };
}

// 突变遗传 (MewGenics: 15%概率)
function inheritMutations(parentA, parentB) {
    const result = {};
    const parts = ['head', 'side', 'back', 'body'];
    for (const part of parts) {
        const mutA = parentA.mutations?.[part];
        const mutB = parentB.mutations?.[part];
        if (mutA && Math.random() < 0.15) result[part] = mutA;
        else if (mutB && Math.random() < 0.15) result[part] = mutB;
    }
    for (const part of parts) {
        if (!result[part] && Math.random() < 0.05) {
            const pool = MUTATIONS[part];
            if (pool) result[part] = pool[Math.floor(Math.random() * pool.length)];
        }
    }
    return result;
}

// 伤疤基因遗传 — 受伤父母的伤疤可传给后代
function inheritScarGenes(parentA, parentB) {
    const scars = [];
    for (const parent of [parentA, parentB]) {
        if (!parent.injuries) continue;
        for (const injId of parent.injuries) {
            const sg = SCAR_GENES[injId];
            if (sg && Math.random() < sg.chance && !scars.includes(sg.id)) {
                scars.push(sg.id);
            }
        }
    }
    // 也继承父母已有的伤疤基因
    for (const parent of [parentA, parentB]) {
        if (!parent.scarGenes) continue;
        for (const sgId of parent.scarGenes) {
            if (!scars.includes(sgId)) scars.push(sgId);
        }
    }
    return scars;
}

// 出生缺陷 — 不再依赖近亲系数，仅依赖父母年龄
function rollDefects(parentA, parentB) {
    const defects = [];
    const ageA = getAgeStage(parentA.age ?? 3);
    const ageB = getAgeStage(parentB.age ?? 3);
    const maxDefectChance = Math.max(ageA.defectChance, ageB.defectChance);
    if (maxDefectChance > 0 && Math.random() < maxDefectChance) {
        defects.push(BIRTH_DEFECTS[Math.floor(Math.random() * BIRTH_DEFECTS.length)].id);
    }
    // 暮年: 额外25%概率第二个缺陷
    if ((ageA.age >= 5 || ageB.age >= 5) && Math.random() < 0.25) {
        const second = BIRTH_DEFECTS[Math.floor(Math.random() * BIRTH_DEFECTS.length)].id;
        if (!defects.includes(second)) defects.push(second);
    }
    return defects;
}

// 年龄导致基因降级
function applyAgeDegradation(childDNA, parentA, parentB) {
    const ageA = getAgeStage(parentA.age ?? 3);
    const ageB = getAgeStage(parentB.age ?? 3);
    const maxDegChance = Math.max(ageA.degradeChance, ageB.degradeChance);
    if (maxDegChance <= 0) return;
    for (let i = 0; i < childDNA.length; i++) {
        if (Math.random() < maxDegChance) {
            childDNA[i] = stepMutate(childDNA[i], -1);
        }
    }
}

// 主繁殖函数
export function breedCreatures(parentA, parentB, catalyst) {
    const upgradeChance = catalyst === 'mutate' ? 0.14 : 0.07;

    // 基因兼容性
    const compat = checkGeneCompatibility(parentA, parentB);

    // DNA遗传
    const childDNA = [];
    const childExpr = [];
    for (let i = 0; i < 6; i++) {
        if ((game.research.gene_lock || game.upgrades?.geneLock) && game.lockedGeneIndex === i) {
            childDNA.push(Math.random() < 0.5 ? parentA.dna[i] : parentB.dna[i]);
        } else {
            childDNA.push(inheritGene(parentA.dna[i], parentB.dna[i], upgradeChance));
        }

        // 表达: 战斗记忆 + 年龄修正
        let expr = inheritExpressionWithMemory(
            parentA.expression[i], parentB.expression[i], i, parentA, parentB
        );

        // 年龄修正: 取父母中更差的修正
        const ageA = getAgeStage(parentA.age ?? 3);
        const ageB = getAgeStage(parentB.age ?? 3);
        const blendMod = Math.min(ageA.blendExprMod, ageB.blendExprMod);
        expr *= blendMod;

        // 兼容性修正
        if (i === 0) { // 元素基因
            if (compat.type === 'synergy') expr += 0.1;
            if (compat.type === 'conflict') expr -= 0.1;
        }

        // 催化剂
        if (catalyst === 'expr' && i >= 1 && i <= 4) expr += 0.1;

        childExpr.push(Math.max(0, Math.min(0.999, expr)));
    }

    // 年龄降级
    applyAgeDegradation(childDNA, parentA, parentB);

    // 冲突兼容性: 5%概率独特突变
    let mutations = inheritMutations(parentA, parentB);
    if (compat.type === 'conflict' && Math.random() < 0.05) {
        const parts = ['head', 'side', 'back', 'body'];
        const part = parts[Math.floor(Math.random() * parts.length)];
        if (!mutations[part]) {
            const pool = MUTATIONS[part];
            mutations[part] = pool[Math.floor(Math.random() * pool.length)];
        }
    }

    // 伤疤基因
    const scarGenes = inheritScarGenes(parentA, parentB);

    // 缺陷
    const defects = rollDefects(parentA, parentB);

    game.totalBreeds++;
    const child = createCreature(childDNA, childExpr, 0); // age=0 幼年
    child.mutations = mutations;
    child.scarGenes = scarGenes;
    child.defects = defects;
    child.baseValue = calcBaseValue(childDNA, childExpr);
    return child;
}

// =====================================================================
// 📋 复制机
// =====================================================================

export function cloneCreature(source) {
    const cost = CLONER_BASE_COST + calcBaseValue(source.dna, source.expression) * CLONER_VALUE_MULT;
    if (game.coins < cost) return null;
    if (game.inventory.length >= 8) return null;
    game.coins -= cost;

    const clone = createCreature([...source.dna], [...source.expression], source.age);
    clone.mutations = { ...source.mutations };
    clone.injuries = [...(source.injuries || [])];
    clone.defects = [...(source.defects || [])];
    clone.scarGenes = [...(source.scarGenes || [])];
    // 复制品无战斗记忆(没亲身经历)
    clone.battleMemory = { damageDealt: 0, damageTaken: 0, healed: 0, dodged: 0, wins: 0, losses: 0 };

    // 30%概率复制缺陷
    let defectChance = CLONER_DEFECT_CHANCE;
    if (game.research.stabilizer) defectChance *= 0.5;
    if (Math.random() < defectChance) {
        const defect = BIRTH_DEFECTS[Math.floor(Math.random() * BIRTH_DEFECTS.length)];
        if (!clone.defects.includes(defect.id)) clone.defects.push(defect.id);
    }

    clone.baseValue = calcBaseValue(clone.dna, clone.expression);
    return clone;
}

export function getCloneCost(source) {
    return CLONER_BASE_COST + calcBaseValue(source.dna, source.expression) * CLONER_VALUE_MULT;
}

// =====================================================================
// 💊 治疗仪
// =====================================================================

export function healInjury(creature, injuryId) {
    if (game.coins < HEALER_COST_PER_INJURY) return false;
    const idx = creature.injuries.indexOf(injuryId);
    if (idx === -1) return false;
    game.coins -= HEALER_COST_PER_INJURY;
    creature.injuries.splice(idx, 1);
    creature.cooldown = false; // 治疗后解除冷却
    return true;
}

// =====================================================================
// 🩹 受伤
// =====================================================================

export function rollInjury() {
    return INJURIES[Math.floor(Math.random() * INJURIES.length)];
}

export function rollInjuryTier() {
    const totalWeight = INJURY_TIERS.reduce((s, t) => s + t.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const tier of INJURY_TIERS) {
        roll -= tier.weight;
        if (roll <= 0) return tier;
    }
    return INJURY_TIERS[0];
}

// =====================================================================
// 🕐 跳过今天
// =====================================================================

export function skipDay() {
    const deaths = [];
    for (const c of game.inventory) {
        c.age = (c.age ?? 0) + 1;
        c.cooldown = false; // 重伤恢复
        if (c.age >= 6) deaths.push(c);
    }
    for (const d of deaths) {
        const idx = game.inventory.indexOf(d);
        if (idx >= 0) game.inventory.splice(idx, 1);
    }
    game.dayCount++;
    game.smuggler.daysSinceVisit++;
    return deaths;
}

// =====================================================================
// 🤝 协同检测
// =====================================================================

export function detectSynergies(team) {
    const active = [];
    const elements = team.map(c => c.dna[0]);
    const chassis = team.map(c => c.dna[1]);
    const elemCounts = {};
    elements.forEach(e => { elemCounts[e] = (elemCounts[e] || 0) + 1; });
    for (const count of Object.values(elemCounts)) {
        if (count >= 2) { active.push(SYNERGIES.find(s => s.match === 'same_element')); break; }
    }
    const chassisCounts = {};
    chassis.forEach(c => { chassisCounts[c] = (chassisCounts[c] || 0) + 1; });
    for (const count of Object.values(chassisCounts)) {
        if (count >= 2) { active.push(SYNERGIES.find(s => s.match === 'same_chassis')); break; }
    }
    const elemSet = new Set(elements);
    for (const syn of SYNERGIES.filter(s => s.type === 'combo')) {
        if (syn.elements.every(e => elemSet.has(e))) active.push(syn);
    }
    return active.filter(Boolean);
}

// =====================================================================
// 🏟️ 3选1对手生成
// =====================================================================

export function generateArenaOpponents(playerPower) {
    return ARENA_DIFFICULTY.map(diff => {
        const [lo, hi] = diff.powerMult;
        const targetPower = playerPower * (lo + Math.random() * (hi - lo));
        const count = Math.max(1, Math.min(3, Math.round(targetPower / 30)));
        const npcs = [];
        for (let i = 0; i < count; i++) npcs.push(generateNPC(targetPower / count));
        const totalStat = npcs.reduce((s, n) => s + calcCreatureStats(n).total, 0);
        return { difficulty: diff, npcs, totalPower: totalStat };
    });
}

export function calcArenaReward(difficulty, won) {
    if (won) {
        const gold = difficulty.rewardGold[0] + Math.floor(Math.random() * (difficulty.rewardGold[1] - difficulty.rewardGold[0]));
        return { gold, rp: difficulty.rewardRP, catalystChance: difficulty.catalystChance };
    }
    return {
        gold: ARENA_LOSS_REWARD.goldMin + Math.floor(Math.random() * (ARENA_LOSS_REWARD.goldMax - ARENA_LOSS_REWARD.goldMin)),
        rp: ARENA_LOSS_REWARD.rp, catalystChance: 0
    };
}

// =====================================================================
// 🕵️ 走私贩
// =====================================================================

export function generateSmugglerStock() {
    const stock = [];
    const count = 1 + (Math.random() < 0.3 ? 1 : 0);
    for (let i = 0; i < count; i++) {
        const rarityRoll = Math.random();
        let rarity, price;
        if (rarityRoll < 0.05) {
            rarity = 'legendary';
            price = SMUGGLER_PRICES.legendary[0];
        } else if (rarityRoll < 0.35) {
            rarity = 'rare';
            price = SMUGGLER_PRICES.rare[0] + Math.floor(Math.random() * (SMUGGLER_PRICES.rare[1] - SMUGGLER_PRICES.rare[0]));
        } else {
            rarity = 'fine';
            price = SMUGGLER_PRICES.fine[0] + Math.floor(Math.random() * (SMUGGLER_PRICES.fine[1] - SMUGGLER_PRICES.fine[0]));
        }
        const dna = [];
        for (let j = 0; j < 6; j++) {
            if (Math.random() < (rarity === 'legendary' ? 0.5 : rarity === 'rare' ? 0.3 : 0.15)) {
                dna.push(randomGeneOfRarity(rarity));
            } else {
                dna.push(randomGeneOfRarity(Math.random() < 0.5 ? 'common' : 'fine'));
            }
        }
        const creature = createCreature(dna, null, 2); // 青年
        stock.push({ creature, price, rarity });
    }
    return stock;
}

// =====================================================================
// ⚔️ NPC生成 + 战斗
// =====================================================================

export function generateNPC(powerLevel) {
    const dna = [];
    for (let i = 0; i < 6; i++) {
        if (powerLevel > 80 && Math.random() < 0.25) dna.push(randomGeneOfRarity('rare'));
        else if (powerLevel > 30 && Math.random() < 0.35) dna.push(randomGeneOfRarity('fine'));
        else dna.push(randomGeneOfRarity('common'));
    }
    const npc = createCreature(dna, null, 3); // 壮年NPC
    npc.isNPC = true;
    if (powerLevel > 50) {
        const parts = ['head', 'side', 'back', 'body'];
        const part = parts[Math.floor(Math.random() * parts.length)];
        const pool = MUTATIONS[part];
        if (pool && Math.random() < 0.4) npc.mutations[part] = pool[Math.floor(Math.random() * pool.length)];
    }
    return npc;
}

// =====================================================================
// ⚔️ 技能表 + 战斗效果
// =====================================================================

const SKILL_TABLE = {
    body: {
        AA:{n:'水滴护盾',type:'def_buff',val:0.3,dur:1,manaCost:2}, AT:{n:'飞盘旋转',type:'dodge',val:1,dur:1,manaCost:3},
        AC:{n:'豆形弹跳',type:'reflect',val:0.3,dur:1,manaCost:3}, AG:{n:'蛞蝓黏液',type:'slow',val:0.3,dur:2,manaCost:2},
        TA:{n:'砖墙',type:'def_buff',val:0.4,dur:2,manaCost:4}, TT:{n:'圆球弹跳',type:'reflect',val:0.4,dur:1,manaCost:3},
        TC:{n:'海星展臂',type:'atk_buff',val:0.3,dur:2,manaCost:3}, TG:{n:'潜艇冲撞',type:'attack',val:8,pierce:true,manaCost:3},
        CA:{n:'吐司硬壳',type:'def_buff',val:0.5,dur:1,manaCost:3}, CT:{n:'梭子穿刺',type:'attack',val:10,manaCost:2},
        CC:{n:'大头冲击',type:'attack',val:12,manaCost:3}, CG:{n:'飞碟力场',type:'dodge',val:1,dur:1,manaCost:4},
        GA:{n:'饺子翻滚',type:'heal',val:8,manaCost:3}, GT:{n:'葫芦吸收',type:'drain',val:6,manaCost:3},
        GC:{n:'元宝重击',type:'attack',val:15,pierce:true,manaCost:5}, GG:{n:'巨兽践踏',type:'attack',val:20,pierce:true,manaCost:6}
    },
    head: {
        AA:{n:'鼠耳回声',type:'attack',val:5,pierce:true,manaCost:2}, AT:{n:'鳃片喷射',type:'slow',val:0.3,dur:2,manaCost:2},
        AC:{n:'兔耳聆听',type:'spd_buff',val:1,dur:1,manaCost:2}, AG:{n:'恶魔低吼',type:'atk_debuff',val:0.3,dur:2,manaCost:3},
        TA:{n:'花瓣旋风',type:'attack',val:7,manaCost:2}, TT:{n:'皇冠威压',type:'atk_debuff',val:0.4,dur:1,manaCost:3},
        TC:{n:'触角电击',type:'stun',val:1,dur:1,manaCost:4}, TG:{n:'火焰吐息',type:'dot',val:4,dur:3,manaCost:3},
        CA:{n:'鲶须感知',type:'spd_buff',val:1,dur:2,manaCost:2}, CT:{n:'脑波干扰',type:'stun',val:1,dur:1,manaCost:4},
        CC:{n:'猫耳反射',type:'dodge',val:1,dur:1,manaCost:3}, CG:{n:'水晶共鸣',type:'attack',val:14,pierce:true,manaCost:5},
        GA:{n:'猎犬追踪',type:'attack',val:10,manaCost:3}, GT:{n:'蛾粉催眠',type:'stun',val:1,dur:1,manaCost:4},
        GC:{n:'象鼻重击',type:'attack',val:15,stun:true,manaCost:5}, GG:{n:'锤头粉碎',type:'attack',val:25,pierce:true,manaCost:7}
    },
    side: {
        AA:{n:'无翼冲撞',type:'attack',val:4,manaCost:1}, AT:{n:'蝠翼俯冲',type:'drain',val:5,manaCost:3},
        AC:{n:'叶刃切割',type:'dot',val:3,dur:3,manaCost:2}, AG:{n:'引擎冲锋',type:'attack',val:8,manaCost:2},
        TA:{n:'羽翼横扫',type:'attack',val:9,manaCost:2}, TT:{n:'脚蹼拍击',type:'attack',val:7,slow:true,manaCost:2},
        TC:{n:'滑翔利刃',type:'attack',val:10,pierce:true,manaCost:3}, TG:{n:'波浪冲击',type:'attack',val:8,manaCost:2},
        CA:{n:'骨刺穿刺',type:'attack',val:12,pierce:true,manaCost:4}, CT:{n:'气泡爆破',type:'attack',val:10,manaCost:3},
        CC:{n:'蝶翼旋风',type:'multi',val:6,hits:2,manaCost:4}, CG:{n:'螺旋钻击',type:'attack',val:14,manaCost:4},
        GA:{n:'鳃梳毒雾',type:'dot',val:5,dur:2,manaCost:3}, GT:{n:'云雾窒息',type:'atk_debuff',val:0.5,dur:2,manaCost:4},
        GC:{n:'折翼斩',type:'attack',val:16,manaCost:4}, GG:{n:'巨翼风暴',type:'attack',val:22,manaCost:6}
    },
    back: {
        AA:{n:'光滑后背',type:'heal',val:5,manaCost:2}, AT:{n:'海葵再生',type:'heal',val:8,manaCost:3},
        AC:{n:'珊瑚壁垒',type:'def_buff',val:0.4,dur:2,manaCost:3}, AG:{n:'蜂窝甲',type:'reflect',val:0.5,dur:1,manaCost:4},
        TA:{n:'海胆反刺',type:'reflect',val:0.4,dur:2,manaCost:3}, TT:{n:'火山喷发',type:'attack',val:12,self_dmg:4,manaCost:3},
        TC:{n:'水母放电',type:'attack',val:10,stun:true,manaCost:4}, TG:{n:'长帆加速',type:'spd_buff',val:1,dur:3,manaCost:3},
        CA:{n:'裸鳃毒素',type:'dot',val:4,dur:3,manaCost:3}, CT:{n:'裂脊放电',type:'attack',val:14,pierce:true,manaCost:5},
        CC:{n:'尾板猛击',type:'attack',val:13,manaCost:3}, CG:{n:'寄生缠绕',type:'drain',val:10,manaCost:4},
        GA:{n:'甲壳反射',type:'dodge',val:1,dur:1,manaCost:4}, GT:{n:'旗鱼突刺',type:'attack',val:18,pierce:true,manaCost:5},
        GC:{n:'毒棘阵',type:'dot',val:6,dur:3,manaCost:4}, GG:{n:'蝠鲼冲击',type:'attack',val:20,heal:10,manaCost:6}
    }
};
const SKILL_SLOTS = ['body', 'head', 'side', 'back'];

export function getCreatureSkills(creature) {
    return SKILL_SLOTS.map((slot, i) => {
        const geneIdx = i + 1;
        const gene = creature.dna[geneIdx];
        const skill = SKILL_TABLE[slot][gene] || SKILL_TABLE[slot]['AA'];
        const exprMult = creature.expression ? getExprTier(creature.expression[geneIdx]).mult : 1;
        return { ...skill, gene, slot, exprMult, cd: 0, maxCd: (skill.type === 'attack' || skill.type === 'heal') ? 0 : 2 };
    });
}

export function applySkillEffect(skill, attacker, defender, aStats, dStats, aHP, dHP, aBuffs, dBuffs) {
    const em = skill.exprMult;
    const result = { dmg: 0, heal: 0, selfDmg: 0, text: '', crit: false, dodged: false };

    if (skill.type === 'attack') {
        let dmg = Math.round(skill.val * em * (0.85 + Math.random() * 0.3));
        dmg += Math.round(aStats.STR * 0.5);
        if (!skill.pierce) dmg = Math.max(1, dmg - Math.round(dStats.CON * 0.3));
        if (Math.random() < aStats.critRate) { dmg = Math.round(dmg * 1.8); result.crit = true; }
        if (dBuffs.dodge) { dmg = 0; result.text = '闪避!'; result.dodged = true; dBuffs.dodge = false; }
        else if (Math.random() < dStats.dodgeRate) { dmg = 0; result.text = '闪避!'; result.dodged = true; }
        else if (dBuffs.reflect > 0) { result.selfDmg = Math.round(dmg * dBuffs.reflect); result.text = `反弹${result.selfDmg}!`; }
        result.dmg = dmg;
        if (skill.stun) dBuffs.stun = (dBuffs.stun || 0) + 1;
        if (skill.slow) dBuffs.spdMod = (dBuffs.spdMod || 0) - 0.3;
        if (skill.heal) result.heal = Math.round(skill.heal * em);
    } else if (skill.type === 'heal') {
        result.heal = Math.round((skill.val + aStats.INT * 0.3) * em);
    } else if (skill.type === 'drain') {
        result.dmg = Math.round(skill.val * em); result.heal = result.dmg;
        if (dBuffs.dodge) { result.dmg = 0; result.heal = 0; result.text = '闪避!'; result.dodged = true; dBuffs.dodge = false; }
    } else if (skill.type === 'dot') {
        dBuffs.dot = (dBuffs.dot || 0) + Math.round(skill.val * em);
        dBuffs.dotDur = Math.max(dBuffs.dotDur || 0, skill.dur);
        result.text = `DOT ${Math.round(skill.val * em)}/回合`;
    } else if (skill.type === 'multi') {
        let total = 0;
        for (let h = 0; h < (skill.hits || 2); h++) { let d = Math.round(skill.val * em * (0.85 + Math.random() * 0.3)); d = Math.max(1, d - Math.round(dStats.CON * 0.3)); total += d; }
        result.dmg = total; result.text = `${skill.hits || 2}连击!`;
    } else if (skill.type === 'def_buff') { aBuffs.defMod = (aBuffs.defMod || 0) + skill.val; aBuffs.defDur = Math.max(aBuffs.defDur || 0, skill.dur); result.text = `DEF+${Math.round(skill.val*100)}%`; }
    else if (skill.type === 'atk_buff') { aBuffs.atkMod = (aBuffs.atkMod || 0) + skill.val; aBuffs.atkDur = Math.max(aBuffs.atkDur || 0, skill.dur); result.text = `ATK+${Math.round(skill.val*100)}%`; }
    else if (skill.type === 'atk_debuff') { dBuffs.atkMod = (dBuffs.atkMod || 0) - skill.val; dBuffs.atkDur = Math.max(dBuffs.atkDur || 0, skill.dur || 2); result.text = `ATK-${Math.round(skill.val*100)}%`; }
    else if (skill.type === 'dodge') { aBuffs.dodge = true; result.text = '闪避姿态!'; }
    else if (skill.type === 'reflect') { aBuffs.reflect = skill.val; aBuffs.reflectDur = skill.dur; result.text = `反弹${Math.round(skill.val*100)}%`; }
    else if (skill.type === 'slow') { dBuffs.spdMod = (dBuffs.spdMod || 0) - skill.val; dBuffs.spdDur = Math.max(dBuffs.spdDur || 0, skill.dur); result.dmg = Math.round(6 * em); result.text = '减速!'; }
    else if (skill.type === 'stun') { dBuffs.stun = (dBuffs.stun || 0) + 1; result.text = '晕眩!'; }
    else if (skill.type === 'spd_buff') { aBuffs.spdBuff = true; aBuffs.spdBuffDur = skill.dur; result.text = '加速!'; }

    if (skill.self_dmg) result.selfDmg += Math.round(skill.self_dmg * em);
    return result;
}

export function tickBuffs(buffs) {
    if (buffs.defDur) { buffs.defDur--; if (buffs.defDur <= 0) buffs.defMod = 0; }
    if (buffs.atkDur) { buffs.atkDur--; if (buffs.atkDur <= 0) buffs.atkMod = 0; }
    if (buffs.spdDur) { buffs.spdDur--; if (buffs.spdDur <= 0) buffs.spdMod = 0; }
    if (buffs.reflectDur) { buffs.reflectDur--; if (buffs.reflectDur <= 0) buffs.reflect = 0; }
    if (buffs.spdBuffDur) { buffs.spdBuffDur--; if (buffs.spdBuffDur <= 0) buffs.spdBuff = false; }
    if (buffs.stun && buffs.stun > 0) buffs.stun--;
    let dotDmg = 0;
    if (buffs.dot && buffs.dotDur > 0) { dotDmg = buffs.dot; buffs.dotDur--; if (buffs.dotDur <= 0) buffs.dot = 0; }
    return dotDmg;
}

export function npcChooseSkill(skills, nHP, nMaxHP, pHP, pBuffs, mana) {
    const available = skills.filter(s => s.cd <= 0 && (s.manaCost || 0) <= mana);
    if (!available.length) {
        const cheapest = skills.filter(s => s.cd <= 0).sort((a, b) => (a.manaCost || 0) - (b.manaCost || 0));
        return cheapest[0] || skills[0];
    }
    if (nHP < nMaxHP * 0.3) { const heals = available.filter(s => s.type === 'heal' || s.type === 'drain'); if (heals.length) return heals[0]; }
    if (pBuffs.dodge) { const piercing = available.filter(s => s.pierce || s.type === 'dot' || s.type === 'stun'); if (piercing.length) return piercing[0]; }
    const attacks = available.filter(s => s.type === 'attack' || s.type === 'multi' || s.type === 'drain');
    if (attacks.length && Math.random() < 0.7) return attacks[Math.floor(Math.random() * attacks.length)];
    return available[Math.floor(Math.random() * available.length)];
}

// re-exports
export { STAT_NAMES_7 as STAT_NAMES };
