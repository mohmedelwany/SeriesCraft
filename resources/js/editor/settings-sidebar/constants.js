/**
 * SeriesCraft Settings Sidebar Constants, Defaults, and Helpers.
 *
 * Provides schema contracts matching legacy series-manager and Phase 3 specifications.
 *
 * @package SeriesCraft\Editor\SettingsSidebar
 */

import { __ } from "@wordpress/i18n";

/**
 * Store and meta identifier constants.
 */
export const STORE_NAME = "series-craft/store";
export const TERM_SETTINGS_META_KEY = "sm_series_settings";

/**
 * Event bus constants for live canvas and spacing preview synchronization.
 */
export const SPACING_PREVIEW_EVENT = "sm-series-spacing-preview";
export const LIVE_PREVIEW_EVENT = "sm-series-live-preview";
export const PREVIEW_REFRESH_EVENT = "sm-series-preview-refresh";

/**
 * Legacy-compatible design system default styles matching SeriesStyleHelper.
 */
export const DEFAULT_STYLE = {
  titleColor: "",
  headerBackgroundColor: "#e8f0fe",
  buttonColor: "#0062a2",
  padding: {
    top: "5rem",
    right: "1.5rem",
    bottom: "5rem",
    left: "1.5rem",
  },
  margin: {
    top: "0px",
    right: "0px",
    bottom: "5rem",
    left: "0px",
  },
  border: {
    width: "1px",
    color: "#0062a2",
    style: "solid",
  },
};

/**
 * Default term settings contract.
 */
export const DEFAULT_SETTINGS = {
  position: "bottom",
  layout: "link-list",
  style: DEFAULT_STYLE,
};

/**
 * Layout variant choices available in the settings sidebar.
 */
export const LAYOUT_OPTIONS = [
  {
    value: "media-grid",
    label: __("Media Grid", "series-craft"),
  },
  {
    value: "link-grid",
    label: __("Link Grid", "series-craft"),
  },
  {
    value: "media-list",
    label: __("Media List", "series-craft"),
  },
  {
    value: "link-list",
    label: __("Link List", "series-craft"),
  },
];

/**
 * Normalizes raw term metadata with default values and fallback contracts.
 *
 * @param {Object} rawSettings Raw metadata object from store or API.
 * @return {Object} Normalized settings object.
 */
export function normalizeSeriesSettings(rawSettings) {
  const raw =
    typeof rawSettings === "object" && rawSettings !== null ? rawSettings : {};
  const rawStyle = raw.style || raw.custom_styles || {};

  const titleColor =
    rawStyle.titleColor !== undefined
      ? rawStyle.titleColor
      : rawStyle.title_color !== undefined
        ? rawStyle.title_color
        : rawStyle.titlecolor !== undefined
          ? rawStyle.titlecolor
          : DEFAULT_STYLE.titleColor;

  const headerBackgroundColor =
    rawStyle.headerBackgroundColor !== undefined
      ? rawStyle.headerBackgroundColor
      : rawStyle.header_background !== undefined
        ? rawStyle.header_background
        : rawStyle.headerbackgroundcolor !== undefined
          ? rawStyle.headerbackgroundcolor
          : rawStyle.header_bg_color !== undefined
            ? rawStyle.header_bg_color
            : DEFAULT_STYLE.headerBackgroundColor;

  const buttonColor =
    rawStyle.buttonColor !== undefined
      ? rawStyle.buttonColor
      : rawStyle.button_color !== undefined
        ? rawStyle.button_color
        : rawStyle.buttoncolor !== undefined
          ? rawStyle.buttoncolor
          : DEFAULT_STYLE.buttonColor;

  const rawBorder =
    typeof rawStyle.border === "object" && rawStyle.border !== null
      ? rawStyle.border
      : {};
  const borderColor =
    rawBorder.color !== undefined
      ? rawBorder.color
      : rawStyle.borderColor !== undefined
        ? rawStyle.borderColor
        : rawStyle.border_color !== undefined
          ? rawStyle.border_color
          : rawStyle.bordercolor !== undefined
            ? rawStyle.bordercolor
            : DEFAULT_STYLE.border.color;

  const borderWidth =
    rawBorder.width !== undefined
      ? rawBorder.width
      : rawStyle.borderWidth !== undefined
        ? rawStyle.borderWidth
        : rawStyle.border_width !== undefined
          ? rawStyle.border_width
          : rawStyle.borderwidth !== undefined
            ? rawStyle.borderwidth
            : DEFAULT_STYLE.border.width;

  const borderStyle =
    rawBorder.style !== undefined
      ? rawBorder.style
      : rawStyle.borderStyle !== undefined
        ? rawStyle.borderStyle
        : rawStyle.border_style !== undefined
          ? rawStyle.border_style
          : rawStyle.borderstyle !== undefined
            ? rawStyle.borderstyle
            : DEFAULT_STYLE.border.style;

  return {
    position: raw.position || DEFAULT_SETTINGS.position,
    layout: raw.layout || DEFAULT_SETTINGS.layout,
    style: {
      titleColor,
      headerBackgroundColor,
      buttonColor,
      padding: {
        ...DEFAULT_STYLE.padding,
        ...(typeof rawStyle.padding === "object" && rawStyle.padding !== null
          ? rawStyle.padding
          : {}),
      },
      margin: {
        ...DEFAULT_STYLE.margin,
        ...(typeof rawStyle.margin === "object" && rawStyle.margin !== null
          ? rawStyle.margin
          : {}),
      },
      border: {
        width: borderWidth,
        color: borderColor,
        style: borderStyle,
      },
    },
  };
}

/**
 * Resolves a spacing value (including WordPress presets and units) to valid CSS.
 *
 * @param {*} value Raw spacing value.
 * @return {string} Valid CSS value or '0px'.
 */
export function resolveSpacingCssValue(value) {
  if (value === undefined || value === null || value === "") {
    return "0px";
  }

  const stringValue = String(value).trim();

  if (stringValue === "0") {
    return "0px";
  }

  const presetMatch = stringValue.match(/^var:preset\|spacing\|([a-z0-9-]+)$/i);
  if (presetMatch) {
    return `var(--wp--preset--spacing--${presetMatch[1]})`;
  }

  if (/^\d+(\.\d+)?(px|rem|em|%|vh|vw)$/i.test(stringValue)) {
    return stringValue;
  }

  if (/^\d+(\.\d+)?$/.test(stringValue)) {
    return `${stringValue}px`;
  }

  return stringValue.startsWith("var(--") ? stringValue : "0px";
}

/**
 * Extracts a side value from a Spacing object.
 *
 * @param {Object} spacing Spacing object containing top/bottom/left/right/horizontal/vertical.
 * @param {string} side 'top' | 'right' | 'bottom' | 'left'
 * @return {string} Resolved CSS string.
 */
export function getSpacingSideValue(spacing, side) {
  if (!spacing || typeof spacing !== "object") {
    return "0px";
  }

  if (
    spacing[side] !== undefined &&
    spacing[side] !== null &&
    spacing[side] !== ""
  ) {
    return resolveSpacingCssValue(spacing[side]);
  }

  if ((side === "left" || side === "right") && spacing.horizontal) {
    return resolveSpacingCssValue(spacing.horizontal);
  }

  if ((side === "top" || side === "bottom") && spacing.vertical) {
    return resolveSpacingCssValue(spacing.vertical);
  }

  return "0px";
}

/**
 * Queries all editor documents including iframes for element matching.
 *
 * @return {Array<Document>} Array of documents.
 */
export function getEditorDocuments() {
  if (typeof document === "undefined") {
    return [];
  }
  const docs = [document];

  document.querySelectorAll("iframe").forEach((iframe) => {
    try {
      if (iframe.contentDocument) {
        docs.push(iframe.contentDocument);
      }
    } catch (error) {
      // Cross-origin iframe guard.
    }
  });

  return docs;
}

/**
 * Clears active spacing preview overlays from target element.
 *
 * @param {HTMLElement} element Target DOM element.
 */
export function clearSpacingPreview(element) {
  if (!element || !element.classList) {
    return;
  }
  element.classList.remove(
    "sm-series-spacing-preview",
    "sm-series-spacing-preview--padding",
    "sm-series-spacing-preview--margin",
  );
}

/**
 * Applies visual spacing preview variables and classes to target canvas elements.
 *
 * @param {Object} detail Event detail with termId, style, and changedKeys.
 */
export function applySpacingPreview({ termId, style, changedKeys }) {
  if (!termId || !Array.isArray(changedKeys) || changedKeys.length === 0) {
    return;
  }

  const selector = `[data-sm-series-term-id="${termId}"]`;
  const target = getEditorDocuments()
    .flatMap((doc) => Array.from(doc.querySelectorAll(selector)))
    .find(
      (element) =>
        element.closest(".sc-series-editor-root") ||
        element.closest(".wp-block-seriescraft-series-list") ||
        element.hasAttribute("data-sm-series-term-id"),
    );

  if (!target) {
    return;
  }

  clearSpacingPreview(target);

  ["padding", "margin"].forEach((type) => {
    ["top", "right", "bottom", "left"].forEach((side) => {
      target.style.setProperty(
        `--sm-preview-${type}-${side}`,
        getSpacingSideValue(style?.[type], side),
      );
    });
  });

  target.classList.add("sm-series-spacing-preview");

  if (changedKeys.includes("padding")) {
    target.classList.add("sm-series-spacing-preview--padding");
  }

  if (changedKeys.includes("margin")) {
    target.classList.add("sm-series-spacing-preview--margin");
  }

  if (target.smSeriesSpacingPreviewTimer) {
    if (typeof window !== "undefined") {
      window.clearTimeout(target.smSeriesSpacingPreviewTimer);
    }
  }

  if (typeof window !== "undefined") {
    target.smSeriesSpacingPreviewTimer = window.setTimeout(() => {
      clearSpacingPreview(target);
    }, 1800);
  }
}

/**
 * Applies visual style preview variables directly to canvas series elements.
 *
 * @param {Object} options Options object.
 * @param {number|string} [options.termId] Target series term ID.
 * @param {Object} options.style Series style settings.
 */
export function applyStylePreview({ termId, style } = {}) {
  if (!style || typeof style !== "object") {
    return;
  }

  const termSelector = termId
    ? `[data-sm-series-term-id="${termId}"], .seriescraft-series-${termId}`
    : "";

  const documents = getEditorDocuments();
  let targets = [];

  if (termSelector) {
    targets = documents.flatMap((doc) =>
      Array.from(doc.querySelectorAll(termSelector)),
    );
  } else {
    targets = documents.flatMap((doc) =>
      Array.from(
        doc.querySelectorAll(
          ".sc-series-editor-root .sc-series-box, .wp-block-seriescraft-series-list .sc-series-box, .sc-series-box, .sm-series-layout",
        ),
      ),
    );
  }

  if (targets.length === 0) {
    return;
  }

  const titleColor =
    style.titleColor ?? style.title_color ?? style.titlecolor ?? "";
  const headerBg =
    style.headerBackgroundColor ??
    style.header_background ??
    style.headerbackgroundcolor ??
    style.header_bg_color ??
    "";
  const buttonColor =
    style.buttonColor ?? style.button_color ?? style.buttoncolor ?? "";

  const rawBorder =
    typeof style.border === "object" && style.border !== null
      ? style.border
      : {};
  const borderColor =
    rawBorder.color ??
    style.borderColor ??
    style.border_color ??
    style.bordercolor ??
    "";
  const borderWidth =
    rawBorder.width ??
    style.borderWidth ??
    style.border_width ??
    style.borderwidth ??
    "";
  const borderStyle =
    rawBorder.style ??
    style.borderStyle ??
    style.border_style ??
    style.borderstyle ??
    "";

  targets.forEach((target) => {
    if (!target || !target.style) {
      return;
    }

    // Title Color
    if (titleColor) {
      target.style.setProperty("--sc-title-color", titleColor);
    } else {
      target.style.removeProperty("--sc-title-color");
    }

    // Header Background
    if (headerBg) {
      target.style.setProperty("--sc-header-bg", headerBg);
    } else {
      target.style.removeProperty("--sc-header-bg");
    }

    // Button / Accent / Hover Color
    if (buttonColor) {
      target.style.setProperty("--sc-button-color", buttonColor);
      target.style.setProperty("--sm-hover-color", buttonColor);
    } else {
      target.style.removeProperty("--sc-button-color");
      target.style.removeProperty("--sm-hover-color");
    }

    // Border Color
    if (borderColor) {
      target.style.setProperty("--sc-border-color", borderColor);
    } else {
      target.style.removeProperty("--sc-border-color");
    }

    // Border Width
    if (borderWidth) {
      const resolvedWidth = /^\d+$/.test(String(borderWidth).trim())
        ? `${borderWidth}px`
        : borderWidth;
      target.style.setProperty("--sc-border-width", resolvedWidth);
    } else {
      target.style.removeProperty("--sc-border-width");
    }

    // Border Style
    if (borderStyle) {
      target.style.setProperty("--sc-border-style", borderStyle);
    } else {
      target.style.removeProperty("--sc-border-style");
    }
  });
}
