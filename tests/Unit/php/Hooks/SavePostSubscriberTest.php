<?php

declare(strict_types=1);

namespace SeriesCraft\Tests\Unit\php\Hooks;

use Brain\Monkey;
use Brain\Monkey\Actions;
use Brain\Monkey\Functions;
use PHPUnit\Framework\TestCase;
use SeriesCraft\Hooks\SavePostSubscriber;
use wpdb;

/**
 * Unit test suite for SavePostSubscriber.
 *
 * Verifies post-to-series association on save_post:
 * 1. Hook registration on save_post with priority 20.
 * 2. Calling wp_set_object_terms when series term is submitted.
 * 3. Updating the custom junction table ({$wpdb->prefix}series_craft_posts) with post_id, series_id, and sort_order.
 */
class SavePostSubscriberTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Monkey\setUp();

        Functions\when('get_term')->justReturn(null);
    }

    protected function tearDown(): void
    {
        unset($_POST['series'], $_POST['seriescraft_series_id']);
        Monkey\tearDown();
        parent::tearDown();
    }

    /**
     * Test 1: Verifies that register method hooks into save_post at priority 20.
     */
    public function testRegisterHooksSavePostAction(): void
    {
        $mockWpdb = $this->createMock(wpdb::class);
        $subscriber = new SavePostSubscriber($mockWpdb);

        Actions\expectAdded('save_post')
            ->once()
            ->with([$subscriber, 'on_save_post'], 20, 2);

        $subscriber->register();

        $this->addToAssertionCount(1);
    }

    /**
     * Test 2: Verifies that on_save_post associates post to series and updates junction table with part order.
     */
    public function testOnSavePostAssociatesSeriesAndUpdatesJunctionTable(): void
    {
        $postId = 101;
        $seriesId = 5;
        $_POST['series'] = [$seriesId];
        $post = (object) [
            'ID' => $postId,
            'post_type' => 'post',
            'post_status' => 'publish',
        ];

        // Ensure not an autosave or revision
        Functions\when('wp_is_post_revision')->justReturn(false);
        Functions\when('wp_is_post_autosave')->justReturn(false);

        // Expect terms to be assigned or retrieved
        Functions\expect('wp_get_object_terms')
            ->once()
            ->with($postId, 'series', ['fields' => 'ids'])
            ->andReturn([$seriesId]);

        // Expect wp_set_object_terms to ensure taxonomy association
        Functions\expect('wp_set_object_terms')
            ->once()
            ->with($postId, [$seriesId], 'series');

        // Mock wpdb to verify junction table insert with post_id, series_id, and sort_order
        $mockWpdb = $this->createMock(wpdb::class);
        $mockWpdb->prefix = 'wp_';

        // Expect check for existing order in junction table (null) followed by max order ('2')
        $mockWpdb->expects($this->exactly(2))
            ->method('get_var')
            ->willReturnOnConsecutiveCalls(null, '2');

        // Expect insert into custom junction table wp_series_craft_posts
        $mockWpdb->expects($this->once())
            ->method('insert')
            ->with(
                'wp_series_craft_posts',
                $this->callback(function ($data) use ($postId, $seriesId) {
                    return isset($data['post_id'], $data['series_id'], $data['sort_order'])
                        && $data['post_id'] === $postId
                        && $data['series_id'] === $seriesId
                        && $data['sort_order'] >= 1;
                }),
                ['%d', '%d', '%d', '%s']
            )
            ->willReturn(1);

        $subscriber = new SavePostSubscriber($mockWpdb);
        $subscriber->on_save_post($postId, $post);
    }

    /**
     * Test 3: Verifies that register method also hooks set_object_terms at priority 20.
     */
    public function testRegisterHooksSetObjectTermsAction(): void
    {
        $mockWpdb = $this->createMock(wpdb::class);
        $subscriber = new SavePostSubscriber($mockWpdb);

        Actions\expectAdded('set_object_terms')
            ->once()
            ->with([$subscriber, 'on_set_object_terms'], 20, 4);

        $subscriber->register();

        $this->addToAssertionCount(1);
    }

    /**
     * Test 4: Verifies that on_save_post handles manual $_POST['series'] submission.
     */
    public function testOnSavePostWithManualPostSeriesInput(): void
    {
        $postId = 202;
        $seriesId = 8;
        $_POST['series'] = [$seriesId];

        Functions\when('wp_is_post_revision')->justReturn(false);
        Functions\when('wp_is_post_autosave')->justReturn(false);

        // Expect manual wp_set_object_terms call from $_POST
        Functions\expect('wp_set_object_terms')
            ->with($postId, [$seriesId], 'series')
            ->atLeast()->once();

        Functions\expect('wp_get_object_terms')
            ->once()
            ->with($postId, 'series', ['fields' => 'ids'])
            ->andReturn([$seriesId]);

        $mockWpdb = $this->createMock(wpdb::class);
        $mockWpdb->prefix = 'wp_';
        $mockWpdb->expects($this->exactly(2))
            ->method('get_var')
            ->willReturnOnConsecutiveCalls(null, '0');

        $mockWpdb->expects($this->once())
            ->method('insert')
            ->willReturn(1);

        $subscriber = new SavePostSubscriber($mockWpdb);
        $subscriber->on_save_post($postId, (object) ['ID' => $postId]);

        unset($_POST['series']);
    }

    /**
     * Test 5: Verifies that on_save_post removes rows from junction table when series is unassigned.
     */
    public function testOnSavePostUnassignsSeriesWhenNoneAssigned(): void
    {
        $postId = 303;

        Functions\when('wp_is_post_revision')->justReturn(false);
        Functions\when('wp_is_post_autosave')->justReturn(false);

        Functions\expect('wp_get_object_terms')
            ->once()
            ->with($postId, 'series', ['fields' => 'ids'])
            ->andReturn([]);

        $mockWpdb = $this->createMock(wpdb::class);
        $mockWpdb->prefix = 'wp_';

        // Expect delete from junction table for post_id
        $mockWpdb->expects($this->once())
            ->method('delete')
            ->with(
                'wp_series_craft_posts',
                ['post_id' => $postId],
                ['%d']
            )
            ->willReturn(1);

        $subscriber = new SavePostSubscriber($mockWpdb);
        $subscriber->on_save_post($postId, (object) ['ID' => $postId]);
    }

    /**
     * Test 6: Verifies that on_set_object_terms syncs the junction table for series taxonomy.
     */
    public function testOnSetObjectTermsSyncsJunctionTable(): void
    {
        $postId = 404;
        $seriesId = 15;

        Functions\expect('wp_get_object_terms')
            ->once()
            ->with($postId, 'series', ['fields' => 'ids'])
            ->andReturn([$seriesId]);

        $mockWpdb = $this->createMock(wpdb::class);
        $mockWpdb->prefix = 'wp_';
        $mockWpdb->expects($this->exactly(2))
            ->method('get_var')
            ->willReturnOnConsecutiveCalls(null, '4');

        $mockWpdb->expects($this->once())
            ->method('insert')
            ->willReturn(1);

        $subscriber = new SavePostSubscriber($mockWpdb);
        $subscriber->on_set_object_terms($postId, [$seriesId], [50], 'series');
    }
}
