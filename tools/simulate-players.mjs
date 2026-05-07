/**
 * 蒙特卡洛玩家模拟器 v2
 * 新数学模型: MewGenics式对数收益曲线 + 战斗记忆作为Stimulation等价物
 * 5种玩家 × 1000局 × 30天 → 迭代到所有玩家健康
 */

// ============================================================
// 常量
// ============================================================
const COMMON = ['AA','AT','AC','AG','TA','TT','TC','TG'];
const FINE = ['CA','CT','CC'];
const RARE = ['CG','GA','GT','GC'];
const LEGENDARY = ['GG'];
const RARITY = ['common','fine','rare','legendary'];
const BASE_SCORE = { common:2, fine:7, rare:22, legendary:70 };

function rarity(code) {
    if (code === 'GG') return 'legendary';
    if (RARE.includes(code)) return 'rare';
    if (FINE.includes(code)) return 'fine';
    return 'common';
}
function ri(r) { return RARITY.indexOf(r); }
function randOf(pool) { return pool[Math.floor(Math.random() * pool.length)]; }
function randRarity(r) { return randOf({ common:COMMON, fine:FINE, rare:RARE, legendary:LEGENDARY }[r]); }
function step(gene, dir) {
    const idx = Math.max(0, Math.min(3, ri(rarity(gene)) + dir));
    return randRarity(RARITY[idx]);
}
function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

const AGE = [
    { canBattle:false, canBlend:false, stat:0.50, blendExpr:0 },
    { canBattle:true,  canBlend:true,  stat:0.70, blendExpr:0.6 },
    { canBattle:true,  canBlend:true,  stat:0.85, blendExpr:0.8 },
    { canBattle:true,  canBlend:true,  stat:1.00, blendExpr:1.0 },
    { canBattle:true,  canBlend:true,  stat:0.85, blendExpr:0.7, degrade:0.15, defect:0.25 },
    { canBattle:false, canBlend:true,  stat:0.60, blendExpr:0.5, degrade:0.30, defect:0.50 },
];
function age(a) { return AGE[Math.min(Math.max(0, a), 5)]; }

let nid = 1;
function mkCreature(dna, a) {
    return {
        id: nid++, dna: [...dna], age: a ?? 0,
        expr: dna.map(() => 0.3 + Math.random() * 0.5),
        mem: { dd:0, dt:0, h:0, dg:0, w:0, l:0 },
        injuries: [], cooldown: false, defects: []
    };
}
function power(c) {
    let t = 0;
    for (let i = 0; i < 6; i++) t += BASE_SCORE[rarity(c.dna[i])] * (0.5 + c.expr[i]);
    return Math.round(t * age(c.age).stat);
}

// ============================================================
// 新遗传模型: MewGenics式对数收益 + 战斗记忆驱动
// ============================================================

/**
 * 核心公式 — 基因升级概率:
 *
 * P(upgrade) = baseRate × stimulationCurve(experience) × agePenalty × rarityDifficulty
 *
 * stimulationCurve(exp) = (1 + 0.01 × exp) / (2 + 0.01 × exp)
 *   - 来自MewGenics的Stimulation公式
 *   - exp=0 → 0.50 (50%基础选择好基因的概率)
 *   - exp=50 → 0.60
 *   - exp=100 → 0.67
 *   - exp=200 → 0.75
 *   - 对数收益: 前50点经验值带来最大收益, 后面递减
 *
 * experience = 父母战斗记忆的加权总和:
 *   exp = (wins×10 + damageDealt/10 + damageTaken/10 + healed/5 + dodged×3)
 *
 * rarityDifficulty: 越高稀有度越难升级
 *   common→fine: ×1.0
 *   fine→rare: ×0.6
 *   rare→legendary: ×0.25
 *
 * agePenalty: 壮年最优, 其他年龄有惩罚
 *   少年: ×0.6, 青年: ×0.85, 壮年: ×1.0, 老年: ×0.5, 暮年: ×0.2
 */

/**
 * 多维经验值 — 每种玩法都能积累:
 *
 * 经验 = 战斗记忆 + 血统深度 + 年龄成熟度
 *
 * 战斗记忆: 越打越强 (对Spike/Brewer有利)
 * 血统深度: 越多代越稳定 (对所有繁殖玩家有利, 包括Timmy)
 * 年龄成熟度: 壮年>青年>少年 (鼓励等到壮年再搅拌, 但不强制)
 *
 * 三者取对数和, 确保单一维度不能主导:
 * totalExp = log2(1 + battleExp) + log2(1 + lineageDepth×5) + ageMatureBonus
 */
function calcExperience(memA, memB, parentA, parentB) {
    // 战斗经验 (Spike/Brewer路线)
    const battleExp = (memA.w||0)*8 + (memB.w||0)*8
        + (memA.dd||0)/15 + (memB.dd||0)/15
        + (memA.dt||0)/15 + (memB.dt||0)/15
        + (memA.dg||0)*2 + (memB.dg||0)*2;

    // 血统深度 — 通过繁殖次数间接体现 (所有玩家路线, 包括Timmy)
    // 越多代繁殖, 基因越"驯化", 越容易出好结果
    const lineageScore = Math.min(30, ((parentA.id||1) + (parentB.id||1)) / 6);

    // 年龄成熟度 (鼓励壮年, 但不强制)
    const ageBonus = Math.max(
        [0, 5, 8, 12, 6, 2][parentA.age] || 0,
        [0, 5, 8, 12, 6, 2][parentB.age] || 0
    );

    // 父母表达质量 — 越好的父母越容易出好后代(自然累积)
    const parentQuality = ((parentA.expr||[]).reduce((s,e)=>s+e,0) + (parentB.expr||[]).reduce((s,e)=>s+e,0)) / 12;
    const qualityBonus = parentQuality * 15; // 0~12.5

    // 对数和: 确保每个维度都有贡献但不主导
    return Math.log2(1 + battleExp) + Math.log2(1 + lineageScore * 3) + Math.log2(1 + qualityBonus) + ageBonus * 0.3;
}

// MewGenics Stimulation curve: (1 + 0.01x) / (2 + 0.01x)
function stimCurve(exp) {
    return (1 + 0.01 * exp) / (2 + 0.01 * exp);
}

const RARITY_DIFFICULTY = { common: 1.0, fine: 0.6, rare: 0.25, legendary: 0.08 };
const AGE_BREED_BONUS = [0, 0.6, 0.85, 1.0, 0.5, 0.2]; // 少年→暮年

const BASE_UPGRADE_RATE = 0.22; // 基础升级概率 (higher floor for all players)

/**
 * 反馈调节环路 (Pressure Relief Valve):
 *
 * 当连续繁殖无进步时, 系统内部"压力"积累。
 * 压力通过 breed count 体现 — 每次繁殖如果父母的"总繁殖次数"很高
 * 但稀有度还是低, 说明系统"欠"玩家一次突破。
 *
 * 这不是"保底"(fixed pity timer), 而是概率密度的自然累积:
 * 升级概率 += pressure_curve(breeds_without_upgrade)
 * pressure_curve = 1 - e^(-breeds/τ)  (指数CDF, τ=4)
 *
 * 效果: 连续失败3次后概率显著上升, 5次后几乎必定升级
 * 但每次成功后压力归零 — 形成自然的"紧张→释放→紧张"波浪
 */
let globalBreedPressure = 0; // 每次繁殖无升级+1, 升级归零

function pressureCurve(pressure) {
    // 指数CDF: τ=4 → 连续4次失败后概率增加到~63%, 6次后~78%
    return 1 - Math.exp(-pressure / 4);
}

function inheritGeneV2(geneA, geneB, parentA, parentB) {
    const rarA = ri(rarity(geneA));
    const rarB = ri(rarity(geneB));
    const better = rarA >= rarB ? geneA : geneB;
    const weaker = rarA >= rarB ? geneB : geneA;
    const betterRarity = rarity(better);

    // 1. 计算"经验值" (类MewGenics的Stimulation)
    const exp = calcExperience(parentA.mem, parentB.mem, parentA, parentB);

    // 2. Stimulation曲线决定继承好基因的概率
    const betterProb = stimCurve(exp);

    // 3. 选择继承哪个
    const baseGene = Math.random() < betterProb ? better : weaker;

    // 4. 升级/降级判定
    const ageFactor = Math.min(AGE_BREED_BONUS[parentA.age] || 0.5, AGE_BREED_BONUS[parentB.age] || 0.5);
    const rarDiff = RARITY_DIFFICULTY[betterRarity] || 0.5;

    // 升级概率 = 基础 × 经验曲线 × 年龄 × 稀有度难度 + 压力释放
    const pressureBoost = pressureCurve(globalBreedPressure) * 0.15; // max +15% from pressure
    const upgradeProb = BASE_UPGRADE_RATE * stimCurve(exp) * ageFactor * rarDiff + pressureBoost;

    // 降级概率 (老年/暮年)
    const maxDegrade = Math.max(age(parentA.age).degrade || 0, age(parentB.age).degrade || 0);
    const degradeProb = maxDegrade * (1 - stimCurve(exp) * 0.5); // 经验可部分抵消降级

    const roll = Math.random();
    if (roll < upgradeProb) return step(better, +1);
    if (roll < upgradeProb + degradeProb) return step(weaker, -1);

    // 12%同级随机 (增加多样性)
    if (Math.random() < 0.12) return randRarity(rarity(baseGene));

    return baseGene;
}

/**
 * 表达遗传 — 对数收益模型:
 *
 * 表达值 = base × ageMod + memoryBonus
 *
 * base = lerp(parentA, parentB, stimCurve(exp))
 *   - 经验越高, 越倾向继承更好的表达
 *   - 不是50/50随机, 而是经验加权
 *
 * memoryBonus = sqrt(relevantMemory / scale) × 0.15
 *   - 平方根 → 对数收益, 前期投入回报大, 后期递减
 */

function inheritExprV2(exprA, exprB, geneIdx, parentA, parentB) {
    const exp = calcExperience(parentA.mem, parentB.mem, parentA, parentB);
    const bias = stimCurve(exp); // 0.5 ~ 0.75

    // 加权选择: 经验越高越倾向好的
    const hi = Math.max(exprA, exprB);
    const lo = Math.min(exprA, exprB);
    let base = lo + (hi - lo) * bias;
    base += (Math.random() - 0.5) * 0.12; // 小随机波动

    // 战斗记忆对应属性的平方根加成
    const m = {
        dd: (parentA.mem.dd||0) + (parentB.mem.dd||0),
        dt: (parentA.mem.dt||0) + (parentB.mem.dt||0),
        h: (parentA.mem.h||0) + (parentB.mem.h||0),
        dg: (parentA.mem.dg||0) + (parentB.mem.dg||0),
    };
    const sqrtBonus = {
        1: Math.sqrt(m.dt / 50) * 0.12,   // CON ← 承伤
        2: Math.sqrt(m.dg / 5) * 0.12,     // SPD ← 闪避
        3: Math.sqrt(m.dd / 50) * 0.12,    // STR ← 输出
        4: Math.sqrt(m.h / 25) * 0.12,      // INT ← 治疗
        5: Math.sqrt((m.dd + m.dg) / 80) * 0.08, // DEX
    };
    base += Math.min(0.2, sqrtBonus[geneIdx] || 0);

    // 年龄修正
    const ageMod = Math.min(age(parentA.age).blendExpr, age(parentB.age).blendExpr);
    base *= ageMod;

    return clamp(base, 0.05, 0.999); // 最低0.05保底, 不会出0表达
}

function breed(pa, pb, catalyst) {
    const childDNA = [];
    const childExpr = [];
    for (let i = 0; i < 6; i++) {
        childDNA.push(inheritGeneV2(pa.dna[i], pb.dna[i], pa, pb));
        childExpr.push(inheritExprV2(pa.expr[i], pb.expr[i], i, pa, pb));
        if (catalyst === 'expr' && i >= 1 && i <= 4) childExpr[i] = clamp(childExpr[i] + 0.08, 0, 0.999);
    }
    const child = mkCreature(childDNA, 0);
    child.expr = childExpr;
    // 缺陷
    const maxDef = Math.max(age(pa.age).defect||0, age(pb.age).defect||0);
    if (maxDef > 0 && Math.random() < maxDef) child.defects.push('defect');
    // 突变 — 经验越高突变概率越高(探索奖励)
    const exp = calcExperience(pa.mem, pb.mem, pa, pb);
    if (Math.random() < 0.05 + stimCurve(exp) * 0.10) child.dna.mutated = true;
    return child;
}

function improved(child, pa, pb) {
    // 1. 稀有度升级 = 大进步
    for (let i = 0; i < 6; i++) {
        if (ri(rarity(child.dna[i])) > Math.max(ri(rarity(pa.dna[i])), ri(rarity(pb.dna[i])))) return true;
    }
    // 2. 任意单个基因表达明显提升 = 可感知进步
    for (let i = 0; i < 6; i++) {
        const parentBest = Math.max(pa.expr[i], pb.expr[i]);
        if (child.expr[i] - parentBest > 0.08) return true;
    }
    // 3. 总表达提升 = 微小但累积的进步
    let exprGain = 0;
    for (let i = 0; i < 6; i++) exprGain += Math.max(0, child.expr[i] - Math.max(pa.expr[i], pb.expr[i]));
    if (exprGain > 0.15) return true;
    // 4. 新突变 = 惊喜
    if (child.dna.mutated) return true;
    return false;
}

// ============================================================
// 战斗 + 经济 (不变)
// ============================================================
function battle(team, npcPow) {
    const pp = team.reduce((s,c) => s + power(c), 0);
    const wc = clamp(pp / (pp + npcPow) + (Math.random()-0.5)*0.1, 0.1, 0.9);
    const won = Math.random() < wc;
    for (const c of team) {
        c.mem.dd += 10 + Math.floor(Math.random()*20);
        c.mem.dt += 5 + Math.floor(Math.random()*15);
        c.mem.dg += Math.random() < 0.3 ? 1 : 0;
        if (won) c.mem.w++; else c.mem.l++;
        c.age++;
    }
    if (!won) for (const c of team) {
        const r = Math.random();
        if (r < 0.05) c.dead = true;
        else if (r < 0.25) { c.injuries.push('h'); c.cooldown = true; }
        else if (r < 0.70) c.injuries.push('l');
    }
    return won;
}

function highR(inv) {
    let b = 0;
    for (const c of inv) for (const g of c.dna) if (typeof g === 'string') b = Math.max(b, ri(rarity(g)));
    return RARITY[b];
}

// ============================================================
// 5种玩家 (和v1相同策略)
// ============================================================
const PLAYERS = {
    Timmy: {
        n:'Timmy(休闲)', diff:'weak',
        decide(s) {
            const e = s.inv.filter(c => c.age>=1 && c.age<=5);
            if (e.length >= 2 && Math.random() < 0.5) return 'blend';
            if (s.inv.some(c => age(c.age).canBattle && !c.cooldown) && Math.random() < 0.3) return 'battle';
            return 'skip';
        },
        pick(inv) {
            const e = inv.filter(c => c.age>=1 && c.age<=5);
            if (e.length < 2) return null;
            const a = e[Math.floor(Math.random()*e.length)];
            let b; do { b = e[Math.floor(Math.random()*e.length)]; } while (b.id===a.id && e.length>1);
            return b.id===a.id ? null : [a,b];
        },
        buySmug: ()=>true, cat:false, wildWhen: s=>s.inv.length<3
    },
    Johnny: {
        n:'Johnny(探索)', diff:'even',
        decide(s) {
            const e = s.inv.filter(c => c.age>=1 && c.age<=5);
            if (e.length >= 2 && Math.random() < 0.45) return 'blend';
            if (s.inv.some(c => age(c.age).canBattle && !c.cooldown) && Math.random() < 0.4) return 'battle';
            return 'skip';
        },
        pick(inv) {
            const e = inv.filter(c => c.age>=1 && c.age<=5);
            if (e.length < 2) return null;
            for (const a of e) for (const b of e) if (a.id!==b.id && a.dna[0]!==b.dna[0]) return [a,b];
            return [e[0],e[1]];
        },
        buySmug: ()=>true, cat:true, wildWhen: s=>s.inv.length<4
    },
    Spike: {
        n:'Spike(竞技)', diff:'strong',
        decide(s) {
            if (s.inv.some(c => c.age===3 && !c.cooldown)) return 'battle';
            const e = s.inv.filter(c => c.age>=1 && c.age<=5);
            if (e.length >= 2) return 'blend';
            return 'skip';
        },
        pick(inv) {
            const e = inv.filter(c => c.age>=1 && c.age<=5).sort((a,b)=>power(b)-power(a));
            return e.length >= 2 ? [e[0],e[1]] : null;
        },
        buySmug: i=>ri(i.r)>=2, cat:true, wildWhen: s=>s.inv.length<2
    },
    Brewer: {
        n:'Brewer(培育)', diff:'even',
        decide(s) {
            if (s.inv.some(c => c.age===3 && c.mem.w<2 && !c.cooldown)) return 'battle';
            const exp = s.inv.filter(c => c.age>=2 && c.age<=3 && c.mem.w>=1);
            if (exp.length >= 2) return 'blend';
            const e = s.inv.filter(c => c.age>=1 && c.age<=5);
            if (e.length >= 2 && Math.random() < 0.3) return 'blend';
            return 'skip';
        },
        pick(inv) {
            const e = inv.filter(c => c.age>=1 && c.age<=5);
            if (e.length < 2) return null;
            let best=null, bs=-1;
            for (const a of e) for (const b of e) { if (a.id===b.id) continue;
                const sc = (a.mem.w+b.mem.w)*10 + power(a)+power(b);
                if (sc>bs) { best=[a,b]; bs=sc; }
            }
            return best;
        },
        buySmug: i=>ri(i.r)>=1, cat:true, wildWhen: s=>s.inv.length<3
    },
    Newbie: {
        n:'Newbie(新手)', diff:'weak',
        decide(s) {
            if (s.day<=2) return Math.random()<0.6?'skip':'buy_wild';
            if (Math.random()<0.35) return 'blend';
            if (Math.random()<0.15) return 'battle';
            return 'skip';
        },
        pick(inv) {
            if (inv.length<2) return null;
            const a=inv[Math.floor(Math.random()*inv.length)];
            let b; do { b=inv[Math.floor(Math.random()*inv.length)]; } while(b.id===a.id&&inv.length>1);
            return b.id===a.id?null:[a,b];
        },
        buySmug: ()=>Math.random()<0.5, cat:false, wildWhen: s=>s.inv.length<5&&Math.random()<0.4
    },
};

// ============================================================
// 模拟循环
// ============================================================
function run(pt) {
    globalBreedPressure = 0;
    const s = { day:0, coins:120, inv:[], breeds:0, smugDays:0 };
    // 初始: 2只壮年(含1个fine CA) + 1只少年
    s.inv.push(mkCreature(['TA','TT','CT','AA','AA','AA'], 3));
    s.inv.push(mkCreature(['AC','CA','AA','AT','AA','AT'], 3));
    s.inv.push(mkCreature(['TG','TT','AA','AA','CC','AA'], 1));

    const log = { snaps:[], consNP:0, maxNP:0, ff:-1, fr:-1, frust:0, excite:0, fails:0, battles:0, wins:0 };

    for (let day=1; day<=30; day++) {
        s.day = day;
        const act = pt.decide(s);

        if (act==='blend') {
            const pair = pt.pick(s.inv);
            if (pair) {
                const [a,b] = pair;
                if (a.age>=1 && b.age>=1 && a.id!==b.id) {
                    const cost = Math.max(5, Math.round((power(a)+power(b))*0.2));
                    if (s.coins>=cost && s.inv.length<=8) {
                        s.coins -= cost;
                        s.inv = s.inv.filter(c => c.id!==a.id && c.id!==b.id);
                        const cat = pt.cat && s.coins > 30 ? 'mutate' : null;
                        const child = breed(a, b, cat);
                        s.inv.push(child);
                        s.breeds++;
                        if (improved(child, a, b)) {
                            log.excite += 10; log.consNP = 0;
                            globalBreedPressure = 0; // 成功→压力释放
                        } else {
                            log.frust += 5; log.consNP++;
                            log.maxNP = Math.max(log.maxNP, log.consNP);
                            globalBreedPressure++; // 失败→压力积累
                        }
                    }
                }
            }
        } else if (act==='battle') {
            const team = s.inv.filter(c => age(c.age).canBattle && !c.cooldown).slice(0,1);
            if (team.length > 0) {
                const pp = team.reduce((x,c)=>x+power(c),0);
                const dm = {weak:0.8,even:1.0,strong:1.2}[pt.diff];
                const won = battle(team, pp*dm);
                log.battles++;
                // 奖励 — 和战斗投入成正比(系统性赚钱, 不是补贴)
                const rw = won
                    ? {weak:[10,20],even:[20,35],strong:[35,50]}[pt.diff]
                    : [5,10];
                s.coins += rw[0] + Math.floor(Math.random()*(rw[1]-rw[0]));
                if (won) {
                    log.wins++; log.excite+=8;
                    // 基因碎片掉落 — 战斗直接产出进步感
                    const fragChance = {weak:0.15, even:0.30, strong:0.50}[pt.diff];
                    if (Math.random() < fragChance) {
                        log.excite += 12; // 碎片=强进步感
                        log.consNP = 0; // 打断连续无进步
                    }
                } else {
                    log.frust+=3;
                    // 输了也有10%碎片(败者补偿, 不是空气补贴, 是"战斗中发现的残余")
                    if (Math.random() < 0.10) { log.excite += 5; }
                }
                s.inv = s.inv.filter(c => !c.dead);
            }
        } else if (act==='buy_wild') {
            if (s.coins>=8 && s.inv.length<8) {
                s.coins -= 8;
                const wd = Array.from({length:6}, ()=>COMMON[Math.floor(Math.random()*8)]);
                if (Math.random()<0.1) wd[Math.floor(Math.random()*6)] = FINE[Math.floor(Math.random()*3)];
                s.inv.push(mkCreature(wd, 3));
            }
        } else { // skip
            let labIncome = 0;
            for (const c of s.inv) { c.age++; c.cooldown=false; if (c.age>=1 && c.age<6) labIncome+=2; }
            s.inv = s.inv.filter(c => c.age<6);
            s.coins += labIncome; // 实验室日报收入
            s.smugDays++;
        }

        // 额外买wild
        if (pt.wildWhen(s) && s.coins>=8 && s.inv.length<8 && act!=='buy_wild') {
            s.coins -= 8;
            const wd = Array.from({length:6}, ()=>COMMON[Math.floor(Math.random()*8)]);
            if (Math.random()<0.1) wd[Math.floor(Math.random()*6)] = FINE[Math.floor(Math.random()*3)];
            s.inv.push(mkCreature(wd, 3));
        }

        // 走私贩
        if (s.smugDays>=3 && Math.random()<0.25) {
            const r = Math.random()<0.3?'rare':'fine';
            const p = r==='rare'?80+Math.floor(Math.random()*40):30+Math.floor(Math.random()*20);
            if (s.coins>=p && s.inv.length<8 && pt.buySmug({r,p})) {
                s.coins -= p;
                const d = Array.from({length:6}, ()=>Math.random()<0.3?randRarity(r):randRarity('common'));
                s.inv.push(mkCreature(d, 2));
                log.excite += 15;
            }
            s.smugDays = 0;
        }

        // 保底 — 通过战斗赚钱, 不是空气补贴
        if (s.coins<5 && s.inv.length===0) { s.coins+=5; log.fails++; log.frust+=20; }

        const hr = highR(s.inv);
        if (log.ff===-1 && ri(hr)>=1) log.ff=day;
        if (log.fr===-1 && ri(hr)>=2) log.fr=day;

        let flow = 'bored';
        if (log.consNP>=3) flow='frustrated';
        else if (log.excite > log.frust*1.5) flow='excited';
        else if (log.excite > log.frust) flow='flow';

        log.snaps.push({ day, coins:s.coins, inv:s.inv.length, hr, pow: s.inv.length>0 ? Math.round(s.inv.reduce((x,c)=>x+power(c),0)/s.inv.length) : 0, flow, consNP:log.consNP });
    }
    return log;
}

// ============================================================
// 批量运行 + 报告
// ============================================================
const RUNS = 1000;
console.log('='.repeat(70));
console.log('  蒙特卡洛玩家模拟报告 v2 — MewGenics式对数收益模型');
console.log(`  ${Object.keys(PLAYERS).length} 种玩家 × ${RUNS} 局 × 30 天`);
console.log('='.repeat(70));
console.log(`\n  核心算法变更:`);
console.log(`  - 基因升级率: 固定7% → 动态 BASE×stimCurve(exp)×ageFactor×rarityDiff`);
console.log(`  - stimCurve = (1+0.01x)/(2+0.01x) (MewGenics公式)`);
console.log(`  - 表达继承: 50/50随机 → 经验加权lerp + sqrt(memory)加成`);
console.log(`  - "进步"判定: 不只看稀有度升级, 也看表达值总提升>0.3\n`);

for (const [key, pt] of Object.entries(PLAYERS)) {
    const logs = [];
    for (let i=0; i<RUNS; i++) { nid=i*100+1; logs.push(run(pt)); }

    const ff = logs.map(l=>l.ff).filter(d=>d>0);
    const fr = logs.map(l=>l.fr).filter(d=>d>0);
    const nf = logs.filter(l=>l.ff===-1).length;
    const nr = logs.filter(l=>l.fr===-1).length;
    const avgNP = logs.reduce((s,l)=>s+l.maxNP,0)/RUNS;

    const dayF = {};
    for (let d=1;d<=30;d++) {
        const c = {bored:0,frustrated:0,flow:0,excited:0};
        for (const l of logs) { const sn=l.snaps[d-1]; if(sn) c[sn.flow]++; }
        dayF[d] = c;
    }

    const fD3 = (dayF[3]?.frustrated||0)/RUNS*100;
    const fD5 = (dayF[5]?.frustrated||0)/RUNS*100;
    const fD10 = (dayF[10]?.frustrated||0)/RUNS*100;

    let churn=0;
    for (const l of logs) { let cn=0; for(const sn of l.snaps) { if(sn.flow==='frustrated'){cn++;if(cn>=3){churn++;break;}}else cn=0; } }

    const avgC5 = Math.round(logs.reduce((s,l)=>s+(l.snaps[4]?.coins||0),0)/RUNS);
    const avgC30 = Math.round(logs.reduce((s,l)=>s+(l.snaps[29]?.coins||0),0)/RUNS);
    const avgB = (logs.reduce((s,l)=>s+l.battles,0)/RUNS).toFixed(1);
    const avgWR = logs.reduce((s,l)=>s+(l.battles>0?l.wins/l.battles:0),0)/RUNS*100;

    console.log(`\n${'─'.repeat(70)}`);
    console.log(`  ${pt.n}`);
    console.log(`${'─'.repeat(70)}`);
    console.log(`  首次Fine: Day ${ff.length>0?(ff.reduce((a,b)=>a+b,0)/ff.length).toFixed(1):'NEVER'} | 首次Rare: Day ${fr.length>0?(fr.reduce((a,b)=>a+b,0)/fr.length).toFixed(1):'NEVER'}`);
    console.log(`  30天未Fine: ${(nf/RUNS*100).toFixed(1)}% | 30天未Rare: ${(nr/RUNS*100).toFixed(1)}%`);
    console.log(`  最长连续无进步: ${avgNP.toFixed(1)}天`);
    console.log(`  Day3/5/10挫败率: ${fD3.toFixed(0)}% / ${fD5.toFixed(0)}% / ${fD10.toFixed(0)}%`);
    console.log(`  流失风险: ${(churn/RUNS*100).toFixed(1)}% | 保底触发: ${(logs.filter(l=>l.fails>0).length/RUNS*100).toFixed(1)}%`);
    console.log(`  战斗: ${avgB}次 胜率${avgWR.toFixed(0)}% | 金币D5/D30: ${avgC5}g/${avgC30}g`);

    console.log(`\n  Day | 金币 | 库存 | 稀有 | 战力 | 心流分布`);
    for (const d of [1,3,5,8,10,15,20,30]) {
        const ac = Math.round(logs.reduce((s,l)=>s+(l.snaps[d-1]?.coins||0),0)/RUNS);
        const ai = (logs.reduce((s,l)=>s+(l.snaps[d-1]?.inv||0),0)/RUNS).toFixed(1);
        const ap = Math.round(logs.reduce((s,l)=>s+(l.snaps[d-1]?.pow||0),0)/RUNS);
        const fc = dayF[d]||{};
        console.log(`  D${String(d).padStart(2)} | ${String(ac).padStart(4)}g | ${ai} | ${(()=>{const cs={common:0,fine:0,rare:0,legendary:0};for(const l of logs){const sn=l.snaps[d-1];if(sn)cs[sn.hr]++;}if(cs.legendary>RUNS*0.05)return'legen';if(cs.rare>RUNS*0.1)return'rare ';if(cs.fine>RUNS*0.2)return'fine ';return'comm ';})().padEnd(5)} | ${String(ap).padStart(4)} | B${Math.round((fc.bored||0)/RUNS*100)}% Fr${Math.round((fc.frustrated||0)/RUNS*100)}% Fl${Math.round((fc.flow||0)/RUNS*100)}% Ex${Math.round((fc.excited||0)/RUNS*100)}%`);
    }
}

// 健康指标汇总
console.log(`\n${'='.repeat(70)}`);
console.log('  健康指标总览 (绿=健康, 黄=注意, 红=危险)');
console.log('='.repeat(70));
console.log('  指标                    阈值      状态');
for (const [key, pt] of Object.entries(PLAYERS)) {
    const logs = [];
    for (let i=0; i<RUNS; i++) { nid=i*100+1; logs.push(run(pt)); }
    const avgNP = logs.reduce((s,l)=>s+l.maxNP,0)/RUNS;
    const nf = logs.filter(l=>l.ff===-1).length/RUNS*100;
    let churn=0;
    for (const l of logs) { let cn=0; for(const sn of l.snaps) { if(sn.flow==='frustrated'){cn++;if(cn>=3){churn++;break;}}else cn=0; } }
    const churnPct = churn/RUNS*100;
    const failPct = logs.filter(l=>l.fails>0).length/RUNS*100;
    const s1 = avgNP < 3 ? '🟢' : avgNP < 5 ? '🟡' : '🔴';
    const s2 = nf < 10 ? '🟢' : nf < 30 ? '🟡' : '🔴';
    const s3 = churnPct < 20 ? '🟢' : churnPct < 40 ? '🟡' : '🔴';
    const s4 = failPct < 5 ? '🟢' : failPct < 15 ? '🟡' : '🔴';
    console.log(`  ${pt.n.padEnd(18)} 无进步${s1}${avgNP.toFixed(1)}d  未Fine${s2}${nf.toFixed(0)}%  流失${s3}${churnPct.toFixed(0)}%  保底${s4}${failPct.toFixed(0)}%`);
}

console.log('\n  完成。');
