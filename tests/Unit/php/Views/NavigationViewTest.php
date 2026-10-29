<?php

declare(strict_types=1);

namespace SeriesCraft\Tests\Unit\Views;

use Brain\Monkey;
use Brain\Monkey\Functions;
use PHPUnit\Framework\TestCase;
use SeriesCraft\Views\NavigationView;

class NavigationViewTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Monkey\setUp();

        Functions\stubs([
            'esc_html'      => static fn (string $text): string => htmlspecialchars($text, ENT_QUOTES, 'UTF-8'),
            'esc_url'       => static fn (string $url): string => filter_var($url, FILTER_SANITIZE_URL) ?: '',
            'esc_attr'      => static fn (string $attr): string => htmlspecialchars($attr, ENT_QUOTES, 'UTF-8'),
            '__'            => static fn (string $text, string $domain = 'default'): string => $text,
            'get_permalink' => static fn (int $id): string => 'https://example.com/post/' . $id,
        ]);
    }

    protected function tearDown(): void
    {
        Monkey\tearDown();
        parent::tearDown();
    }

    public function testRenderReturnsEmptyStringWhenBothPostsAreNull(): void
    {
        $navView = new NavigationView(null, null);
        $output = $navView->render();

        $this->assertSame('', $output);
    }

    public function testRenderOutputsBothButtonsWhenBothPostsExist(): void
    {
        $prevPost = ['id' => 10, 'title' => 'First Post', 'url' => 'https://example.com/p1'];
        $nextPost = ['id' => 12, 'title' => 'Third Post', 'url' => 'https://example.com/p3'];

        $navView = new NavigationView($prevPost, $nextPost);
        $output = $navView->render();

        $this->assertStringContainsString('sc-nav', $output);
        $this->assertStringContainsString('sc-nav__btn--prev', $output);
        $this->assertStringContainsString('href="https://example.com/p1"', $output);
        $this->assertStringContainsString('sc-nav__btn--next', $output);
        $this->assertStringContainsString('href="https://example.com/p3"', $output);
        $this->assertStringContainsString('arrow_back', $output);
        $this->assertStringContainsString('arrow_forward', $output);
    }

    public function testRenderOutputsPlaceholderWhenOneAdjacentPostIsMissing(): void
    {
        $nextPost = ['id' => 12, 'title' => 'Second Post', 'url' => 'https://example.com/p2'];

        // At first post: no previous, only next
        $navViewFirst = new NavigationView(null, $nextPost);
        $outputFirst = $navViewFirst->render();

        $this->assertStringContainsString('sc-nav__placeholder', $outputFirst);
        $this->assertStringContainsString('No Previous', $outputFirst);
        $this->assertStringContainsString('sc-nav__btn--next', $outputFirst);

        // At last post: previous exists, no next
        $prevPost = ['id' => 11, 'title' => 'Second Post', 'url' => 'https://example.com/p2'];
        $navViewLast = new NavigationView($prevPost, null);
        $outputLast = $navViewLast->render();

        $this->assertStringContainsString('sc-nav__btn--prev', $outputLast);
        $this->assertStringContainsString('sc-nav__placeholder', $outputLast);
        $this->assertStringContainsString('No Next', $outputLast);
    }
}
