/**
 * Custom React Hook: usePostSavingSync
 *
 * Coordinates post saving lifecycle, Gutenberg editor hydration guards,
 * and automatic synchronization (insertion/removal) of the 'seriescraft/series-list' block.
 *
 * @package SeriesCraft\Hooks
 */

import { useEffect, useRef, useMemo } from "@wordpress/element";
import { useSelect, useDispatch, dispatch } from "@wordpress/data";
import { createBlock } from "@wordpress/blocks";
import { extractSeriesId } from "./useSeries";

/**
 * Removes the default core Gutenberg taxonomy panel for 'series'.
 */
export function removeCoreTaxonomyPanel() {
  // WordPress 6.5+ moved removeEditorPanel from 'core/edit-post' to 'core/editor'.
  const editorDispatch = dispatch("core/editor");
  if (
    editorDispatch &&
    typeof editorDispatch.removeEditorPanel === "function"
  ) {
    editorDispatch.removeEditorPanel("taxonomy-panel-series");
  } else {
    const editPostDispatch = dispatch("core/edit-post");
    if (
      editPostDispatch &&
      typeof editPostDispatch.removeEditorPanel === "function"
    ) {
      editPostDispatch.removeEditorPanel("taxonomy-panel-series");
    }
  }
}

/**
 * Recursively locates any SeriesCraft Series List blocks in the block hierarchy.
 *
 * @param {Array} blockList Array of block objects.
 * @return {Array} Found Series List block instances.
 */
export function findSeriesBlocks(blockList) {
  if (!Array.isArray(blockList)) {
    return [];
  }
  let results = [];
  for (const block of blockList) {
    if (block?.name === "seriescraft/series-list") {
      results.push(block);
    }
    if (Array.isArray(block?.innerBlocks) && block.innerBlocks.length > 0) {
      results = results.concat(findSeriesBlocks(block.innerBlocks));
    }
  }
  return results;
}

export const findSeriesListBlocks = findSeriesBlocks;

/**
 * usePostSavingSync hook.
 *
 * @return {Object} Synchronization state, block references, and trigger actions.
 */
export function usePostSavingSync() {
  const {
    currentPostId,
    currentPostTitle,
    assignedSeriesId,
    savedSeriesId,
    rawSeriesTerms,
    blocks,
    isEditorReady,
  } = useSelect((select) => {
    const editor = select("core/editor");
    const blockEditor = select("core/block-editor");
    const coreData = select("core/data");

    const postId = editor?.getCurrentPostId?.() || 0;
    const postTitle = editor?.getEditedPostAttribute?.("title") || "";
    const rawSeries = editor?.getEditedPostAttribute?.("series");
    const cleanSeries = editor?.getCurrentPostAttribute?.("series");
    const postContent = editor?.getEditedPostAttribute?.("content");
    const editorBlocks =
      blockEditor?.getBlocks?.() || editor?.getBlocks?.() || [];

    // Check if Gutenberg is still resolving post or content
    const isResolving = coreData?.isResolving || editor?.isResolving;
    const isResolvingContent = Boolean(
      isResolving?.("core/editor", "getEditedPostAttribute", ["content"]) ||
      editor?.isResolving?.("getEditedPostAttribute", ["content"]),
    );
    const isResolvingPost = Boolean(
      isResolving?.("core/editor", "getCurrentPost") ||
      editor?.isResolving?.("getCurrentPost"),
    );

    // If post content exists as raw string but blocks have not been parsed yet, editor is still hydrating
    const isParsingBlocks =
      typeof postContent === "string" &&
      postContent.trim().length > 0 &&
      editorBlocks.length === 0;

    const isReady =
      (typeof editor?.__unstableIsEditorReady === "function"
        ? editor.__unstableIsEditorReady()
        : true) &&
      !isResolvingContent &&
      !isResolvingPost &&
      !isParsingBlocks;

    return {
      currentPostId: postId,
      currentPostTitle: postTitle,
      assignedSeriesId: extractSeriesId(rawSeries),
      savedSeriesId: extractSeriesId(cleanSeries),
      rawSeriesTerms: rawSeries,
      blocks: editorBlocks,
      isEditorReady: isReady,
    };
  }, []);

  const { editPost } = useDispatch("core/editor") || {};
  const blockEditorDispatch = useDispatch("core/block-editor");
  const editorDispatch = useDispatch("core/editor");
  const insertBlock =
    blockEditorDispatch?.insertBlock || editorDispatch?.insertBlock;
  const removeBlock =
    blockEditorDispatch?.removeBlock || editorDispatch?.removeBlock;

  const seriesTermIds = useMemo(() => {
    if (Array.isArray(rawSeriesTerms)) {
      return rawSeriesTerms
        .map((val) =>
          typeof val === "object" && val !== null
            ? Number(val.id || val.term_id)
            : Number(val),
        )
        .filter((id) => !isNaN(id));
    }
    if (rawSeriesTerms) {
      const num = Number(rawSeriesTerms);
      return !isNaN(num) ? [num] : [];
    }
    return [];
  }, [
    Array.isArray(rawSeriesTerms)
      ? rawSeriesTerms
          .map((v) =>
            typeof v === "object" && v !== null ? v.id || v.term_id : v,
          )
          .join(",")
      : rawSeriesTerms,
  ]);

  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  const hasMountedRef = useRef(false);
  const previousSeriesIdRef = useRef(assignedSeriesId);
  const userChangedSeriesRef = useRef(false);

  const seriesBlocks = findSeriesBlocks(blocks);
  const hasSeriesBlock = seriesBlocks.length > 0;

  useEffect(() => {
    // Wait until Gutenberg finishes its initial post hydration
    if (!isEditorReady) {
      return;
    }

    const currentBlocks =
      blocksRef.current && blocksRef.current.length > 0
        ? blocksRef.current
        : blocks || [];
    const existingBlocks = findSeriesBlocks(currentBlocks);
    const hasSeries =
      Array.isArray(seriesTermIds) &&
      seriesTermIds.length > 0 &&
      seriesTermIds[0] !== 0;

    // Deduplication check: if block already exists anywhere, NEVER insert another instance
    if (hasSeries && existingBlocks.length > 0) {
      previousSeriesIdRef.current = assignedSeriesId;
      hasMountedRef.current = true;
      return;
    }

    const isInitialRender = !hasMountedRef.current;
    const isSavedAssignment =
      isInitialRender &&
      savedSeriesId > 0 &&
      savedSeriesId === assignedSeriesId;

    // Detect if series assignment transitioned from saved or previous value, or user interacted
    const hasTransitioned =
      userChangedSeriesRef.current ||
      (previousSeriesIdRef.current !== null &&
        previousSeriesIdRef.current !== assignedSeriesId) ||
      (isInitialRender && !isSavedAssignment);

    if (hasSeries && existingBlocks.length === 0) {
      // Do NOT auto-insert during the initial load of an existing post that already had this series saved
      if (isSavedAssignment && !userChangedSeriesRef.current) {
        previousSeriesIdRef.current = assignedSeriesId;
        hasMountedRef.current = true;
        return;
      }

      if (hasTransitioned) {
        const blockFactory = createBlock || window?.wp?.blocks?.createBlock;
        if (
          typeof blockFactory === "function" &&
          typeof insertBlock === "function"
        ) {
          const newBlock = blockFactory("seriescraft/series-list");
          insertBlock(newBlock, 0);
        }
      }
    } else if (!hasSeries && existingBlocks.length > 0) {
      // Auto-remove when unassigned
      if (typeof removeBlock === "function") {
        existingBlocks.forEach((block) => removeBlock(block.clientId));
      }
    }

    previousSeriesIdRef.current = assignedSeriesId;
    userChangedSeriesRef.current = false;
    hasMountedRef.current = true;
  }, [
    isEditorReady,
    seriesTermIds,
    assignedSeriesId,
    savedSeriesId,
    insertBlock,
    removeBlock,
  ]);

  const handleAddBlockManual = () => {
    const blockFactory = createBlock || window?.wp?.blocks?.createBlock;
    if (
      typeof blockFactory === "function" &&
      typeof insertBlock === "function"
    ) {
      const newBlock = blockFactory("seriescraft/series-list");
      insertBlock(newBlock, 0);
    }
  };

  const handleSelectSeries = (newSeriesId) => {
    userChangedSeriesRef.current = true;
    const seriesIds = (Array.isArray(newSeriesId) ? newSeriesId : [newSeriesId])
      .map(Number)
      .filter((seriesId) => Number.isInteger(seriesId) && seriesId > 0);
    if (typeof editPost === "function") {
      editPost({
        series: seriesIds,
      });
    }
  };

  return {
    currentPostId,
    currentPostTitle,
    assignedSeriesId,
    savedSeriesId,
    isEditorReady,
    hasSeriesBlock,
    seriesBlocks,
    handleAddBlockManual,
    handleSelectSeries,
  };
}

export default usePostSavingSync;
