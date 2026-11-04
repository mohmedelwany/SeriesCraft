<?php

declare(strict_types=1);

namespace SeriesCraft\Tests\Unit\php\Api;

use Brain\Monkey;
use Brain\Monkey\Functions;
use PHPUnit\Framework\TestCase;
use SeriesCraft\Api\Controllers\SeriesRestController;
use SeriesCraft\Database\Repositories\SeriesRepositoryInterface;
use WP_REST_Request;

class SeriesRestControllerTest extends TestCase
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
     * Test get_series_posts queries valid post statuses (publish, draft, pending).
     */
    public function testGetSeriesPostsQueriesAllValidPostStatuses(): void
    {
        $termId = 12;

        Functions\expect('get_term')
            ->once()
            ->with($termId, 'series')
            ->andReturn((object) ['term_id' => $termId, 'name' => 'Test Series']);

        $mockPost1 = (object) ['ID' => 101, 'post_title' => 'Post One', 'post_status' => 'publish'];
        $mockPost2 = (object) ['ID' => 102, 'post_title' => 'Post Two', 'post_status' => 'draft'];
        $mockPost3 = (object) ['ID' => 103, 'post_title' => 'Post Three', 'post_status' => 'pending'];

        $mockRepo = $this->createMock(SeriesRepositoryInterface::class);
        $mockRepo->expects($this->once())
            ->method('get_series_posts')
            ->with($termId, ['publish', 'draft', 'pending'])
            ->willReturn([$mockPost1, $mockPost2, $mockPost3]);

        Functions\when('get_the_title')->returnArg();

        $controller = new SeriesRestController($mockRepo);
        $request = new WP_REST_Request(['id' => $termId]);

        $response = $controller->get_series_posts($request);

        $this->assertEquals(200, $response->get_status());
        $data = $response->get_data();
        $this->assertCount(3, $data);
        $this->assertEquals(101, $data[0]['id']);
        $this->assertEquals('publish', $data[0]['status']);
        $this->assertEquals(102, $data[1]['id']);
        $this->assertEquals('draft', $data[1]['status']);
        $this->assertEquals(103, $data[2]['id']);
        $this->assertEquals('pending', $data[2]['status']);
    }
}
