# 小黏兽基因实验室

Three.js 程序化生物培育 + 自走棋战斗游戏。

## 运行

```bash
python3 -m http.server 5173
# 打开 http://localhost:5173
```

## 项目结构

```
├── index.html                  HTML骨架 + importmap
├── css/style.css               所有样式
├── src/
│   ├── main.mjs                入口 (场景/UI/战斗/输入)
│   ├── core/
│   │   ├── state.mjs           全局状态
│   │   └── math-utils.mjs      数学工具
│   ├── data/
│   │   ├── dna-constants.mjs   DNA形态字典 (16种头/侧翼/背部/体型)
│   │   └── game-constants.mjs  游戏常量 (属性/突变/受伤/竞技场)
│   ├── creature/
│   │   └── creature-builder.mjs 3D生物网格生成
│   └── game/
│       └── game-logic.mjs      繁殖/战斗/设施逻辑
└── tools/
    └── qa-atlas.mjs            Playwright QA截图自动化
```

## 核心系统

- **6岁寿命**: 幼年→少年→青年→壮年→老年→暮年
- **战斗记忆遗传**: 战斗经历影响后代属性表达
- **DNA搅拌机**: 拖入2只→繁殖1只后代(父母消失)
- **DNA复制机**: 复制生物(有缺陷风险)
- **DNA治疗仪**: 修复受伤(消耗金币)
- **竞技场**: 3选1对手(弱/均衡/强) + 分级奖励
- **走私贩**: 定期出现的稀有生物商人

## QA

```bash
npm install
npm run qa:atlas
# 输出: qa-atlas/latest/
```
