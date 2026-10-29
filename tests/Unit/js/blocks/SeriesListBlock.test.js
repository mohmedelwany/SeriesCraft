/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import * as wpData from "@wordpress/data";
import * as wpBlocks from "@wordpress/blocks";

jest.mock("@wordpress/blocks", () => ({
  registerBlockType: jest.fn((name, settings) => ({ name, ...settings })),
}));

jest.mock("@wordpress/block-editor", () => ({
  useBlockProps: jest.fn((props = {}) => ({
    ...props,
    "data-testid": "block-props-root",
  })),
  InspectorControls: ({ children }) => (
    <div data-testid="inspector-controls">{children}</div>
  ),
  BlockControls: ({ children }) => (
    <div data-testid="block-controls">{children}</div>
  ),
}));

jest.mock("@wordpress/server-side-render", () => {
  return function MockServerSideRender(props) {
    const previewSeriesIds = JSON.parse(
      props.urlQueryArgs?.preview_series_ids || "[]",
    );

    return (
      <div
        data-testid="server-side-render"
        data-block={props.block}
        data-mode={props.attributes?.mode}
        data-limit={props.attributes?.limit}
        data-user={props.attributes?.selectedUser}
        data-topic={props.attributes?.selectedTopic}
        data-post-id={props.urlQueryArgs?.post_id}
        data-preview-series-ids={props.urlQueryArgs?.preview_series_ids}
        data-preview-series-id={props.urlQueryArgs?.preview_series_id}
        data-preview-title={props.urlQueryArgs?.preview_title}
        data-preview-image={props.urlQueryArgs?.preview_image}
        data-preview-key={props.urlQueryArgs?.preview_key}
      >
        {previewSeriesIds.length > 1 &&
          previewSeriesIds.map((seriesId) => (
            <details className="seriescraft-accordion-item" key={seriesId}>
              <section data-sm-series-term-id={seriesId} />
            </details>
          ))}
        {props.EmptyResponsePlaceholder && <props.EmptyResponsePlaceholder />}
      </div>
    );
  };
});

jest.mock("@wordpress/components", () => ({
  PanelBody: ({ children, title }) => (
    <div data-testid="panel-body" data-title={title}>
      <h3>{title}</h3>
      {children}
    </div>
  ),
  SelectControl: ({ label, value, options, onChange }) => (
    <div className="components-select-control">
      <label htmlFor={`select-${label}`}>{label}</label>
      <select
        id={`select-${label}`}
        data-testid={`select-${label}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  ),
  RangeControl: ({ label, value, onChange, min, max }) => (
    <div className="components-range-control">
      <label htmlFor="range-limit">{label}</label>
      <input
        id="range-limit"
        type="range"
        data-testid="range-control-limit"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  ),
  Spinner: () => <span data-testid="mock-spinner">Loading...</span>,
  ToolbarGroup: ({ children }) => (
    <div data-testid="toolbar-group">{children}</div>
  ),
  ToolbarButton: ({ icon, label, title, onClick, isActive }) => (
    <button
      type="button"
      data-testid="toolbar-button-settings"
      aria-label={label || title}
      onClick={onClick}
      data-active={isActive}
    >
      {label || title}
    </button>
  ),
  Modal: ({ children, title, onRequestClose }) => (
    <div data-testid="settings-modal" data-title={title}>
      <h2>{title}</h2>
      <button type="button" data-testid="modal-close" onClick={onRequestClose}>
        Close
      </button>
      {children}
    </div>
  ),
}));

jest.mock(
  "../../../../resources/js/editor/settings-sidebar/SeriesSettingsSidebar",
  () => {
    return {
      __esModule: true,
      SeriesSettingsSidebar: function MockSeriesSettingsSidebar(props) {
        return (
          <div
            data-testid="series-settings-sidebar"
            data-in-modal={String(props.inModal)}
          />
        );
      },
    };
  },
);

jest.mock("@wordpress/data", () => ({
  useSelect: jest.fn(),
  useDispatch: jest.fn(() => ({})),
}));

import metadata from "../../../../resources/js/blocks/series-list/block.json";
import save from "../../../../resources/js/blocks/series-list/save";
import { registerSeriesListBlock } from "../../../../resources/js/blocks/series-list/index";
import Edit, {
  findFirstImageInBlocks,
  syncAccordionToSeries,
} from "../../../../resources/js/blocks/series-list/edit";
import ModeSelector from "../../../../resources/js/blocks/series-list/components/ModeSelector";
import UserSelector from "../../../../resources/js/blocks/series-list/components/UserSelector";
import TopicSelector from "../../../../resources/js/blocks/series-list/components/TopicSelector";
import SeriesPreviewCard from "../../../../resources/js/blocks/series-list/components/SeriesPreviewCard";

describe("Series List Block (seriescraft/series-list)", () => {
  let mockGetEntityRecords;
  let mockIsResolving;

  beforeEach(() => {
    jest.clearAllMocks();

    global.MutationObserver = class {
      observe() {}
      disconnect() {}
    };

    mockIsResolving = jest.fn(() => false);
    mockGetEntityRecords = jest.fn((kind, name, query) => {
      if (name === "series") {
        if (query?.author === 999 || query?.topic === "empty-topic") {
          return [];
        }
        return [
          { id: 10, name: "JavaScript Deep Dive", count: 5 },
          { id: 11, name: "CSS Architecture", count: 3 },
        ];
      }
      if (name === "category") {
        return [
          { id: 1, name: "Web Dev", slug: "web-dev" },
          { id: 2, name: "DevOps", slug: "devops" },
        ];
      }
      return [];
    });

    wpData.useSelect.mockImplementation((callback) => {
      const select = (storeName) => {
        if (storeName === "core/editor") {
          return {
            getCurrentPostId: () => 42,
            getEditedPostAttribute: (attr) => {
              if (attr === "title") return "Test Post Title";
              if (attr === "series") return [10];
              return null;
            },
          };
        }
        if (storeName === "core/data") {
          return {
            isResolving: mockIsResolving,
          };
        }
        if (storeName === "core") {
          return {
            getUsers: () => [
              { id: 1, name: "Admin Author" },
              { id: 2, name: "Guest Contributor" },
            ],
            getEntityRecords: mockGetEntityRecords,
          };
        }
        return {};
      };
      return callback(select);
    });
  });

  describe("block.json metadata schema", () => {
    test("Test 1: block name and title match official seriescraft/series-list specifications", () => {
      expect(metadata.name).toBe("seriescraft/series-list");
      expect(metadata.title).toBe("Series List");
      expect(metadata.category).toBe("layout");
      expect(metadata.icon).toBe("list-view");
    });

    test("Test 2: attributes declare mode, limit, selectedUser, selectedTopic, and align with correct defaults", () => {
      expect(metadata.attributes.mode).toEqual({
        type: "string",
        default: "all",
      });
      expect(metadata.attributes.limit).toEqual({
        type: "number",
        default: 5,
      });
      expect(metadata.attributes.selectedUser).toEqual({
        type: "number",
        default: 0,
      });
      expect(metadata.attributes.selectedTopic).toEqual({
        type: "string",
        default: "",
      });
      expect(metadata.attributes.align).toEqual({
        type: "string",
        default: "wide",
      });
    });

    test("Test 3: supports inserter and disables html editing", () => {
      expect(metadata.supports.inserter).toBe(true);
      expect(metadata.supports.html).toBe(false);
    });
  });

  describe("save.js", () => {
    test("Test 4: save returns null for server-side dynamic rendering", () => {
      expect(save()).toBeNull();
    });
  });

  describe("index.js registration", () => {
    test("Test 5: registerSeriesListBlock invokes registerBlockType with metadata, edit, and save", () => {
      const registered = registerSeriesListBlock();
      expect(wpBlocks.registerBlockType).toHaveBeenCalledWith(
        "seriescraft/series-list",
        expect.objectContaining({
          name: "seriescraft/series-list",
          edit: Edit,
          save,
        }),
      );
      expect(registered.name).toBe("seriescraft/series-list");
    });
  });

  describe("ModeSelector Component", () => {
    test("Test 6: renders MODE dropdown with all 4 modes and handles change", () => {
      const onChange = jest.fn();
      render(<ModeSelector mode="all" onChange={onChange} />);

      const select = screen.getByTestId("select-MODE");
      expect(select).toBeDefined();
      expect(select.value).toBe("all");

      fireEvent.change(select, { target: { value: "top" } });
      expect(onChange).toHaveBeenCalledWith("top");
    });
  });

  describe("UserSelector Component", () => {
    test("Test 7: renders SELECT USER dropdown with authors list and dispatches numeric ID", () => {
      const onChange = jest.fn();
      const users = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ];
      render(
        <UserSelector selectedUser={0} users={users} onChange={onChange} />,
      );

      const select = screen.getByTestId("select-SELECT USER");
      expect(select).toBeDefined();

      fireEvent.change(select, { target: { value: "2" } });
      expect(onChange).toHaveBeenCalledWith(2);
    });
  });

  describe("TopicSelector Component", () => {
    test("Test 8: renders SELECT TOPIC dropdown with categories/topics and calls onChange", () => {
      const onChange = jest.fn();
      const topics = [
        { id: 1, name: "Web Dev", slug: "web-dev" },
        { id: 2, name: "DevOps", slug: "devops" },
      ];
      render(
        <TopicSelector selectedTopic="" topics={topics} onChange={onChange} />,
      );

      const select = screen.getByTestId("select-SELECT TOPIC");
      expect(select).toBeDefined();

      fireEvent.change(select, { target: { value: "web-dev" } });
      expect(onChange).toHaveBeenCalledWith("web-dev");
    });
  });

  describe("SeriesPreviewCard Component", () => {
    test("Test 9: passes author filter when in user mode and topic filter when in topics mode", () => {
      const { rerender } = render(
        <SeriesPreviewCard mode="user" selectedUser={5} />,
      );

      expect(mockGetEntityRecords).toHaveBeenCalledWith(
        "taxonomy",
        "series",
        expect.objectContaining({
          author: 5,
          hide_empty: false,
        }),
      );

      rerender(<SeriesPreviewCard mode="topics" selectedTopic="web-dev" />);

      expect(mockGetEntityRecords).toHaveBeenCalledWith(
        "taxonomy",
        "series",
        expect.objectContaining({
          topic: "web-dev",
          hide_empty: false,
        }),
      );
    });

    test("Test 10: renders loading spinner when records are resolving", () => {
      mockIsResolving.mockReturnValue(true);

      render(<SeriesPreviewCard mode="all" />);

      expect(screen.getByTestId("series-preview-loading")).toBeDefined();
      expect(screen.getByTestId("mock-spinner")).toBeDefined();
    });

    test("Test 11: renders empty notice when no series are returned", () => {
      render(<SeriesPreviewCard mode="user" selectedUser={999} />);

      expect(screen.getByTestId("series-preview-empty")).toBeDefined();
      expect(screen.getByText("No series found.")).toBeDefined();
    });
  });

  describe("Edit Component", () => {
    test("Test 12: renders stable root PanelBody and permanently mounted SeriesPreviewCard", () => {
      render(
        <Edit
          attributes={{ mode: "all", limit: 5 }}
          setAttributes={jest.fn()}
        />,
      );

      const root = screen.getByTestId("block-props-root");
      expect(root.className).toContain("sc-series-editor-root");
      expect(root.className).toContain("wp-block-seriescraft-series-list");

      const panelBody = screen.getByTestId("panel-body");
      expect(panelBody).toBeDefined();
      expect(panelBody.getAttribute("data-title")).toBe("Series Display Mode");

      expect(screen.getByTestId("series-preview-card")).toBeDefined();

      const ssr = screen.getByTestId("server-side-render");
      expect(ssr.getAttribute("data-block")).toBe("seriescraft/series-list");
      expect(ssr.getAttribute("data-mode")).toBe("all");
      expect(ssr.getAttribute("data-post-id")).toBe("42");
      expect(ssr.getAttribute("data-preview-series-id")).toBe("10");
      expect(ssr.getAttribute("data-preview-title")).toBe("Test Post Title");
      expect(ssr.getAttribute("data-preview-key")).toBe("10-Test Post Title-0");
    });

    test('Test 13: InspectorControls shows RangeControl only when mode is "top"', () => {
      const setAttributes = jest.fn();
      const { rerender } = render(
        <Edit
          attributes={{ mode: "all", limit: 5 }}
          setAttributes={setAttributes}
        />,
      );

      expect(screen.queryByTestId("range-control-limit")).toBeNull();

      rerender(
        <Edit
          attributes={{ mode: "top", limit: 5 }}
          setAttributes={setAttributes}
        />,
      );

      const range = screen.getByTestId("range-control-limit");
      expect(range).toBeDefined();

      fireEvent.change(range, { target: { value: "10" } });
      expect(setAttributes).toHaveBeenCalledWith({ limit: 10 });

      // SeriesPreviewCard remains firmly mounted
      expect(screen.getByTestId("series-preview-card")).toBeDefined();
    });

    test('Test 14: InspectorControls shows UserSelector when mode is "user"', () => {
      const setAttributes = jest.fn();
      const { rerender } = render(
        <Edit
          attributes={{ mode: "all", selectedUser: 0 }}
          setAttributes={setAttributes}
        />,
      );

      expect(screen.queryByTestId("select-SELECT USER")).toBeNull();

      rerender(
        <Edit
          attributes={{ mode: "user", selectedUser: 0 }}
          setAttributes={setAttributes}
        />,
      );

      expect(screen.getByTestId("select-SELECT USER")).toBeDefined();

      const userSelect = screen.getByTestId("select-SELECT USER");
      fireEvent.change(userSelect, { target: { value: "1" } });
      expect(setAttributes).toHaveBeenCalledWith({ selectedUser: 1 });

      // SeriesPreviewCard remains firmly mounted
      expect(screen.getByTestId("series-preview-card")).toBeDefined();
    });

    test('Test 15: InspectorControls shows TopicSelector when mode is "topics"', () => {
      const setAttributes = jest.fn();
      const { rerender } = render(
        <Edit
          attributes={{ mode: "all", selectedTopic: "" }}
          setAttributes={setAttributes}
        />,
      );

      expect(screen.queryByTestId("select-SELECT TOPIC")).toBeNull();

      rerender(
        <Edit
          attributes={{ mode: "topics", selectedTopic: "" }}
          setAttributes={setAttributes}
        />,
      );

      expect(screen.getByTestId("select-SELECT TOPIC")).toBeDefined();

      const topicSelect = screen.getByTestId("select-SELECT TOPIC");
      fireEvent.change(topicSelect, { target: { value: "devops" } });
      expect(setAttributes).toHaveBeenCalledWith({ selectedTopic: "devops" });

      // SeriesPreviewCard remains firmly mounted
      expect(screen.getByTestId("series-preview-card")).toBeDefined();
    });

    test("Test 16: increments previewRefreshKey when window event sc-series-preview-refresh fires", () => {
      render(<Edit attributes={{ mode: "all" }} setAttributes={jest.fn()} />);

      const ssr = screen.getByTestId("server-side-render");
      expect(ssr.getAttribute("data-preview-key")).toBe("10-Test Post Title-0");

      act(() => {
        window.dispatchEvent(new CustomEvent("sc-series-preview-refresh"));
      });

      expect(ssr.getAttribute("data-preview-key")).toBe("10-Test Post Title-1");

      act(() => {
        window.dispatchEvent(new CustomEvent("sm-series-preview-refresh"));
      });

      expect(ssr.getAttribute("data-preview-key")).toBe("10-Test Post Title-2");
    });

    test("Test 17: cleans up window event listeners on unmount", () => {
      const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");

      const { unmount } = render(
        <Edit attributes={{ mode: "all" }} setAttributes={jest.fn()} />,
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "seriescraft:order-updated",
        expect.any(Function),
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "sc-series-preview-refresh",
        expect.any(Function),
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "sm-series-preview-refresh",
        expect.any(Function),
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "sm-series-live-preview",
        expect.any(Function),
      );

      removeEventListenerSpy.mockRestore();
    });

    test("Test 18: traps click events on anchors and nav buttons inside editor canvas preview", () => {
      const { container } = render(
        <Edit attributes={{ mode: "all" }} setAttributes={jest.fn()} />,
      );

      const root = container.querySelector(".sc-series-editor-root");
      expect(root).toBeDefined();

      const testLink = document.createElement("a");
      testLink.href = "https://example.com/test-article";
      root.appendChild(testLink);

      const clickEvent = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      });
      const notCancelled = testLink.dispatchEvent(clickEvent);

      expect(notCancelled).toBe(false);
      expect(clickEvent.defaultPrevented).toBe(true);
    });

    test("Test 19: detects image block in editor blocks and passes preview_image to ServerSideRender", () => {
      wpData.useSelect.mockImplementation((callback) => {
        const select = (storeName) => {
          if (storeName === "core/editor") {
            return {
              getCurrentPostId: () => 42,
              getEditedPostAttribute: (attr) => {
                if (attr === "title") return "Test Post Title";
                if (attr === "series") return [10];
                if (attr === "featured_media") return 0;
                return null;
              },
            };
          }
          if (storeName === "core/block-editor") {
            return {
              getBlocks: () => [
                {
                  name: "core/paragraph",
                  attributes: { content: "Introduction paragraph" },
                },
                {
                  name: "core/image",
                  attributes: { url: "https://example.com/canvas-preview.jpg" },
                },
              ],
            };
          }
          if (storeName === "core") {
            return {
              getUsers: () => [],
              getEntityRecords: mockGetEntityRecords,
            };
          }
          return {};
        };
        return callback(select);
      });

      render(<Edit attributes={{ mode: "all" }} setAttributes={jest.fn()} />);

      const ssr = screen.getByTestId("server-side-render");
      expect(ssr.getAttribute("data-preview-image")).toBe(
        "https://example.com/canvas-preview.jpg",
      );
      expect(ssr.getAttribute("data-preview-key")).toBe(
        "10-Test Post Title-https://example.com/canvas-preview.jpg-0",
      );
    });

    test("Test 20: renders BlockControls with Series Settings toolbar gear button and toggles Settings Modal", () => {
      render(<Edit attributes={{ mode: "all" }} setAttributes={jest.fn()} />);

      const toolbarBtn = screen.getByTestId("toolbar-button-settings");
      expect(toolbarBtn).toBeDefined();

      // Modal is initially closed
      expect(screen.queryByTestId("settings-modal")).toBeNull();

      // Clicking gear icon opens the Toolbar Settings Modal
      fireEvent.click(toolbarBtn);
      const modal = screen.getByTestId("settings-modal");
      expect(modal).toBeDefined();
      expect(modal.getAttribute("data-title")).toBe(
        "Series Appearance & Settings",
      );
      expect(screen.getByTestId("series-settings-sidebar")).toBeDefined();

      // Clicking close button cleanly unmounts the modal
      fireEvent.click(screen.getByTestId("modal-close"));
      expect(screen.queryByTestId("settings-modal")).toBeNull();
      expect(screen.queryByTestId("series-settings-sidebar")).toBeNull();
    });

    test("Test 21: sm-series-live-preview updates style without incrementing preview_key", () => {
      render(<Edit attributes={{ mode: "all" }} setAttributes={jest.fn()} />);

      const ssr = screen.getByTestId("server-side-render");
      expect(ssr.getAttribute("data-preview-key")).toBe("10-Test Post Title-0");

      act(() => {
        window.dispatchEvent(
          new CustomEvent("sm-series-live-preview", {
            detail: {
              style: {
                buttonColor: "#00cc88",
              },
            },
          }),
        );
      });

      // Preview key remains 0 because live preview does not trigger SSR fetch
      expect(ssr.getAttribute("data-preview-key")).toBe("10-Test Post Title-0");
    });

    test("Test 22: InspectorControls does not render color settings and remains strictly dedicated to display mode selection", () => {
      const { container } = render(
        <Edit attributes={{ mode: "all" }} setAttributes={jest.fn()} />,
      );

      const inspector = screen.getByTestId("inspector-controls");
      expect(inspector).toBeDefined();

      // Inspector contains display mode selector
      expect(screen.getByTestId("select-MODE")).toBeDefined();

      // Inspector does NOT contain color palettes or custom styles
      expect(inspector.querySelector(".sc-series-inspector-colors")).toBeNull();
      expect(inspector.querySelector('input[type="color"]')).toBeNull();
      expect(inspector.querySelector(".components-color-palette")).toBeNull();
      expect(screen.queryByTestId("block-color-settings")).toBeNull();
    });

    test("Test 23: sm-series-live-preview applies CSS custom properties directly to canvas target styles", () => {
      const { container } = render(
        <Edit attributes={{ mode: "all" }} setAttributes={jest.fn()} />,
      );

      const root = container.querySelector(".sc-series-editor-root");
      expect(root).toBeDefined();

      const mockBox = document.createElement("div");
      mockBox.className = "sc-series-box";
      mockBox.dataset.smSeriesTermId = "10";

      act(() => {
        root.appendChild(mockBox);
      });

      act(() => {
        window.dispatchEvent(
          new CustomEvent("sm-series-live-preview", {
            detail: {
              termId: 10,
              style: {
                buttonColor: "#ff00aa",
                borderColor: "#334455",
                headerBackgroundColor: "#eef2f5",
                borderWidth: "2px",
                borderStyle: "dashed",
              },
            },
          }),
        );
      });

      // CSS custom properties should be injected directly onto target element
      expect(mockBox.style.getPropertyValue("--sc-button-color")).toBe(
        "#ff00aa",
      );
      expect(mockBox.style.getPropertyValue("--sm-hover-color")).toBe(
        "#ff00aa",
      );
      expect(mockBox.style.getPropertyValue("--sc-border-color")).toBe(
        "#334455",
      );
      expect(mockBox.style.getPropertyValue("--sc-header-bg")).toBe("#eef2f5");
      expect(mockBox.style.getPropertyValue("--sc-border-width")).toBe("2px");
      expect(mockBox.style.getPropertyValue("--sc-border-style")).toBe(
        "dashed",
      );
    });

    test("Test 24: refreshes the server preview with live multi-series assignments", () => {
      let assignedSeriesIds = [10];
      wpData.useSelect.mockImplementation((callback) => {
        const select = (storeName) => {
          if (storeName === "core/editor") {
            return {
              getCurrentPostId: () => 42,
              getEditedPostAttribute: (attribute) => {
                if (attribute === "title") return "Test Post Title";
                if (attribute === "series") return assignedSeriesIds;
                if (attribute === "featured_media") return 0;
                return null;
              },
            };
          }
          if (storeName === "core/data") {
            return { isResolving: mockIsResolving };
          }
          if (storeName === "core/block-editor") {
            return { getBlocks: () => [] };
          }
          if (storeName === "core") {
            return {
              getUsers: () => [],
              getEntityRecords: mockGetEntityRecords,
            };
          }
          return {};
        };
        return callback(select);
      });

      const { rerender } = render(
        <Edit attributes={{ mode: "all" }} setAttributes={jest.fn()} />,
      );

      let ssr = screen.getByTestId("server-side-render");
      expect(ssr.getAttribute("data-preview-series-ids")).toBe("[10]");
      expect(ssr.getAttribute("data-preview-series-id")).toBe("10");

      assignedSeriesIds = [10, 11];
      rerender(<Edit attributes={{ mode: "all" }} setAttributes={jest.fn()} />);

      ssr = screen.getByTestId("server-side-render");
      expect(ssr.getAttribute("data-preview-series-ids")).toBe("[10,11]");
      expect(ssr.getAttribute("data-preview-series-id")).toBeNull();
    });

    test("Test 25: increments previewRefreshKey when window event seriescraft:order-updated fires for active series", () => {
      render(<Edit attributes={{ mode: "all" }} setAttributes={jest.fn()} />);

      const ssr = screen.getByTestId("server-side-render");
      expect(ssr.getAttribute("data-preview-key")).toBe("10-Test Post Title-0");

      act(() => {
        window.dispatchEvent(
          new CustomEvent("seriescraft:order-updated", {
            detail: {
              seriesId: 10,
              postIds: [102, 101],
              timestamp: Date.now(),
            },
          }),
        );
      });

      expect(ssr.getAttribute("data-preview-key")).toBe("10-Test Post Title-1");
    });

    test("Test 26: ignores seriescraft:order-updated event when seriesId does not match active series", () => {
      render(<Edit attributes={{ mode: "all" }} setAttributes={jest.fn()} />);

      const ssr = screen.getByTestId("server-side-render");
      expect(ssr.getAttribute("data-preview-key")).toBe("10-Test Post Title-0");

      act(() => {
        window.dispatchEvent(
          new CustomEvent("seriescraft:order-updated", {
            detail: {
              seriesId: 999,
              postIds: [201, 202],
              timestamp: Date.now(),
            },
          }),
        );
      });

      // Should remain 0 because event was for series 999 and active series is 10
      expect(ssr.getAttribute("data-preview-key")).toBe("10-Test Post Title-0");
    });

    /**
     * Test 28: Expands only the accordion item matching the selected series.
     */
    test("Test 27: expands the selected series and collapses the other accordion items", () => {
      const previewRoot = document.createElement("div");
      previewRoot.innerHTML = `
        <details class="seriescraft-accordion-item" open>
          <section data-sm-series-term-id="10"></section>
        </details>
        <details class="seriescraft-accordion-item" open>
          <section data-sm-series-term-id="20"></section>
        </details>
      `;

      const synchronized = syncAccordionToSeries(previewRoot, 20);
      const items = previewRoot.querySelectorAll(".seriescraft-accordion-item");

      expect(synchronized).toBe(true);
      expect(items[0].open).toBe(false);
      expect(items[1].open).toBe(true);
    });

    /**
     * Test 29: Synchronizes accordion expansion when the active store series changes.
     */
    test("Test 28: updates the open accordion item when activeSeriesId changes", () => {
      let activeSeriesId = 10;
      wpData.useSelect.mockImplementation((callback) => {
        const select = (storeName) => {
          if (storeName === "core/editor") {
            return {
              getCurrentPostId: () => 42,
              getEditedPostAttribute: (attribute) =>
                attribute === "series" ? [10, 11] : null,
            };
          }
          if (storeName === "series-craft/store") {
            return {
              getSeries: () => [
                { id: 10, name: "Series 10" },
                { id: 11, name: "Series 11" },
              ],
              getSeriesPosts: () => [],
              getActiveSeriesId: () => activeSeriesId,
            };
          }
          if (storeName === "core/data") {
            return { isResolving: mockIsResolving };
          }
          if (storeName === "core/block-editor") {
            return { getBlocks: () => [] };
          }
          if (storeName === "core") {
            return {
              getUsers: () => [],
              getEntityRecords: mockGetEntityRecords,
            };
          }
          return {};
        };
        return callback(select);
      });

      const { container, rerender } = render(
        <Edit attributes={{ mode: "all" }} setAttributes={jest.fn()} />,
      );

      let items = container.querySelectorAll(".seriescraft-accordion-item");
      expect(items[0].open).toBe(true);
      expect(items[1].open).toBe(false);

      activeSeriesId = 11;
      rerender(<Edit attributes={{ mode: "all" }} setAttributes={jest.fn()} />);

      items = container.querySelectorAll(".seriescraft-accordion-item");
      expect(items[0].open).toBe(false);
      expect(items[1].open).toBe(true);
    });
  });

  describe("findFirstImageInBlocks helper", () => {
    test("returns empty string when blocks array is empty or invalid", () => {
      expect(findFirstImageInBlocks([])).toBe("");
      expect(findFirstImageInBlocks(null)).toBe("");
    });

    test("extracts url from core/image and core/cover blocks", () => {
      const blocks = [
        { name: "core/paragraph", attributes: {} },
        {
          name: "core/image",
          attributes: { url: "https://example.com/img1.png" },
        },
      ];
      expect(findFirstImageInBlocks(blocks)).toBe(
        "https://example.com/img1.png",
      );

      const coverBlocks = [
        {
          name: "core/cover",
          attributes: { url: "https://example.com/cover.png" },
        },
      ];
      expect(findFirstImageInBlocks(coverBlocks)).toBe(
        "https://example.com/cover.png",
      );
    });

    test("extracts mediaUrl from core/media-text block", () => {
      const blocks = [
        {
          name: "core/media-text",
          attributes: { mediaUrl: "https://example.com/media-text.png" },
        },
      ];
      expect(findFirstImageInBlocks(blocks)).toBe(
        "https://example.com/media-text.png",
      );
    });

    test("extracts image from nested innerBlocks recursively", () => {
      const blocks = [
        {
          name: "core/columns",
          innerBlocks: [
            {
              name: "core/column",
              innerBlocks: [
                {
                  name: "core/image",
                  attributes: { url: "https://example.com/nested-img.png" },
                },
              ],
            },
          ],
        },
      ];
      expect(findFirstImageInBlocks(blocks)).toBe(
        "https://example.com/nested-img.png",
      );
    });

    test("extracts image src from core/html content", () => {
      const blocks = [
        {
          name: "core/html",
          attributes: {
            content:
              '<figure><img src="https://example.com/html-img.png" alt="" /></figure>',
          },
        },
      ];
      expect(findFirstImageInBlocks(blocks)).toBe(
        "https://example.com/html-img.png",
      );
    });
  });
});
