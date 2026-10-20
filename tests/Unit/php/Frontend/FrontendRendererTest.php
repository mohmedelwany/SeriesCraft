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
            '__'         => static fn (string $text, string $domain = 'default'): string => $text,
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
}