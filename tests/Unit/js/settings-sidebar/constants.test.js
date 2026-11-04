/**
 * @jest-environment jsdom
 */

import {
  DEFAULT_SETTINGS,
  DEFAULT_STYLE,
  LAYOUT_OPTIONS,
  normalizeSeriesSettings,
  resolveSpacingCssValue,
  getSpacingSideValue,
  applySpacingPreview,
  applyStylePreview,
  clearSpacingPreview,
  SPACING_PREVIEW_EVENT,
  LIVE_PREVIEW_EVENT,
  PREVIEW_REFRESH_EVENT,
} from "../../../../resources/js/editor/settings-sidebar/constants";

describe("Settings Sidebar Constants & Helpers", () => {
  it("Test 1: validates default contract constants matching legacy specifications", () => {
    expect(DEFAULT_SETTINGS.position).toBe("bottom");
    expect(DEFAULT_SETTINGS.layout).toBe("link-list");
    expect(DEFAULT_SETTINGS.style).toEqual(DEFAULT_STYLE);

    expect(DEFAULT_STYLE.titleColor).toBe("");
    expect(DEFAULT_STYLE.headerBackgroundColor).toBe("#e8f0fe");
    expect(DEFAULT_STYLE.buttonColor).toBe("#0062a2");

    expect(DEFAULT_STYLE.padding).toEqual({
      top: "5rem",
      right: "1.5rem",
      bottom: "5rem",
      left: "1.5rem",
    });
    expect(DEFAULT_STYLE.margin).toEqual({
      top: "0px",
      right: "0px",
      bottom: "5rem",
      left: "0px",
    });
    expect(DEFAULT_STYLE.border).toEqual({
      width: "1px",
      color: "#0062a2",
      style: "solid",
    });

    expect(LAYOUT_OPTIONS).toHaveLength(4);
    expect(LAYOUT_OPTIONS.map((o) => o.value)).toEqual([
      "media-grid",
      "link-grid",
      "media-list",
      "link-list",
    ]);

    expect(SPACING_PREVIEW_EVENT).toBe("sm-series-spacing-preview");
    expect(LIVE_PREVIEW_EVENT).toBe("sm-series-live-preview");
    expect(PREVIEW_REFRESH_EVENT).toBe("sm-series-preview-refresh");
  });

  it("Test 2: normalizeSeriesSettings provides fallback values when metadata is empty or partial", () => {
    const emptyNormalized = normalizeSeriesSettings(null);
    expect(emptyNormalized.position).toBe("bottom");
    expect(emptyNormalized.layout).toBe("link-list");
    expect(emptyNormalized.style.headerBackgroundColor).toBe("#e8f0fe");
    expect(emptyNormalized.style.buttonColor).toBe("#0062a2");
    expect(emptyNormalized.style.padding.top).toBe("5rem");

    // Partial overrides
    const partial = {
      layout: "media-grid",
      style: {
        buttonColor: "#ff0000",
        padding: { top: "3rem" },
      },
    };
    const normalized = normalizeSeriesSettings(partial);
    expect(normalized.layout).toBe("media-grid");
    expect(normalized.style.buttonColor).toBe("#ff0000");
    expect(normalized.style.titleColor).toBe("");
    expect(normalized.style.headerBackgroundColor).toBe("#e8f0fe");
    expect(normalized.style.padding.top).toBe("3rem");
    expect(normalized.style.padding.bottom).toBe("5rem");
    expect(normalized.style.padding.left).toBe("1.5rem");
  });

  it("Test 3: normalizeSeriesSettings handles custom_styles alias", () => {
    const aliasObj = {
      custom_styles: {
        headerBackgroundColor: "#123456",
      },
    };
    const normalized = normalizeSeriesSettings(aliasObj);
    expect(normalized.style.headerBackgroundColor).toBe("#123456");
  });

  it("Test 4: resolveSpacingCssValue correctly handles WP presets, units, numbers, and zero", () => {
    expect(resolveSpacingCssValue("var:preset|spacing|50")).toBe(
      "var(--wp--preset--spacing--50)",
    );
    expect(resolveSpacingCssValue("var(--custom-unit)")).toBe(
      "var(--custom-unit)",
    );
    expect(resolveSpacingCssValue("24px")).toBe("24px");
    expect(resolveSpacingCssValue("2.5rem")).toBe("2.5rem");
    expect(resolveSpacingCssValue("50%")).toBe("50%");
    expect(resolveSpacingCssValue("32")).toBe("32px");
    expect(resolveSpacingCssValue("0")).toBe("0px");
    expect(resolveSpacingCssValue(0)).toBe("0px");
    expect(resolveSpacingCssValue("")).toBe("0px");
    expect(resolveSpacingCssValue(null)).toBe("0px");
    expect(resolveSpacingCssValue(undefined)).toBe("0px");
  });

  it("Test 5: getSpacingSideValue resolves directional and fallback spacing", () => {
    const spacing = {
      top: "10px",
      horizontal: "20px",
      vertical: "30px",
    };
    expect(getSpacingSideValue(spacing, "top")).toBe("10px");
    expect(getSpacingSideValue(spacing, "bottom")).toBe("30px");
    expect(getSpacingSideValue(spacing, "left")).toBe("20px");
    expect(getSpacingSideValue(spacing, "right")).toBe("20px");
    expect(getSpacingSideValue(null, "top")).toBe("0px");
  });

  it("Test 6: applySpacingPreview injects CSS variables and overlay classes onto canvas targets", () => {
    jest.useFakeTimers();

    document.body.innerHTML = `
			<div class="sm-series-editor-root">
				<div data-sm-series-term-id="42"></div>
			</div>
		`;

    const target = document.querySelector('[data-sm-series-term-id="42"]');
    expect(target).not.toBeNull();

    applySpacingPreview({
      termId: 42,
      style: {
        padding: { top: "2rem", right: "1rem", bottom: "2rem", left: "1rem" },
        margin: { bottom: "3rem" },
      },
      changedKeys: ["padding", "margin"],
    });

    expect(target.classList.contains("sm-series-spacing-preview")).toBe(true);
    expect(
      target.classList.contains("sm-series-spacing-preview--padding"),
    ).toBe(true);
    expect(target.classList.contains("sm-series-spacing-preview--margin")).toBe(
      true,
    );
    expect(target.style.getPropertyValue("--sm-preview-padding-top")).toBe(
      "2rem",
    );
    expect(target.style.getPropertyValue("--sm-preview-margin-bottom")).toBe(
      "3rem",
    );

    // Advance timer past 1800ms to test auto-clearing
    jest.advanceTimersByTime(2000);
    expect(target.classList.contains("sm-series-spacing-preview")).toBe(false);

    jest.useRealTimers();
  });

  it("Test 7: clearSpacingPreview cleans classes directly", () => {
    const el = document.createElement("div");
    el.classList.add(
      "sm-series-spacing-preview",
      "sm-series-spacing-preview--padding",
      "sm-series-spacing-preview--margin",
    );
    clearSpacingPreview(el);
    expect(el.classList.contains("sm-series-spacing-preview")).toBe(false);
    expect(el.classList.contains("sm-series-spacing-preview--padding")).toBe(
      false,
    );
    expect(el.classList.contains("sm-series-spacing-preview--margin")).toBe(
      false,
    );
  });

  it("Test 8: applyStylePreview injects color and border CSS variables onto canvas targets", () => {
    document.body.innerHTML = `
			<div class="sc-series-editor-root">
				<div data-sm-series-term-id="55"></div>
			</div>
		`;

    const target = document.querySelector('[data-sm-series-term-id="55"]');
    expect(target).not.toBeNull();

    applyStylePreview({
      termId: 55,
      style: {
        titleColor: "#123456",
        headerBackgroundColor: "#abcdef",
        buttonColor: "#ff6600",
        border: {
          width: "3px",
          color: "#999999",
          style: "dashed",
        },
      },
    });

    expect(target.style.getPropertyValue("--sc-title-color")).toBe("#123456");
    expect(target.style.getPropertyValue("--sc-header-bg")).toBe("#abcdef");
    expect(target.style.getPropertyValue("--sc-button-color")).toBe("#ff6600");
    expect(target.style.getPropertyValue("--sm-hover-color")).toBe("#ff6600");
    expect(target.style.getPropertyValue("--sc-border-width")).toBe("3px");
    expect(target.style.getPropertyValue("--sc-border-color")).toBe("#999999");
    expect(target.style.getPropertyValue("--sc-border-style")).toBe("dashed");
  });

  it("Test 9: applies CSS variables only to the requested series term", () => {
    document.body.innerHTML = `
			<div class="sc-series-editor-root">
				<div class="sc-series-box" data-sm-series-term-id="55"></div>
				<div class="sc-series-box" data-sm-series-term-id="66"></div>
			</div>
		`;

    const firstSeries = document.querySelector('[data-sm-series-term-id="55"]');
    const secondSeries = document.querySelector(
      '[data-sm-series-term-id="66"]',
    );
    applyStylePreview({ termId: 55, style: { buttonColor: "#123456" } });

    expect(firstSeries.style.getPropertyValue("--sc-button-color")).toBe(
      "#123456",
    );
    expect(secondSeries.style.getPropertyValue("--sc-button-color")).toBe("");

    applyStylePreview({ termId: 999, style: { buttonColor: "#abcdef" } });
    expect(firstSeries.style.getPropertyValue("--sc-button-color")).toBe(
      "#123456",
    );
    expect(secondSeries.style.getPropertyValue("--sc-button-color")).toBe("");
  });

  /**
   * Test 10: Normalizes lowercased and snake_case style keys.
   */
  it("Test 10: normalizeSeriesSettings handles lowercased and snake_case alias keys", () => {
    const lowercasedObj = {
      style: {
        titlecolor: "#111111",
        headerbackgroundcolor: "#222222",
        buttoncolor: "#333333",
        bordercolor: "#444444",
        borderwidth: "2px",
        borderstyle: "solid",
      },
    };

    const normalized = normalizeSeriesSettings(lowercasedObj);
    expect(normalized.style.titleColor).toBe("#111111");
    expect(normalized.style.headerBackgroundColor).toBe("#222222");
    expect(normalized.style.buttonColor).toBe("#333333");
    expect(normalized.style.border.color).toBe("#444444");
    expect(normalized.style.border.width).toBe("2px");
    expect(normalized.style.border.style).toBe("solid");
  });
});
