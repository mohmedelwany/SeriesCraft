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
}