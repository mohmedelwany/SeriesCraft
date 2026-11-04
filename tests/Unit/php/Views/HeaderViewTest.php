<?php

declare(strict_types=1);

namespace SeriesCraft\Tests\Unit\Views;

use Brain\Monkey;
use Brain\Monkey\Functions;
use PHPUnit\Framework\TestCase;
use SeriesCraft\Views\HeaderView;

class HeaderViewTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Monkey\setUp();

        Functions\stubs([
            'esc_html' => static fn (string $text): string => htmlspecialchars($text, ENT_QUOTES, 'UTF-8'),
            'esc_attr' => static fn (string $attr): string => htmlspecialchars($attr, ENT_QUOTES, 'UTF-8'),
            '__'       => static fn (string $text, string $domain = 'default'): string => $text,
        ]);
    }

    protected function tearDown(): void
    {
        Monkey\tearDown();
        parent::tearDown();
    }

    public function testRenderOutputsSeriesTitleAndBadge(): void
    {
        $headerView = new HeaderView('Mastering TypeScript', 1, 3);
        $output = $headerView->render();

        $this->assertStringContainsString('sc-header', $output);
        $this->assertStringContainsString('Mastering TypeScript', $output);
        $this->assertStringContainsString('sc-header__badge', $output);
        $this->assertStringContainsString('Part 1 of 3', $output);
    }

    public function testRenderOmitsBadgeWhenCurrentPartIsZero(): void
    {
        $headerView = new HeaderView('Standalone Series', 0, 5);
        $output = $headerView->render();

        $this->assertStringContainsString('sc-header', $output);
        $this->assertStringContainsString('Standalone Series', $output);
        $this->assertStringNotContainsString('sc-header__badge', $output);
        $this->assertStringNotContainsString('Part 0 of 5', $output);
    }

    public function testRenderEscapesSeriesTitle(): void
    {
        $headerView = new HeaderView('Test & "Series" <script>', 2, 4);
        $output = $headerView->render();

        $this->assertStringContainsString('Test &amp; &quot;Series&quot; &lt;script&gt;', $output);
        $this->assertStringNotContainsString('<script>', $output);
    }
}
