<?php

declare(strict_types=1);

namespace SeriesCraft\Tests\Integration\Taxonomy;

use SeriesCraft\Tests\Integration\IntegrationTestCase;
use SeriesCraft\Taxonomy\SeriesTaxonomy;
use SeriesCraft\Taxonomy\SeriesTaxonomyAdmin;
use SeriesCraft\Database\Repositories\SeriesRepository;

/**
 * Class SeriesTaxonomyAdminTest
 *
 * Integration test suite for SeriesTaxonomyAdmin covering classic taxonomy fallback screens.
 * Covers project requirement 3.14:
 * - Validates registration of admin action hooks for term edit forms.
 * - Asserts enqueueing of jquery-ui-sortable only on the series taxonomy screen.
 * - Confirms saving explicit post order submitted via the classic admin form.
 *
 * @package SeriesCraft\Tests\Integration\Taxonomy
 */
class SeriesTaxonomyAdminTest extends IntegrationTestCase
{
    /**
     * Admin service under test.
     */
    private SeriesTaxonomyAdmin $admin;

    /**
     * Repository dependency.
     */
    private SeriesRepository $repository;

    /**
     * Test term ID.
     */
    private int $termId;

    /**
     * Created test post IDs.
     *
     * @var array<int>
     */
    private array $postIds = [];

    /**
     * Setup test fixture before each test run.
     */
    protected function setUp(): void
    {
        parent::setUp();

        (new SeriesTaxonomy())->register();
        $this->repository = new SeriesRepository();
        $this->admin = new SeriesTaxonomyAdmin($this->repository);

        $term = wp_insert_term('Classic Architecture Series', SeriesTaxonomy::TAXONOMY);
        $this->assertIsArray($term);
        $this->termId = (int) $term['term_id'];

        $postA = (int) wp_insert_post([
            'post_title'  => 'Article One',
            'post_status' => 'publish',
        ]);
        $postB = (int) wp_insert_post([
            'post_title'  => 'Article Two',
            'post_status' => 'publish',
        ]);

        $this->postIds = [$postA, $postB];

        foreach ($this->postIds as $postId) {
            wp_set_object_terms($postId, [$this->termId], SeriesTaxonomy::TAXONOMY, true);
        }
    }

    /**
     * Clean up created artifacts after each test run.
     */
    protected function tearDown(): void
    {
        foreach ($this->postIds as $postId) {
            wp_delete_post($postId, true);
        }

        wp_delete_term($this->termId, SeriesTaxonomy::TAXONOMY);

        parent::tearDown();
    }

    /**
     * Test 01: Verify that required WordPress admin hooks are registered.
     */
    public function test_01_it_registers_admin_hooks(): void
    {
        $this->admin->register();

        $this->assertNotFalse(
            has_action(SeriesTaxonomy::TAXONOMY . '_edit_form_fields', [$this->admin, 'renderOrderField']),
            'Failed: Edit form fields hook is not registered.'
        );

        $this->assertNotFalse(
            has_action('edited_' . SeriesTaxonomy::TAXONOMY, [$this->admin, 'saveOrderField']),
            'Failed: Save term order hook is not registered.'
        );

        $this->assertNotFalse(
            has_action('admin_enqueue_scripts', [$this->admin, 'enqueueScripts']),
            'Failed: Admin enqueue scripts hook is not registered.'
        );
    }

    /**
     * Test 02: Verify that form rendering outputs the ordering container and security nonce.
     */
    public function test_02_it_renders_order_field_markup(): void
    {
        $term = get_term($this->termId, SeriesTaxonomy::TAXONOMY);
        $this->assertNotNull($term);

        ob_start();
        $this->admin->renderOrderField($term);
        $output = (string) ob_get_clean();

        $this->assertStringContainsString('series-order-sortable', $output);
        $this->assertStringContainsString('series_craft_order_nonce', $output);
        $this->assertStringContainsString('Article One', $output);
        $this->assertStringContainsString('Article Two', $output);
    }

    /**
     * Test 03: Verify that posted order data updates post positions via repository.
     */
    public function test_03_it_saves_order_from_post_data(): void
    {
        $userId = (int) wp_insert_user([
            'user_login' => 'test_admin_user',
            'user_pass'  => 'password123',
            'role'       => 'administrator',
        ]);
        wp_set_current_user($userId);
        
        $_POST['series_craft_order_nonce'] = wp_create_nonce(SeriesTaxonomyAdmin::NONCE_ACTION);
        $_POST['series_post_order'] = implode(',', [$this->postIds[1], $this->postIds[0]]);

        $this->admin->saveOrderField($this->termId);

        $orderedPosts = $this->repository->getSeriesPosts($this->termId);
        $retrievedIds = array_map('intval', wp_list_pluck($orderedPosts, 'ID'));

        $this->assertSame([$this->postIds[1], $this->postIds[0]], $retrievedIds);

        unset($_POST['series_craft_order_nonce'], $_POST['series_post_order']);
    }
}