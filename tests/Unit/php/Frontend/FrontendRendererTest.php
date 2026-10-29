<?php

declare(strict_types=1);

namespace SeriesCraft\Tests\Unit\Frontend;

use Brain\Monkey;
use Brain\Monkey\Functions;
use Mockery;
use PHPUnit\Framework\TestCase;
use SeriesCraft\Frontend\FrontendRenderer;
use SeriesCraft\Services\NavigationService;
use SeriesCraft\Services\StyleSanitizer;
use SeriesCraft\Views\AccordionLayout;
use SeriesCraft\Database\Repositories\SeriesRepositoryInterface;

class FrontendRendererTest extends TestCase
{
    private $repository;
    private $navigationService;
    private $styleSanitizer;
    private $accordionLayout;
    private FrontendRenderer $renderer;

    protected function setUp(): void
    {
        parent::setUp();
        Monkey\setUp();

        $this->repository = Mockery::mock(SeriesRepositoryInterface::class);
        $this->navigationService = Mockery::mock(NavigationService::class);
        $this->styleSanitizer = Mockery::mock(StyleSanitizer::class);
        $this->accordionLayout = Mockery::mock(AccordionLayout::class);

        Functions\stubs([
            'is_single' => static fn (): bool => true,
            'get_the_ID' => static fn (): int => 100,
            'get_permalink'  => static fn (int $id): string => 'https://example.com/post/' . $id,
            'esc_html'   => static fn (string $text): string => htmlspecialchars($text, ENT_QUOTES, 'UTF-8'),
            'esc_url'    => static fn (string $url): string => filter_var($url, FILTER_SANITIZE_URL) ?: '',
            'esc_attr'   => static fn (string $attr): string => htmlspecialchars($attr, ENT_QUOTES, 'UTF-8'),
            '__'                  => static fn (string $text, string $domain = 'default'): string => $text,
            'esc_html__'          => static fn (string $text, string $domain = 'default'): string => htmlspecialchars($text, ENT_QUOTES, 'UTF-8'),
            'sanitize_text_field' => static fn (string $str): string => trim(strip_tags($str)),
            'has_block'                   => static fn (string $block_name, string $content): bool => false !== strpos($content, $block_name),
            'is_admin'                    => static fn (): bool => false,
            'get_post_thumbnail_id'       => static fn (int $id): int => 0,
            'wp_get_attachment_image_url' => static fn (int $id, string $size = 'thumbnail'): string => '',
            'get_the_title'               => static fn (int $id = 0): string => 'Post ' . $id,
        ]);

        $this->renderer = new FrontendRenderer(
            $this->repository,
            $this->navigationService,
            $this->styleSanitizer,
            $this->accordionLayout
        );
    }

    protected function tearDown(): void
    {
        Mockery::close();
        Monkey\tearDown();
        parent::tearDown();
    }

    public function testFilterContentReturnsOriginalContentInAdminContext(): void
    {
        Functions\when('is_admin')->justReturn(true);

        $content = '<p>Post content in editor or admin context.</p>';
        $result = $this->renderer->filter_content($content);

        $this->assertSame($content, $result);
    }

    public function testRenderContentReturnsOriginalContentIfNotSinglePost(): void
    {
        Functions\when('is_single')->justReturn(false);

        $content = '<p>This is standard blog archive content.</p>';
        $result = $this->renderer->filter_content($content);

        $this->assertSame($content, $result);
    }

    public function testRenderContentReturnsOriginalContentIfPostHasNoSeries(): void
    {
        $this->repository->shouldReceive('getSeriesForPost')
            ->once()
            ->with(100)
            ->andReturn([]);

        $content = '<p>Standalone post content without series.</p>';
        $result = $this->renderer->filter_content($content);

        $this->assertSame($content, $result);
    }

    public function testRenderContentInjectsSingleSeriesBoxAndStyles(): void
    {
        $seriesData = [
            [
                'id'     => 5,
                'name'   => 'PHP Architecture Series',
                'layout' => 'link-list',
                'styles' => ['title_color' => '#112233'],
                'posts'  => [
                    ['id' => 100, 'title' => 'Part 1', 'url' => 'https://example.com/1', 'part_order' => 1, 'thumbnail' => null],
                    ['id' => 101, 'title' => 'Part 2', 'url' => 'https://example.com/2', 'part_order' => 2, 'thumbnail' => null],
                ],
            ],
        ];

        $this->repository->shouldReceive('getSeriesForPost')
            ->once()
            ->with(100)
            ->andReturn($seriesData);

        $this->navigationService->shouldReceive('get_navigation_context')
            ->once()
            ->andReturn([
                'current_part'   => 1,
                'total_parts'    => 2,
                'position_label' => 'Part 1 of 2',
                'is_first'       => true,
                'is_last'        => false,
                'previous_post'  => null,
                'next_post'      => ['id' => 101, 'title' => 'Part 2', 'part_order' => 2],
            ]);

        $this->styleSanitizer->shouldReceive('generate_inline_css')
            ->once()
            ->with(5, ['title_color' => '#112233'])
            ->andReturn('.seriescraft-series-5 { --sc-title-color: #112233; }');

        $content = '<p>Article Body Text</p>';
        $result = $this->renderer->filter_content($content);

        $this->assertStringContainsString('<style>.seriescraft-series-5 { --sc-title-color: #112233; }</style>', $result);
        $this->assertStringContainsString('seriescraft-wrapper', $result);
        $this->assertStringContainsString('PHP Architecture Series', $result);
        $this->assertStringContainsString('Part 1 of 2', $result);
        $this->assertStringContainsString('<p>Article Body Text</p>', $result);
    }

    public function testRenderContentSwitchesToAccordionWhenMultipleSeriesExist(): void
    {
        $seriesData = [
            [
                'id'     => 1,
                'name'   => 'First Series',
                'layout' => 'link-list',
                'styles' => [],
                'posts'  => [['id' => 100, 'title' => 'Part 1', 'url' => 'https://example.com/1', 'part_order' => 1, 'thumbnail' => null]],
            ],
            [
                'id'     => 2,
                'name'   => 'Second Series',
                'layout' => 'link-list',
                'styles' => [],
                'posts'  => [['id' => 100, 'title' => 'Part 1', 'url' => 'https://example.com/1', 'part_order' => 1, 'thumbnail' => null]],
            ],
        ];

        $this->repository->shouldReceive('getSeriesForPost')
            ->once()
            ->with(100)
            ->andReturn($seriesData);

        $this->navigationService->shouldReceive('get_navigation_context')
            ->twice()
            ->andReturn([
                'current_part'   => 1,
                'total_parts'    => 1,
                'position_label' => 'Part 1 of 1',
                'is_first'       => true,
                'is_last'        => true,
                'previous_post'  => null,
                'next_post'      => null,
            ]);

        $this->styleSanitizer->shouldReceive('generate_inline_css')
            ->twice()
            ->andReturn('');

        $this->accordionLayout->shouldReceive('render')
            ->once()
            ->andReturn('<div class="seriescraft-accordion">Accordion Mock Content</div>');

        $content = '<p>Article Body Text</p>';
        $result = $this->renderer->filter_content($content);

        $this->assertStringContainsString('Accordion Mock Content', $result);
        $this->assertStringContainsString('<p>Article Body Text</p>', $result);
    }

    public function testRenderSeriesBlockReturnsSeriesMarkup(): void
    {
        $seriesData = [
            [
                'id'     => 9,
                'name'   => 'Block Driven Series',
                'layout' => 'link-list',
                'styles' => [],
                'posts'  => [['id' => 100, 'title' => 'Part 1', 'url' => 'https://example.com/1', 'part_order' => 1, 'thumbnail' => null]],
            ],
        ];

        $this->repository->shouldReceive('getSeriesForPost')
            ->once()
            ->with(100)
            ->andReturn($seriesData);

        $this->navigationService->shouldReceive('get_navigation_context')
            ->once()
            ->andReturn([
                'current_part'   => 1,
                'total_parts'    => 1,
                'position_label' => 'Part 1 of 1',
                'is_first'       => true,
                'is_last'        => true,
                'previous_post'  => null,
                'next_post'      => null,
            ]);

        $this->styleSanitizer->shouldReceive('generate_inline_css')
            ->once()
            ->with(9, [])
            ->andReturn('');

        $output = $this->renderer->render_series_block();

        $this->assertStringContainsString('seriescraft-wrapper', $output);
        $this->assertStringContainsString('Block Driven Series', $output);
    }

    public function testFilterContentDoesNotDuplicateWhenBlockAlreadyInContent(): void
    {
        $content = '<!-- wp:seriescraft/series-list --><div>List</div><!-- /wp:seriescraft/series-list --><p>Content</p>';

        $this->repository->shouldReceive('getSeriesForPost')->never();

        $result = $this->renderer->filter_content($content);

        $this->assertSame($content, $result);
    }

    public function testRenderSeriesBlockWithExplicitSeriesIdAttribute(): void
    {
        $mockPost = new \stdClass();
        $mockPost->ID = 100;
        $mockPost->post_title = 'First Part';

        Functions\when('get_term')->justReturn((object) ['term_id' => 15, 'name' => 'GraphQL Masterclass']);
        Functions\when('get_term_meta')->justReturn([
            'layout' => 'link-list',
            'custom_styles' => ['button_color' => '#6366f1'],
        ]);
        Functions\when('get_the_title')->justReturn('First Part');
        Functions\when('get_post_thumbnail_id')->justReturn(0);

        $this->repository->shouldReceive('get_series_posts')
            ->once()
            ->with(15)
            ->andReturn([$mockPost]);

        $this->navigationService->shouldReceive('get_navigation_context')
            ->once()
            ->andReturn([
                'current_part'   => 1,
                'total_parts'    => 1,
                'position_label' => 'Part 1 of 1',
                'is_first'       => true,
                'is_last'        => true,
                'previous_post'  => null,
                'next_post'      => null,
            ]);

        $this->styleSanitizer->shouldReceive('generate_inline_css')
            ->once()
            ->with(15, ['button_color' => '#6366f1'])
            ->andReturn('.seriescraft-series-15 { --sc-button-color: #6366f1; }');

        $output = $this->renderer->render_series_block(['seriesId' => 15, 'postId' => 100]);

        $this->assertStringContainsString('seriescraft-wrapper', $output);
        $this->assertStringContainsString('GraphQL Masterclass', $output);
        $this->assertStringContainsString('data-sm-series-term-id="15"', $output);
    }

    public function testRenderSeriesBlockContext2StandaloneListing(): void
    {
        $mockTerm = (object) [
            'term_id' => 20,
            'name' => 'Fullstack Series',
            'description' => 'A complete guide to fullstack dev.',
            'count' => 3,
        ];

        Functions\when('get_terms')->justReturn([$mockTerm]);
        Functions\when('get_term_link')->justReturn('https://example.com/series/fullstack');
        Functions\when('is_wp_error')->justReturn(false);
        Functions\when('_n')->alias(fn ($s, $p, $c) => $c === 1 ? "$c Part" : "$c Parts");

        $output = $this->renderer->render_series_block(['mode' => 'top', 'limit' => 5, 'postId' => 0]);

        $this->assertStringContainsString('sc-series-card-grid', $output);
        $this->assertStringContainsString('Fullstack Series', $output);
        $this->assertStringContainsString('3 Parts', $output);
        $this->assertStringContainsString('A complete guide to fullstack dev.', $output);
    }

    public function testRenderSeriesBlockContext3EditorCanvasNoSeries(): void
    {
        $this->repository->shouldReceive('getSeriesForPost')
            ->once()
            ->with(200)
            ->andReturn([]);

        $_GET['preview_key'] = '1';

        $output = $this->renderer->render_series_block(['postId' => 200]);

        unset($_GET['preview_key']);

        $this->assertStringContainsString('sc-series-empty-preview', $output);
        $this->assertStringContainsString('add a series in the sidebar', $output);
    }

    public function testRenderSeriesBlockRendersLivePreviewWithPreviewSeriesIdAndLiveTitle(): void
    {
        $mockTerm = (object) [
            'term_id' => 30,
            'name'    => 'Vue.js Series',
        ];
        Functions\when('get_term')->justReturn($mockTerm);
        Functions\when('get_term_meta')->justReturn(['layout' => 'link-list']);
        Functions\when('wp_unslash')->alias(static fn ($val) => $val);

        $mockPost1 = (object) [
            'ID'         => 301,
            'post_title' => 'Vue Basics',
        ];
        $this->repository->shouldReceive('get_series_posts')
            ->once()
            ->with(30)
            ->andReturn([$mockPost1]);

        $this->navigationService->shouldReceive('get_navigation_context')
            ->once()
            ->with(-1, Mockery::on(function ($parts) {
                return count($parts) === 2 && $parts[1]['title'] === 'Reactive Architecture' && $parts[1]['id'] === -1;
            }))
            ->andReturn([
                'current_part'   => 2,
                'total_parts'    => 2,
                'position_label' => 'Part 2 of 2',
                'is_first'       => false,
                'is_last'        => true,
                'previous_post'  => ['id' => 301, 'title' => 'Vue Basics', 'part_order' => 1],
                'next_post'      => null,
            ]);

        $this->styleSanitizer->shouldReceive('generate_inline_css')
            ->once()
            ->with(30, Mockery::any())
            ->andReturn('');

        $_GET['preview_series_id'] = '30';
        $_GET['preview_title'] = 'Reactive Architecture';

        $output = $this->renderer->render_series_block(['postId' => 0]);

        unset($_GET['preview_series_id'], $_GET['preview_title']);

        $this->assertStringContainsString('Vue.js Series', $output);
        $this->assertStringContainsString('Reactive Architecture', $output);
        $this->assertStringContainsString('Part 2 of 2', $output);
    }

    public function testRenderSeriesBlockRendersLivePreviewWithPreviewImage(): void
    {
        $mockTerm = (object) [
            'term_id' => 30,
            'name'    => 'Vue.js Series',
        ];
        Functions\when('get_term')->justReturn($mockTerm);
        Functions\when('get_term_meta')->justReturn(['layout' => 'media-list']);
        Functions\when('wp_unslash')->alias(static fn ($val) => $val);
        Functions\when('esc_url_raw')->alias(static fn ($val) => $val);

        $mockPost1 = (object) [
            'ID'           => 301,
            'post_title'   => 'Vue Basics',
            'post_content' => '<p>No image here</p>',
        ];
        $this->repository->shouldReceive('get_series_posts')
            ->once()
            ->with(30)
            ->andReturn([$mockPost1]);

        $this->navigationService->shouldReceive('get_navigation_context')
            ->once()
            ->with(-1, Mockery::on(function ($parts) {
                return count($parts) === 2 && $parts[1]['thumbnail'] === 'https://example.com/canvas-image.png';
            }))
            ->andReturn([
                'current_part'   => 2,
                'total_parts'    => 2,
                'position_label' => 'Part 2 of 2',
                'is_first'       => false,
                'is_last'        => true,
                'previous_post'  => ['id' => 301, 'title' => 'Vue Basics', 'part_order' => 1],
                'next_post'      => null,
            ]);

        $this->styleSanitizer->shouldReceive('generate_inline_css')
            ->once()
            ->with(30, Mockery::any())
            ->andReturn('');

        $_GET['preview_series_id'] = '30';
        $_GET['preview_title'] = 'Active Post';
        $_GET['preview_image'] = 'https://example.com/canvas-image.png';

        $output = $this->renderer->render_series_block(['postId' => 0]);

        unset($_GET['preview_series_id'], $_GET['preview_title'], $_GET['preview_image']);

        $this->assertStringContainsString('https://example.com/canvas-image.png', $output);
    }
}