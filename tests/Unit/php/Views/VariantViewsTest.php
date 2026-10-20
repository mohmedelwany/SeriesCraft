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
            'esc_html' => static fn (string $text): string => htmlspecialchars($text, ENT_QUOTES, 'UTF-8'),
            'esc_url'  => static fn (string $url): string => filter_var($url, FILTER_SANITIZE_URL) ?: '',
            'esc_attr' => static fn (string $attr): string => htmlspecialchars($attr, ENT_QUOTES, 'UTF-8'),
            '__'       => static fn (string $text, string $domain = 'default'): string => $text,
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
        $this->assertStringContainsString('https://example.com/thumb-1.jpg', $html);
        $this->assertStringContainsString('seriescraft-media-placeholder', $html);
    }

    public function testMediaGridViewRendersResponsiveMediaCards(): void
    {
        $view = new MediaGridView();
        $posts = $this->getSamplePosts();
        $currentPostId = 101;

        $html = $view->render($posts, $currentPostId);

        $this->assertStringContainsString('seriescraft-layout-media-grid', $html);
        $this->assertStringContainsString('Clean Architecture Fundamentals', $html);
        $this->assertStringContainsString('seriescraft-card', $html);
    }
}