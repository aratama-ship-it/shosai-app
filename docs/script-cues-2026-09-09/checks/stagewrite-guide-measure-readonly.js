
async () => {
  const root = document.body || document.documentElement;
  const viewportArea = Math.max(1, innerWidth * innerHeight);

  function selectorFor(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return "";
    if (el.id) {
      const byId = `#${CSS.escape(el.id)}`;
      if (document.querySelectorAll(byId).length === 1) return byId;
    }
    const parts = [];
    let current = el;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      const tag = current.tagName.toLowerCase();
      if (tag === "html") {
        parts.unshift("html");
        break;
      }
      let index = 1;
      let sibling = current.previousElementSibling;
      while (sibling) {
        if (sibling.tagName === current.tagName) index += 1;
        sibling = sibling.previousElementSibling;
      }
      parts.unshift(`${tag}:nth-of-type(${index})`);
      const candidate = parts.join(" > ");
      try {
        if (document.querySelectorAll(candidate).length === 1) return candidate;
      } catch (_) {}
      current = current.parentElement;
    }
    return parts.join(" > ");
  }

  function docRect(rect) {
    return {
      x: rect.left + scrollX,
      y: rect.top + scrollY,
      width: rect.width,
      height: rect.height,
    };
  }

  function waitFrames(count = 1) {
    return new Promise((resolve) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve();
        }
      }, 250);
      function step(remaining) {
        requestAnimationFrame(() => {
          if (settled) return;
          if (remaining > 1) {
            step(remaining - 1);
          } else {
            settled = true;
            clearTimeout(timeout);
            resolve();
          }
        });
      }
      step(count);
    });
  }

  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    let current = el;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      const style = getComputedStyle(current);
      if (
        style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0 ||
        style.contentVisibility === "hidden"
      ) {
        return false;
      }
      const currentRect = current.getBoundingClientRect();
      const clippedForAccessibility =
        currentRect.width <= 2 && currentRect.height <= 2 &&
        ["absolute", "fixed"].includes(style.position) &&
        (style.overflow === "hidden" || style.clip !== "auto" || /inset\(50%\)/i.test(style.clipPath || ""));
      if (clippedForAccessibility) return false;
      current = current.parentElement;
    }
    return true;
  }

  // CUA read-only adapter: parse computed rgb(a) strings without a canvas.
  function colorToRgba(value) {
    const v=String(value||'').trim();
    if(v==='transparent') return [0,0,0,0];
    const m=v.match(/^rgba?\(([^)]+)\)$/);
    if(!m) return null;
    const parts=m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    if(parts.length===3) parts.push(1);
    return parts.length===4 && parts.every(Number.isFinite) ? parts : null;
  }

  function splitTopLevel(text, splitOnWhitespace) {
    const result = [];
    let token = "";
    let depth = 0;
    let quote = "";
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      if (quote) {
        token += ch;
        if (ch === quote && text[i - 1] !== "\\") quote = "";
        continue;
      }
      if (ch === "\"" || ch === "'") {
        quote = ch;
        token += ch;
      } else if (ch === "(") {
        depth += 1;
        token += ch;
      } else if (ch === ")") {
        depth = Math.max(0, depth - 1);
        token += ch;
      } else if (depth === 0 && ((!splitOnWhitespace && ch === ",") || (splitOnWhitespace && /\s/.test(ch)))) {
        if (token.trim()) result.push(token.trim());
        token = "";
      } else {
        token += ch;
      }
    }
    if (token.trim()) result.push(token.trim());
    return result;
  }

  function gradientFunctions(image) {
    const lower = image.toLowerCase();
    const names = ["linear-gradient(", "radial-gradient("];
    const found = [];
    let cursor = 0;
    while (cursor < image.length) {
      let at = -1;
      let name = "";
      for (const candidate of names) {
        const position = lower.indexOf(candidate, cursor);
        if (position >= 0 && (at < 0 || position < at)) {
          at = position;
          name = candidate;
        }
      }
      if (at < 0) break;
      const open = at + name.length - 1;
      let depth = 0;
      let quote = "";
      let end = -1;
      for (let i = open; i < image.length; i += 1) {
        const ch = image[i];
        if (quote) {
          if (ch === quote && image[i - 1] !== "\\") quote = "";
          continue;
        }
        if (ch === "\"" || ch === "'") quote = ch;
        else if (ch === "(") depth += 1;
        else if (ch === ")") {
          depth -= 1;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      }
      if (end < 0) break;
      found.push(image.slice(open + 1, end));
      cursor = end + 1;
    }
    return found;
  }

  function resolveStopColor(stop) {
    const tokens = splitTopLevel(stop, true);
    for (let end = tokens.length; end > 0; end -= 1) {
      const candidate = tokens.slice(0, end).join(" ");
      const rgba = colorToRgba(candidate);
      if (rgba) return {raw: candidate, rgba};
    }
    return null;
  }

  function gradientColors(image) {
    const colors = [];
    for (const body of gradientFunctions(image || "")) {
      for (const stop of splitTopLevel(body, false)) {
        const parsed = resolveStopColor(stop);
        if (parsed && parsed.rgba[3] > 0.5) colors.push(parsed);
      }
    }
    const unique = new Map();
    for (const color of colors) {
      const key = color.rgba.map((part) => Number(part).toFixed(4)).join(":");
      if (!unique.has(key)) unique.set(key, color);
    }
    return Array.from(unique.values());
  }

  function hasRasterImage(image) {
    if (!image || image === "none") return false;
    return /(?:url|image-set|-webkit-image-set)\s*\(/i.test(image);
  }

  function pseudoCoverImage(el, pseudo) {
    const style = getComputedStyle(el, pseudo);
    const active = style.content !== "none" && style.content !== "normal" && style.display !== "none" && style.visibility !== "hidden";
    const positioned = ["absolute", "fixed"].includes(style.position);
    const insetCover = [style.top, style.right, style.bottom, style.left].every((value) => value === "0px");
    const sizedCover = style.width === "100%" && style.height === "100%";
    return active && positioned && (insetCover || sizedCover) ? style : null;
  }

  const visualMedia = Array.from(document.querySelectorAll("img, video, canvas, iframe"))
    .filter(isVisible)
    .map((element) => ({
      element,
      tag: element.tagName.toLowerCase(),
      selector: selectorFor(element),
      rect: docRect(element.getBoundingClientRect()),
    }));

  function intersects(first, second) {
    return first.x < second.x + second.width && first.x + first.width > second.x &&
      first.y < second.y + second.height && first.y + first.height > second.y;
  }

  function mediaBehind(rect, textElement) {
    const raster = [];
    const dynamic = [];
    for (const item of visualMedia) {
      if (!intersects(rect, item.rect)) continue;
      const left = Math.max(rect.x, item.rect.x);
      const right = Math.min(rect.x + rect.width, item.rect.x + item.rect.width);
      const top = Math.max(rect.y, item.rect.y);
      const bottom = Math.min(rect.y + rect.height, item.rect.y + item.rect.height);
      const clientX = (left + right) / 2 - scrollX;
      const clientY = (top + bottom) / 2 - scrollY;
      let isBehind = true;
      let protectedByOpaqueBand = false;
      if (clientX >= 0 && clientX < innerWidth && clientY >= 0 && clientY < innerHeight) {
        const stack = document.elementsFromPoint(clientX, clientY);
        const textIndex = stack.findIndex((element) => element === textElement || textElement.contains(element));
        const mediaIndex = stack.indexOf(item.element);
        if (textIndex >= 0 && mediaIndex >= 0) {
          isBehind = mediaIndex > textIndex;
          if (isBehind) {
            for (let index = textIndex; index < mediaIndex; index += 1) {
              const layer = stack[index];
              if (!(layer === textElement || layer.contains(textElement))) continue;
              const style = getComputedStyle(layer);
              const background = colorToRgba(style.backgroundColor);
              if (background && background[3] >= 0.999 && Number(style.opacity) >= 0.999) {
                protectedByOpaqueBand = true;
                break;
              }
            }
          }
        }
      }
      if (isBehind && !protectedByOpaqueBand) {
        let current = textElement;
        while (current && current.nodeType === Node.ELEMENT_NODE) {
          if (!current.contains(item.element)) {
            const style = getComputedStyle(current);
            const background = colorToRgba(style.backgroundColor);
            if (background && background[3] >= 0.999 && Number(style.opacity) >= 0.999) {
              protectedByOpaqueBand = true;
              break;
            }
          }
          current = current.parentElement;
        }
      }
      if (!isBehind || protectedByOpaqueBand) continue;
      const observed = {tag: item.tag, selector: item.selector};
      if (item.tag === "img") raster.push(observed);
      else dynamic.push(observed);
    }
    return {raster, dynamic};
  }

  function backgroundPath(el) {
    const result = [];
    let current = el;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      const style = getComputedStyle(current);
      const ownImage = style.backgroundImage || "none";
      const before = pseudoCoverImage(current, "::before");
      const after = pseudoCoverImage(current, "::after");
      const pseudoStyles = [before, after].filter(Boolean);
      const pseudoImages = pseudoStyles
        .map((pseudoStyle) => pseudoStyle.backgroundImage || "none")
        .filter((value) => value !== "none");
      const pseudoCoverColors = pseudoStyles
        .map((pseudoStyle) => {
          const color = colorToRgba(pseudoStyle.backgroundColor);
          if (!color) return null;
          return [color[0], color[1], color[2], color[3] * Number(pseudoStyle.opacity || "1")];
        })
        .filter((color) => color && color[3] > 0.5)
        .map((rgba) => ({raw: "pseudo-element background", rgba}));
      const opaquePseudoCover = pseudoCoverColors.some((entry) => entry.rgba[3] >= 0.999);
      const images = [...(opaquePseudoCover ? [] : [ownImage]), ...pseudoImages]
        .filter((value) => value !== "none");
      const image = images.join(", ") || "none";
      const hasRaster =
        pseudoImages.some(hasRasterImage) ||
        (!opaquePseudoCover && hasRasterImage(ownImage));
      result.push({
        selector: selectorFor(current),
        backgroundColor: style.backgroundColor,
        backgroundColorRgba: colorToRgba(style.backgroundColor),
        backgroundImage: image,
        gradientColors: [...gradientColors(image), ...pseudoCoverColors],
        hasRaster,
        opacity: Number.parseFloat(style.opacity || "1"),
      });
      current = current.parentElement;
    }
    return result;
  }

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function bodyContainer(el) {
    const semantic = el.closest("p, li, blockquote, dd, dt");
    if (semantic) return semantic;
    let current = el;
    while (current && current !== root) {
      const display = getComputedStyle(current).display;
      if (["block", "flow-root", "list-item", "table-cell"].includes(display)) return current;
      current = current.parentElement;
    }
    return el;
  }

  function isBodyText(el, text) {
    if (!text) return false;
    if (el.closest("h1, h2, h3, h4, h5, h6, [role='heading'], header, footer, aside, nav, [role='navigation'], button, [role='button'], [role='tab'], [role='menuitem'], input, select, textarea")) {
      return false;
    }
    return true;
  }

  const texts = [];
  const bodyElements = new Set();
  if (root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const text = normalizeText(node.nodeValue);
      const el = node.parentElement;
      if (!text || !el || ["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"].includes(el.tagName) || !isVisible(el)) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const clientRects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
      if (!clientRects.length) continue;
      const rect = range.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      const style = getComputedStyle(el);
      const lineTops = [];
      for (const part of clientRects) {
        if (!lineTops.some((top) => Math.abs(top - part.top) < 1)) lineTops.push(part.top);
      }
      const itemRect = docRect(rect);
      const body = isBodyText(el, text);
      const media = mediaBehind(itemRect, el);
      if (body) bodyElements.add(bodyContainer(el));
      texts.push({
        selector: selectorFor(el),
        text,
        rect: itemRect,
        fontSize: Number.parseFloat(style.fontSize || "0"),
        fontWeight: style.fontWeight,
        fontFamily: style.fontFamily,
        lineHeight: style.lineHeight,
        color: style.color,
        colorRgba: colorToRgba(style.color),
        lineCount: Math.max(1, lineTops.length),
        isBody: body,
        isUi: Boolean(el.closest("button, [role='button'], input, select, textarea, [role='tab'], [role='menuitem'], [role='checkbox'], [role='radio'], [role='switch']")),
        // 無効状態のUI部品。WCAG 2.x は inactive user interface component を
        // コントラスト要件の対象外としているため、C1 の判定から除外する。
        isInactive: Boolean(el.closest(":disabled, [aria-disabled='true'], [inert]")),
        isLinguistic: /[\p{L}\p{N}]/u.test(text),
        backgrounds: backgroundPath(el),
        rasterBehind: media.raster,
        dynamicBehind: media.dynamic,
      });
    }
  }
  const visibleTextNodeCount = texts.length;

  const formControls = Array.from(document.querySelectorAll(
    "input:not([type='hidden']):not([type='checkbox']):not([type='radio']):not([type='color']):not([type='range']):not([type='image']), textarea, select"
  )).filter(isVisible);
  for (const el of formControls) {
    let text = "";
    if (el.tagName === "SELECT") {
      text = normalizeText(Array.from(el.selectedOptions || []).map((option) => option.textContent).join(" "));
    } else {
      text = normalizeText(el.value || el.placeholder || "");
    }
    if (!text) continue;
    const selector = selectorFor(el);
    if (texts.some((item) => item.selector === selector && item.text === text)) continue;
    const showsPlaceholder = el.tagName !== "SELECT" && !el.value && Boolean(el.placeholder);
    const style = getComputedStyle(el, showsPlaceholder ? "::placeholder" : null);
    const itemRect = docRect(el.getBoundingClientRect());
    const media = mediaBehind(itemRect, el);
    texts.push({
      selector,
      text,
      rect: itemRect,
      fontSize: Number.parseFloat(style.fontSize || "0"),
      fontWeight: style.fontWeight,
      fontFamily: style.fontFamily,
      lineHeight: style.lineHeight,
      color: style.color,
      colorRgba: colorToRgba(style.color),
      lineCount: 1,
      isBody: false,
      isUi: true,
      isLinguistic: /[\p{L}\p{N}]/u.test(text),
      backgrounds: backgroundPath(el),
      rasterBehind: media.raster,
      dynamicBehind: media.dynamic,
    });
  }

  const bodyBlocks = Array.from(bodyElements).filter(isVisible).map((el) => {
    const style = getComputedStyle(el);
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
    const lineTops = [];
    for (const part of rects) {
      if (!lineTops.some((top) => Math.abs(top - part.top) < 1)) lineTops.push(part.top);
    }
    return {
      selector: selectorFor(el),
      text: normalizeText(el.innerText || el.textContent),
      rect: docRect(el.getBoundingClientRect()),
      fontSize: Number.parseFloat(style.fontSize || "0"),
      fontWeight: style.fontWeight,
      fontFamily: style.fontFamily,
      lineHeight: style.lineHeight,
      lineCount: Math.max(1, lineTops.length),
    };
  });

  const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6, [role='heading']"))
    .filter(isVisible)
    .map((el) => {
      const style = getComputedStyle(el);
      return {
        selector: selectorFor(el),
        text: normalizeText(el.innerText || el.textContent),
        rect: docRect(el.getBoundingClientRect()),
        fontSize: Number.parseFloat(style.fontSize || "0"),
      };
    });

  function numericWeight(value) {
    if (value === "normal") return 400;
    if (value === "bold") return 700;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 400;
  }

  const links = Array.from(document.querySelectorAll("a[href]"))
    .filter((el) =>
      isVisible(el) &&
      !el.closest("header, footer, aside, nav, [role='navigation'], h1, h2, h3, h4, h5, h6, [role='heading'], button, [role='button']") &&
      Boolean(el.closest("p, li, blockquote, dd, dt") || Array.from(bodyElements).some((body) => body.contains(el)))
    )
    .map((el) => {
      const style = getComputedStyle(el);
      const parentStyle = el.parentElement ? getComputedStyle(el.parentElement) : style;
      const before = getComputedStyle(el, "::before").content;
      const after = getComputedStyle(el, "::after").content;
      const text = normalizeText(el.innerText || el.textContent);
      const cues = [];
      if ((style.textDecorationLine || "").includes("underline")) cues.push("下線");
      if (style.borderBottomStyle !== "none" && Number.parseFloat(style.borderBottomWidth || "0") > 0) cues.push("下線相当の下辺");
      if (numericWeight(style.fontWeight) >= numericWeight(parentStyle.fontWeight) + 100) cues.push("太さ");
      if ((before && !["none", "normal", "\"\""].includes(before)) || (after && !["none", "normal", "\"\""].includes(after)) || el.querySelector("svg, img") || /^[→←↑↓↗↘›»#※]|[→←↑↓↗↘›»]$/.test(text)) cues.push("記号");
      return {
        selector: selectorFor(el),
        text,
        rect: docRect(el.getBoundingClientRect()),
        cues: Array.from(new Set(cues)),
      };
    });

  const interactiveSelector = "button, a[href], input:not([type='hidden']), select, textarea, summary, [role='button'], [role='link'], [role='checkbox'], [role='radio'], [role='switch'], [role='tab'], [tabindex]:not([tabindex='-1'])";
  const interactive = Array.from(new Set(Array.from(document.querySelectorAll(interactiveSelector))))
    .filter(isVisible)
    .map((el) => {
      // 実際に押せる範囲を測る。チェックボックス/ラジオが <label> で包まれている場合、
      // 指が触れる対象は 12px の input ではなくラベル全体なので、そちらの大きさで判定する。
      let target = el;
      const label = el.closest("label");
      if (label && (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA")) {
        const lr = label.getBoundingClientRect();
        const er = el.getBoundingClientRect();
        if (lr.width >= er.width && lr.height >= er.height) target = label;
      }
      const rect = target.getBoundingClientRect();
      const text = normalizeText(el.getAttribute("aria-label") || el.innerText || el.value || el.title || "");
      return {selector: selectorFor(el), text, rect: docRect(rect), tapArea: target === el ? "self" : "label"};
    });

  function hasVisibleWordText(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const value = normalizeText(node.nodeValue);
      if (!value || !/[\p{L}\p{N}]/u.test(value)) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const rect = range.getBoundingClientRect();
      if (rect.width > 2 && rect.height > 2) return true;
    }
    return false;
  }

  const buttonElements = Array.from(new Set(Array.from(document.querySelectorAll("button, [role='button']")))).filter(isVisible);
  const buttons = buttonElements.map((el) => {
    const rect = el.getBoundingClientRect();
    const visibleText = normalizeText(el.innerText || el.textContent);
    const style = getComputedStyle(el);
    const before = getComputedStyle(el, "::before");
    const after = getComputedStyle(el, "::after");
    const pseudoGraphic = [before, after].some((pseudo) =>
      (pseudo.content && !["none", "normal", "\"\""].includes(pseudo.content)) ||
      (pseudo.backgroundImage && pseudo.backgroundImage !== "none")
    );
    const hasGraphic =
      Boolean(el.querySelector("svg, img, i, use, [class*='icon'], [class*='Icon']")) ||
      style.backgroundImage !== "none" || pseudoGraphic ||
      (visibleText && !/[\p{L}\p{N}]/u.test(visibleText));
    const iconOnly = hasGraphic && !hasVisibleWordText(el);
    return {
      selector: selectorFor(el),
      text: normalizeText(el.getAttribute("aria-label") || visibleText || el.title || ""),
      visibleLabel: visibleText,
      rect: docRect(rect),
      iconOnly,
      ariaLabel: normalizeText(el.getAttribute("aria-label") || ""),
    };
  });

  const originalScroll = {x: scrollX, y: scrollY};
  const coverage = [];
  for (const el of buttonElements) {
    const rect = el.getBoundingClientRect();
    const x = Math.min(Math.max(rect.left + rect.width / 2, 0), innerWidth - 1);
    const y = Math.min(Math.max(rect.top + rect.height / 2, 0), innerHeight - 1);
    if(rect.top < 0 || rect.bottom > innerHeight || rect.left < 0 || rect.right > innerWidth) continue;
    const hit = document.elementFromPoint(x, y);
    coverage.push({
      selector: selectorFor(el),
      text: normalizeText(el.getAttribute("aria-label") || el.innerText || el.title || ""),
      rect: docRect(rect),
      hitOk: Boolean(hit && (hit === el || el.contains(hit))),
      hitSelector: selectorFor(hit),
    });
  }

  const labelGroups = new Map();
  for (const button of buttons) {
    const label = normalizeText(button.visibleLabel || button.text).toLocaleLowerCase();
    if (!label) continue;
    if (!labelGroups.has(label)) labelGroups.set(label, []);
    labelGroups.get(label).push(button.selector);
  }
  const duplicateLabels = Array.from(labelGroups.entries())
    .filter(([, selectors]) => selectors.length > 1)
    .map(([label, selectors]) => ({label, selectors}));

  const navigations = Array.from(document.querySelectorAll("nav, [role='navigation']"))
    .filter(isVisible)
    .map((nav) => {
      const items = Array.from(new Set(Array.from(nav.querySelectorAll("a[href], button, [role='menuitem'], [role='tab']")))).filter(isVisible);
      return {selector: selectorFor(nav), count: items.length, rect: docRect(nav.getBoundingClientRect())};
    });

  function parseTimes(value) {
    return String(value || "0s").split(",").map((part) => {
      const text = part.trim();
      if (text.endsWith("ms")) return Number.parseFloat(text) || 0;
      if (text.endsWith("s")) return (Number.parseFloat(text) || 0) * 1000;
      return 0;
    });
  }

  let hasReducedMotionRule = false;
  let inaccessibleStyleSheets = 0;
  const reducedMotionSelectors = [];
  function inspectRules(rules, insideReducedQuery = false) {
    for (const rule of Array.from(rules || [])) {
      const isReducedQuery =
        rule.type === CSSRule.MEDIA_RULE &&
        /prefers-reduced-motion\s*:\s*reduce/i.test(rule.conditionText || "");
      const insideReduced = insideReducedQuery || isReducedQuery;
      if (insideReduced && rule.type === CSSRule.STYLE_RULE && rule.selectorText && rule.style) {
        const changesMotion = Array.from(rule.style).some((property) =>
          /^(animation|transition)|^(transform|scroll-behavior)$/.test(property)
        );
        if (changesMotion) reducedMotionSelectors.push(rule.selectorText);
      }
      try {
        if (rule.cssRules) inspectRules(rule.cssRules, insideReduced);
      } catch (_) {}
    }
  }
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      inspectRules(sheet.cssRules);
    } catch (_) {
      inaccessibleStyleSheets += 1;
    }
  }
  hasReducedMotionRule = reducedMotionSelectors.length > 0;

  function motionSnapshot() {
    let count = 0;
    let maxMs = 0;
    const items = [];
    for (const el of document.querySelectorAll("*")) {
      if (!isVisible(el)) continue;
      const style = getComputedStyle(el);
      const animationDuration = Math.max(0, ...parseTimes(style.animationDuration));
      const transitionDuration = Math.max(0, ...parseTimes(style.transitionDuration));
      const hasAnimation = style.animationName.split(",").some((name) => name.trim() !== "none") && animationDuration > 0;
      const hasTransition = style.transitionProperty.split(",").some((name) => name.trim() !== "none") && transitionDuration > 0;
      if (!hasAnimation && !hasTransition) continue;
      count += 1;
      maxMs = Math.max(maxMs, animationDuration, transitionDuration);
      const matchedReducedRule = reducedMotionSelectors.some((selector) => {
        try {
          return el.matches(selector);
        } catch (_) {
          return false;
        }
      });
      items.push({
        selector: selectorFor(el),
        text: normalizeText(el.innerText || el.getAttribute("aria-label") || ""),
        rect: docRect(el.getBoundingClientRect()),
        kind: [hasAnimation ? "animation" : "", hasTransition ? "transition" : ""].filter(Boolean).join(" + "),
        maxMs: Math.max(animationDuration, transitionDuration),
        animationMs: animationDuration,
        transitionMs: transitionDuration,
        animationName: style.animationName,
        animationIterationCount: style.animationIterationCount,
        animationPlayState: style.animationPlayState,
        transitionProperty: style.transitionProperty,
        matchedReducedRule,
      });
    }
    return {count, maxMs, items, samples: items.slice(0, 20)};
  }

  const canvases = visualMedia
    .filter((item) => item.tag === "canvas")
    .map((item) => ({tag: item.tag, selector: item.selector, rect: item.rect}));
  const largeCanvases = canvases.filter((item) =>
    item.rect.width >= 200 && item.rect.height >= 150 &&
    item.rect.width * item.rect.height >= viewportArea * 0.20
  );

  return {
    visibleTextCount: visibleTextNodeCount,
    canvasDominant: visibleTextNodeCount < 3 && largeCanvases.length > 0,
    largeCanvases,
    texts,
    bodyBlocks,
    headings,
    links,
    interactive,
    buttons,
    coverage,
    duplicateLabels,
    navigations,
    motion: motionSnapshot(),
    hasReducedMotionRule,
    inaccessibleStyleSheets,
  };
}
