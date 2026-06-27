/**
 * 美图大师 - 主入口
 *
 * 依赖：window.AIBeautyPrompts、window.AIBeautyMocks
 * 加载顺序：prompts.js → mocks.js → main.js
 *
 * 代码组织（自上而下）：
 *   1. 常量与默认值（CONFIG_FIELDS 是字段配置单一来源）
 *   2. 全局状态 appState / dom 缓存
 *   3. 初始化：缓存 DOM、绑定事件、回填配置
 *   4. 生成流程：runGeneration / runMultiStyle / runFineTune / runUpscale 统一走 requestImage
 *   5. 工具函数：状态面板、Busy、文件、下载、JSON 兜底
 */
(function () {
  "use strict";

  const P = window.AIBeautyPrompts;
  const M = window.AIBeautyMocks;
  const O = window.AIBeautyOptions;
  const A = window.AIBeautyApi;

  // ============================================================
  // 1. 常量与默认配置
  // ============================================================
  const STORAGE_KEYS = {
    relayConfig: "aiBeautyRelayConfig",
    apiKey: "aiBeautyApiKey",
  };

  const FILE_LIMITS = {
    maxBytes: 8 * 1024 * 1024,
    acceptedTypes: ["image/jpeg", "image/png", "image/webp"],
  };

  // 单一来源：配置项添加 / 改 default / 改输入框 id 都只在这里改一处
  // type=text   : 字符串，trim
  // type=bool   : 复选框
  // persisted=false: 不参与 localStorage（暂未使用，保留扩展位）
  const CONFIG_FIELDS = [
    { key: "endpoint",          default: "https://api.177911.com/v1/images/edits", domId: "endpoint-input",      type: "text" },
    { key: "imageField",        default: "image",                                  domId: "image-field-input",   type: "text" },
    { key: "modeField",         default: "",                                       domId: "mode-field-input",    type: "text" },
    { key: "responseImagePath", default: "data[0].url",                            domId: "response-path-input", type: "text" },
    { key: "model",             default: "gpt-image-2",                            domId: "model-input",         type: "text" },
    { key: "n",                 default: "1",                                      domId: "count-input",         type: "text" },
    { key: "size",              default: "1536x1024",                              domId: "size-input",          type: "text" },
    { key: "quality",           default: "high",                                   domId: "quality-input",       type: "text" },
    { key: "useMockMode",       default: true,                                     domId: "mock-mode-input",     type: "bool" },
  ];

  const DEFAULT_RELAY_CONFIG = CONFIG_FIELDS.reduce((acc, f) => { acc[f.key] = f.default; return acc; }, {});

  // 唯一被吐槽点：旧版本可能把 modeField 误存为 "mode"，这里做一次清洗
  const LEGACY_ENDPOINT = "https://api.177911.com/v1/images/edits";

  // ============================================================
  // 2. 状态与 DOM 缓存
  // ============================================================
  const appState = {
    uploadedFile: null,
    previewUrl: "",
    currentResultUrl: "",
    relayConfig: loadRelayConfig(),
    apiKey: loadApiKey(),
    lastPrompt: "",
    styleGenerationCycle: 0,
    firstGenerationPrompt: "",
    firstGenerationResultUrl: "",
    apiLogs: [],
  };

  const IS_DEV_MODE = isDevMode();
  const dom = {};
  const dropdowns = [];

  // ============================================================
  // 3. 入口
  // ============================================================
  document.addEventListener("DOMContentLoaded", () => {
    try {
      cacheDom();
      renderDynamicButtons();
      hydrateConfigForm();
      bindAll();
      initDebugPanel();
      showStatus("页面已加载。请先上传照片，或保持 Mock 模式体验生成流程。");
    } catch (error) {
      showInitError(error);
    }
    window.setTimeout(() => {
      document.querySelectorAll(".step-badge").forEach((b) => b.classList.add("is-fading"));
    }, 3500);
  });

  function cacheDom() {
    const ids = {
      form: "beauty-form",
      photoInput: "photo-input",
      photoPreview: "photo-preview",
      photoPlaceholder: "photo-placeholder",
      uploadMeta: "upload-meta",
      clearPhotoButton: "photo-remove-btn",
      userPrompt: "user-prompt-input",
      statusPanel: "status-panel",
      resultPanel: "result-panel",
      resultImage: "result-image",
      resultImageError: "result-image-error",
      resultGallery: "result-gallery",
      fineTunePanel: "fine-tune-panel",
      fineTuneButton: "fine-tune-button",
      reportButton: "report-button",
      downloadButton: "download-button",
      generateButton: "generate-button",
      copyPromptButton: "copy-prompt-button",
      testApiButton: "test-api-button",
      batchCountSelect: "batch-count-select",
      batchIntervalWrap: "batch-interval-wrap",
      batchIntervalSelect: "batch-interval-select",
      profession: "profession-select",
      ageRange: "age-select",
      shotType: "shot-select",
      scene: "scene-select",
      resultFeature: "result-feature-select",
      chooseButton: "choose-button",
      chooseMenu: "choose-menu",
      regenButton: "regen-button",
      regenMenuButton: "regen-menu-button",
      regenMenu: "regen-menu",
      upscaleButton: "upscale-button",
      upscaleMenu: "upscale-menu",
      apiKey: "api-key-input",
      debugPanel: "debug-panel",
      apiLogOutput: "api-log-output",
      promptShortcuts: null, // class selector，下面手动塞
    };
    Object.keys(ids).forEach((k) => { if (ids[k]) dom[k] = document.getElementById(ids[k]); });
    dom.promptShortcuts = document.querySelector(".prompt-shortcuts");
    CONFIG_FIELDS.forEach((f) => { dom[f.key] = document.getElementById(f.domId); });
  }

  // ============================================================
  // 3.1 数据驱动渲染：fine-tune 面板 / 多造型下拉 / 放大下拉 / 重新生成下拉 / Prompt 快捷指令
  // 所有按钮 HTML 都从 options.js 数据生成；index.html 只保留容器骨架。
  // ============================================================
  function renderDynamicButtons() {
    renderFineTunePanels();
    renderChooseMenu();
    renderUpscaleMenu();
    renderRegenMenu();
    renderPromptShortcuts();
  }

  function renderFineTunePanels() {
    O.FINE_TUNE_PANELS.forEach(({ panelId, module, tunes }) => {
      const panel = document.getElementById(panelId);
      if (!panel) return;
      panel.innerHTML = tunes
        .map((tune) => `<button type="button" data-module="${module}" data-tune="${tune}">${tune}</button>`)
        .join("");
    });
  }

  function renderChooseMenu() {
    if (!dom.chooseMenu) return;
    dom.chooseMenu.innerHTML = O.CHOOSE_MENU_GROUPS.map(({ module, items }) => {
      const buttons = items
        .map(([tune, title]) => `<button type="button" data-module="${module}" data-tune="${tune}" title="${title}">${tune}</button>`)
        .join("");
      return `<div class="choose-group"><div class="choose-group-title">${module}</div>${buttons}</div>`;
    }).join("");
  }

  function renderUpscaleMenu() {
    if (!dom.upscaleMenu) return;
    dom.upscaleMenu.innerHTML = O.UPSCALE_ITEMS
      .map(({ index, label, title }) => `<button type="button" data-upscale-index="${index}" title="${title}">${label}</button>`)
      .join("");
  }

  function renderRegenMenu() {
    if (!dom.regenMenu) return;
    dom.regenMenu.innerHTML = O.REGEN_ITEMS
      .map(({ mode, label, title }) => `<button type="button" data-regen-mode="${mode}" title="${title}">${label}</button>`)
      .join("");
  }

  function renderPromptShortcuts() {
    if (!dom.promptShortcuts) return;
    dom.promptShortcuts.innerHTML = O.PROMPT_SHORTCUTS
      .map(({ label, text }) => `<button type="button" data-prompt-insert="${escapeAttr(text)}">${label}</button>`)
      .join("");
  }

  function escapeAttr(value) {
    return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function hydrateConfigForm() {
    CONFIG_FIELDS.forEach((f) => {
      const el = dom[f.key];
      if (!el) return;
      if (f.type === "bool") el.checked = !!appState.relayConfig[f.key];
      else el.value = appState.relayConfig[f.key] ?? "";
    });
    dom.apiKey.value = appState.apiKey;
  }

  function bindAll() {
    bindUpload();
    bindGenerate();
    bindResultActions();
    bindTabs();
    bindTuneButtons();
    bindConfigPersistence();
    bindUtilityActions();
    bindDropdownAutoClose();
  }

  // ============================================================
  // 4. 事件绑定
  // ============================================================
  function bindUpload() {
    dom.photoInput.addEventListener("change", async () => {
      showStatus("正在读取照片...");
      const file = dom.photoInput.files && dom.photoInput.files[0];
      const validationError = validateImageFile(file);
      if (validationError) {
        resetUploadPreview();
        showStatus(validationError, true);
        return;
      }
      try {
        const previewUrl = await fileToDataUrl(file);
        appState.uploadedFile = file;
        appState.previewUrl = previewUrl;
        appState.firstGenerationPrompt = "";
        appState.firstGenerationResultUrl = "";
        appState.styleGenerationCycle = 0;
        dom.photoPreview.src = previewUrl;
        dom.photoPreview.hidden = false;
        dom.photoPlaceholder.hidden = true;
        dom.clearPhotoButton.hidden = false;
        showStatus("照片已读取，可以继续生成。");
      } catch (error) {
        showStatus(error.message, true);
      }
    });
  }

  function bindGenerate() {
    dom.form.addEventListener("submit", (event) => event.preventDefault());
    dom.generateButton.addEventListener("click", async (event) => {
      event.preventDefault();
      showStatus("已点击生成，正在检查照片和设置...");
      await runGeneration(getOutputMode());
    });
  }

  function bindResultActions() {
    dom.regenButton.addEventListener("click", () => runGeneration("x3"));
    registerDropdown(dom.regenMenuButton, dom.regenMenu, (btn) => runGeneration(btn.dataset.regenMode || "x3"));
    registerDropdown(dom.chooseButton, dom.chooseMenu, (btn) => runMultiStyle(btn.dataset.module, btn.dataset.tune));
    registerDropdown(dom.upscaleButton, dom.upscaleMenu, (btn) => confirmUpscale(Number(btn.dataset.upscaleIndex)));

    dom.fineTuneButton.addEventListener("click", () => {
      dom.fineTunePanel.hidden = false;
      dom.fineTunePanel.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    dom.reportButton.addEventListener("click", () => runDetailedReport());
    dom.downloadButton.addEventListener("click", async () => {
      if (!appState.currentResultUrl) return;
      setBusy(true, { message: "正在准备下载当前图片..." });
      try {
        await downloadImage(appState.currentResultUrl);
        showStatus("已触发下载。若浏览器打开了新标签，请在新标签中保存图片。");
      } finally {
        setBusy(false);
      }
    });
  }

  function bindTabs() {
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach((i) => i.classList.remove("is-active"));
        document.querySelectorAll(".tune-options").forEach((p) => { p.hidden = true; });
        tab.classList.add("is-active");
        const panel = document.getElementById(tab.dataset.panel);
        if (panel) panel.hidden = false;
      });
    });
  }

  function bindTuneButtons() {
    document.querySelectorAll(".tune-options [data-tune]").forEach((button) => {
      button.addEventListener("click", () => {
        const panel = button.closest(".tune-options");
        if (panel) panel.querySelectorAll("[data-tune]").forEach((b) => b.classList.remove("is-selected"));
        button.classList.add("is-selected");
        runFineTune(button.dataset.module, button.dataset.tune);
      });
    });
  }

  function bindConfigPersistence() {
    CONFIG_FIELDS.forEach((f) => {
      const el = dom[f.key];
      if (!el) return;
      el.addEventListener("input", syncConfig);
      el.addEventListener("change", () => {
        syncConfig();
        showStatus("API 设置已保存到当前浏览器。");
      });
    });
    dom.apiKey.addEventListener("input", syncConfig);
    dom.apiKey.addEventListener("change", () => {
      syncConfig();
      showStatus("API 设置已保存到当前浏览器。");
    });
  }

  function bindUtilityActions() {
    dom.clearPhotoButton.addEventListener("click", () => {
      resetUploadPreview();
      showStatus("照片已清除，可以重新上传。");
    });
    document.querySelectorAll("[data-prompt-insert]").forEach((button) => {
      button.addEventListener("click", () => appendPromptShortcut(button.dataset.promptInsert || ""));
    });
    dom.copyPromptButton.addEventListener("click", copyCurrentPrompt);
    dom.testApiButton.addEventListener("click", testApiConnection);
    dom.resultImage.addEventListener("error", showResultImageError);
    dom.resultImage.addEventListener("load", hideResultImageError);
    if (dom.batchCountSelect) {
      dom.batchCountSelect.addEventListener("change", syncBatchIntervalVisibility);
      syncBatchIntervalVisibility();
    }
  }

  // ============================================================
  // 4.1 统一下拉菜单
  // ============================================================
  function registerDropdown(triggerBtn, menuEl, onItemClick) {
    if (!triggerBtn || !menuEl) return;
    dropdowns.push({ triggerBtn, menuEl });
    triggerBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      const willOpen = menuEl.hidden;
      closeAllDropdowns();
      menuEl.hidden = !willOpen;
      triggerBtn.setAttribute("aria-expanded", String(willOpen));
    });
    menuEl.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.stopPropagation();
        closeAllDropdowns();
        onItemClick(btn);
      });
    });
  }

  function closeAllDropdowns() {
    dropdowns.forEach(({ triggerBtn, menuEl }) => {
      menuEl.hidden = true;
      triggerBtn.setAttribute("aria-expanded", "false");
    });
  }

  function bindDropdownAutoClose() {
    document.addEventListener("click", () => closeAllDropdowns());
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeAllDropdowns();
    });
  }

  // ============================================================
  // 5. 生成流程 - 统一入口 requestImage
  // ============================================================
  async function runGeneration(mode) {
    if (mode === "report") return runDetailedReport();
    const choices = collectChoices();
    const prompt = P.buildPromptForMode(mode, choices);
    const count = getBatchCount();
    if ((mode === "x1" || mode === "x3") && count > 1) {
      const first = await requestImageBatch({ file: appState.uploadedFile, prompt, mode, count });
      if (first) {
        appState.firstGenerationPrompt = prompt;
        appState.firstGenerationResultUrl = first;
        advanceStyleCycle();
      }
      return;
    }
    const result = await requestImage({ file: appState.uploadedFile, prompt, mode, count });
    if (result && (mode === "x1" || mode === "x3")) {
      appState.firstGenerationPrompt = prompt;
      appState.firstGenerationResultUrl = result.imageUrl;
      advanceStyleCycle();
    }
  }

  /**
   * 错峰批次：count 个 n=1 请求按 getBatchInterval() 间隔「错峰发起」，
   * 不等上一张返回就发下一张，请求各自并发跑——削服务器峰值，但用户总等待
   * ≈ 最慢一张 + 错峰累计，而非各张耗时线性相加。
   * 渐进展示：哪张先回来先进画廊，最先回来的进主图；单张失败不中止，
   * 保留成功的。返回最先成功的图片地址（没有则 null）。
   */
  async function requestImageBatch({ file, prompt, mode, count }) {
    syncConfig();
    if (!file) {
      showStatus("请先上传一张照片。", true);
      return null;
    }
    appState.lastPrompt = prompt;
    appState.relayConfig.n = "1";

    const intervalMs = getBatchInterval() * 1000;
    const slots = new Array(count).fill(null);
    const failures = [];
    let firstUrl = null;

    setBusy(true, { message: `已进入生成队列，每隔 ${getBatchInterval()}s 错峰发起，共 ${count} 张...`, showSpinner: true });
    scrollToStatusPanel();
    resetBatchGallery();

    const renderArrived = () => renderResultGallery(slots.filter(Boolean));

    const showProgress = () => {
      const done = slots.filter(Boolean).length + failures.length;
      const tail = failures.length ? `，已失败 ${failures.length} 张` : "";
      showStatus(`已完成 ${done}/${count} 张${tail}...`);
    };

    function startOne(i) {
      return A.generateImage({
        file,
        prompt,
        mode,
        config: appState.relayConfig,
        apiKey: appState.apiKey,
        mock: M.mockGenerateImage,
        onWaitingTip: () => showStatus(`第 ${i + 1}/${count} 张仍在处理中，请继续等待，不要重复点击。`),
        onLog: appendApiLog,
      }).then((result) => {
        const url = (result.imageUrls && result.imageUrls.length ? result.imageUrls : [result.imageUrl])[0];
        if (!url) throw new Error("接口未返回图片地址。");
        slots[i] = url;
        if (!firstUrl) {
          firstUrl = url;
          appState.currentResultUrl = url;
          hideResultImageError();
          dom.resultImage.src = url;
          dom.resultImage.hidden = false;
          dom.resultPanel.hidden = false;
          dom.resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        renderArrived();
        showProgress();
      }).catch(() => {
        failures.push(i + 1);
        showProgress();
      });
    }

    try {
      const tasks = [];
      for (let i = 0; i < count; i += 1) {
        if (i > 0) await delay(intervalMs);
        tasks.push(startOne(i));
      }
      await Promise.all(tasks);

      const collected = slots.filter(Boolean);
      if (collected.length === 0) {
        showStatus(`${count} 张全部生成失败。你可以重试，或切回 Mock 模式检查页面流程。`, true);
        return null;
      }
      const tail = failures.length ? `，第 ${failures.sort((a, b) => a - b).join("、")} 张失败` : "";
      showStatus(`已生成 ${collected.length}/${count} 张${tail}。可以下载、重新生成、微调或生成详细美感报告。`);
      return firstUrl;
    } finally {
      setBusy(false);
    }
  }

  function delay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function resetBatchGallery() {
    if (!dom.resultGallery) return;
    dom.resultGallery.hidden = true;
    dom.resultGallery.innerHTML = "";
  }

  async function runMultiStyle(moduleName, selectedTune) {
    if (!moduleName) return;
    const prompt = P.buildMultiStylePrompt(collectChoices(), moduleName, selectedTune);
    await requestImage({ file: appState.uploadedFile, prompt, mode: `multi-style-${moduleName}` });
  }

  async function runFineTune(moduleName, tune) {
    if (!appState.currentResultUrl) {
      showStatus("请先生成一张结果图，再进行微调。", true);
      return;
    }
    const prompt = P.buildFineTunePrompt(collectChoices(), moduleName, tune);
    try {
      const file = await urlToFile(appState.currentResultUrl);
      await requestImage({ file, prompt, mode: "fine-tune" });
    } catch (error) {
      showStatus(error.message, true);
    }
  }

  async function runDetailedReport() {
    if (!appState.firstGenerationPrompt) {
      showStatus("请先提交一次生图，再生成详细美感报告。", true);
      return;
    }
    if (!window.confirm("请上传第一次生成的结果图，系统会保持人物和布局不变，升级为详细报告。")) return;
    pickImageFile((file) => generateDetailedReportFromFile(file));
  }

  async function generateDetailedReportFromFile(file) {
    const prompt = P.buildDetailedReportPromptFromFirstGeneration(appState.firstGenerationPrompt);
    showStatus("已上传首次生成结果图，正在生成详细美感报告...");
    await requestImage({ file, prompt, mode: "report" });
  }

  function confirmUpscale(imageIndex) {
    if (!window.confirm("请先下载图，然后上传分析，系统会继续执行放大。")) return;
    pickImageFile((file) => runUpscale(imageIndex, file));
  }

  async function runUpscale(imageIndex, sourceFile) {
    const prompt = P.buildUpscalePrompt(collectChoices(), imageIndex);
    showStatus(`已选择图${imageIndex}，正在请求 AI 放大，请稍候...`);
    scrollToStatusPanel();
    await requestImage({ file: sourceFile, prompt, mode: `upscale-${imageIndex}` });
  }

  /**
   * 所有生图入口的最终归路：负责 setBusy、错误兜底、结果回填。
   */
  async function requestImage({ file, prompt, mode, count = 1 }) {
    syncConfig();
    if (!file) {
      showStatus("请先上传一张照片。", true);
      return null;
    }
    appState.lastPrompt = prompt;
    appState.relayConfig.n = String(Math.max(1, Number(count) || 1));

    setBusy(true, { message: "已进入生成队列，正在请求 AI 生图，请稍候...", showSpinner: true });
    scrollToStatusPanel();
    try {
      const result = await A.generateImage({
        file,
        prompt,
        mode,
        config: appState.relayConfig,
        apiKey: appState.apiKey,
        mock: M.mockGenerateImage,
        onWaitingTip: () => showStatus("生成仍在处理中，请继续等待，不要重复点击生成。"),
        onLog: appendApiLog,
      });
      const imageUrls = result.imageUrls && result.imageUrls.length ? result.imageUrls : [result.imageUrl];
      appState.currentResultUrl = imageUrls[0];
      hideResultImageError();
      dom.resultImage.src = imageUrls[0];
      dom.resultImage.hidden = false;
      renderResultGallery(imageUrls);
      dom.resultPanel.hidden = false;
      showStatus("生成完成。可以下载、重新生成、微调或生成详细美感报告。");
      dom.resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
      return result;
    } catch (error) {
      showStatus(`${error.message} 你可以重试，或切回 Mock 模式检查页面流程。`, true);
      return null;
    } finally {
      setBusy(false);
    }
  }

  // 批次 >1 时渲染缩略图画廊，点击切换主图与下载目标；<=1 时清空隐藏。
  function renderResultGallery(imageUrls) {
    if (!dom.resultGallery) return;
    if (!imageUrls || imageUrls.length <= 1) {
      dom.resultGallery.hidden = true;
      dom.resultGallery.innerHTML = "";
      return;
    }
    dom.resultGallery.innerHTML = imageUrls
      .map((url, i) => `<button type="button" class="result-gallery-thumb${i === 0 ? " is-active" : ""}" data-gallery-url="${escapeAttr(url)}"><img src="${escapeAttr(url)}" alt="批次结果 ${i + 1}" /></button>`)
      .join("");
    dom.resultGallery.hidden = false;
    dom.resultGallery.querySelectorAll(".result-gallery-thumb").forEach((thumb) => {
      thumb.addEventListener("click", () => {
        const url = thumb.dataset.galleryUrl;
        if (!url) return;
        appState.currentResultUrl = url;
        dom.resultImage.src = url;
        dom.resultGallery.querySelectorAll(".result-gallery-thumb").forEach((t) => t.classList.remove("is-active"));
        thumb.classList.add("is-active");
      });
    });
  }

  // ============================================================
  // 5.1 API 调用（generateImage 已抽到 src/js/api.js，本处只保留连接测试）
  // ============================================================
  async function testApiConnection() {
    syncConfig();
    if (appState.relayConfig.useMockMode) return showStatus("当前为 Mock 模式，不会连接真实 API。请关闭 Mock 模式后测试。", true);
    if (!appState.relayConfig.endpoint) return showStatus("请先填写 API 中转接口地址。", true);
    if (!appState.apiKey) return showStatus("请先填写 API Key。", true);

    setBusy(true, { message: "正在测试 API 连接..." });
    try {
      const response = await fetch(appState.relayConfig.endpoint, {
        method: "OPTIONS",
        headers: { Authorization: `Bearer ${appState.apiKey}` },
      });
      appendApiLog({ mode: "test", endpoint: appState.relayConfig.endpoint, status: response.status, ok: response.ok, fields: { method: "OPTIONS" } });
      showStatus(response.ok ? "API 连接测试通过。" : `已连接到接口，但返回 HTTP ${response.status}。如服务不支持 OPTIONS，可直接尝试生成。`, !response.ok);
    } catch (error) {
      appendApiLog({ mode: "test", endpoint: appState.relayConfig.endpoint, ok: false, error: error.message, fields: { method: "OPTIONS" } });
      showStatus(`API 连接测试失败：${error.message}`, true);
    } finally {
      setBusy(false);
    }
  }

  // ============================================================
  // 6. 工具函数
  // ============================================================
  function getOutputMode() {
    return new FormData(dom.form).get("outputMode") || "x3";
  }

  function getBatchCount() {
    return Number(new FormData(dom.form).get("batchCount")) || 1;
  }

  function getBatchInterval() {
    const value = Number(new FormData(dom.form).get("batchInterval"));
    return value > 0 ? value : 0.5;
  }

  function syncBatchIntervalVisibility() {
    if (!dom.batchIntervalWrap) return;
    dom.batchIntervalWrap.hidden = getBatchCount() <= 1;
  }

  function advanceStyleCycle() {
    appState.styleGenerationCycle += 1;
  }

  function collectChoices() {
    return {
      profession: dom.profession.value,
      ageRange: dom.ageRange.value,
      shotType: dom.shotType.value,
      resultFeature: dom.resultFeature ? dom.resultFeature.value : "默认",
      scene: dom.scene.value,
      outputMode: getOutputMode(),
      generationCycle: appState.styleGenerationCycle,
      userPrompt: dom.userPrompt.value.trim(),
    };
  }

  function appendPromptShortcut(text) {
    if (!text) return;
    const current = dom.userPrompt.value.trim();
    dom.userPrompt.value = current ? `${current}\n${text}` : text;
    dom.userPrompt.focus();
  }

  async function copyCurrentPrompt() {
    const prompt = P.buildPromptForMode(getOutputMode(), collectChoices());
    appState.lastPrompt = prompt;
    try {
      await navigator.clipboard.writeText(prompt);
      showStatus("Prompt 已复制到剪贴板。");
    } catch {
      showStatus("当前浏览器不允许直接复制，请手动复制控制台或输入框中的 Prompt。", true);
      console.log(prompt);
    }
  }

  function pickImageFile(onPicked) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = FILE_LIMITS.acceptedTypes.join(",");
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      const validationError = validateImageFile(file);
      if (validationError) {
        showStatus(validationError, true);
        return;
      }
      onPicked(file);
    }, { once: true });
    input.click();
  }

  function validateImageFile(file) {
    if (!file) return "请先上传一张照片。";
    if (!FILE_LIMITS.acceptedTypes.includes(file.type)) return "请上传 JPG、PNG 或 WebP 图片。";
    if (file.size > FILE_LIMITS.maxBytes) return "图片不能超过 8MB。";
    return "";
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("图片读取失败，请重新选择。"));
      reader.readAsDataURL(file);
    });
  }

  async function urlToFile(url, filename = "current-result.png") {
    const response = await fetch(url);
    if (!response.ok) throw new Error("当前结果图读取失败，请重新生成后再微调。");
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type || "image/png" });
  }

  async function downloadImage(url, filename = "ai-beauty-result.png") {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("download failed");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      triggerDownload(objectUrl, filename);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      triggerDownload(url, filename);
    }
  }

  function triggerDownload(url, filename) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    document.body.append(a);
    a.click();
    a.remove();
  }

  // ============================================================
  // 6.1 状态面板 & Busy
  // ============================================================
  function showStatus(message, isError = false) {
    dom.statusPanel.hidden = false;
    dom.statusPanel.textContent = message;
    dom.statusPanel.classList.toggle("is-error", isError);
  }

  function showInitError(error) {
    const sp = document.getElementById("status-panel");
    if (sp) {
      sp.hidden = false;
      sp.classList.add("is-error");
      sp.textContent = `页面初始化失败：${error.message}`;
    }
    console.error(error);
  }

  function scrollToStatusPanel() {
    dom.statusPanel.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /**
   * @param {boolean} isBusy
   * @param {{message?: string, showSpinner?: boolean}} [opts]
   */
  function setBusy(isBusy, opts = {}) {
    const { message = "", showSpinner = false } = opts;

    dom.generateButton.disabled = isBusy;
    dom.copyPromptButton.disabled = isBusy;
    dom.testApiButton.disabled = isBusy;
    document.querySelectorAll(".result-actions button, .tune-options button").forEach((b) => { b.disabled = isBusy; });

    if (isBusy) closeAllDropdowns();

    const oldSpinner = dom.statusPanel.querySelector(".loading-spinner");
    if (oldSpinner) oldSpinner.remove();

    if (message) showStatus(message);

    if (isBusy && showSpinner) {
      const spinner = document.createElement("span");
      spinner.className = "loading-spinner";
      dom.statusPanel.appendChild(spinner);
    }
  }

  function showResultImageError() {
    dom.resultImage.hidden = true;
    dom.resultImageError.hidden = false;
    showStatus("结果图加载失败，请重新生成或检查接口返回的图片地址。", true);
  }

  function hideResultImageError() {
    dom.resultImageError.hidden = true;
  }

  function resetUploadPreview() {
    appState.uploadedFile = null;
    appState.previewUrl = "";
    appState.firstGenerationPrompt = "";
    appState.firstGenerationResultUrl = "";
    appState.styleGenerationCycle = 0;
    dom.photoInput.value = "";
    dom.photoPreview.removeAttribute("src");
    dom.photoPreview.hidden = true;
    dom.photoPlaceholder.hidden = false;
    dom.uploadMeta.hidden = true;
    dom.uploadMeta.textContent = "";
    dom.clearPhotoButton.hidden = true;
  }

  // ============================================================
  // 6.2 配置持久化
  // ============================================================
  function syncConfig() {
    const next = { ...appState.relayConfig };
    CONFIG_FIELDS.forEach((f) => {
      const el = dom[f.key];
      if (!el) return;
      if (f.type === "bool") next[f.key] = el.checked;
      else next[f.key] = (el.value || "").trim() || f.default;
    });
    appState.relayConfig = next;
    try {
      localStorage.setItem(STORAGE_KEYS.relayConfig, JSON.stringify(next));
    } catch {}
    appState.apiKey = dom.apiKey.value.trim();
    try {
      localStorage.setItem(STORAGE_KEYS.apiKey, appState.apiKey);
    } catch {}
  }

  function loadRelayConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.relayConfig);
      const config = raw ? { ...DEFAULT_RELAY_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_RELAY_CONFIG };
      if (config.endpoint === LEGACY_ENDPOINT && config.modeField === "mode") config.modeField = "";
      return config;
    } catch {
      return { ...DEFAULT_RELAY_CONFIG };
    }
  }

  function loadApiKey() {
    try { return localStorage.getItem(STORAGE_KEYS.apiKey) || ""; } catch { return ""; }
  }

  // ============================================================
  // 6.3 调试面板
  // ============================================================
  function initDebugPanel() {
    dom.debugPanel.hidden = !IS_DEV_MODE;
  }

  function appendApiLog(entry) {
    if (!IS_DEV_MODE) return;
    appState.apiLogs.unshift({ time: new Date().toLocaleString(), ...entry });
    appState.apiLogs = appState.apiLogs.slice(0, 20);
    dom.apiLogOutput.textContent = JSON.stringify(appState.apiLogs, null, 2);
  }

  function isDevMode() {
    return ["localhost", "127.0.0.1", ""].includes(window.location.hostname)
      || new URLSearchParams(window.location.search).has("dev");
  }
})();