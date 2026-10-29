/**
 * SeriesSettingsSidebar Component.
 *
 * Main container coordinating series selection switcher, layout/style tabs,
 * and user interactions via the useSeries and useSeriesSettings custom hooks.
 *
 * @package SeriesCraft\Editor\SettingsSidebar
 */

import React, { useState, useEffect } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import {
  PanelBody,
  SelectControl,
  TabPanel,
  Spinner,
  Notice,
} from "@wordpress/components";
import LayoutTab from "./LayoutTab";
import StyleTab from "./StyleTab";
import { useSeries } from "../../hooks/useSeries";
import { useSeriesSettings } from "../../hooks/useSeriesSettings";

/**
 * SeriesSettingsSidebar component.
 *
 * @param {Object} props Component props.
 * @param {number} [props.initialSeriesId=0] Optional initial series ID.
 * @param {boolean} [props.inModal=false] True if rendered inside a modal.
 * @return {JSX.Element} Rendered settings sidebar panel contents.
 */
export function SeriesSettingsSidebar({
  initialSeriesId = 0,
  inModal = false,
} = {}) {
  const [targetSeriesId, setTargetSeriesId] = useState(initialSeriesId || 0);
  const {
    currentPostId,
    assignedSeriesIds,
    assignedSeriesList,
    seriesList: availableSeries,
    activeSeriesId,
    activeSeries,
    updateSeriesMeta,
    setActiveSeriesId,
  } = useSeries(targetSeriesId);

  useEffect(() => {
    if (typeof setActiveSeriesId === "function") {
      setActiveSeriesId(activeSeriesId);
    }
  }, [activeSeriesId, setActiveSeriesId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    const handleJumpToSeries = (event) => {
      const seriesId = Number(event?.detail?.seriesId);
      if (seriesId > 0) {
        setTargetSeriesId(seriesId);
      }
    };
    window.addEventListener("seriescraft:jump-to-settings", handleJumpToSeries);
    return () =>
      window.removeEventListener(
        "seriescraft:jump-to-settings",
        handleJumpToSeries,
      );
  }, []);

  useEffect(() => {
    if (initialSeriesId > 0) {
      setTargetSeriesId(initialSeriesId);
    }
  }, [initialSeriesId]);

  const {
    settings: localSettings,
    isSaving,
    error,
    handleLayoutChange,
    handleStyleChange,
    handleSpacingChange,
    handleResetStyles,
  } = useSeriesSettings(activeSeriesId, {
    activeSeries,
    currentPostId,
    updateSeriesMeta,
  });

  const switcherSeries =
    assignedSeriesIds.length > 1 ? assignedSeriesList : availableSeries;
  const seriesOptions = switcherSeries.map((series) => ({
    label: `${series.name} `,
    value: String(series.id),
  }));

  return (
    <div
      className={`seriescraft-settings-sidebar ${inModal ? "is-in-modal" : ""}`}
      data-testid="seriescraft-settings-sidebar"
    >
      <PanelBody
        title={__("Series Settings", "series-craft")}
        initialOpen={true}
      >
        {assignedSeriesIds.length !== 1 && (
          <div className="sc-series-switcher seriescraft-series-switcher">
            <SelectControl
              __next40pxDefaultSize={true}
              __nextHasNoMarginBottom={true}
              label={__("Target Series", "series-craft")}
              value={activeSeriesId ? String(activeSeriesId) : ""}
              options={seriesOptions}
              onChange={(value) => setTargetSeriesId(value ? Number(value) : 0)}
              help={__(
                "Switch between assigned series to configure per-series visual appearance.",
                "series-craft",
              )}
            />
          </div>
        )}

        {error && (
          <Notice
            status="error"
            isDismissible={false}
            className="sc-notice seriescraft-notice"
          >
            {error}
          </Notice>
        )}

        {!activeSeries ? (
          <p className="seriescraft-no-series-notice">
            {availableSeries.length === 0
              ? __(
                  "No series found. Create a series first in Document Settings.",
                  "series-craft",
                )
              : __(
                  "Select one or more series for this post first.",
                  "series-craft",
                )}
          </p>
        ) : (
          <div
            className="sc-series-layout-setting sm-series-layout-setting"
            key={activeSeries.id}
            data-testid="sm-series-layout-setting"
          >
            <h4 className="sc-series-title sm-series-title">
              series: {activeSeries.name}
            </h4>

            <TabPanel
              className="sm-series-tabs"
              activeClass="is-active"
              tabs={[
                {
                  name: "layout",
                  title: __("Layout", "series-craft"),
                  className: "sm-tab-layout",
                },
                {
                  name: "style",
                  title: __("Style", "series-craft"),
                  className: "sm-tab-style",
                },
              ]}
            >
              {(tab) => {
                if (tab.name === "layout") {
                  return (
                    <LayoutTab
                      series={activeSeries}
                      layout={localSettings.layout}
                      onChangeLayout={handleLayoutChange}
                    />
                  );
                }
                if (tab.name === "style") {
                  return (
                    <StyleTab
                      series={activeSeries}
                      style={localSettings.style}
                      isSaving={isSaving}
                      onChangeStyle={handleStyleChange}
                      onChangeSpacing={handleSpacingChange}
                      onReset={handleResetStyles}
                    />
                  );
                }
                return null;
              }}
            </TabPanel>

            {isSaving && (
              <div className="sc-series-layout-saving sm-series-layout-saving">
                <Spinner /> {__("Saving...", "series-craft")}
              </div>
            )}
          </div>
        )}
      </PanelBody>
    </div>
  );
}
