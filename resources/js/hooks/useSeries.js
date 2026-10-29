/**
 * Custom React Hook: useSeries
 *
 * Centralizes series taxonomy retrieval, current post series assignment,
 * active series resolution for appearance controls, and series creation.
 *
 * @package SeriesCraft\Hooks
 */

import { useMemo } from "@wordpress/element";
import { useSelect, useDispatch } from "@wordpress/data";
import { STORE_NAME } from "../store/constants";

/**
 * Normalizes raw taxonomy attribute to a numeric series term ID.
 *
 * @param {*} rawSeries Raw series attribute from core/editor.
 * @return {number} Extracted series term ID or 0.
 */
export function extractSeriesId(rawSeries) {
  if (Array.isArray(rawSeries) && rawSeries.length > 0) {
    const first = rawSeries[0];
    const id =
      typeof first === "object" && first !== null
        ? Number(first.id || first.term_id)
        : Number(first);
    return isNaN(id) ? 0 : id;
  }
  if (rawSeries) {
    const num = Number(rawSeries);
    return !isNaN(num) ? num : 0;
  }
  return 0;
}

/**
 * Extracts all assigned series IDs from rawSeries attribute.
 *
 * @param {*} rawSeries Raw series attribute from core/editor.
 * @return {number[]} Array of assigned series term IDs.
 */
export function extractSeriesIds(rawSeries) {
  if (Array.isArray(rawSeries)) {
    const ids = rawSeries
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          return Number(item.id || item.term_id);
        }
        return Number(item);
      })
      .filter((id) => !isNaN(id) && id > 0);
    return [...new Set(ids)];
  }
  if (rawSeries) {
    const num = Number(rawSeries);
    return !isNaN(num) && num > 0 ? [num] : [];
  }
  return [];
}

/**
 * useSeries hook.
 *
 * @param {number} [targetSeriesId=0] Optional explicit series ID to inspect/customize.
 * @return {Object} Series state and manipulation handlers.
 */
export function useSeries(targetSeriesId = 0) {
  const { currentPostId, rawSeries, seriesList } = useSelect((select) => {
    const editor = select("core/editor");
    const store = select(STORE_NAME);

    return {
      currentPostId: editor?.getCurrentPostId?.() || 0,
      rawSeries: editor?.getEditedPostAttribute?.("series"),
      seriesList: store?.getSeries?.() || [],
    };
  }, []);

  const editorDispatch =
    typeof useDispatch === "function" ? useDispatch("core/editor") : {};
  const storeDispatch =
    typeof useDispatch === "function" ? useDispatch(STORE_NAME) : {};
  const editPost = editorDispatch?.editPost;
  const createSeries = storeDispatch?.createSeries;
  const updateSeriesMeta = storeDispatch?.updateSeriesMeta;
  const setActiveSeriesId = storeDispatch?.setActiveSeriesId;

  const assignedSeriesIds = useMemo(
    () => extractSeriesIds(rawSeries),
    [rawSeries],
  );
  const assignedSeriesList = useMemo(
    () =>
      assignedSeriesIds
        .map((id) =>
          seriesList.find((series) => Number(series.id) === Number(id)),
        )
        .filter(Boolean),
    [seriesList, assignedSeriesIds],
  );

  const assignedSeriesId =
    assignedSeriesIds.length > 0 ? assignedSeriesIds[0] : 0;
  const assignedSeries =
    assignedSeriesList.length > 0 ? assignedSeriesList[0] : null;

  const activeSeriesId = useMemo(() => {
    const targetExists = seriesList.some(
      (series) => Number(series.id) === Number(targetSeriesId),
    );
    if (targetSeriesId > 0 && targetExists) {
      return Number(targetSeriesId);
    }
    if (assignedSeriesId > 0) {
      return assignedSeriesId;
    }
    return seriesList.length > 0 ? Number(seriesList[0].id) : 0;
  }, [targetSeriesId, assignedSeriesId, seriesList]);

  const activeSeries = useMemo(() => {
    return (
      seriesList.find(
        (series) => Number(series.id) === Number(activeSeriesId),
      ) || null
    );
  }, [seriesList, activeSeriesId]);

  const assignSeries = (newSeriesIds) => {
    if (typeof editPost === "function") {
      const ids = Array.isArray(newSeriesIds) ? newSeriesIds : [newSeriesIds];
      const normalizedIds = [
        ...new Set(ids.map(Number).filter((id) => !isNaN(id) && id > 0)),
      ];
      editPost({ series: normalizedIds });
    }
  };

  return {
    currentPostId,
    seriesList,
    assignedSeriesIds,
    assignedSeriesList,
    assignedSeriesId,
    assignedSeries,
    activeSeriesId,
    activeSeries,
    createSeries,
    assignSeries,
    updateSeriesMeta,
    setActiveSeriesId,
  };
}

export default useSeries;
