/**
 * Gutenberg Document Settings Sidebar Panel for SeriesCraft.
 *
 * Integrates directly into the post settings document sidebar panel via PluginDocumentSettingPanel.
 * Provides lifecycle auto-synchronization and manual block addition with strict post hydration guards.
 *
 * @package SeriesCraft\Editor\Sidebar
 */

import domReady from "@wordpress/dom-ready";
import { registerPlugin } from "@wordpress/plugins";
import { PluginDocumentSettingPanel } from "@wordpress/editor";
import { Button } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import SeriesSelector from "./SeriesSelector";
import PartOrderList from "./PartOrderList";
import { useSeries } from "../../hooks/useSeries";
import {
  usePostSavingSync,
  findSeriesBlocks,
  findSeriesListBlocks,
  removeCoreTaxonomyPanel,
} from "../../hooks/usePostSavingSync";

export { removeCoreTaxonomyPanel, findSeriesBlocks, findSeriesListBlocks };

// Remove default core taxonomy panel when editor DOM is ready
if (typeof domReady === "function") {
  domReady(removeCoreTaxonomyPanel);
} else if (typeof window !== "undefined" && window.wp?.domReady) {
  window.wp.domReady(removeCoreTaxonomyPanel);
}

/**
 * SeriesDocumentSettingsPanel component.
 *
 * @return {JSX.Element} Rendered plugin document setting panel.
 */
export function SeriesDocumentSettingsPanel() {
  const {
    currentPostId,
    currentPostTitle,
    assignedSeriesId,
    handleSelectSeries,
  } = usePostSavingSync();
  const { assignedSeriesIds, assignedSeriesList } = useSeries();

  // Handler for jumping to settings sidebar for a series
  const jumpToSettingsSidebar = (seriesId) => {
    if (
      typeof window !== "undefined" &&
      typeof window.dispatchEvent === "function"
    ) {
      const editPostStore = window.wp?.data?.dispatch?.("core/edit-post");
      editPostStore?.openGeneralSidebar?.("series-craft-settings");
      if (typeof CustomEvent === "function") {
        window.dispatchEvent(
          new CustomEvent("seriescraft:jump-to-settings", {
            detail: { seriesId },
          }),
        );
      }
    }
  };

  return (
    <PluginDocumentSettingPanel
      name="seriescraft-series-panel"
      title={__("Series", "series-craft")}
      className="seriescraft-document-settings-panel"
      icon="list-view"
    >
      <SeriesSelector
        currentSeriesId={assignedSeriesId}
        assignedSeriesIds={assignedSeriesIds}
        onSelectSeries={(id) => {
          if (id > 0) {
            handleSelectSeries([...assignedSeriesIds, id]);
          }
        }}
      />

      {assignedSeriesList.length > 0 && (
        <div className="seriescraft-multi-series-list">
          {assignedSeriesList.map((series) => (
            <div className="seriescraft-series-card" key={series.id}>
              <div className="seriescraft-series-card-header">
                <span className="seriescraft-series-card-title">
                  {series.name}
                </span>
                <Button
					icon="no-alt"
					label={__("Remove the current post from this series", "series-craft")}
					onClick={() =>
						handleSelectSeries(
						assignedSeriesIds.filter(
							(id) => Number(id) !== Number(series.id),
						),
						)
					}
					className="seriescraft-remove-series-btn"
					/>
              </div>
              <PartOrderList
                seriesId={series.id}
                currentPostId={currentPostId}
                currentPostTitle={currentPostTitle}
              />
            </div>
          ))}
        </div>
      )}

      {assignedSeriesList.length === 0 && (
        <p className="seriescraft-empty-sidebar-notice">
          {__(
            "Select or create a series to manage sequential post ordering and table of contents display.",
            "series-craft",
          )}
        </p>
      )}
    </PluginDocumentSettingPanel>
  );
}

// Register sidebar extension with Gutenberg plugin system
registerPlugin("seriescraft-document-settings", {
  render: SeriesDocumentSettingsPanel,
  icon: "list-view",
});

export default SeriesDocumentSettingsPanel;
