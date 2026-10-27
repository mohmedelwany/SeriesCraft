<?php

declare(strict_types=1);

namespace SeriesCraft\Tests\Unit\php\Core;

use Brain\Monkey;
use Brain\Monkey\Actions;
use Brain\Monkey\Functions;
use PHPUnit\Framework\TestCase;
use SeriesCraft\Assets\EnqueueManager;
use SeriesCraft\Core\Main;
use SeriesCraft\Hooks\SavePostSubscriber;
use SeriesCraft\Taxonomy\SeriesTaxonomy;

class MainTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Monkey\setUp();

        if (!defined('SCFT_PLUGIN_DIR')) {
            define('SCFT_PLUGIN_DIR', '/tmp/seriescraft/');
        }
        if (!defined('SCFT_PLUGIN_URL')) {
            define('SCFT_PLUGIN_URL', 'https://example.com/wp-content/plugins/seriescraft/');
        }

        Functions\stubs([
            'is_admin' => false,
            'did_action' => false,
        ]);
    }

    protected function tearDown(): void
    {
        Monkey\tearDown();
        parent::tearDown();
    }

    /**
     * Test 1: Verifies that Main::init registers EnqueueManager.
     */
    public function testInitRegistersEnqueueManager(): void
    {
        $mockEnqueueManager = $this->createMock(EnqueueManager::class);
        $mockEnqueueManager->expects($this->once())
            ->method('register');

        $main = new Main($mockEnqueueManager);
        $main->init();
    }

    /**
     * Test 2: Verifies that Main::init registers taxonomy on the WordPress init action hook.
     */
    public function testInitRegistersTaxonomyOnAction(): void
    {
        $mockEnqueueManager = $this->createMock(EnqueueManager::class);
        $mockTaxonomy = $this->createMock(SeriesTaxonomy::class);

        Actions\expectAdded('init')
            ->once()
            ->with([$mockTaxonomy, 'register']);

        $main = new Main($mockEnqueueManager, $mockTaxonomy);
        $main->init();

        $this->addToAssertionCount(1);
    }

    /**
     * Test 3: Verifies that Main::init hooks register_rest_routes on rest_api_init.
     */
    public function testInitRegistersRestRoutesOnAction(): void
    {
        $mockEnqueueManager = $this->createMock(EnqueueManager::class);
        $main = new Main($mockEnqueueManager);

        Actions\expectAdded('rest_api_init')
            ->once()
            ->with([$main, 'register_rest_routes']);

        $main->init();

        $this->addToAssertionCount(1);
    }

    /**
     * Test 4: Verifies that Main::init registers SavePostSubscriber.
     */
    public function testInitRegistersSavePostSubscriber(): void
    {
        $mockEnqueueManager = $this->createMock(EnqueueManager::class);
        $mockTaxonomy = $this->createMock(SeriesTaxonomy::class);
        $mockSavePostSubscriber = $this->createMock(SavePostSubscriber::class);

        $mockSavePostSubscriber->expects($this->once())
            ->method('register');

        $main = new Main($mockEnqueueManager, $mockTaxonomy, $mockSavePostSubscriber);
        $main->init();
    }

    /**
     * Test 5: Verifies that Main::init registers FrontendRenderer on the_content filter.
     */
    public function testInitRegistersFrontendRendererOnTheContentFilter(): void
    {
        $frontendRenderer = \Mockery::mock(\SeriesCraft\Frontend\FrontendRenderer::class);
        $main = new \SeriesCraft\Core\Main(null, null, null, $frontendRenderer);

        \Brain\Monkey\Filters\expectAdded('the_content')
            ->once()
            ->with([$frontendRenderer, 'filter_content']);

        $main->init();

        $this->addToAssertionCount(1);
    }
}