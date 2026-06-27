/**
 * Prompt 模板集中地。所有面向 AI 的中文 Prompt 都在这里维护，
 * 主逻辑只负责选择模式、收集 choices，不直接拼接长字符串。
 *
 * 风格：段落 DSL
 *   每个 build* 函数都是「段落数组 + join」，共享段落集中到 SHARED 常量。
 *   想改某句话只动一处；想加一段就在数组里加一行。
 *
 * 暴露到全局：window.AIBeautyPrompts
 */
(function (global) {
  "use strict";

  const STYLE_LIBRARY = [
    "松弛高级感", "清冷电影感", "都市高智感", "法式优雅感", "复古港风感",
    "氧气少女感", "元气甜酷感", "温柔知性风", "轻奢名媛感", "森系自然感",
    "新中式清雅感", "东方电影感", "清透韩系感", "法式松弛感", "轻奢松弛感",
    "复古电影感", "氧气亲和感", "高级新娘光感", "清透专业感", "轻熟知性风",
    "甜酷千金感", "冷艳御姐感", "自然原生感", "艺术策展感", "摩登都市感",
    "文艺书卷感", "明媚度假感", "极简通勤感", "清爽运动感", "复古学院感",
  ];

  const IDENTITY_LOCK = "Preserve the subject's facial identity exactly: face shape, eye distance, nose bridge, lip contour must remain unchanged. Modify only: hairstyle, makeup, clothing, background, lighting. Do not smooth, beautify, or restructure facial features.";

  const VISUAL_PRESETS = {
    relaxedLuxury: {
      lighting: "soft natural side light, diffused daylight, no harsh shadows.",
      clothing: "Oversized cashmere or linen, wide-leg trousers, minimal accessories, muted neutrals.",
      hairMakeup: "Undone wave or chignon, visible skin texture, effortless nude lip.",
      styleAnchor: "The Row or Toteme editorial aesthetic, muted warm palette, effortless quiet luxury.",
    },
    coolCinema: {
      lighting: "cinematic side backlight, slight rim light, moody atmosphere.",
      clothing: "Structured coat or silk dress, cold tones, cinematic drape.",
      hairMakeup: "Sleek straight hair or updo, matte skin, defined brow, nude or dark lip.",
      styleAnchor: "Wong Kar-wai or Hou Hsiao-hsien visual language, cold desaturated palette, cinematic emotion.",
    },
    urbanIntellect: {
      lighting: "cool-toned overhead light, hard directional edges, deep controlled shadows.",
      clothing: "Tailored blazer, clean silhouette, black or grey palette, no prints.",
      hairMakeup: "Sleek straight hair or updo, matte skin, defined brow, nude or dark lip.",
      styleAnchor: "Celine or The Row campaign aesthetic, cold tones, architectural precision.",
    },
    frenchElegant: {
      lighting: "soft indoor ambient light, warm window diffusion, gentle shadow falloff.",
      clothing: "Silk blouse, midi skirt or relaxed tailoring, understated jewelry, muted warm neutrals.",
      hairMakeup: "Undone wave or chignon, visible skin texture, effortless nude lip.",
      styleAnchor: "Parisian editorial aesthetic, muted warm palette, quiet elegance, effortless sophistication.",
    },
    vintageHongKong: {
      lighting: "warm tungsten backlight, high contrast warm shadows, subtle neon reflection.",
      clothing: "Silk blouse or qipao silhouette, gold jewelry, deep rich colors.",
      hairMakeup: "Deep loose wave with volume, red or dark rose lip, defined liner, matte complexion.",
      styleAnchor: "1990s HK cinema aesthetic, warm high contrast, film grain, Wong Kar-wai mood.",
    },
    oxygenFresh: {
      lighting: "soft natural side light, diffused daylight, no harsh shadows.",
      clothing: "Cotton midi dress, soft pastel, simple cut, no heavy accessories.",
      hairMakeup: "Soft wave or middle-part hair, dewy skin, soft brow, sheer pink lip.",
      styleAnchor: "Lifestyle photography aesthetic, warm natural light, life-affirming, clean Glossier visual.",
    },
    sweetCool: {
      lighting: "golden hour warm sunlight, long shadows, energetic highlights.",
      clothing: "Cropped top, wide-leg or mini silhouette, bold color-block, sneakers or boots.",
      hairMakeup: "Textured short hair or air-bangs, rosy flush, clean brow, fresh visible energy.",
      styleAnchor: "Contemporary street editorial aesthetic, bold color energy, youth culture mood.",
    },
    gentleIntellectual: {
      lighting: "soft indoor ambient light, warm window diffusion, calm low contrast.",
      clothing: "Knit sweater or shirt dress, earth tones, soft layering.",
      hairMakeup: "Natural wavy mid-length hair, bare skin texture, soft brow, nude lip.",
      styleAnchor: "35mm analog film aesthetic, muted palette, quiet intellectual mood, bookstore light.",
    },
    lightLuxury: {
      lighting: "soft natural side light, diffused daylight, polished highlights.",
      clothing: "Silk or satin blouse, tailored slim trousers, understated luxury accessories.",
      hairMakeup: "Sleek straight hair or soft updo, matte skin, defined brow, nude or rose lip.",
      styleAnchor: "Understated luxury editorial aesthetic, refined neutral palette, composed feminine power.",
    },
    forestNatural: {
      lighting: "soft natural side light, diffused daylight, organic low contrast.",
      clothing: "Linen or cotton casual pieces, earth palette, natural texture, no logos.",
      hairMakeup: "Natural wavy mid-length hair, visible skin texture, soft brow, nude lip.",
      styleAnchor: "Nature lifestyle editorial aesthetic, earth palette, quiet organic atmosphere.",
    },
    newChinese: {
      lighting: "soft indoor ambient light, warm window diffusion, poetic gentle shadows.",
      clothing: "Reformed hanfu or tea-ceremony dress, silk or gauze, embroidered detail.",
      hairMakeup: "Classical updo with pin, dewy skin, soft curved brow, sheer pink lip.",
      styleAnchor: "Ink wash painting atmosphere, Song Dynasty elegance, poetic soft focus.",
    },
    artCurator: {
      lighting: "cool-toned directional gallery light, clean shadows, sculptural contrast.",
      clothing: "Deconstructed designer silhouette, architectural volume, experimental texture.",
      hairMakeup: "Asymmetric or sculptural hair, graphic eye or bare face.",
      styleAnchor: "Comme des Garçons editorial aesthetic, high concept, intentional disruption.",
    },
    modernUrban: {
      lighting: "cool-toned overhead light, hard directional, deep shadows.",
      clothing: "Tailored blazer, clean silhouette, black or grey palette, no prints.",
      hairMakeup: "Sleek straight hair or updo, matte skin, defined brow, nude or dark lip.",
      styleAnchor: "Modern city editorial aesthetic, cold tones, precise geometry, commercial polish.",
    },
    literary: {
      lighting: "soft indoor ambient light, warm window diffusion, muted contrast.",
      clothing: "Oversized linen shirt or knit, midi skirt, muted earth tones.",
      hairMakeup: "Natural wavy mid-length hair, bare skin texture, soft brow, nude lip.",
      styleAnchor: "35mm analog film aesthetic, desaturated palette, grain texture, quiet literary mood.",
    },
    sunnyVacation: {
      lighting: "golden hour warm sunlight, long shadows, lens flare welcome.",
      clothing: "Flowy sundress or linen set, warm bright palette, light fabric.",
      hairMakeup: "Soft wave or middle-part hair, dewy skin, soft brow, sheer coral lip.",
      styleAnchor: "Golden hour lifestyle aesthetic, warm saturated palette, Mediterranean light.",
    },
    bridalGlow: {
      lighting: "soft natural side light, diffused daylight, luminous highlights, no harsh shadows.",
      clothing: "Silk or satin bridal-inspired dress, delicate gauze, refined pearl detail.",
      hairMakeup: "Soft updo or gentle wave, dewy skin, soft curved brow, sheer rose lip.",
      styleAnchor: "High-end bridal editorial aesthetic, luminous palette, romantic clean luxury.",
    },
    professionalClean: {
      lighting: "soft natural side light, diffused daylight, clean even facial illumination.",
      clothing: "Clean cut trousers, minimal blouse, neutral palette, structured bag.",
      hairMakeup: "Sleek straight hair or tidy updo, matte skin, defined brow, nude lip.",
      styleAnchor: "Professional portrait editorial aesthetic, clean neutral palette, trustworthy precision.",
    },
    sportyFresh: {
      lighting: "clean outdoor daylight, crisp highlights, energetic natural shadows.",
      clothing: "Athletic or prep-inspired pieces, bold stripe or logo, clean sneakers.",
      hairMakeup: "Textured short hair or air-bangs, rosy flush, clean brow, no visible heavy makeup.",
      styleAnchor: "Preppy editorial aesthetic, clean outdoor light, collegiate energy.",
    },
    commuterMinimal: {
      lighting: "soft natural side light, diffused daylight, polished office clarity.",
      clothing: "Clean cut trousers, minimal blouse, neutral palette, structured bag.",
      hairMakeup: "Sleek straight hair or low bun, matte skin, defined brow, nude lip.",
      styleAnchor: "Minimal commute editorial aesthetic, neutral palette, quiet professional efficiency.",
    },
    collegeVintage: {
      lighting: "clean outdoor daylight, crisp highlights, soft nostalgic shadows.",
      clothing: "Prep-inspired pieces, pleated skirt or tailored shorts, bold stripe, clean sneakers or loafers.",
      hairMakeup: "Textured short hair or air-bangs, rosy flush, clean brow, no visible heavy makeup.",
      styleAnchor: "Collegiate editorial aesthetic, vintage campus mood, clean youthful energy.",
    },
  };

  const STYLE_VISUAL_TRANSLATIONS = {
    "松弛高级感": VISUAL_PRESETS.relaxedLuxury,
    "清冷电影感": VISUAL_PRESETS.coolCinema,
    "都市高智感": VISUAL_PRESETS.urbanIntellect,
    "法式优雅感": VISUAL_PRESETS.frenchElegant,
    "复古港风感": VISUAL_PRESETS.vintageHongKong,
    "氧气少女感": VISUAL_PRESETS.oxygenFresh,
    "元气甜酷感": VISUAL_PRESETS.sweetCool,
    "温柔知性风": VISUAL_PRESETS.gentleIntellectual,
    "轻奢名媛感": VISUAL_PRESETS.lightLuxury,
    "森系自然感": VISUAL_PRESETS.forestNatural,
    "新中式清雅感": VISUAL_PRESETS.newChinese,
    "东方电影感": VISUAL_PRESETS.coolCinema,
    "清透韩系感": VISUAL_PRESETS.oxygenFresh,
    "法式松弛感": VISUAL_PRESETS.relaxedLuxury,
    "轻奢松弛感": VISUAL_PRESETS.lightLuxury,
    "复古电影感": VISUAL_PRESETS.vintageHongKong,
    "氧气亲和感": VISUAL_PRESETS.oxygenFresh,
    "高级新娘光感": VISUAL_PRESETS.bridalGlow,
    "清透专业感": VISUAL_PRESETS.professionalClean,
    "轻熟知性风": VISUAL_PRESETS.gentleIntellectual,
    "甜酷千金感": VISUAL_PRESETS.sweetCool,
    "冷艳御姐感": VISUAL_PRESETS.coolCinema,
    "自然原生感": VISUAL_PRESETS.forestNatural,
    "艺术策展感": VISUAL_PRESETS.artCurator,
    "摩登都市感": VISUAL_PRESETS.modernUrban,
    "文艺书卷感": VISUAL_PRESETS.literary,
    "明媚度假感": VISUAL_PRESETS.sunnyVacation,
    "极简通勤感": VISUAL_PRESETS.commuterMinimal,
    "清爽运动感": VISUAL_PRESETS.sportyFresh,
    "复古学院感": VISUAL_PRESETS.collegeVintage,
  };

  const PROFESSION_PERSONAS = {
    "职场女性": ["都市高智感", "温柔知性风", "清透专业感", "极简通勤感", "轻熟知性风", "摩登都市感"],
    "美妆博主": ["元气甜酷感", "清透韩系感", "高级新娘光感", "甜酷千金感", "冷艳御姐感", "明媚度假感"],
    "穿搭博主": ["松弛高级感", "法式优雅感", "都市高智感", "轻奢松弛感", "摩登都市感", "艺术策展感"],
    "艺术家": ["清冷电影感", "森系自然感", "复古港风感", "艺术策展感", "文艺书卷感", "东方电影感"],
    "设计师": ["都市高智感", "清冷电影感", "极简通勤感", "艺术策展感", "摩登都市感", "文艺书卷感"],
    "创业者": ["都市高智感", "轻奢名媛感", "极简通勤感", "摩登都市感", "轻奢松弛感", "清透专业感"],
    "老师": ["温柔知性风", "氧气亲和感", "复古学院感", "文艺书卷感", "清透专业感", "自然原生感"],
    "电商主播": ["元气甜酷感", "轻奢名媛感", "复古港风感", "甜酷千金感", "明媚度假感", "冷艳御姐感"],
    "学生": ["氧气少女感", "元气甜酷感", "清爽运动感", "自然原生感", "清透韩系感", "复古学院感"],
    "宝妈": ["温柔知性风", "松弛高级感", "氧气亲和感", "轻熟知性风", "自然原生感", "法式松弛感"],
    "自由职业": ["森系自然感", "法式松弛感", "清爽运动感", "艺术策展感", "文艺书卷感", "明媚度假感"],
    "银发女性": ["温柔知性风", "轻奢松弛感", "复古电影感", "东方电影感", "自然原生感", "新中式清雅感"],
  };

  const SCENE_PERSONAS = {
    "社交头像": ["清透韩系感", "氧气亲和感", "轻熟知性风", "松弛高级感", "自然原生感", "清爽运动感"],
    "证件照": ["清透专业感", "温柔知性风", "都市高智感", "自然原生感", "极简通勤感", "松弛高级感"],
    "职场形象照": ["都市高智感", "轻奢松弛感", "极简通勤感", "清透专业感", "摩登都市感", "轻熟知性风"],
    "杂志封面": ["清冷电影感", "法式优雅感", "复古电影感", "摩登都市感", "艺术策展感", "冷艳御姐感"],
    "小红书封面": ["氧气少女感", "元气甜酷感", "松弛高级感", "清透韩系感", "甜酷千金感", "明媚度假感"],
    "日系清冷": ["清冷电影感", "森系自然感", "氧气少女感", "自然原生感", "文艺书卷感", "复古学院感"],
    "港风穿搭": ["复古港风感", "轻奢名媛感", "清冷电影感", "复古电影感", "冷艳御姐感", "摩登都市感"],
    "国风穿搭": ["新中式清雅感", "温柔知性风", "东方电影感", "艺术策展感", "文艺书卷感", "自然原生感"],
    "新中式穿搭": ["新中式清雅感", "温柔知性风", "东方电影感", "法式松弛感", "文艺书卷感", "自然原生感"],
    "氛围写真": ["松弛高级感", "清冷电影感", "森系自然感", "法式松弛感", "复古电影感", "艺术策展感"],
    "生日写真": ["元气甜酷感", "轻奢名媛感", "氧气少女感", "甜酷千金感", "明媚度假感", "清爽运动感"],
    "新娘写真": ["高级新娘光感", "法式优雅感", "温柔知性风", "复古电影感", "东方电影感", "轻奢松弛感"],
  };

  const MULTI_STYLE_OPTIONS = {
    "妆容": ["自然淡妆", "通勤裸妆", "约会纯欲", "复古港风", "新娘妆", "轻龄抗衰", "消肿显脸小", "伪素颜", "高级冷感"],
    "发型": ["蓬松锁骨发", "侧分刘海", "大波浪", "干练短发", "发际线优化", "发质柔顺", "颅顶增高", "显脸小层次", "减龄刘海"],
    "穿搭": ["通勤", "松弛感", "显瘦显高", "职场精致", "轻奢名媛", "约会"],
  };

  const SHARED = {
    HARD_RULES: [
      "Use exact Chinese text.",
      "Do not modify characters.",
      "No garbled text.",
    ],
    BEAUTY_CONSTITUTION: "角色设定：你是一位世界级私人形象顾问、时尚造型师和美学设计师，不是测颜值工具。任务不是评价长相，而是发现并放大用户独特的美感、气质和风格潜力；所有建议都必须从优势出发，避免挑缺点、打分或制造外貌焦虑。",
    STYLE_CREATION_RULE: "审美创作原则：每个用户都必须拥有独一无二的风格表达。禁止所有用户生成相同发型、相同妆容、相同穿搭、相同配色、相同构图和相同氛围；必须根据用户五官比例、气质、肤色、年龄感、面部留白和风格潜力重新设计专属造型。",
    SURPRISE_RULE: "惊喜原则：每次生成必须包含至少一个超出用户预期但非常适合本人气质的风格突破点，例如新发色、风格转向、妆容升级、穿搭升级、杂志感表达或更有辨识度的气质强化。用户看到结果时应该感到：原来我还有这样的可能性。",
    LAYOUT_FIXED: "版式策略：生成一张适合社交传播的横向视觉海报，保留清晰人像主视觉和简洁美感报告区，但不要使用固定模板。允许根据场景自动选择杂志封面式、社交头像式、品牌大片式、lookbook 提案式或清爽信息卡式构图。",
    TONE_STYLE: "整体审美：当代、时尚、年轻、有新鲜感，避免影楼感、老气奶茶色、过度柔焦、PPT 信息图感和模板化排版。配色应根据人物气质、场景和当前风格方案自动变化；报告区再从候选方案中选出 1 个最佳风格。",
    VISUAL_DIRECTION_RULE: "生图目标：不是生成普通漂亮图片，而是生成用户未来更美的样子。画面应像高级时尚杂志大片、明星私人造型方案或专业形象改造提案，并体现完整妆发、穿搭、姿态、光影和场景设计。",
    ANTI_TEMPLATE_RULE: "反模板要求：每次生成都必须根据用户照片、职业、年龄和场景重组视觉方案。禁止所有结果使用同一背景、同一色系、同一报告卡片、同一人物姿势和同一排版节奏。",
    GENDER_ADAPTATION_RULE: "性别适配规则：本产品主要面向女性用户，但必须先根据上传图片判断主体性别和气质表达。若主体呈现为男性，本规则优先级高于候选标签、场景默认风格和固定中文标签；禁止在画面文字、风格标签、最佳风格、报告文案中使用轻奢名媛感、氧气少女感、少女感、新娘妆、甜妹、纯欲、名媛风等明显女性化风格词；必须自动改用都市精英感、清爽少年感、松弛高级感、绅士复古感、清冷电影感、阳光运动感、商务质感、文艺松弛感等更适合男性的表达。不要把男性用户女性化。",
    TYPOGRAPHY_RULE: "重要排版要求：不要在人物图片上压文字、压标签、压图标；所有风格标签和报告内容必须放在独立留白区域，文字清楚、有设计感。",
    TEXT_LESS_RULE: "文字必须少而清晰，不要生成长段文字，不要复杂说明。",
    CHINESE_RULE: "图片中的中文必须短句、大字、清晰排版。",
    RESULT_FEATURE_FULL: "结果功能选项：全身。优先生成或放大为完整全身效果，人物从头到脚完整入镜，避免半身裁切，保留自然比例和完整穿搭。",
    REPORT_VISUAL: "轻报告视觉：报告区必须简洁清晰，但不要固定为同一种卡片模板。可以使用杂志信息栏、轻量标签组、现代 UI 卡片、品牌 lookbook 注释、社交媒体封面信息区等形式；文字要少、清楚、有设计感，避免像 PPT 模板。",
    REPORT_REQUIREMENT: "轻报告内容：只包含发型建议、妆容建议、穿搭建议和最佳风格。每项只写一句短建议；如果画面包含 3 个候选风格，最佳风格必须从这 3 个候选风格中只选 1 个，明确写出“最佳风格：候选风格名”，并给 1 句短理由。不要把 3 个候选都称为最佳风格。",
    REPORT_HINT_LINE: "在报告区底部放一行无标题辅助小字，文字只能是“下方解锁详细美感报告”；字号比普通正文小约 15%，不要单独铺不同底色，不要做按钮样式，不要出现“提示小字”四个字。",
    REPORT_FORBID: "轻报告禁止出现：脸型倾向、缺点评价、颜值评分、优势打分、配饰建议等详细报告模块。",
    TEXT_LIMIT_150: "文字限制：整张图中文字不超过 150 个汉字。",
    TEXT_LIMIT_180: "文字限制：不要新增长文本，整张图中文字不超过 180 个汉字。",
    REPORT_PANEL_HEAD_X1: "单图报告区：根据整体构图灵活放置在底部、侧边或留白区域，保持清晰可读。不要固定深咖竖栏，不要固定 1×3 网格，不要每次使用相同版式；报告区服务于人像主视觉，不要抢占画面。",
    REPORT_PANEL_HEAD_X3: "三图报告区：在三张人像下方或侧边设计简洁报告信息区，重点体现三种风格差异。三张图在妆容、发型、穿搭、背景、光影和气质上必须明显不同，避免像同一模板复制。",
    DETAIL_REPORT_BODY: "详细报告视觉：升级为更完整的时尚美感分析页，风格接近当代杂志编辑页、品牌 lookbook 或高级社交媒体视觉报告。报告模块可以分区展示，但不要做死板表格，不要固定深咖竖栏，不要复用同一套卡片模板；整体要让用户感到被看见，而不是被评分。",
  };

  function portraitRule(shotType) {
    return `人像要求：统一柔光证件照/形象照质感，高清${shotType}照，保留本人身份特征和原生辨识度，拒绝夸张网红脸。`;
  }

  function join(...lines) {
    return lines.filter((line) => line !== null && line !== undefined && line !== false).join("\n");
  }

  function pickPersonaCycle(personas, generationCycle = 0) {
    const cycle = Math.max(0, Math.floor(Math.abs(Number(generationCycle) || 0)));
    const start = cycle === 0 ? 0 : cycle === 1 ? 3 : cycle % Math.max(1, personas.length);
    const rotated = personas.slice(start).concat(personas.slice(0, start));
    const selected = rotated.slice(0, 3);
    return selected.length === 3 ? selected : STYLE_LIBRARY.slice(cycle % STYLE_LIBRARY.length).concat(STYLE_LIBRARY).slice(0, 3);
  }

  function selectStylePersonas({ profession, scene, generationCycle = 0, generationIndex, usedStyles = [] }) {
    const cycle = generationIndex !== undefined ? Math.max(0, Number(generationIndex) - 1) : generationCycle;
    const scenePersonas = SCENE_PERSONAS[scene];
    const source = scenePersonas || PROFESSION_PERSONAS[profession] || STYLE_LIBRARY;
    const base = Number(generationIndex) >= 4
      ? source.concat(STYLE_LIBRARY).filter((style, index, styles) => !usedStyles.includes(style) && styles.indexOf(style) === index)
      : source;
    return pickPersonaCycle(base.length >= 3 ? base : source, cycle);
  }

  function translateStyleToVisual(styleName) {
    return STYLE_VISUAL_TRANSLATIONS[styleName] || STYLE_VISUAL_TRANSLATIONS[STYLE_LIBRARY[0]];
  }

  function buildStyleVisualLine(styleName, roleLabel) {
    const visual = translateStyleToVisual(styleName);
    return `${roleLabel}: ${IDENTITY_LOCK} ${visual.lighting} ${visual.clothing} ${visual.hairMakeup} ${visual.styleAnchor}`;
  }

  function buildVisualDirection(styles) {
    const roleLabels = ["Best Self", "Potential Self", "Unexpected Self"];
    return join(
      "Visual translation layer: use the following pure English visual directions as the core image-generation instructions. Do not render these English lines as text in the image.",
      ...styles.map((style, index) => buildStyleVisualLine(style, roleLabels[index] || `Style ${index + 1}`)),
    );
  }

  function buildQualityGate() {
    return join(
      "内部质量门槛：输出前自检但不要展示评分过程。",
      "评估维度：身份一致性、美学质量、商业吸引力、新颖性，任一维度低于 7 分时，必须内部修正造型决策并增强风格差异后再生成。",
      "最终验证：必须是同一个人；三种视觉可能性明显不同；每张图都有独立美学价值；至少一张图带来惊喜感。",
    );
  }

  function baseContext(choices) {
    return join(
      IDENTITY_LOCK,
      `用户职业：${choices.profession}`,
      `年龄段：${choices.ageRange}`,
      `景别：${choices.shotType}`,
      `想要场景：${choices.scene}`,
      SHARED.BEAUTY_CONSTITUTION,
      "核心优先级：Identity First 保持人物身份 > Beauty Enhancement 放大优势 > Style Exploration 探索新的自己。",
      "轻推理流程：生成前内部观察人物整体气质、年龄感、风格倾向、亲和度、职业感和时尚感；提取 2～3 个核心气质词；不要输出推理过程。",
      SHARED.STYLE_CREATION_RULE,
      SHARED.SURPRISE_RULE,
      SHARED.LAYOUT_FIXED,
      SHARED.TONE_STYLE,
      SHARED.VISUAL_DIRECTION_RULE,
      SHARED.ANTI_TEMPLATE_RULE,
      SHARED.GENDER_ADAPTATION_RULE,
      portraitRule(choices.shotType),
      SHARED.TYPOGRAPHY_RULE,
      SHARED.TEXT_LESS_RULE,
      SHARED.CHINESE_RULE,
      ...SHARED.HARD_RULES,
      choices.resultFeature === "全身" ? SHARED.RESULT_FEATURE_FULL : null,
      choices.userPrompt ? `用户补充指令：${choices.userPrompt}` : null,
    );
  }

  function buildX1Prompt(choices) {
    const personas = selectStylePersonas(choices);
    const styleName = personas[0];
    return join(
      baseContext(choices),
      buildStyleVisualLine(styleName, "Single Best Self"),
      "",
      "任务：生成一张单图定妆视觉报告，默认只展示轻报告。",
      `当前视觉方向：${styleName}。中文风格名只允许作为画面标签或报告内容，不要把中文风格名当作视觉描述本身。`,
      "画布：16:9 横向宽幅，整体应像一张可分享的时尚形象提案页；背景、光影、主色调和留白根据用户气质、场景和当前风格方向自动设计。",
      `顶部文字：主标题“${choices.profession} · ${choices.scene}风格推荐”，副标题“发现更适合你的美感方向”。`,
      "主体：以一张高质量人像为主视觉，完整呈现妆发、穿搭、姿态和气质；可以使用杂志大片、品牌形象照、生活方式封面或高级头像构图。",
      "风格标签：放在独立留白区域，标签样式应融入整体设计，不要覆盖人像，不要每次使用同一种浅棕圆角标签。",
      SHARED.REPORT_PANEL_HEAD_X1,
      SHARED.REPORT_VISUAL,
      SHARED.REPORT_REQUIREMENT,
      SHARED.REPORT_HINT_LINE,
      SHARED.REPORT_FORBID,
      buildQualityGate(),
      SHARED.TEXT_LIMIT_150,
    );
  }

  function buildX3Prompt(choices) {
    const personas = selectStylePersonas(choices);
    return join(
      baseContext(choices),
      buildVisualDirection(personas),
      "",
      "任务：生成一张三图对比推荐视觉报告，不要返回三张独立图片，默认只展示轻报告。",
      "三图体验结构：图 1 是 Best Self，最适合本人、最容易驾驭、最符合自身气质；图 2 是 Potential Self，略有突破、带来新鲜感、放大隐藏优势；图 3 是 Unexpected Self，意想不到但合理，让用户产生惊喜感。",
      "画布：16:9 横向宽幅，整体应像一页时尚造型提案或杂志编辑页；不要使用固定奶油色背景和固定卡片模板。",
      `顶部文字：主标题“${choices.profession} · ${choices.scene}风格推荐”，副标题“3 种更适合你的变美可能性”。`,
      "上半部分：展示 3 个明显不同的风格方案，可以采用三列、错落卡片、杂志分栏或 lookbook 拼贴式构图，但必须保持信息清晰。",
      `卡片规则：每张卡片只放用户本人${choices.shotType}形象照；风格标签必须放在图片外的独立留白区，不能压在人像图片上。`,
      `三张候选风格标签：${personas.join(" / ")}。中文风格名只允许作为画面标签或报告内容；真正的视觉生成必须参考上方英文 visual directions。`,
      "视觉差异规则：三张图必须在发型、妆容、穿搭、色彩、背景、光影、姿态和氛围上产生明显变化；禁止只更换衣服，禁止选择高度相似的表达。",
      `最佳风格选择规则：从以上 3 个候选风格中，只选择 1 个最适合用户的风格作为“最佳风格”，并在报告区单独写出“最佳风格：${personas.join(" / ")} 中的 1 个”。不要出现多个最佳风格。`,
      SHARED.REPORT_PANEL_HEAD_X3,
      SHARED.REPORT_VISUAL,
      SHARED.REPORT_REQUIREMENT,
      SHARED.REPORT_HINT_LINE,
      SHARED.REPORT_FORBID,
      buildQualityGate(),
      SHARED.TEXT_LIMIT_150,
    );
  }

  function buildMultiStyleOutfitPrompt(choices, selectedTune) {
    const styles = MULTI_STYLE_OPTIONS["穿搭"];
    return join(
      baseContext(choices),
      "",
      "任务：使用用户最初上传的原图，生成一张 2×3 六宫格全身穿搭对比图。",
      `用户入口选择：穿搭 - ${selectedTune}。`,
      "本次对比主题：穿搭。",
      `六宫格内容：${styles.join(" / ")}。`,
      "视觉主干：严格执行最前方 IDENTITY LOCK；六格只改变穿搭、色彩、搭配比例、鞋包和场景氛围，不改变脸部结构、年龄感和原生辨识度。",
      "画布：16:9 横向宽幅时尚 lookbook，2 行 × 3 列布局，六个格子等宽等高，间距统一；背景和卡片样式根据整体风格变化，不要固定浅米杏模板。",
      "人物要求：六格都必须保持同一个用户本人身份特征、五官、脸型和原生辨识度，不要变成不同人。",
      "全身要求：每格都必须是完整全身照，从头到脚完整入镜，包含鞋子和整体身材比例；不要裁头、不要裁脚、不要半身、不要只展示上衣。",
      "变化规则：只变化穿搭方向，包括服装版型、颜色、鞋包和整体造型；每格都要有明显不同的时尚表达，避免像同一套衣服换色。",
      "每格底部放对应中文标签，标签文字必须按六宫格内容顺序一一对应，清晰可读，不要压在人像上。",
      "六格顺序固定为：通勤、松弛感、显瘦显高、职场精致、轻奢名媛、约会。",
      "禁止：不要生成单张大图，不要生成三图布局，不要生成美感报告，不要添加水印或复杂说明。",
      buildQualityGate(),
      "文字限制：整张图只保留标题“穿搭六宫格”和 6 个风格标签。",
    );
  }

  function buildMultiStyleNineGridPrompt(choices, moduleName, selectedTune) {
    const styles = MULTI_STYLE_OPTIONS[moduleName] || MULTI_STYLE_OPTIONS["妆容"];
    return join(
      baseContext(choices),
      "",
      "任务：使用用户最初上传的原图，生成一张 3×3 九宫格多造型对比图。",
      `用户入口选择：${moduleName} - ${selectedTune}。`,
      `本次对比主题：${moduleName}。`,
      `九宫格内容：${styles.join(" / ")}。`,
      `视觉主干：严格执行最前方 IDENTITY LOCK；九格只变化${moduleName}方向，非本主题元素只做协调性微调，不改变脸部结构、年龄感和原生辨识度。`,
      "画布：正方形或 4:5 竖版时尚造型提案，九个格子等宽等高，间距统一；整体可以像杂志拼贴、造型档案或社交媒体风格板，不要固定浅米杏背景和同一种圆角卡片。",
      "人物要求：九格都必须保持同一个用户本人身份特征、五官、脸型和原生辨识度，不要变成不同人。",
      `变化规则：只变化${moduleName}方向；每格都要有清晰差异和新鲜感，非本主题元素保持自然协调，不要过度变化。`,
      "每格底部放对应中文标签，标签文字必须与九宫格内容一一对应，清晰可读，不要压在人脸上。",
      `第一格优先展示用户选择的“${selectedTune}”，其他八格展示同模块其余方向。`,
      "禁止：不要生成单张大图，不要生成三图布局，不要生成美感报告，不要添加水印或复杂说明。",
      buildQualityGate(),
      `文字限制：整张图只保留标题“${moduleName}九宫格”和 9 个风格标签。`,
    );
  }

  function buildMultiStylePrompt(choices, moduleName, selectedTune) {
    if (moduleName === "穿搭") return buildMultiStyleOutfitPrompt(choices, selectedTune);
    return buildMultiStyleNineGridPrompt(choices, moduleName, selectedTune);
  }

  function buildFineTunePrompt(choices, moduleName, tuneValue) {
    return join(
      baseContext(choices),
      "",
      "任务：基于当前图片做图生图微调。",
      `微调模块：${moduleName}。`,
      `微调方向：${tuneValue}。`,
      "要求：严格保持人物身份、脸部比例、年龄感、主体构图、文字数量和标签可读性，只调整本次微调方向；如当前画面模板感过强，可在不破坏信息结构的前提下优化为更时尚、更轻盈、更有新鲜感的视觉表达。",
      "禁止：不要改变五官结构，不要磨皮换脸，不要把文字、标签或图标压在人像图片上。",
      buildQualityGate(),
      SHARED.TEXT_LIMIT_180,
    );
  }

  function buildDetailedReportPromptFromFirstGeneration(firstGenerationPrompt) {
    return join(
      firstGenerationPrompt,
      "",
      "追加任务：基于当前上传图片生成详细美感报告版本。当前上传图片就是用户第一次生成后下载/保存的结果图。",
      "核心要求：保持当前结果图内的人物身份、五官、脸型、年龄感、发型、妆容、穿搭和主要风格方案一致，不要重新生成成另一个人。",
      "允许变化：把轻报告升级为详细报告，移除“下方解锁详细美感报告”这行引导小字；可以重新组织报告区版式，让页面更像当代杂志编辑页、品牌 lookbook 或高级社交媒体视觉报告。",
      "版式比例：详细报告版本以报告内容为主，人物图片区域约占 4 成，报告内容区域约占 6 成；可以缩小人物图片占比，但人物本身不能变。",
      SHARED.DETAIL_REPORT_BODY,
      "报告区域：保持高级、清晰、时尚和可读；不要固定奶油浅色卡片、深咖竖栏或同一种图标网格，颜色和模块样式应贴合当前最佳风格。",
      "详细报告必须包含 8 项，顺序固定：美感报告、脸型倾向、妆容建议、优势、穿搭建议、发型建议、配饰建议、最佳风格。",
      "其中“美感报告”作为报告标题或栏目识别，不作为长正文。",
      "脸型倾向、妆容建议、优势、穿搭建议、发型建议、配饰建议：每项正文 1 句短分析，措辞必须从优势和适配性出发，不要挑缺点。",
      "最佳风格最重要：如果原图是三图对比结果，必须从首次生成的 3 个候选风格中只选 1 个作为最佳风格，并说明为什么这个方案最适合用户；不要把每个候选都写成最佳风格。若原图是单图结果，则沿用当前唯一风格作为最佳风格。",
      "禁止：不要重新生成新人物，不要改变人像身份，不要添加颜值评分、缺点评价、水印或复杂装饰。",
      "详细报告质量门槛：身份一致性优先于版式丰富度；如果报告区需要扩展，优先扩展留白和模块层级，不要牺牲人像辨识度。",
      "文字限制：整张图中文字不超过 260 个汉字，中文清晰可读。",
    );
  }

  function buildDetailedReportPrompt(choices) {
    return buildDetailedReportPromptFromFirstGeneration(buildX3Prompt(choices));
  }

  function buildUpscalePrompt(choices, imageIndex) {
    const personas = selectStylePersonas(choices);
    const position = imageIndex === 1 ? "左侧第 1 张" : imageIndex === 2 ? "中间第 2 张" : "右侧第 3 张";
    const styleName = personas[imageIndex - 1] || personas[0];
    return join(
      baseContext(choices),
      buildStyleVisualLine(styleName, "Upscale Selected Self"),
      "",
      "任务：基于当前已生成的三图对比结果，生成一张 9:16 竖版高清单人形象照。",
      `目标风格：${styleName}。中文风格名只作为当前卡片识别，实际视觉生成参考上方英文 visual direction。`,
      `请选择${position}人像方案进行放大，只参考该卡片的发型、妆容、穿搭、姿态、光影、风格和人像特征。`,
      "画面只保留一个人物，不要生成三图布局，不要生成顶部标题，不要生成底部美感报告。",
      "不要添加任何文字、标签、图标、水印或边框。",
      "保持本人身份特征、脸部比例、年龄感和原生辨识度，整体自然精致，适合直接下载保存。",
      buildQualityGate(),
    );
  }

  function buildPromptForMode(mode, choices) {
    if (mode === "x1") return buildX1Prompt(choices);
    if (mode === "report") return buildDetailedReportPrompt(choices);
    return buildX3Prompt(choices);
  }

  global.AIBeautyPrompts = {
    STYLE_LIBRARY,
    MULTI_STYLE_OPTIONS,
    selectStylePersonas,
    buildX1Prompt,
    buildX3Prompt,
    buildMultiStylePrompt,
    buildFineTunePrompt,
    buildDetailedReportPrompt,
    buildDetailedReportPromptFromFirstGeneration,
    buildUpscalePrompt,
    buildPromptForMode,
  };
})(window);