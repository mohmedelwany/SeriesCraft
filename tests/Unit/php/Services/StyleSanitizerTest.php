<?php

declare(strict_types=1);

namespace SeriesCraft\Tests\Unit\Services;

use Brain\Monkey;
use PHPUnit\Framework\TestCase;
use SeriesCraft\Services\StyleSanitizer;

class StyleSanitizerTest extends TestCase
{
    private StyleSanitizer $sanitizer;

    protected function setUp(): void
    {
        parent::setUp();
        Monkey\setUp();

        $this->sanitizer = new StyleSanitizer();
    }

    protected function tearDown(): void
    {
        Monkey\tearDown();
        parent::tearDown();
    }

    public function testSanitizeStylesFiltersInvalidHexAndRetainsValidColors(): void
    {
        $rawStyles = [
            'title_color'       => '#ff5500',
            'header_background' => 'invalid-color; expression(alert(1))',
            'button_color'      => '#00aa55',
        ];

        $sanitized = $this->sanitizer->sanitize($rawStyles);

        $this->assertSame('#ff5500', $sanitized['title_color']);
        $this->assertSame('', $sanitized['header_background']);
        $this->assertSame('#00aa55', $sanitized['button_color']);
    }

    public function testSanitizeStylesAllowsValidDimensionUnits(): void
    {
        $rawStyles = [
            'padding_top'    => '16px',
            'padding_bottom' => '1.5rem',
            'margin_bottom'  => '20px',
            'border_width'   => '2px',
            'border_style'   => 'solid',
            'border_color'   => '#cccccc',
            'malicious_prop' => '10px; background: red',
        ];

        $sanitized = $this->sanitizer->sanitize($rawStyles);

        $this->assertSame('16px', $sanitized['padding_top']);
        $this->assertSame('1.5rem', $sanitized['padding_bottom']);
        $this->assertSame('20px', $sanitized['margin_bottom']);
        $this->assertSame('2px', $sanitized['border_width']);
        $this->assertSame('solid', $sanitized['border_style']);
        $this->assertSame('#cccccc', $sanitized['border_color']);
        $this->assertArrayNotHasKey('malicious_prop', $sanitized);
    }

    public function testGenerateInlineCssBuildsScopedRules(): void
    {
        $seriesId = 42;
        $sanitizedStyles = [
            'title_color'       => '#112233',
            'header_background' => '#f8f9fa',
            'border_width'      => '1px',
            'border_style'      => 'dashed',
            'border_color'      => '#dddddd',
            'padding_top'       => '12px',
        ];

        $css = $this->sanitizer->generateInlineCss($seriesId, $sanitizedStyles);

        $expectedSelector = '.seriescraft-series-42';
        $this->assertStringContainsString($expectedSelector, $css);
        $this->assertStringContainsString('--sc-title-color: #112233;', $css);
        $this->assertStringContainsString('--sc-header-bg: #f8f9fa;', $css);
        $this->assertStringContainsString('--sc-border-width: 1px;', $css);
        $this->assertStringContainsString('--sc-border-style: dashed;', $css);
        $this->assertStringContainsString('--sc-border-color: #dddddd;', $css);
        $this->assertStringContainsString('--sc-padding-top: 12px;', $css);
    }

    public function testGenerateInlineCssReturnsEmptyStringWhenNoStylesConfigured(): void
    {
        $seriesId = 42;
        $css = $this->sanitizer->generateInlineCss($seriesId, []);

        $this->assertSame('', $css);
    }
}
