/**
 * API 请求层。负责「把一次生图请求发出去并解析回图片地址」，不碰 DOM。
 *
 * 设计：副作用全部依赖注入，保持本层是可单测的纯逻辑
 *   mock         : Mock 模式下的出图函数（由 main 传 window.AIBeautyMocks.mockGenerateImage）
 *   onWaitingTip : 长等待提示回调（可选）
 *   onLog        : 请求日志回调（可选，仅 dev 面板用）
 *
 * 契约：传入的 config 必须是已兜底的完整配置（model / n / size / quality / imageField 都有值），
 *       本层不再二次兜底默认值。
 *
 * 暴露到全局：window.AIBeautyApi
 */
(function (global) {
  "use strict";

  const PROMPT_FIELD = "prompt";
  const WAITING_TIP_MS = 90000;

  // mode → 输出尺寸：放大走竖版，多宫格走横版，其余用配置尺寸
  function resolveImageSize(mode, config) {
    if (mode.startsWith("upscale-")) return "1024x1536";
    if (mode.startsWith("multi-style-")) return "1536x1024";
    return config.size;
  }

  function buildGenerationFormData({ file, prompt, mode, config }) {
    const formData = new FormData();
    formData.append("model", config.model);
    formData.append(PROMPT_FIELD, prompt);
    formData.append("n", config.n);
    formData.append("size", resolveImageSize(mode, config));
    formData.append("quality", config.quality);
    if (config.modeField) formData.append(config.modeField, mode);
    formData.append(config.imageField, file, file.name || "image.png");
    return formData;
  }

  function parseJsonResponse(text) {
    if (!text) return {};
    try { return JSON.parse(text); } catch { return text; }
  }

  function getValueByPath(source, path) {
    if (!path) return undefined;
    return path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean).reduce((value, key) => value?.[key], source);
  }

  function extractImageUrl(payload, configuredPath) {
    if (typeof payload === "string") return payload;
    if (!payload || typeof payload !== "object") return "";
    const candidates = [
      getValueByPath(payload, configuredPath),
      payload.image_url,
      payload.url,
      payload.data?.[0]?.url,
      payload.b64_json ? `data:image/png;base64,${payload.b64_json}` : "",
      payload.data?.[0]?.b64_json ? `data:image/png;base64,${payload.data[0].b64_json}` : "",
    ];
    return candidates.find((c) => typeof c === "string" && c.length > 0) || "";
  }

  // 批次出图：把接口返回的整组图都取出来。data 是数组就逐条解析，
  // 否则退回单张（兼容只返回一张的接口）。
  function extractImageUrls(payload, configuredPath) {
    if (Array.isArray(payload?.data)) {
      const urls = payload.data
        .map((item) => {
          if (typeof item === "string") return item;
          if (item?.url) return item.url;
          if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
          return "";
        })
        .filter((u) => typeof u === "string" && u.length > 0);
      if (urls.length > 0) return urls;
    }
    const single = extractImageUrl(payload, configuredPath);
    return single ? [single] : [];
  }

  function summarizeFormData(formData) {
    const summary = {};
    formData.forEach((value, key) => {
      summary[key] = value instanceof File
        ? `${value.name} (${formatFileSize(value.size)}, ${formatFileType(value.type)})`
        : value;
    });
    return summary;
  }

  function formatFileSize(bytes) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
  }

  function formatFileType(type) {
    return (type || "").replace("image/", "").toUpperCase() || "未知格式";
  }

  async function generateImage({ file, prompt, mode, config, apiKey, mock, onWaitingTip, onLog }) {
    if (config.useMockMode) return mock(mode, Number(config.n) || 1);
    if (!config.endpoint) throw new Error("请先填写 API 中转接口地址，或开启 Mock 模式。");
    if (!apiKey) throw new Error("请先填写 API Key，或开启 Mock 模式。");

    const waitingTipId = window.setTimeout(() => {
      if (onWaitingTip) onWaitingTip();
    }, WAITING_TIP_MS);

    try {
      const formData = buildGenerationFormData({ file, prompt, mode, config });
      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
      });

      const responseText = await response.text();
      const payload = parseJsonResponse(responseText);
      if (onLog) onLog({
        mode,
        endpoint: config.endpoint,
        status: response.status,
        ok: response.ok,
        fields: summarizeFormData(formData),
        payload,
      });

      if (!response.ok) {
        const remoteMessage = (typeof payload === "object" && payload && payload.error && payload.error.message) || (typeof payload === "string" && payload) || "";
        throw new Error(remoteMessage ? `生成失败：${remoteMessage}` : `生成失败：HTTP ${response.status}`);
      }
      if (typeof payload === "object" && payload && payload.error) {
        throw new Error(payload.error.message || "生成失败：接口返回错误。");
      }

      const imageUrls = extractImageUrls(payload, config.responseImagePath);
      if (imageUrls.length === 0) throw new Error("接口已返回，但没有找到图片地址。请检查返回图片路径设置。");
      return { imageUrl: imageUrls[0], imageUrls, payload };
    } finally {
      window.clearTimeout(waitingTipId);
    }
  }

  global.AIBeautyApi = {
    PROMPT_FIELD,
    WAITING_TIP_MS,
    resolveImageSize,
    buildGenerationFormData,
    parseJsonResponse,
    extractImageUrl,
    extractImageUrls,
    summarizeFormData,
    generateImage,
  };
})(window);