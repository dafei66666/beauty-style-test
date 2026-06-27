/**
 * Mock 模式下用的占位 SVG 生成器。
 * 关 Mock 模式后这些函数不会被调用，但保留方便页面流程跑通。
 *
 * 暴露到全局：window.AIBeautyMocks
 */
(function (global) {
  "use strict";

  function svgDataUrl(svg) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function mockX1Svg(mode) {
    const title = mode === "report" ? "详细美感报告" : mode === "fine-tune" ? "微调结果" : "单图定妆";
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1500"><rect width="1200" height="1500" fill="#f7f4f1"/><text x="90" y="100" font-size="52" fill="#7d3444" font-family="Microsoft YaHei">${title}</text><rect x="90" y="150" width="700" height="1260" rx="28" fill="#e8d8d2"/><circle cx="440" cy="450" r="170" fill="#c88f87"/><rect x="260" y="650" width="360" height="520" rx="170" fill="#9f4f5f"/><rect x="830" y="180" width="280" height="780" rx="24" fill="#fff"/><text x="870" y="260" font-size="40" fill="#7d3444" font-family="Microsoft YaHei">AI形象诊断</text><text x="870" y="340" font-size="30" fill="#24201d" font-family="Microsoft YaHei">自然精致</text><text x="870" y="400" font-size="30" fill="#24201d" font-family="Microsoft YaHei">保留辨识度</text><text x="870" y="460" font-size="30" fill="#24201d" font-family="Microsoft YaHei">适合分享</text></svg>`;
  }

  function mockX3Svg() {
    const labels = ["韩系温柔", "原生淡颜", "通勤精致"];
    const cards = labels.map((label, index) => {
      const x = 70 + index * 470;
      return `<rect x="${x}" y="130" width="420" height="620" rx="28" fill="#fff"/><circle cx="${x + 210}" cy="310" r="95" fill="#c88f87"/><rect x="${x + 120}" y="430" width="180" height="240" rx="90" fill="#9f4f5f"/><text x="${x + 80}" y="720" font-size="34" fill="#24201d" font-family="Microsoft YaHei">${label}</text>`;
    }).join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1000"><rect width="1500" height="1000" fill="#f7f4f1"/><text x="70" y="80" font-size="46" fill="#7d3444" font-family="Microsoft YaHei">多图对比</text>${cards}<rect x="70" y="800" width="1360" height="130" rx="24" fill="#fff"/><text x="110" y="875" font-size="34" fill="#24201d" font-family="Microsoft YaHei">轻报告：自然精致｜保留辨识度｜适合分享</text></svg>`;
  }

  function mockUpscaleSvg(mode) {
    const index = mode.replace("upscale-", "");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536"><rect width="1024" height="1536" fill="#f7f4f1"/><rect x="112" y="96" width="800" height="1344" rx="48" fill="#e8d8d2"/><circle cx="512" cy="420" r="190" fill="#c88f87"/><rect x="312" y="650" width="400" height="560" rx="200" fill="#9f4f5f"/><text x="360" y="1320" font-size="42" fill="#7d3444" font-family="Microsoft YaHei">Mock 图${index}放大</text></svg>`;
  }

  function mockMultiStyleSvg(mode) {
    const moduleName = mode.replace("multi-style-", "") || "妆容";
    if (moduleName === "穿搭") {
      const labels = ["职场", "通勤", "约会", "学生感", "微胖友好", "新娘"];
      const cards = labels.map((label, index) => {
        const col = index % 3;
        const row = Math.floor(index / 3);
        const x = 80 + col * 470;
        const y = 160 + row * 390;
        return `<rect x="${x}" y="${y}" width="390" height="340" rx="26" fill="#fff"/><circle cx="${x + 195}" cy="${y + 82}" r="48" fill="#c88f87"/><rect x="${x + 135}" y="${y + 145}" width="120" height="138" rx="60" fill="#9f4f5f"/><rect x="${x + 142}" y="${y + 278}" width="42" height="36" rx="18" fill="#7d3444"/><rect x="${x + 206}" y="${y + 278}" width="42" height="36" rx="18" fill="#7d3444"/><text x="${x + 112}" y="${y + 326}" font-size="28" fill="#7d3444" font-family="Microsoft YaHei">${label}</text>`;
      }).join("");
      return `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024"><rect width="1536" height="1024" fill="#f7f4f1"/><text x="80" y="105" font-size="52" fill="#7d3444" font-family="Microsoft YaHei">穿搭六宫格</text>${cards}</svg>`;
    }
    const labels = moduleName === "发型"
      ? ["锁骨发", "侧分刘海", "大波浪", "干练短发", "发际线", "柔顺发", "颅顶高", "显脸小", "减龄刘海"]
      : ["自然淡妆", "通勤裸妆", "约会纯欲", "复古港风", "新娘妆", "轻龄抗衰", "消肿", "伪素颜", "高级冷感"];
    const cards = labels.map((label, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = 80 + col * 350;
      const y = 170 + row * 360;
      return `<rect x="${x}" y="${y}" width="300" height="310" rx="26" fill="#fff"/><circle cx="${x + 150}" cy="${y + 110}" r="58" fill="#c88f87"/><rect x="${x + 92}" y="${y + 180}" width="116" height="90" rx="45" fill="#9f4f5f"/><text x="${x + 54}" y="${y + 288}" font-size="28" fill="#7d3444" font-family="Microsoft YaHei">${label}</text>`;
    }).join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1320"><rect width="1200" height="1320" fill="#f7f4f1"/><text x="80" y="105" font-size="52" fill="#7d3444" font-family="Microsoft YaHei">${moduleName}九宫格</text>${cards}</svg>`;
  }

  function pickMockSvg(mode) {
    if (mode.startsWith("upscale-")) return mockUpscaleSvg(mode);
    if (mode.startsWith("multi-style-")) return mockMultiStyleSvg(mode);
    if (mode === "x3") return mockX3Svg();
    return mockX1Svg(mode);
  }

  // 批次出图：count 张图共用同一 mode 模板，右上角叠一个序号角标区分。
  function badgeSvg(svg, index, total) {
    if (total <= 1) return svg;
    const badge = `<g><circle cx="60" cy="60" r="46" fill="#9f4f5f"/><text x="60" y="76" font-size="48" fill="#fff" font-family="Microsoft YaHei" text-anchor="middle">${index}</text></g>`;
    return svg.replace("</svg>", `${badge}</svg>`);
  }

  async function mockGenerateImage(mode, count = 1) {
    await new Promise((resolve) => window.setTimeout(resolve, 600));
    const total = Math.max(1, Number(count) || 1);
    const base = pickMockSvg(mode);
    const imageUrls = Array.from({ length: total }, (_, i) => svgDataUrl(badgeSvg(base, i + 1, total)));
    return { imageUrl: imageUrls[0], imageUrls, payload: { mock: true, count: total } };
  }

  global.AIBeautyMocks = { mockGenerateImage, pickMockSvg };
})(window);