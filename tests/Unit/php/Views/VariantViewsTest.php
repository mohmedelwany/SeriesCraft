<?php

declare(strict_types=1);

namespace SeriesCraft\Tests\Unit\Views;

use Brain\Monkey;
use Brain\Monkey\Functions;
use PHPUnit\Framework\TestCase;
use SeriesCraft\Views\Variants\LinkListView;
use SeriesCraft\Views\Variants\LinkGridView;
use SeriesCraft\Views\Variants\MediaListView;
use SeriesCraft\Views\Variants\MediaGridView;

class VariantViewsTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Monkey\setUp();

        // Stub standard WordPress escaping and URL helpers
        Functions\stubs([
            'esc_html'                    => static fn (string $text): string => htmlspecialchars($text, ENT_QUOTES, 'UTF-8'),
            'esc_url'                     => static fn (string $url): string => filter_var($url, FILTER_SANITIZE_URL) ?: '',
            'esc_attr'                    => static fn (string $attr): string => htmlspecialchars($attr, ENT_QUOTES, 'UTF-8'),
            '__'                          => static fn (string $text, string $domain = 'default'): string => $text,
            'plugins_url'                 => static fn (string $path = '', string $plugin = ''): string => 'https://example.com/wp-content/plugins/seriescraft/' . ltrim($path, '/'),
            'apply_filters'               => static fn (string $hook, $value, ...$args) => $value,
            'get_post_thumbnail_id'       => static fn (int $post_id): int => 0,
            'wp_get_attachment_image_url' => static fn (int $attachment_id, string $size = 'thumbnail'): string => '',
        ]);
    }

    protected function tearDown(): void
    {
        Monkey\tearDown();
        parent::tearDown();
    }

    /**
     * @return array<int, array{id: int, title: string, url: string, part_order: int, thumbnail: string|null}>
     */
    private function getSamplePosts(): array
    {
        return [
            [
                'id'         => 101,
                'title'      => 'Clean Architecture Fundamentals',
                'url'        => 'https://example.com/part-1',
                'part_order' => 1,
                'thumbnail'  => 'https://example.com/thumb-1.jpg',
            ],
            [
                'id'         => 102,
                'title'      => 'PostgreSQL and Custom Tables',
                'url'        => 'https://example.com/part-2',
                'part_order' => 2,
                'thumbnail'  => null,
            ],
        ];
    }

    public function testLinkListViewRendersVerticalListWithCurrentPostHighlight(): void
    {
        $view = new LinkListView();
        $posts = $this->getSamplePosts();
        $currentPostId = 101;

        $html = $view->render($posts, $currentPostId);

        $this->assertStringContainsString('seriescraft-layout-link-list', $html);
        $this->assertStringContainsString('sm-link-list', $html);
        $this->assertStringContainsString('sm-link-list__item', $html);
        $this->assertStringContainsString('sm-link-list__icon-wrap', $html);
        $this->assertStringContainsString('sm-link-list__title', $html);
        $this->assertStringContainsString('Clean Architecture Fundamentals', $html);
        $this->assertStringContainsString('is-current', $html);
        $this->assertStringContainsString('Reading Now', $html);
        $this->assertStringContainsString('https://example.com/part-2', $html);
    }

    public function testLinkGridViewRendersGridLayoutClasses(): void
    {
        $view = new LinkGridView();
        $posts = $this->getSamplePosts();
        $currentPostId = 102;

        $html = $view->render($posts, $currentPostId);

        $this->assertStringContainsString('seriescraft-layout-link-grid', $html);
        $this->assertStringContainsString('sm-link-grid', $html);
        $this->assertStringContainsString('sm-link-grid__grid', $html);
        $this->assertStringContainsString('sm-link-grid__card', $html);
        $this->assertStringContainsString('sm-link-grid__card--current', $html);
        $this->assertStringContainsString('sm-link-grid__icon', $html);
        $this->assertStringContainsString('sm-link-grid__title', $html);
        $this->assertStringContainsString('PostgreSQL and Custom Tables', $html);
        $this->assertStringContainsString('is-current', $html);
        $this->assertStringNotContainsString('seriescraft-layout-link-list', $html);
    }

    public function testMediaListViewRendersThumbnailsAndPlaceholders(): void
    {
        $view = new MediaListView();
        $posts = $this->getSamplePosts();
        $currentPostId = 101;

        $html = $view->render($posts, $currentPostId);

        $this->assertStringContainsString('seriescraft-layout-media-list', $html);
        $this->assertStringContainsString('sm-media-list', $html);
        $this->assertStringContainsString('sm-media-list__item', $html);
        $this->assertStringContainsString('sm-media-list__thumbnail', $html);
        $this->assertStringContainsString('sm-media-list__title', $html);
        $this->assertStringContainsString('https://example.com/thumb-1.jpg', $html);
        $this->assertStringContainsString('sc-media-list__image', $html);
        $this->assertStringContainsString('sc-media-list__image--placeholder', $html);
        $this->assertStringContainsString('placeholder.png', $html);
        $this->assertStringContainsString('loading="lazy"', $html);
    }

    public function testMediaGridViewRendersResponsiveMediaCards(): void
    {
        $view = new MediaGridView();
        $posts = $this->getSamplePosts();
        $currentPostId = 101;

        $html = $view->render($posts, $currentPostId);

        $this->assertStringContainsString('seriescraft-layout-media-grid', $html);
        $this->assertStringContainsString('sm-media-grid', $html);
        $this->assertStringContainsString('sm-media-grid__grid', $html);
        $this->assertStringContainsString('sm-media-grid-card', $html);
        $this->assertStringContainsString('sm-media-grid-card--current', $html);
        $this->assertStringContainsString('sm-media-grid__header', $html);
        $this->assertStringContainsString('sm-media-grid__title', $html);
        $this->assertStringContainsString('Clean Architecture Fundamentals', $html);
        $this->assertStringContainsString('seriescraft-card', $html);
        $this->assertStringContainsString('sc-media-grid__image', $html);
        $this->assertStringContainsString('sc-media-grid__image--placeholder', $html);
        $this->assertStringContainsString('placeholder.png', $html);
        $this->assertStringContainsString('loading="lazy"', $html);
    }

    public function testPlaceholderImageUrlFilterCanCustomizeFallback(): void
    {
        Functions\when('apply_filters')->alias(static function (string $hook, $value, ...$args) {
            if ($hook === 'seriescraft_placeholder_image_url') {
                return 'https://example.com/custom-placeholder.jpg';
            }
            return $value;
        });

        $view = new MediaListView();
        $posts = [
            [
                'id'         => 105,
                'title'      => 'Custom Placeholder Test',
                'url'        => 'https://example.com/part-5',
                'part_order' => 1,
                'thumbnail'  => null,
            ],
        ];

        $html = $view->render($posts, 105);

        $this->assertStringContainsString('https://example.com/custom-placeholder.jpg', $html);
    }

    public function testMediaListViewResolvesImageBlockWhenThumbnailIsNull(): void
    {
        $mockPost = (object) [
            'ID'           => 108,
            'post_content' => '<!-- wp:image {"url":"https://example.com/block-fallback.png"} -->',
        ];
        Functions\when('get_post')->justReturn($mockPost);
        Functions\when('has_blocks')->justReturn(false);

        $view = new MediaListView();
        $posts = [
            [
                'id'         => 108,
                'title'      => 'Block Image Fallback Post',
                'url'        => 'https://example.com/part-8',
                'part_order' => 1,
                'thumbnail'  => null,
            ],
        ];

        $html = $view->render($posts, 108);

        $this->assertStringContainsString('https://example.com/block-fallback.png', $html);
        $this->assertStringNotContainsString('placeholder.png', $html);
    }
}