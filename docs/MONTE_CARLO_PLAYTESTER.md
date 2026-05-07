# 蒙特卡洛自动玩家模拟器 — 完整技术规格

## 给 TapTap Maker / AI Agent 的 Prompt

> 你是一个游戏平衡测试工程师。你需要用 Lua 编写一个蒙特卡洛玩家模拟器，模拟5种不同类型的玩家玩"小黏兽基因实验室"这款游戏，每种玩家跑1000局，每局30天(回合)，收集数据并分析难度曲线、经济平衡和流失风险。

---

## 一、游戏规则摘要(模拟器需要实现的核心机制)

### 1.1 生物(Creature)数据结构

```lua
creature = {
    id = 唯一ID,
    dna = { "TA", "TT", "CT", "AA", "AA", "AA" },  -- 6个基因位
    expression = { 0.5, 0.7, 0.3, 0.8, 0.6, 0.4 },  -- 6个表达值(0~1)
    age = 0,  -- 0=幼年, 1=少年, 2=青年, 3=壮年, 4=老年, 5=暮年, >=6死亡
    injuries = {},       -- 受伤ID列表
    mutations = {},      -- 部位突变
    defects = {},        -- 出生缺陷
    scarGenes = {},      -- 伤疤基因
    battleMemory = {
        damageDealt = 0,   -- 总造成伤害
        damageTaken = 0,   -- 总承受伤害
        healed = 0,        -- 总治疗量
        dodged = 0,        -- 总闪避次数
        wins = 0,
        losses = 0
    },
    cooldown = false  -- 重伤后是否需要休息
}
```

### 1.2 稀有度系统

```lua
COMMON_GENES = {"AA","AT","AC","AG","TA","TT","TC","TG"}  -- 8个
FINE_GENES   = {"CA","CT","CC"}                             -- 3个
RARE_GENES   = {"CG","GA","GT","GC"}                        -- 4个
LEGENDARY    = {"GG"}                                        -- 1个

-- 稀有度判定
function getGeneRarity(code)
    if code == "GG" then return "legendary" end
    if contains(RARE_GENES, code) then return "rare" end
    if contains(FINE_GENES, code) then return "fine" end
    return "common"
end

-- 基础分值
GENE_BASE_SCORE = { common=2, fine=7, rare=22, legendary=70 }
```

### 1.3 年龄系统

```lua
AGE_STAGES = {
    [0] = { name="幼年", canBattle=false, canBlend=false, statMod=0.50, blendExprMod=0.0 },
    [1] = { name="少年", canBattle=true,  canBlend=true,  statMod=0.70, blendExprMod=0.6 },
    [2] = { name="青年", canBattle=true,  canBlend=true,  statMod=0.85, blendExprMod=0.8 },
    [3] = { name="壮年", canBattle=true,  canBlend=true,  statMod=1.00, blendExprMod=1.0 },
    [4] = { name="老年", canBattle=true,  canBlend=true,  statMod=0.85, blendExprMod=0.7,
            degradeChance=0.15, defectChance=0.25 },
    [5] = { name="暮年", canBattle=false, canBlend=true,  statMod=0.60, blendExprMod=0.5,
            degradeChance=0.30, defectChance=0.50 },
}
```

### 1.4 基因遗传算法

```lua
function inheritGene(geneA, geneB, upgradeChance)
    local rarA = getRarityIndex(getGeneRarity(geneA))
    local rarB = getRarityIndex(getGeneRarity(geneB))
    local better = (rarA >= rarB) and geneA or geneB
    local weaker = (rarA >= rarB) and geneB or geneA

    local roll = math.random()
    if roll < 0.42 then return better end             -- 42% 继承好的
    if roll < 0.60 then return weaker end             -- 18% 继承弱的
    if roll < 0.72 then                               -- 12% 同级随机
        return randomGeneOfRarity(getGeneRarity(math.random() < 0.5 and better or weaker))
    end
    if roll < 0.72 + upgradeChance then               -- 7% 或 14%(有催化剂) 升级
        return stepMutate(better, +1)
    end
    if roll < 0.72 + upgradeChance + 0.08 then        -- 8% 降级
        return stepMutate(weaker, -1)
    end
    return better                                      -- 兜底
end
```

### 1.5 表达遗传(含战斗记忆)

```lua
function inheritExpressionWithMemory(exprA, exprB, geneIdx, parentA, parentB)
    -- 基础: 随机选父或母 + 随机波动
    local base = math.random() < 0.5 and exprA or exprB
    base = base + (math.random() - 0.5) * 0.15

    -- 战斗记忆加成
    local mem = combineBattleMemory(parentA.battleMemory, parentB.battleMemory)
    local memoryMap = {
        [1] = math.min(0.15, mem.damageTaken / 200),  -- 体型→CON
        [2] = math.min(0.15, mem.dodged / 20),          -- 头部→SPD
        [3] = math.min(0.15, mem.damageDealt / 200),    -- 侧翼→STR
        [4] = math.min(0.15, mem.healed / 100),          -- 背部→INT
        [5] = math.min(0.10, (mem.damageDealt + mem.dodged) / 300)  -- 花纹→DEX
    }
    base = base + (memoryMap[geneIdx] or 0)
    base = base + math.min(0.05, mem.wins * 0.01)  -- 胜场加成

    return clamp(base, 0, 0.999)
end
```

### 1.6 搅拌机繁殖

```lua
function breedCreatures(parentA, parentB, catalyst)
    local upgradeChance = (catalyst == "mutate") and 0.14 or 0.07

    local childDNA = {}
    local childExpr = {}
    for i = 1, 6 do
        childDNA[i] = inheritGene(parentA.dna[i], parentB.dna[i], upgradeChance)

        local expr = inheritExpressionWithMemory(
            parentA.expression[i], parentB.expression[i], i, parentA, parentB
        )
        -- 年龄修正
        local ageMod = math.min(
            AGE_STAGES[parentA.age].blendExprMod,
            AGE_STAGES[parentB.age].blendExprMod
        )
        expr = expr * ageMod

        -- 催化剂加成
        if catalyst == "expr" and i >= 2 and i <= 5 then
            expr = expr + 0.1
        end
        childExpr[i] = clamp(expr, 0, 0.999)
    end

    -- 年龄降级(老年/暮年)
    applyAgeDegradation(childDNA, parentA, parentB)

    -- 突变遗传(15%概率)
    local mutations = inheritMutations(parentA, parentB)

    -- 缺陷(基于年龄)
    local defects = rollDefects(parentA, parentB)

    -- 伤疤基因(受伤父母10%概率传)
    local scarGenes = inheritScarGenes(parentA, parentB)

    return createCreature(childDNA, childExpr, 0, mutations, defects, scarGenes)
end
```

### 1.7 战力计算

```lua
function calcCreatureStats(creature)
    local stats = {}
    -- 7属性: STR/DEX/CON/INT/SPD/CHA/LCK
    -- 每个从对应基因位的稀有度×表达计算
    -- + 体型职业加成
    -- + 突变效果
    -- + 伤疤基因效果
    -- - 受伤效果
    -- - 缺陷效果
    -- × 年龄衰退系数
    stats.total = STR + DEX + CON + INT + SPD + CHA + LCK
    stats.maxHP = CON * 4
    return stats
end
```

### 1.8 战斗模拟(简化版)

```lua
function simulateBattle(playerTeam, npcTeam)
    -- 简化: 比较总战力 + 随机因子
    local playerPower = sumTeamPower(playerTeam)
    local npcPower = sumTeamPower(npcTeam)

    -- 胜率 = 玩家战力 / (玩家战力 + NPC战力) + 随机波动
    local winChance = playerPower / (playerPower + npcPower)
    winChance = winChance + (math.random() - 0.5) * 0.1  -- ±5%随机

    local won = math.random() < winChance

    -- 战斗记忆更新
    for _, c in ipairs(playerTeam) do
        c.battleMemory.damageDealt = c.battleMemory.damageDealt + math.random(10, 30)
        c.battleMemory.damageTaken = c.battleMemory.damageTaken + math.random(5, 20)
        if won then c.battleMemory.wins = c.battleMemory.wins + 1
        else c.battleMemory.losses = c.battleMemory.losses + 1 end
        c.age = c.age + 1  -- 战斗+1岁
    end

    -- 败方受伤
    if not won then
        for _, c in ipairs(playerTeam) do
            local tier = rollInjuryTier()
            if tier == "light" then
                table.insert(c.injuries, randomInjury())
            elseif tier == "heavy" then
                table.insert(c.injuries, randomInjury())
                c.cooldown = true
            elseif tier == "fatal" then
                c.dead = true
            end
        end
    end

    return won
end
```

### 1.9 经济系统

```lua
-- 收入
-- 竞技场胜利: 弱10-20g, 均衡20-35g, 强35-50g
-- 竞技场失败: 5-10g(败者补偿)
-- 走私贩: 不产生收入(花钱)
-- 保底: 打扫卫生5g/次

-- 支出
-- 买野生: 8g
-- 搅拌费: max(5, (价值A + 价值B) × 0.2)
-- 复制费: 10 + 基础价值 × 2
-- 治疗费: 30g/伤
-- 走私贩: fine=30-50g, rare=80-120g
```

### 1.10 走私贩

```lua
-- 每次"跳过今天"或战斗后, 如果距上次出现>=3天, 25%概率出现
-- 库存: 1-2只 fine/rare/偶尔legendary 生物
-- 价格: fine=30-50g, rare=80-120g, legendary=200g
```

---

## 二、5种模拟玩家定义

### 2.1 Timmy(休闲玩家)

```lua
Timmy = {
    name = "Timmy",
    description = "随机操作, 不看属性, 追求简单乐趣",

    -- 每天决策权重
    decideAction = function(state)
        if #state.inventory < 2 then return "skip_day" end
        if #state.inventory >= 2 and math.random() < 0.5 then return "blend" end
        if math.random() < 0.3 then return "battle" end
        return "skip_day"
    end,

    -- 搅拌选择: 随机两只(不看属性)
    chooseBlendPair = function(inventory)
        local eligible = filter(inventory, function(c) return c.age >= 1 and c.age <= 5 end)
        if #eligible < 2 then return nil end
        return eligible[math.random(#eligible)], eligible[math.random(#eligible)]
    end,

    -- 战斗选择: 总选最弱对手
    chooseBattleDifficulty = function() return "weak" end,

    -- 走私贩: 有钱就买
    smugglerBuyThreshold = 0,  -- 只要买得起就买

    -- 治疗: 不治
    healInjuries = false,

    -- 催化剂: 不用
    useCatalyst = false,

    -- 买野生: 库存<3时买
    buyWildThreshold = 3,
}
```

### 2.2 Johnny(探索玩家)

```lua
Johnny = {
    name = "Johnny",
    description = "尝试不同组合, 好奇心驱动, 选均衡对手",

    decideAction = function(state)
        -- 优先搅拌不同元素组合
        if canBlendDifferentElements(state) then return "blend" end
        if math.random() < 0.4 then return "battle" end
        return "skip_day"
    end,

    chooseBlendPair = function(inventory)
        -- 优先选不同元素的两只
        local eligible = getBlendEligible(inventory)
        for _, a in ipairs(eligible) do
            for _, b in ipairs(eligible) do
                if a.id ~= b.id and a.dna[1] ~= b.dna[1] then
                    return a, b
                end
            end
        end
        -- fallback随机
        return randomPair(eligible)
    end,

    chooseBattleDifficulty = function() return "even" end,
    smugglerBuyThreshold = 0,  -- 总是买(好奇)
    healInjuries = false,
    useCatalyst = true,  -- 有就用
    buyWildThreshold = 4,
}
```

### 2.3 Spike(竞技玩家)

```lua
Spike = {
    name = "Spike",
    description = "追求效率最大化, 只搅拌最强的, 打最强对手",

    decideAction = function(state)
        -- 壮年优先战斗(积累记忆)
        local primeCreatures = filter(state.inventory, function(c) return c.age == 3 end)
        if #primeCreatures > 0 and not primeCreatures[1].cooldown then return "battle" end
        -- 有两只可搅拌时搅拌
        if canBlend(state) then return "blend" end
        return "skip_day"
    end,

    chooseBlendPair = function(inventory)
        -- 选属性最高的两只
        local eligible = getBlendEligible(inventory)
        table.sort(eligible, function(a, b) return calcPower(a) > calcPower(b) end)
        if #eligible >= 2 then return eligible[1], eligible[2] end
        return nil
    end,

    chooseBattleDifficulty = function() return "strong" end,  -- 总选最强
    smugglerBuyThreshold = 80,  -- 只买rare以上
    healInjuries = true,  -- 治疗受伤
    useCatalyst = true,
    buyWildThreshold = 2,  -- 只在快没怪时买
}
```

### 2.4 Brewer(培育玩家)

```lua
Brewer = {
    name = "Brewer",
    description = "先战斗积累记忆再搅拌, 注重兼容性和伤疤基因",

    decideAction = function(state)
        -- 核心策略: 壮年先打1-2场(积累battleMemory), 然后搅拌
        local prime = filter(state.inventory, function(c) return c.age == 3 end)
        for _, c in ipairs(prime) do
            if c.battleMemory.wins < 2 and not c.cooldown then
                return "battle"  -- 还没打够，继续战斗
            end
        end
        -- 有两只有战斗记忆的壮年 → 搅拌
        local experienced = filter(state.inventory, function(c)
            return c.age >= 2 and c.age <= 3 and c.battleMemory.wins >= 1
        end)
        if #experienced >= 2 then return "blend" end
        -- 没有合适的搅拌对象 → 跳过
        return "skip_day"
    end,

    chooseBlendPair = function(inventory)
        -- 优先选有战斗记忆+元素兼容的组合
        local eligible = getBlendEligible(inventory)
        local bestPair, bestScore = nil, -1
        for _, a in ipairs(eligible) do
            for _, b in ipairs(eligible) do
                if a.id ~= b.id then
                    local score = (a.battleMemory.wins + b.battleMemory.wins) * 10
                    if checkCompatibility(a, b) == "synergy" then score = score + 50 end
                    if score > bestScore then bestPair = {a, b}; bestScore = score end
                end
            end
        end
        if bestPair then return bestPair[1], bestPair[2] end
        return nil
    end,

    chooseBattleDifficulty = function() return "even" end,
    smugglerBuyThreshold = 30,  -- 买fine以上
    healInjuries = true,
    useCatalyst = true,  -- 策略性使用催化剂
    buyWildThreshold = 3,
}
```

### 2.5 Newbie(新手)

```lua
Newbie = {
    name = "Newbie",
    description = "前3天不知道该干什么, 经常操作失误, 容易放弃",

    decideAction = function(state)
        if state.day <= 2 then
            -- 前2天: 瞎点, 50%跳过, 30%买野生, 20%随机尝试
            if math.random() < 0.5 then return "skip_day" end
            if math.random() < 0.6 then return "buy_wild" end
            return "skip_day"
        end
        -- 第3天开始尝试搅拌
        if math.random() < 0.4 and canBlend(state) then return "blend" end
        if math.random() < 0.2 then return "battle" end
        return "skip_day"
    end,

    chooseBlendPair = function(inventory)
        -- 完全随机, 不区分年龄(可能选幼年导致失败)
        if #inventory < 2 then return nil end
        return inventory[math.random(#inventory)], inventory[math.random(#inventory)]
    end,

    chooseBattleDifficulty = function() return "weak" end,
    smugglerBuyThreshold = 0,  -- 不懂走私贩, 但看到就买
    healInjuries = false,  -- 不知道有治疗仪
    useCatalyst = false,
    buyWildThreshold = 5,  -- 库存少于5就买
}
```

---

## 三、主模拟循环

```lua
function simulateOneGame(playerType, seed)
    math.randomseed(seed)

    local state = {
        day = 0,
        coins = 120,
        inventory = createStarterCreatures(),  -- 3只初始怪
        totalBreeds = 0,
        catalysts = { expr = 0, mutate = 0 },
        smuggler = { daysSinceVisit = 0 },
    }

    local log = {
        dailySnapshots = {},    -- 每天的状态快照
        events = {},            -- 重要事件列表
        frustrationScore = 0,   -- 累计挫败感
        excitementScore = 0,    -- 累计兴奋感
        consecutiveNoProgress = 0,  -- 连续无进步天数
        firstFineDay = -1,      -- 第一次获得fine基因的天数
        firstRareDay = -1,      -- 第一次获得rare基因的天数
        peakFrustrationDay = -1,
        flowState = {},         -- 每天的心流状态: bored/frustrated/flow/excited
    }

    for day = 1, 30 do
        state.day = day

        -- 1. 玩家决策
        local action = playerType.decideAction(state)

        -- 2. 执行动作
        if action == "blend" then
            local a, b = playerType.chooseBlendPair(state.inventory)
            if a and b and a.id ~= b.id then
                local cost = calcBreedCost(a, b)
                if state.coins >= cost and a.age >= 1 and b.age >= 1 then
                    state.coins = state.coins - cost
                    removeFromInventory(state, a)
                    removeFromInventory(state, b)

                    local catalyst = nil
                    if playerType.useCatalyst and state.catalysts.mutate > 0 then
                        catalyst = "mutate"
                        state.catalysts.mutate = state.catalysts.mutate - 1
                    end

                    local child = breedCreatures(a, b, catalyst)
                    table.insert(state.inventory, child)
                    state.totalBreeds = state.totalBreeds + 1

                    -- 分析进步
                    local improved = hasImprovedGenes(child, a, b)
                    if improved then
                        log.excitementScore = log.excitementScore + 10
                        log.consecutiveNoProgress = 0
                        addEvent(log, day, "BREED_UPGRADE", child)
                    else
                        log.frustrationScore = log.frustrationScore + 5
                        log.consecutiveNoProgress = log.consecutiveNoProgress + 1
                        addEvent(log, day, "BREED_NO_PROGRESS", child)
                    end

                    -- 记录首次稀有度进步
                    if log.firstFineDay == -1 and hasRarity(state.inventory, "fine") then
                        log.firstFineDay = day
                    end
                    if log.firstRareDay == -1 and hasRarity(state.inventory, "rare") then
                        log.firstRareDay = day
                    end
                end
            end

        elseif action == "battle" then
            local team = selectBattleTeam(state, playerType)
            if #team > 0 then
                local difficulty = playerType.chooseBattleDifficulty()
                local npcPower = calcTeamPower(team) * getDifficultyMult(difficulty)
                local npcTeam = generateNPCTeam(npcPower)
                local won = simulateBattle(team, npcTeam)

                local reward = calcReward(difficulty, won)
                state.coins = state.coins + reward.gold
                if reward.catalyst then
                    state.catalysts[reward.catalystType] = state.catalysts[reward.catalystType] + 1
                end

                if won then
                    log.excitementScore = log.excitementScore + 8
                    addEvent(log, day, "BATTLE_WIN", { reward = reward })
                else
                    log.frustrationScore = log.frustrationScore + 3
                    addEvent(log, day, "BATTLE_LOSS", {})
                    -- 检查死亡
                    removeDeadCreatures(state)
                end
            end

        elseif action == "buy_wild" then
            if state.coins >= 8 and #state.inventory < 8 then
                state.coins = state.coins - 8
                local wild = createWildCreature()
                wild.age = 3  -- 野生成年
                table.insert(state.inventory, wild)
            end

        elseif action == "skip_day" then
            -- 全体+1岁
            for _, c in ipairs(state.inventory) do
                c.age = c.age + 1
                c.cooldown = false
            end
            removeDeadCreatures(state)  -- age >= 6 的移除
            state.smuggler.daysSinceVisit = state.smuggler.daysSinceVisit + 1
        end

        -- 3. 走私贩检查
        if state.smuggler.daysSinceVisit >= 3 and math.random() < 0.25 then
            local stock = generateSmugglerStock()
            for _, item in ipairs(stock) do
                if state.coins >= item.price and
                   getRarityIndex(item.rarity) >= playerType.smugglerBuyThreshold and
                   #state.inventory < 8 then
                    state.coins = state.coins - item.price
                    table.insert(state.inventory, item.creature)
                    log.excitementScore = log.excitementScore + 15
                    addEvent(log, day, "SMUGGLER_BUY", item)
                end
            end
            state.smuggler.daysSinceVisit = 0
        end

        -- 4. 保底检查
        if state.coins < 5 and #state.inventory == 0 then
            state.coins = state.coins + 5  -- 打扫卫生
            log.frustrationScore = log.frustrationScore + 20
            addEvent(log, day, "FAILSAFE", {})
        end

        -- 5. 心流状态判定
        local flow = "bored"
        if log.consecutiveNoProgress >= 3 then flow = "frustrated"
        elseif log.excitementScore > log.frustrationScore * 1.5 then flow = "excited"
        elseif log.excitementScore > log.frustrationScore then flow = "flow"
        end
        log.flowState[day] = flow

        -- 6. 每天快照
        log.dailySnapshots[day] = {
            coins = state.coins,
            inventorySize = #state.inventory,
            highestRarity = getHighestRarityInInventory(state),
            avgPower = calcAvgPower(state.inventory),
            totalBreeds = state.totalBreeds,
            frustration = log.frustrationScore,
            excitement = log.excitementScore,
            consecutiveNoProgress = log.consecutiveNoProgress,
            flow = flow,
        }
    end

    return log
end
```

---

## 四、批量模拟与数据收集

```lua
function runFullSimulation()
    local playerTypes = { Timmy, Johnny, Spike, Brewer, Newbie }
    local results = {}

    for _, playerType in ipairs(playerTypes) do
        results[playerType.name] = {
            logs = {},
            aggregate = {}
        }

        for run = 1, 1000 do
            local log = simulateOneGame(playerType, run * 12345 + 67890)
            table.insert(results[playerType.name].logs, log)
        end

        -- 聚合统计
        results[playerType.name].aggregate = aggregateStats(results[playerType.name].logs)
    end

    return results
end
```

---

## 五、数据分析与报告

### 5.1 聚合统计函数

```lua
function aggregateStats(logs)
    local agg = {
        -- 每天的平均值(30天×N个指标)
        dailyAvg = {},

        -- 里程碑
        avgFirstFineDay = 0,        -- 平均第几天拿到第一个fine
        avgFirstRareDay = 0,        -- 平均第几天拿到第一个rare
        pctNeverFine = 0,           -- 30天内从未拿到fine的比例
        pctNeverRare = 0,           -- 30天内从未拿到rare的比例

        -- 挫败感
        avgPeakFrustrationDay = 0,  -- 平均最挫败的是第几天
        avgConsecutiveNoProgress = 0,-- 平均最长连续无进步天数
        pctFrustratedDay3 = 0,      -- 第3天处于frustrated状态的比例
        pctFrustratedDay5 = 0,      -- 第5天...
        pctFrustratedDay10 = 0,     -- 第10天...

        -- 经济
        avgCoinsDay5 = 0,
        avgCoinsDay10 = 0,
        avgCoinsDay30 = 0,
        pctBrokeAtLeastOnce = 0,    -- 至少破产1次的比例
        pctFailsafe = 0,            -- 触发保底的比例

        -- 流失预测
        -- 定义: 如果连续3天frustrated → 标记为"流失风险"
        pctChurnRisk = 0,
    }

    for _, log in ipairs(logs) do
        -- ...计算所有聚合指标...
    end

    return agg
end
```

### 5.2 输出报告格式

```lua
function generateReport(results)
    print("=" * 60)
    print("蒙特卡洛玩家模拟报告 — 5种玩家 × 1000局 × 30天")
    print("=" * 60)

    for name, data in pairs(results) do
        local agg = data.aggregate
        print("\n--- " .. name .. " ---")
        print("首次Fine天数(平均): Day " .. agg.avgFirstFineDay)
        print("首次Rare天数(平均): Day " .. agg.avgFirstRareDay)
        print("30天未获Fine比例: " .. agg.pctNeverFine .. "%")
        print("最长连续无进步: " .. agg.avgConsecutiveNoProgress .. " 天")
        print("Day3挫败率: " .. agg.pctFrustratedDay3 .. "%")
        print("Day5挫败率: " .. agg.pctFrustratedDay5 .. "%")
        print("流失风险率: " .. agg.pctChurnRisk .. "%")
        print("触发保底率: " .. agg.pctFailsafe .. "%")

        -- 每日难度曲线
        print("\n  日期 | 金币 | 战力 | 稀有度 | 心流")
        for day = 1, 30 do
            local s = agg.dailyAvg[day]
            print(string.format("  D%02d | %4d | %4d | %s | %s",
                day, s.coins, s.avgPower, s.highestRarity, s.flow))
        end
    end

    -- 波浪形验证
    print("\n=== 波浪形难度曲线验证 ===")
    print("理想: 惊喜→平稳→挑战→突破→惊喜→...")
    print("实际: " .. analyzeWavePattern(results))

    -- 关键建议
    print("\n=== 自动生成的平衡建议 ===")
    generateBalanceSuggestions(results)
end
```

### 5.3 自动平衡建议

```lua
function generateBalanceSuggestions(results)
    for name, data in pairs(results) do
        local agg = data.aggregate

        if agg.pctFrustratedDay3 > 50 then
            print("⚠ " .. name .. ": Day3挫败率>" .. agg.pctFrustratedDay3 ..
                  "% → 建议提高前3次繁殖升级率到20%")
        end

        if agg.avgFirstFineDay > 8 then
            print("⚠ " .. name .. ": 平均Day" .. agg.avgFirstFineDay ..
                  "才获Fine → 建议初始怪含1只Fine级")
        end

        if agg.pctBrokeAtLeastOnce > 40 then
            print("⚠ " .. name .. ": " .. agg.pctBrokeAtLeastOnce ..
                  "%破产 → 建议增加日常补贴或降低搅拌费用")
        end

        if agg.pctChurnRisk > 30 then
            print("🔴 " .. name .. ": 流失风险" .. agg.pctChurnRisk ..
                  "% → 严重! 需要在Day1-3插入保证性正反馈")
        end

        if agg.avgConsecutiveNoProgress > 4 then
            print("⚠ " .. name .. ": 平均连续" .. agg.avgConsecutiveNoProgress ..
                  "天无进步 → 建议加入保底升级机制")
        end
    end
end
```

---

## 六、关键指标阈值(健康游戏的标准)

```
指标                          健康值          危险值
首次Fine平均天数              Day 3-5         > Day 8
首次Rare平均天数              Day 8-12        > Day 20
Day3挫败率(所有玩家平均)      < 30%           > 50%
Day5流失风险率                < 15%           > 30%
最长连续无进步                < 3天           > 5天
破产率                        < 20%           > 40%
保底触发率                    < 5%            > 15%
心流状态占比(flow+excited)    > 60%           < 40%
```

---

## 七、波浪形验证算法

```lua
function analyzeWavePattern(results)
    -- 理想的难度曲线应该是波浪形:
    -- 低谷(挑战) → 峰值(突破/惊喜) → 低谷 → 峰值 → ...
    -- 周期约3-5天

    local excitementCurve = getAvgExcitementCurve(results)

    -- 检测波峰和波谷
    local peaks = findPeaks(excitementCurve)
    local valleys = findValleys(excitementCurve)

    -- 健康的波浪形: 至少3个完整周期(30天/5天周期=6个峰)
    if #peaks < 3 then
        return "❌ 太平坦 — 缺少兴奋峰值, 玩家会感到无聊"
    end

    -- 检查峰谷交替
    local alternating = checkAlternating(peaks, valleys)
    if not alternating then
        return "⚠ 峰谷不交替 — 可能有连续高峰(过于容易)或连续低谷(过于挫败)"
    end

    -- 检查总体趋势上升
    local trend = calcTrend(excitementCurve)
    if trend < 0 then
        return "❌ 整体下降趋势 — 越玩越无聊, 需要后期内容注入"
    end

    return "✅ 健康的波浪形上升趋势, 周期约" .. calcAvgPeriod(peaks) .. "天"
end
```

---

## 八、使用方法

```
1. 将此文件中的Lua代码复制到你的游戏测试环境
2. 运行 runFullSimulation()
3. 调用 generateReport(results) 查看完整报告
4. 根据"自动平衡建议"调整游戏参数
5. 再次运行模拟验证调整效果
6. 重复直到所有关键指标达到"健康值"范围
```

---

## 九、迭代调参示例

如果模拟报告显示"Newbie前3天挫败率72%"，可以尝试：

```lua
-- 调整方案A: 新手保底(前3次繁殖保证升级)
if state.totalBreeds <= 3 then upgradeChance = 0.25 end  -- 从7%→25%

-- 调整方案B: 初始怪更好
function createStarterCreatures()
    return {
        createCreature({"TA","TT","CT","CA","AA","AA"}, nil, 3),  -- 含1个fine
        createCreature({"AC","CA","AA","AT","AA","AT"}, nil, 3),
        createCreature({"TG","TT","AA","AA","CC","AA"}, nil, 1),  -- 幼年(让玩家体验成长)
    }
end

-- 调整方案C: 走私贩Day2强制出现
if state.day == 2 then forceSmuggler = true end

-- 调整后重新跑模拟, 对比指标变化
```
