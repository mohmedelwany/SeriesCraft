# seriesCraft - Project Standards & Architectural Contract

## 1. Project Context & Tech Stack
- **Plugin Name:** seriesCraft
- **Description:** Professional WordPress plugin to create, organize, and manage post series with ordering, Gutenberg block TOC, layout variants, and navigation components.
- **Backend:** PHP 8.1+, WordPress Core APIs, Composer (PSR-4 autoloading under `SeriesCraft\`), PHPUnit, PHPCS (WPCS), PHPStan.
- **Frontend / Editor:** React 18+, `@wordpress/*` packages, `@wordpress/data` centralized state store, SCSS / CSS Custom Properties, `@wordpress/scripts`.
- **Testing Methodology:** Strict Test-Driven Development (TDD) across three tiers:
  - **Unit (`tests/Unit`):** Fast isolated tests for PHP (Mockery/BrainMonkey) and JS (Jest).
  - **Integration (`tests/Integration`):** WP DB-connected integration tests extending `WP_UnitTestCase`.
  - **E2E (`tests/E2E`):** End-to-end Playwright tests executing in real browser sessions with `.wp-env`.

---

## 2. Architectural Principles & Legacy Migration Contract

### Key Architectural Improvements over Legacy Implementation:
1. **PSR-4 Autoloading (`SeriesCraft\`):** Elimination of manual `require_once` chains. Autoloader maps `SeriesCraft\` directly to `src/src/`.
2. **Database Schema & Migration Layer:** Schema DDL operations (e.g., adding `term_order` column to `$wpdb->term_relationships`) are moved strictly to activation/migration scripts (`Database/Migrations/`), eliminating runtime `ALTER TABLE` checks on read queries.
3. **REST API over legacy `admin-ajax.php`:** Legacy `admin-ajax.php` handlers are replaced with standard WordPress REST API controllers (`Api/Controllers/SeriesRestController` & `SettingsRestController` extending `WP_REST_Controller`).
4. **Single `@wordpress/data` Centralized State:** Replaces dual-sidebar split state and fragile custom window events with a unified React data store (`resources/js/store/`).
5. **Clean Separation of Concerns:**
   - **Database Layer (`Database/Repositories/`):** Pure `$wpdb` SQL queries separated from UI/business logic.
   - **Frontend Rendering (`Frontend/`):** Modular Layouts (`StandardLayout`, `AccordionLayout`) and Variants (`MediaGrid`, `LinkGrid`, etc.) implementing strict PHP interfaces.
   - **Admin Controllers (`Admin/Controllers/`):** Form processing separated from HTML views.

---

## 3. Official Unified Directory Structure

```text
series-craft/
├── .github/                                # GitHub configuration & CI/CD workflows
│   └── workflows/                          # Automated CI pipelines (PHPUnit, PHPCS, PHPStan, Playwright)
├── assets/                                 # Build output directory for compiled JS/CSS assets (DO NOT EDIT)
│   ├── js/                                 # Compiled JavaScript bundles (editor, frontend)
│   └── css/                                # Compiled CSS stylesheets (admin, editor, frontend)
├── bin/                                    # Command-line helper scripts and test orchestration runners
│   └── test-integration-matrix.sh          # Shell script for running matrix integration test suites
├── docker/                                 # Docker local development configuration
├── resources/                              # Source code directory for frontend JS, React, and SCSS
│   ├── js/                                 # Uncompiled JavaScript and React source files
│   │   ├── api/                            # Client-side REST API wrapper utilizing @wordpress/api-fetch
│   │   │   └── seriesClient.js             # HTTP communication service for REST API calls
│   │   ├── blocks/                         # Gutenberg custom block definitions
│   │   │   └── series-list/                # Dynamic 'series-craft/series-list' block (block.json, edit.js, save.js, components/)
│   │   ├── editor/                         # Gutenberg editor subsystems (strictly separated by responsibility)
│   │   │   ├── sidebar/                    # Document Settings Panel (index.js, PartOrderList.js)
│   │   │   └── settings-sidebar/           # Series Appearance Drawer & Toolbar Gear Modal (SeriesSettingsSidebar, LayoutTab, StyleTab, constants)
│   │   ├── frontend/                       # Lightweight vanilla JS for frontend interactions (accordion)
│   │   ├── hooks/                          # Custom React hooks (useSeries, useSeriesPosts, useSeriesOrder, useSeriesSettings, usePostSavingSync)
│   │   ├── store/                          # Centralized @wordpress/data store (actions, reducer, resolvers, selectors, constants)
│   │   ├── index.js                        # Canonical JavaScript entry point
│   │   └── editor.js                       # Build entry wrapper
│   └── scss/                               # Modular SCSS architecture & design tokens
│       ├── abstracts/                      # Global Sass tools (_mixins.scss, _variables.scss with --sc-* tokens)
│       ├── components/                     # Frontend UI partials (_badge, _header, _navigation, _post-list)
│       ├── editor/                         # Scoped Gutenberg editor partials (_draggable, _layout-selector, _panel)
│       ├── admin.scss                      # Isolated Admin dashboard bundle entry
│       ├── editor.scss                     # Isolated Gutenberg editor bundle entry
│       ├── frontend.scss                   # Isolated Frontend rendering bundle entry
│       └── variables.scss                  # Design tokens forward wrapper
├── src/                                    # Main PHP plugin root directory (shippable package)
│   ├── series-craft.php                    # Main plugin bootstrap, constants, activation hook (SchemaManager & LegacyDataMigrator)
│   └── src/                                # PSR-4 autoloader root mapped to 'SeriesCraft\' namespace
│       ├── Admin/                          # Admin dashboard screens, settings tabs, and sanitization
│       │   ├── AdminPage.php               # Registers top-level WP admin menu and delegates to SeriesSettingsPage
│       │   ├── SeriesSettingsPage.php      # Settings controller & renderer (tabs, nonces, form processing)
│       │   ├── SettingsSanitizer.php       # Static sanitizers for post types and layout whitelists
│       │   └── Views/                      # Admin HTML templates (settings-page.php, tab-layouts.php, tab-custom-post-types.php)
│       ├── Api/                            # WordPress REST API integration layer (wp-json/series-craft/v1)
│       │   └── Controllers/                # REST API endpoint controllers extending WP_REST_Controller
│       │       ├── SeriesRestController.php    # Endpoints for series list, posts, and ordering
│       │       └── SettingsRestController.php  # Endpoints for term-level and global settings
│       ├── Assets/                         # Script and style enqueuing
│       │   └── EnqueueManager.php          # Enqueues isolated admin, editor, and frontend bundles
│       ├── Core/                           # Plugin core lifecycle and wiring
│       │   └── Main.php                    # Composition root: instantiates services and registers hooks, REST routes, and block
│       ├── Database/                       # Database schema, lifecycle integrity, and repositories
│       │   ├── SchemaManager.php           # Creates and manages custom junction table schema on activation
│       │   ├── LegacyDataMigrator.php      # Migrates legacy post-order meta on activation
│       │   ├── LifecycleSubscriber.php     # Hooks into WP delete events to keep junction data consistent
│       │   └── Repositories/               # Data access layer encapsulating all $wpdb and meta operations
│       │       ├── SeriesRepositoryInterface.php   # Contract for series data retrieval & ordering
│       │       ├── SeriesRepository.php            # Implements custom SQL queries and series post ordering
│       │       ├── SettingsRepositoryInterface.php # Contract for settings persistence
│       │       └── SettingsRepository.php          # Handles term meta (sm_series_settings) and plugin options
│       ├── Frontend/                       # Frontend server-side rendering and content filtering
│       │   └── FrontendRenderer.php        # Dynamic block render_callback and 'the_content' series injection
│       ├── Hooks/                          # WordPress action/filter event subscribers
│       │   └── SavePostSubscriber.php      # Hooks into 'save_post' to manage series assignment and sequencing
│       ├── Services/                       # Domain services and helpers
│       │   ├── NavigationService.php       # Calculates adjacent (previous/next) posts in series sequence
│       │   ├── StyleSanitizer.php          # Converts style settings into sanitized inline CSS variables (--sc-*)
│       │   └── ThumbnailResolver.php       # Resolves post featured image with content-image fallback
│       ├── Taxonomy/                       # Custom taxonomy registration and classic admin UI
│       │   ├── SeriesTaxonomy.php          # Registers 'series' custom taxonomy with REST support
│       │   └── SeriesTaxonomyAdmin.php     # Classic term edit screen enhancements & reorder fallback
│       └── Views/                          # Modular frontend view templates and layout variants
│           ├── AccordionLayout.php         # Multi-series collapsible layout view
│           ├── HeaderView.php              # Series header + "Part X of Y" badge view
│           ├── NavigationView.php          # Previous/Next post buttons view
│           └── Variants/                   # Concrete post list/grid rendering variations
│               ├── VariantViewInterface.php # Contract interface for layout variants
│               ├── LinkGridView.php        # Text link grid variation
│               ├── LinkListView.php        # Text link list variation
│               ├── MediaGridView.php       # Thumbnail media grid variation
│               └── MediaListView.php       # Thumbnail media list variation
└── tests/                                  # Automated testing suite organized by test tier
│   ├── E2E/                                # Playwright end-to-end browser tests
│   │   ├── helpers/                        # Playwright test utility helpers and page object models
│   │   ├── auth.setup.js                   # Authentication setup for WordPress admin session reuse
│   │   ├── homepage.spec.js                # Frontend end-to-end test suite
│   │   └── plugin-activation.spec.js       # Plugin activation & admin workflow end-to-end test suite
│   ├── Integration/                        # PHPUnit integration tests running against active WordPress database
│   │   ├── bootstrap.php                   # Test bootstrap file configuring WP test environment
│   │   ├── IntegrationTestCase.php         # Base integration test case class extending WP_UnitTestCase
│   │   └── SmokeTest.php                   # Basic smoke test for plugin initialization and DB sanity
│   ├── Unit/                               # Fast isolated unit tests running without full WordPress DB stack
│   │   ├── js/                             # JavaScript/React unit tests executed via Jest
│   │   └── php/                            # PHPUnit unit tests for isolated classes with Mockery/BrainMonkey
│   └── bootstrap.php                       # PHPUnit root setup file
├── PROJECT_RULES.md                        # Official architectural contract, AI rules, and directory specification
├── composer.json                           # PHP dependencies, scripts, and PSR-4 autoloader mapping ('SeriesCraft\\' -> 'src/src/')
├── jest.config.js                          # Jest testing configuration for React unit tests
├── package.json                            # NPM dependencies, build scripts (@wordpress/scripts), and dev tool configurations
├── phpcs.xml                               # PHP_CodeSniffer rule definitions enforcing WordPress Coding Standards (WPCS)
├── phpcs_sec.xml                           # PHP_CodeSniffer security audit rules
├── phpstan.neon.dist                       # PHPStan static analysis configuration (level 8/9 target)
├── phpunit.integration.xml                 # PHPUnit configuration file for database-driven integration tests
├── phpunit.xml.dist                        # PHPUnit configuration file for isolated unit tests
└── playwright.config.js                    # Playwright end-to-end test runner configuration
```

---

### 4. Legacy Responsibility to Modern Target Architecture Mapping

---

#### 4.1. Core Lifecycle & Bootstrapping
* **Plugin Bootstrapping & Orchestration:**
  * **Legacy:** Relied on scattered manual `require_once` statements inside `series-manager.php`.
  * **Target:** Handled centrally by `SeriesCraft\Core\Main` and `SeriesCraft\Core\Plugin` with Composer PSR-4 autoloading.
* **Asset Management & Enqueuing:**
  * **Legacy:** Script and style registrations were mixed directly into view files and render callbacks.
  * **Target:** Encapsulated entirely within `SeriesCraft\Core\AssetManager` to register and enqueue compiled assets from `assets/`.

---

#### 4.2. Database & Persistence Layer
* **Database Schema Migrations:**
  * **Legacy:** Checked for the `term_order` column and executed `ALTER TABLE` queries during frontend read queries.
  * **Target:** Isolated inside `SeriesCraft\Database\Migrations\AddTermOrderColumnMigration`, executing strictly once during plugin activation.
* **Series Data Queries & Term Ordering:**
  * **Legacy:** Raw SQL queries directly embedded inside admin callbacks and template views.
  * **Target:** Abstracted into `SeriesCraft\Database\Repositories\SeriesRepository` conforming to `SeriesRepositoryInterface`.
* **Settings & Term Metadata Persistence:**
  * **Legacy:** Mixed option storage, term meta, and input sanitization logic.
  * **Target:** Managed cleanly via `SeriesCraft\Database\Repositories\SettingsRepository`.

---

#### 4.3. API & Communication Layer
* **Ordering & Management Endpoints:**
  * **Legacy:** Built on outdated `admin-ajax.php` actions with repetitive manual nonce checks.
  * **Target:** Modern WordPress REST API controllers under the `/wp-json/series-craft/v1` namespace:
    * `SeriesCraft\Api\Controllers\SeriesRestController`
    * `SeriesCraft\Api\Controllers\SettingsRestController`
* **Response Serialization:**
  * **Legacy:** Ad-hoc array structures returned from AJAX handlers.
  * **Target:** Standardized JSON formatting managed by `SeriesCraft\Api\Responses\SeriesFormatter`.

---

#### 4.4. Taxonomy & Admin Management
* **Custom Taxonomy Registration:**
  * **Legacy:** Static procedures inside `class-series-taxonomy.php`.
  * **Target:** Object-oriented registration with full REST API and capability mapping via `SeriesCraft\Taxonomy\SeriesTaxonomy`.
* **Classic Admin Term Reordering:**
  * **Legacy:** `class-series-taxonomy-edit.php` directly accessing the global `$wpdb`.
  * **Target:** `SeriesCraft\Taxonomy\SeriesTaxonomyAdmin` delegating data operations to the repository layer.
* **Admin Settings Screens:**
  * **Legacy:** Scripts like `CPTpage.php` and `Layouts.php` handling form processing directly within HTML view output.
  * **Target:** Clear separation: `SeriesCraft\Admin\AdminMenu` registers routes/tabs, and dedicated controllers in `SeriesCraft\Admin\Controllers\` process input and updates.

---

#### 4.5. Event Subscribers & Automation Hooks
* **Auto-Sequencing New Posts:**
  * **Legacy:** Unmapped logic for assigning default order values to newly assigned posts.
  * **Target:** An isolated event subscriber `SeriesCraft\Hooks\SavePostSubscriber` hooking into `save_post` (priority 20).

---

#### 4.6. Frontend Layouts & Rendering Engine
* **Container Layouts & Multi-Series Handling:**
  * **Legacy:** Monolithic HTML generation inside a single `renderer.php` file.
  * **Target:** Polymorphic layout architecture:
    * `SeriesCraft\Frontend\Layouts\StandardLayout` (single series)
    * `SeriesCraft\Frontend\Layouts\AccordionLayout` (multi-series collapsible view)
    * Both implement `SeriesCraft\Frontend\Layouts\LayoutInterface`.
* **Display Variants (Lists & Grids):**
  * **Legacy:** Procedural template blocks with shared, brittle rendering logic.
  * **Target:** Distinct classes implementing `SeriesCraft\Frontend\Variants\VariantInterface`:
    * `LinkList.php` (plain text link list)
    * `LinkGrid.php` (plain text link grid)
    * `MediaList.php` (thumbnail list layout)
    * `MediaGrid.php` (thumbnail grid layout)
* **CSS & Style Sanitization:**
  * **Legacy:** Embedded unverified style strings directly into template markup.
  * **Target:** Verified, sanitized CSS variable injection handled by `SeriesCraft\Frontend\Style\StyleSanitizer`.

---

#### 4.7. React Gutenberg Editor (`resources/js/`)
* **Custom React Hooks Layer (`resources/js/hooks/`):**
  * Centralizes all store selectors, dispatchers, post assignment, and block auto-sync into reusable hooks:
    * `useSeries`: Manages series taxonomy fetching, post series assignment, and active term resolution.
    * `useSeriesPosts`: Manages per-series post fetching and dynamic current-post injection.
    * `useSeriesOrder`: Manages drag-and-drop post reordering persistence, optimistic auto-saves, and status notices.
    * `useSeriesSettings`: Coordinates per-series appearance metadata retrieval, local settings synchronization, debounced REST persistence, and live preview canvas event dispatching.
    * `usePostSavingSync`: Manages Gutenberg hydration readiness guards, editor canvas block insertion at index 0 on series assignment, and auto-removal on unassignment.
* **Separation of Editor Concerns (`resources/js/editor/`):**
  * `resources/js/editor/components/`: Shared reusable UI components (`DraggableItem`, `LayoutVariantSelector`, `SeriesSelector`).
  * `resources/js/editor/sidebar/`: Document Settings Panel container integrating into Post settings (`PluginDocumentSettingPanel`) for series assignment and post ordering (`PartOrderList`).
  * `resources/js/editor/settings-sidebar/`: Dedicated appearance drawer (`PluginSidebar`) and Toolbar Gear Modal for per-series visual styles (`StyleTab`) and layout variants (`LayoutTab`).
* **State Management & Cross-Component Sync:**
  * **Legacy:** Split sidebars attempting synchronization via manual `window.CustomEvent` dispatchers.
  * **Target:** Centralized `@wordpress/data` Redux store inside `resources/js/store/` (`reducer.js`, `actions.js`, `selectors.js`, `resolvers.js`).
* **Client-Side API Integration:**
  * **Legacy:** Hand-rolled `fetch` wrappers for `admin-ajax.php`.
  * **Target:** Unified API client utilizing official `@wordpress/api-fetch` located at `resources/js/api/seriesClient.js`, consumed directly by store actions and resolvers.

---

## 5. Development & Testing Workflow Rules

1. **TDD First:** Write failing tests prior to implementing logic:
   - `tests/Unit/php` for pure logic (sanitizers, formatters, calculators).
   - `tests/Integration` for WP database operations, custom SQL repositories, REST endpoints, and hooks.
   - `tests/E2E` for editor interactions and block behavior.
2. **Strict Code Quality Standards:**
   - Run `composer lint` (PHPCS) to ensure WordPress Coding Standards (WPCS) compliance.
   - Run `composer stan` (PHPStan) to ensure static analysis passes cleanly.
   - Run `npm test` / `npm run build` for React & JS assets.

### 6. Test Documentation & Numbering Standard
- Every test method within both Unit and Integration test classes must include a docblock comment.
- The docblock must explicitly start with a sequential test case number within the file, followed by a concise description of the scenario and expected outcome:
  ```php
  /**
   * Test 1: Verifies that creating tables executes idempotently and applies proper schema constraints.
   */
  public function test_creates_table_successfully(): void
  {
      // ...
  }

  /**
   * Test 2: Verifies that post deletion cascades to remove junction records.
   */
  public function test_post_deletion_removes_relationship(): void
  {
      // ...
  }
  ```

---

## 7. Database Transaction Isolation & DDL Rules in Integration Tests

### 7.1. MySQL DDL Implicit Commit Architectural Rule
- **The Issue:** In MySQL, Data Definition Language (DDL) statements (`CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`, `TRUNCATE`, or `dbDelta()`) trigger an **implicit commit** immediately. An implicit commit terminates any active MySQL transaction without issuing an explicit `COMMIT`, preventing subsequent `ROLLBACK` commands from reverting database changes.
- **Root Cause in Test Suites:** When child integration tests call `(new SchemaManager())->create_tables()` or `$schema_manager->drop_tables()` inside `setUp()`, `tearDown()`, or individual test methods *after* `parent::setUp()` starts a transaction, the active transaction is instantly committed. As a result, test posts, series terms, and database rows permanently persist into the test database.

### 7.2. Integration Test Transaction Rules
1. **Pre-Transaction Schema Initialization:**
   - In `IntegrationTestCase::setUp()`, the custom table schema must be initialized ONCE **before** `$wpdb->query('START TRANSACTION')`.
   - A static flag `private static bool $schema_initialized = false;` ensures `(new SchemaManager())->create_tables()` is called only once prior to the start of transactions:
     ```php
     if ( ! self::$schema_initialized && class_exists( \SeriesCraft\Database\SchemaManager::class ) ) {
         ( new \SeriesCraft\Database\SchemaManager() )->create_tables();
         self::$schema_initialized = true;
     }
     ```
2. **Prohibition of DDL in Child Tests:**
   - Child integration tests extending `IntegrationTestCase` must **never** call `create_tables()` or `drop_tables()` inside `setUp()`, `tearDown()`, or test methods.
   - Rely strictly on `IntegrationTestCase` transaction rollback (`$wpdb->query('ROLLBACK')` in `tearDown()`) to clean up test fixtures and records.
3. **Restoration in Schema-Specific Tests:**
   - Test suites specifically testing table creation or dropping lifecycle (e.g., `SchemaManagerTest`, `PluginActivationTest`) must implement `tearDownAfterClass()` to restore the custom schema:
     ```php
     public static function tearDownAfterClass(): void
     {
         ( new \SeriesCraft\Database\SchemaManager() )->create_tables();
         parent::tearDownAfterClass();
     }
     ```
   - This ensures that subsequent test suites running in the same test process find the database schema intact.