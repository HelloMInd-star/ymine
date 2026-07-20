/**
 * MindSpeak V19.0 · 公开对照样本库
 * 每模块配备3~5组正反/同类/异类/边界对照案例
 */

window.MS_SAMPLES = window.MS_SAMPLES || {};

MS_SAMPLES.modules = [
    { id: 'word-order', name: '① 语序↔线性代数交换律', icon: '🔄', layer: 'syntax' },
    { id: 'tense-kelly', name: '② 时态↔凯利概率模型', icon: '⏳', layer: 'temporal' },
    { id: 'affix-feature', name: '③ 词缀派生↔特征工程', icon: '🔧', layer: 'morphology' },
    { id: 'ioc-passive', name: '④ 主动/被动↔IoC依赖反转', icon: '🔀', layer: 'voice' },
    { id: 'polysemy', name: '⑤ 多义词↔策略模式路由', icon: '🎯', layer: 'semantics' },
    { id: 'culture-regex', name: '⑥ 文化正则化约束', icon: '🌏', layer: 'pragmatics' },
    { id: 'ood-detect', name: '⑦ OOD边界异常检测', icon: '🚨', layer: 'boundary' },
    { id: 'chicken-rabbit', name: '⑧ 鸡兔同笼↔方程组求解', icon: '🐔', layer: 'logic' },
    { id: 'pacd', name: '⑨ PACD工程效率↔并行调度', icon: '⚙️', layer: 'engineering' },
    { id: 'enum-validation', name: '⑩ 枚举验证↔组合剪枝', icon: '✅', layer: 'verification' }
];

MS_SAMPLES.wordOrder = [
    { id: 'en-zh', label: '中英定语前后置换', source: 'a beautiful red flower', target: '一朵 美丽的 红色的 花', note: '英文Adj前置顺序→中文定语前置线性交换', adjOrder: ['beautiful', 'red'], cnOrder: ['美丽的', '红色的'] },
    { id: 'malay', label: '马来语定语后置', source: 'bunga merah yang cantik', target: '花 红色 的 美丽', note: '南岛语系核心名词前置，修饰语后置向量反转', adjOrder: ['cantik', 'merah'], cnOrder: ['美丽的', '红色的'] },
    { id: 'german', label: '德语从句尾语序', source: 'Ich weiß, dass er heute kommt', target: '我 知道 ， 他 今天 来', note: '德语从句动词后置→线性位置向量跨语言映射', verbPos: 'final', cnVerbPos: 'medial' },
    { id: 'jp-adj', label: '日语定语连体形', source: '美しい 赤い 花', target: '美丽的 红色的 花', note: '日语定语前置与中文同构，交换律验证成立', adjOrder: ['美しい', '赤い'], cnOrder: ['美丽的', '红色的'] },
    { id: 'boundary', label: '多重定语嵌套边界', source: 'the man who you saw yesterday who wears a hat', target: '你 昨天 见到的 那个 戴帽子的 男人', note: '多重从句嵌套，交换律需分层次逐层应用', nested: true }
];

MS_SAMPLES.tenseKelly = [
    { id: 'present', label: '一般现在时', tense: 'present', p: 0.55, q: 0.5, note: '稳定胜率p=0.55，f*=0.1稳态持仓', example: 'He plays tennis every week' },
    { id: 'progressive', label: '现在进行时', tense: 'progressive', p: 0.62, q: 0.4, note: '瞬时胜率p=0.62，动态调整f*=0.38区间', example: 'He is playing tennis now' },
    { id: 'perfect', label: '现在完成时', tense: 'perfect', p: 0.75, q: 0.3, note: '胜率累积p=0.75，有效年龄=累计周期，持仓可放大', example: 'He has played tennis for 10 years' },
    { id: 'future', label: '一般将来时', tense: 'future', p: 0.45, q: 0.55, note: '不确定胜率p=0.45<0.5保本线下，空仓观望', example: 'He will play tennis tomorrow' },
    { id: 'boundary', label: '边界熔断p=0.7', tense: 'perfect-progressive', p: 0.7, q: 0.3, note: 'p=0.7触碰0.68红线附近，触发预警审计', example: 'He has been playing since morning' }
];

MS_SAMPLES.affixFeature = [
    { id: 'noun-id', label: '印尼语名词派生', root: 'ajar (教)', affixes: ['pe-ajar', 'pe-ajar-an', 'peng-ajar'], features: ['施事者', '抽象名词', '职业'], note: '名词词缀→一阶特征变换' },
    { id: 'verb-id', label: '印尼语动词派生', root: 'tulis (写)', affixes: ['me-nulis', 'me-nulis-kan', 'di-tulis'], features: ['主动谓词', '使役动词', '被动谓词'], note: '动词词缀→二阶交互特征' },
    { id: 'adj-id', label: '印尼语形容词派生', root: 'baik (好)', affixes: ['ter-baik', 'se-baik-nya', 'ke-baik-an'], features: ['最高级', '最优式', '名词化'], note: '形容词词缀→三阶特征拓扑' },
    { id: 'simple', label: '简单基础特征', features: ['词性', '时态', '单复数'], transform: 'linear', note: '基础特征工程，单层线性变换' },
    { id: 'high-order', label: '高阶交互特征', features: ['词性×语境', '时态×语体', '语义×文化'], transform: 'nonlinear', note: '高阶交叉特征，多层非线性拓扑变换' }
];

MS_SAMPLES.iocPassive = [
    { id: 'daily-active', label: '日常主动→被动', active: '我 吃了 苹果', passive: '苹果 被 我 吃了', note: '简单主谓宾，数据流依赖反转', flow: 'subj→verb→obj ↔ obj→bei→subj→verb' },
    { id: 'daily-reverse', label: '日常被动→主动', active: '他 打开了 窗户', passive: '窗户 被 他 打开了', note: '双向IoC转换，控制流方向验证成立', flow: 'obj→bei→subj→verb ↔ subj→verb→obj' },
    { id: 'business', label: '工程业务句式', active: '服务器 处理了 请求', passive: '请求 由 服务器 处理', note: '技术文档常用被动，IoC容器依赖注入类比', flow: 'service→handler→request ↔ request→by→service→handler' },
    { id: 'complex', label: '双宾语反转', active: '老师 教了 我们 英语', passive: '我们 被 老师 教了 英语 / 英语 由 老师 教给 我们', note: '双宾语结构，两种反转路径', flow: 'ditransitive inversion' },
    { id: 'boundary', label: '不及物动词边界', active: '他 来了', passive: '—（不可转换）', note: '不及物动词无宾语，IoC边界不可用', flow: 'intransitive boundary', cannotConvert: true }
];

MS_SAMPLES.polysemy = [
    { id: 'da-ball', label: '打+球类', word: '打', context: '打球', meaning: 'play (sports)', branch: 'sports', note: '体育娱乐分支策略' },
    { id: 'da-taxi', label: '打+交通工具', word: '打', context: '打车', meaning: 'take/hail', branch: 'transport', note: '交通出行分支策略' },
    { id: 'da-water', label: '打+液体', word: '打', context: '打水', meaning: 'fetch/draw', branch: 'daily', note: '日常获取分支策略' },
    { id: 'da-lawsuit', label: '打+抽象', word: '打', context: '打官司', meaning: 'engage in (lawsuit)', branch: 'legal', note: '法律诉讼分支策略' },
    { id: 'en-bank', label: '英文bank多义', word: 'bank', contexts: ['river bank', 'bank account', 'bank on it'], meanings: ['河岸', '银行', '指望'], branch: 'context-route', note: '英文同形异义词策略路由' }
];

MS_SAMPLES.cultureRegex = [
    { id: 'dragon-cn', label: '龙·中国文化义', word: '龙', culture: 'cn', meaning: '祥瑞、权威、帝王', constraint: '正面意象', taboo: false, note: '中国龙正面，禁止译dragon邪恶义' },
    { id: 'dragon-en', label: 'Dragon·西方文化义', word: 'dragon', culture: 'en', meaning: '邪恶、巨兽、恶魔', constraint: '负面意象', taboo: true, note: '西方dragon负面，正则约束反向转换' },
    { id: 'phoenix-cn', label: '凤凰·中国文化义', word: '凤凰', culture: 'cn', meaning: '吉祥、皇后、和谐', constraint: '成对阴阳', taboo: false, note: '凤凰雌雄同体，正则化约束配对' },
    { id: 'phoenix-en', label: 'Phoenix·西方文化义', word: 'phoenix', culture: 'en', meaning: '不死鸟、重生', constraint: '单数涅槃', taboo: false, note: '西方phoenix单性重生，正则化约束单数' },
    { id: 'taboo', label: '数字禁忌边界', word: '4/13', cultures: ['cn', 'en'], constraint: '4谐音死/13不祥', taboo: true, note: '数字文化禁忌，正则化自动替换或加注' }
];

MS_SAMPLES.oodDetect = [
    { id: 'normal', label: '同源正常词汇', word: '美丽', oodScore: 0.15, confidence: 0.82, note: '训练集内词汇，置信度高，正常通过', category: 'in-distribution' },
    { id: 'pseudo', label: '伪同源迷惑词汇', word: '巭孬', oodScore: 0.52, confidence: 0.55, note: '生僻字组合，置信度下降至预警区', category: 'pseudo-ood' },
    { id: 'unknown', label: '完全陌生生词', word: 'qwertyxyz外星文', oodScore: 0.88, confidence: 0.22, note: 'OOD异常，置信度低于0.48保本线触发熔断', category: 'true-ood' },
    { id: 'neologism', label: '网络新词边界', word: '绝绝子yyds', oodScore: 0.45, confidence: 0.60, note: '网络新词边界值，需人工审计确认', category: 'boundary' },
    { id: 'mixed', label: '中英混合污染', word: '今天很happy', oodScore: 0.35, confidence: 0.65, note: '语码混合，置信度轻度下降', category: 'code-mix' }
];

MS_SAMPLES.chickenRabbit = [
    { id: 'standard', label: '经典题35头94脚', heads: 35, feet: 94, chicken: 23, rabbit: 12, note: '《孙子算经》经典题，整数解稳态' },
    { id: 'small', label: '小规模10头28脚', heads: 10, feet: 28, chicken: 6, rabbit: 4, note: '小规模验证，计算收敛稳定' },
    { id: 'large', label: '大规模100头280脚', heads: 100, feet: 280, chicken: 60, rabbit: 40, note: '大规模验证，线性方程组可扩展性' },
    { id: 'boundary-min', label: '边界值1头4脚(全兔)', heads: 1, feet: 4, chicken: 0, rabbit: 1, note: '单兔边界值，零鸡边界验证' },
    { id: 'boundary-odd', label: '异常值35头93脚(无解)', heads: 35, feet: 93, chicken: null, rabbit: null, note: '奇数脚边界，方程组无解触发异常检测' }
];

MS_SAMPLES.pacd = [
    { id: 'dual', label: '双人合作效率', people: [{name: 'A', rate: 1/10}, {name: 'B', rate: 1/15}], combinedRate: 1/6, days: 6, note: '经典工程问题，1/10+1/15=1/6' },
    { id: 'triple', label: '三人合作效率', people: [{name: 'A', rate: 1/10}, {name: 'B', rate: 1/12}, {name: 'C', rate: 1/15}], combinedRate: 1/4, days: 4, note: '三人协作，调度复杂度上升但效率提升' },
    { id: 'quad', label: '四人并行调度', people: [{name: 'A', rate: 1/20}, {name: 'B', rate: 1/24}, {name: 'C', rate: 1/30}, {name: 'D', rate: 1/40}], combinedRate: (1/20+1/24+1/30+1/40), days: null, note: '多人并行，边际收益递减验证' },
    { id: 'sequential', label: '先后接力vs并行', people: [{name: 'A', rate: 1/10, days: 3}, {name: 'B', rate: 1/15, days: null}], note: '先A做3天再B完成，vs完全并行对比' },
    { id: 'bottleneck', label: '瓶颈节点验证', people: [{name: '快', rate: 1/5}, {name: '中', rate: 1/10}, {name: '慢', rate: 1/20}], note: '最慢节点决定整体效率，阿马迪亚定律验证' }
];

MS_SAMPLES.enumValidation = [
    { id: 'perm-small', label: '3元素全排列', n: 3, total: 6, pruned: 6, note: '3! = 6，小规模无需剪枝' },
    { id: 'comb', label: '5选2组合', n: 5, k: 2, total: 10, pruned: 10, note: 'C(5,2)=10，组合枚举验证' },
    { id: 'perm-prune', label: '4元素剪枝排列', n: 4, constraints: 2, total: 24, pruned: 10, note: '带约束剪枝，4!→10分支减少58%' },
    { id: 'sudoku', label: '数独9×9剪枝', n: 9, constraints: 27, total: '6.6e21', pruned: null, note: '数独约束传播，暴力枚举不可行需剪枝' },
    { id: 'boundary', label: '旅行商边界', n: 10, total: '3.6e6', pruned: '~1000', note: 'TSP分支定界，剪枝率>99.9%' }
];

console.log('%c MindSpeak V19.0 Samples Loaded: 10 modules × 5 samples = 50 cases ', 
    'background:#1a1a2e;color:#a78bfa;font-weight:bold;padding:4px 8px;border-radius:4px;');