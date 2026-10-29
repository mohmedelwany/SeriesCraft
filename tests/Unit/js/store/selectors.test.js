/**
 * Unit Tests for SeriesCraft Store Selectors.
 *
 * @package SeriesCraft\Tests\Unit\Js\Store
 */

import {
  getSeries,
  getSeriesPosts,
  isSavingOrder,
  getSeriesMeta,
  getOrderNotice,
  getSeriesById,
  getAllNotices,
  getActiveSeriesId,
} from "../../../../resources/js/store/selectors";
import { DEFAULT_STATE } from "../../../../resources/js/store/reducer";

describe("SeriesCraft Store Selectors", () => {
  const sampleState = {
    series: [
      { id: 10, name: "Machine Learning", slug: "machine-learning", count: 5 },
      { id: 20, name: "Data Engineering", slug: "data-engineering", count: 3 },
    ],
    activeSeriesId: 20,
    postsBySeries: {
      10: [
        { id: 101, title: { rendered: "Intro to ML" }, part_order: 1 },
        { id: 102, title: { rendered: "Supervised Learning" }, part_order: 2 },
      ],
    },
    metaBySeries: {
      10: {
        layout: "media-grid",
        custom_styles: { border_color: "#3b82f6" },
      },
    },
    isSaving: {
      10: true,
      20: false,
    },
    notices: {
      10: { status: "success", message: "Saved successfully." },
    },
  };

  /**
   * Test 1: getSeries extracts list of series from state or returns empty array.
   */
  it("Test 1: getSeries returns series array when present or empty array if empty", () => {
    expect(getSeries(sampleState)).toEqual(sampleState.series);
    expect(getSeries(DEFAULT_STATE)).toEqual([]);
    expect(getSeries(null)).toEqual([]);
  });

  /**
   * Test 2: getSeriesPosts extracts ordered posts for specified seriesId or empty array.
   */
  it("Test 2: getSeriesPosts returns post list for existing seriesId or empty array", () => {
    expect(getSeriesPosts(sampleState, 10)).toEqual(
      sampleState.postsBySeries[10],
    );
    expect(getSeriesPosts(sampleState, 999)).toEqual([]);
    expect(getSeriesPosts(sampleState, null)).toEqual([]);
  });

  /**
   * Test 3: isSavingOrder returns boolean saving status for specified seriesId.
   */
  it("Test 3: isSavingOrder returns true when series is saving, false otherwise", () => {
    expect(isSavingOrder(sampleState, 10)).toBe(true);
    expect(isSavingOrder(sampleState, 20)).toBe(false);
    expect(isSavingOrder(sampleState, 999)).toBe(false);
    expect(isSavingOrder(sampleState, null)).toBe(false);
  });

  /**
   * Test 4: getSeriesMeta extracts styling/layout metadata for specified seriesId.
   */
  it("Test 4: getSeriesMeta returns metadata object or null if not found", () => {
    expect(getSeriesMeta(sampleState, 10)).toEqual({
      layout: "media-grid",
      custom_styles: { border_color: "#3b82f6" },
    });
    expect(getSeriesMeta(sampleState, 999)).toBeNull();
    expect(getSeriesMeta(sampleState, null)).toBeNull();
  });

  /**
   * Test 5: getOrderNotice extracts notice for specified seriesId or null.
   */
  it("Test 5: getOrderNotice returns notice object or null if none active", () => {
    expect(getOrderNotice(sampleState, 10)).toEqual({
      status: "success",
      message: "Saved successfully.",
    });
    expect(getOrderNotice(sampleState, 20)).toBeNull();
    expect(getOrderNotice(sampleState, null)).toBeNull();
  });

  /**
   * Test 6: getSeriesById finds series item by numeric or string ID.
   */
  it("Test 6: getSeriesById retrieves series item matching ID or null", () => {
    expect(getSeriesById(sampleState, 10)).toEqual(sampleState.series[0]);
    expect(getSeriesById(sampleState, "20")).toEqual(sampleState.series[1]);
    expect(getSeriesById(sampleState, 999)).toBeNull();
  });

  /**
   * Test 7: getAllNotices retrieves all notices dictionary.
   */
  it("Test 7: getAllNotices retrieves notices dictionary from state", () => {
    expect(getAllNotices(sampleState)).toEqual(sampleState.notices);
    expect(getAllNotices(DEFAULT_STATE)).toEqual({});
  });

  /**
   * Test 8: Retrieves the selected active series ID.
   */
  it("Test 8: getActiveSeriesId returns the selected ID or its default", () => {
    expect(getActiveSeriesId(sampleState)).toBe(20);
    expect(getActiveSeriesId(DEFAULT_STATE)).toBe(0);
  });
});
