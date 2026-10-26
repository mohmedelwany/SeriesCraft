<?php

declare(strict_types=1);

namespace SeriesCraft\Tests\Unit\php\Assets;

use Brain\Monkey;
use Brain\Monkey\Actions;
use Brain\Monkey\Functions;
use PHPUnit\Framework\TestCase;
use SeriesCraft\Assets\EnqueueManager;

class EnqueueManagerTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Monkey\setUp();
    }

    protected function tearDown(): void
    {
        Monkey\tearDown();
        parent::tearDown();
    }

    /**
     * Test 1: Verifies that register method adds enqueue action for block editor assets.
     */
    public function testRegisterHooksAddsEnqueueAction(): void
    {
        $manager = new EnqueueManager('/var/www/html/plugin', 'https://example.com/plugin');

        Actions\expectAdded('enqueue_block_editor_assets')
            ->once()
            ->with([$manager, 'enqueue_editor_assets']);

        $manager->register();

        $this->addToAssertionCount(1);
    }

    /**
     * Test 2: Verifies that enqueue_editor_assets registers script and style with extracted asset dependencies.
     */
    public function testEnqueueEditorAssetsRegistersScriptWithDependencies(): void
    {
        $pluginDir = sys_get_temp_dir() . '/seriescraft_test_' . uniqid();
        $jsDir = $pluginDir . '/assets/js';
        $cssDir = $pluginDir . '/assets/css';

        mkdir($jsDir, 0777, true);
        mkdir($cssDir, 0777, true);

        $mockAsset = "<?php return ['dependencies' => ['wp-element', 'wp-data'], 'version' => '1.0.5'];";
        file_put_contents($jsDir . '/editor.asset.php', $mockAsset);
        file_put_contents($jsDir . '/editor.js', 'console.log("editor");');
        file_put_contents($cssDir . '/editor.css', '/* css */');

        Functions\expect('wp_enqueue_script')
            ->once()
            ->with(
                'seriescraft-editor',
                'https://example.com/plugin/assets/js/editor.js',
                ['wp-element', 'wp-data'],
                '1.0.5',
                true
            );

        Functions\expect('wp_enqueue_style')
            ->once()
            ->with(
                'seriescraft-editor-style',
                'https://example.com/plugin/assets/css/editor.css',
                [],
                '1.0.5'
            );

        $manager = new EnqueueManager($pluginDir, 'https://example.com/plugin');
        $manager->enqueue_editor_assets();

        $this->addToAssertionCount(2);

        unlink($jsDir . '/editor.asset.php');
        unlink($jsDir . '/editor.js');
        unlink($cssDir . '/editor.css');
        rmdir($jsDir);
        rmdir($cssDir);
        rmdir($pluginDir . '/assets');
        rmdir($pluginDir);
    }

    /**
     * Test 3: Verifies that enqueue_editor_assets does not enqueue script when file is missing.
     */
    public function testEnqueueEditorAssetsDoesNotEnqueueWhenScriptMissing(): void
    {
        $pluginDir = sys_get_temp_dir() . '/seriescraft_test_missing_' . uniqid();
        mkdir($pluginDir, 0777, true);

        Functions\expect('wp_enqueue_script')->never();
        Functions\expect('wp_enqueue_style')->never();

        $manager = new EnqueueManager($pluginDir, 'https://example.com/plugin');
        $manager->enqueue_editor_assets();

        $this->addToAssertionCount(1);

        rmdir($pluginDir);
    }

    /**
     * Test 4: Verifies that enqueue_editor_assets falls back to parent directory assets if running from subfolder.
     */
    public function testEnqueueEditorAssetsFallsBackToParentAssetsDirectory(): void
    {
        $rootDir = sys_get_temp_dir() . '/seriescraft_parent_' . uniqid();
        $subDir = $rootDir . '/src';
        $jsDir = $rootDir . '/assets/js';

        mkdir($subDir, 0777, true);
        mkdir($jsDir, 0777, true);

        $mockAsset = "<?php return ['dependencies' => ['wp-blocks'], 'version' => '2.0.0'];";
        file_put_contents($jsDir . '/editor.asset.php', $mockAsset);
        file_put_contents($jsDir . '/editor.js', 'console.log("parent editor");');

        Functions\when('content_url')->alias(function ($path) {
            return 'https://example.com/wp-content/' . ltrim($path, '/');
        });

        Functions\expect('wp_enqueue_script')
            ->once()
            ->with(
                'seriescraft-editor',
                'https://example.com/wp-content/plugins/' . basename($rootDir) . '/assets/js/editor.js',
                ['wp-blocks'],
                '2.0.0',
                true
            );

        Functions\when('wp_enqueue_style')->justReturn();

        $manager = new EnqueueManager($subDir, 'https://example.com/sub');
        $manager->enqueue_editor_assets();

        $this->addToAssertionCount(1);

        unlink($jsDir . '/editor.asset.php');
        unlink($jsDir . '/editor.js');
        rmdir($jsDir);
        rmdir($rootDir . '/assets');
        rmdir($subDir);
        rmdir($rootDir);
    }

    /**
     * Test 5: Verifies that enqueue_block_assets enqueues seriescraft-editor-style for block iframe compatibility.
     */
    public function testEnqueueBlockAssetsEnqueuesEditorStyle(): void
    {
        $pluginDir = sys_get_temp_dir() . '/seriescraft_block_' . uniqid();
        $cssDir = $pluginDir . '/assets/css';
        mkdir($cssDir, 0777, true);
        file_put_contents($cssDir . '/editor.css', '/* css */');

        Functions\when('is_admin')->justReturn(true);

        Functions\expect('wp_enqueue_style')
            ->once()
            ->with(
                'seriescraft-editor-style',
                'https://example.com/plugin/assets/css/editor.css',
                [],
                '1.0.0'
            );

        $manager = new EnqueueManager($pluginDir, 'https://example.com/plugin');
        $manager->enqueue_block_assets();

        $this->addToAssertionCount(1);

        unlink($cssDir . '/editor.css');
        rmdir($cssDir);
        rmdir($pluginDir . '/assets');
        rmdir($pluginDir);
    }

    /**
     * Test 6: Verifies that enqueue_editor_assets enqueues seriescraft-frontend and calls add_editor_style when frontend.css exists.
     */
    public function testEnqueueEditorAssetsEnqueuesFrontendStyleWhenFileExists(): void
    {
        $pluginDir = sys_get_temp_dir() . '/seriescraft_front_ed_' . uniqid();
        $jsDir = $pluginDir . '/assets/js';
        $cssDir = $pluginDir . '/assets/css';

        mkdir($jsDir, 0777, true);
        mkdir($cssDir, 0777, true);

        $mockAsset = "<?php return ['dependencies' => ['wp-element'], 'version' => '1.2.0'];";
        file_put_contents($jsDir . '/editor.asset.php', $mockAsset);
        file_put_contents($jsDir . '/editor.js', 'console.log("editor");');
        file_put_contents($cssDir . '/editor.css', '/* editor css */');
        file_put_contents($cssDir . '/frontend.css', '/* frontend css */');

        Functions\expect('wp_enqueue_script')->once();

        Functions\expect('wp_enqueue_style')
            ->once()
            ->with(
                'seriescraft-editor-style',
                'https://example.com/plugin/assets/css/editor.css',
                [],
                '1.2.0'
            );

        Functions\expect('wp_enqueue_style')
            ->once()
            ->with(
                'seriescraft-frontend',
                'https://example.com/plugin/assets/css/frontend.css',
                [],
                '1.2.0'
            );

        Functions\expect('add_editor_style')
            ->once()
            ->with('https://example.com/plugin/assets/css/frontend.css');

        $manager = new EnqueueManager($pluginDir, 'https://example.com/plugin');
        $manager->enqueue_editor_assets();

        $this->addToAssertionCount(4);

        unlink($jsDir . '/editor.asset.php');
        unlink($jsDir . '/editor.js');
        unlink($cssDir . '/editor.css');
        unlink($cssDir . '/frontend.css');
        rmdir($jsDir);
        rmdir($cssDir);
        rmdir($pluginDir . '/assets');
        rmdir($pluginDir);
    }

    /**
     * Test 7: Verifies that enqueue_block_assets enqueues seriescraft-frontend both in admin and frontend.
     */
    public function testEnqueueBlockAssetsEnqueuesFrontendStyleInAdmin(): void
    {
        $pluginDir = sys_get_temp_dir() . '/seriescraft_front_block_' . uniqid();
        $cssDir = $pluginDir . '/assets/css';
        mkdir($cssDir, 0777, true);
        file_put_contents($cssDir . '/frontend.css', '/* frontend css */');

        Functions\when('is_admin')->justReturn(true);

        Functions\expect('wp_enqueue_style')
            ->once()
            ->with(
                'seriescraft-frontend',
                'https://example.com/plugin/assets/css/frontend.css',
                [],
                '1.0.0'
            );

        $manager = new EnqueueManager($pluginDir, 'https://example.com/plugin');
        $manager->enqueue_block_assets();

        $this->addToAssertionCount(1);

        unlink($cssDir . '/frontend.css');
        rmdir($cssDir);
        rmdir($pluginDir . '/assets');
        rmdir($pluginDir);
    }

    /**
     * Test 8: Verifies that enqueue_editor_assets enqueues Google Material Symbols font.
     */
    public function testEnqueueEditorAssetsEnqueuesGoogleMaterialSymbolsFont(): void
    {
        $pluginDir = sys_get_temp_dir() . '/seriescraft_font_test_' . uniqid();
        $jsDir = $pluginDir . '/assets/js';
        mkdir($jsDir, 0777, true);
        file_put_contents($jsDir . '/editor.js', 'console.log("editor");');

        Functions\when('wp_enqueue_script')->justReturn();

        Functions\expect('wp_enqueue_style')
            ->once()
            ->with(
                'series-craft-material-symbols',
                'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200',
                [],
                null
            );

        $manager = new EnqueueManager($pluginDir, 'https://example.com/plugin');
        $manager->enqueue_editor_assets();

        $this->addToAssertionCount(1);

        unlink($jsDir . '/editor.js');
        rmdir($jsDir);
        rmdir($pluginDir . '/assets');
        rmdir($pluginDir);
    }

    /**
     * Test 9: Verifies that add_editor_styles registers Google font and frontend style.
     */
    public function testAddEditorStylesRegistersGoogleFontAndFrontendStyle(): void
    {
        $pluginDir = sys_get_temp_dir() . '/seriescraft_add_style_test_' . uniqid();
        $cssDir = $pluginDir . '/assets/css';
        mkdir($cssDir, 0777, true);
        file_put_contents($cssDir . '/frontend.css', '/* frontend css */');

        Functions\expect('add_editor_style')
            ->once()
            ->with('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');

        Functions\expect('add_editor_style')
            ->once()
            ->with('https://example.com/plugin/assets/css/frontend.css');

        $manager = new EnqueueManager($pluginDir, 'https://example.com/plugin');
        $manager->add_editor_styles();

        $this->addToAssertionCount(2);

        unlink($cssDir . '/frontend.css');
        rmdir($cssDir);
        rmdir($pluginDir . '/assets');
        rmdir($pluginDir);
    }

    /**
     * Test 10: Verifies that filter_editor_settings injects Google font @import and compiled frontend CSS into settings styles.
     */
    public function testFilterEditorSettingsInjectsMaterialSymbolsAndFrontendCss(): void
    {
        $pluginDir = sys_get_temp_dir() . '/seriescraft_filter_settings_' . uniqid();
        $cssDir = $pluginDir . '/assets/css';
        mkdir($cssDir, 0777, true);
        file_put_contents($cssDir . '/frontend.css', '.sm-series-layout { display: flex; }');

        $manager = new EnqueueManager($pluginDir, 'https://example.com/plugin');
        $result = $manager->filter_editor_settings(['styles' => []]);

        $this->assertNotEmpty($result['styles']);
        $hasFont = false;
        $hasCss = false;
        foreach ($result['styles'] as $styleEntry) {
            if (isset($styleEntry['css']) && str_contains($styleEntry['css'], 'Material+Symbols+Outlined')) {
                $hasFont = true;
            }
            if (isset($styleEntry['css']) && str_contains($styleEntry['css'], '.sm-series-layout')) {
                $hasCss = true;
            }
        }

        $this->assertTrue($hasFont, 'Settings styles should contain Google Material Symbols @import');
        $this->assertTrue($hasCss, 'Settings styles should contain compiled frontend.css');

        unlink($cssDir . '/frontend.css');
        rmdir($cssDir);
        rmdir($pluginDir . '/assets');
        rmdir($pluginDir);
    }
}