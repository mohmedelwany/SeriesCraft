<?php

declare(strict_types=1);

namespace SeriesCraft\Tests\Unit\Views;

use Brain\Monkey;
use Brain\Monkey\Functions;
use PHPUnit\Framework\TestCase;
use SeriesCraft\Views\AccordionLayout;

class AccordionLayoutTest extends TestCase
{
    private AccordionLayout $accordionLayout;

    protected function setUp(): void
    {
        parent::setUp();
        Monkey\setUp();

        Functions\stubs([
            'esc_html' => static fn (string $text): string => htmlspecialchars($text, ENT_QUOTES, 'UTF-8'),
            'esc_attr' => static fn (string $attr): string => htmlspecialchars($attr, ENT_QUOTES, 'UTF-8'),
        ]);

        $this->accordionLayout = new AccordionLayout();
    }

    protected function tearDown(): void
    {
        Monkey\tearDown();
        parent::tearDown();
    }

    public function testRenderWrapsMultipleSeriesInDetailsElements(): void
    {
        $renderedSeriesList = [
            [
                'id'       => 10,
                'title'    => 'WordPress Plugin Architecture',
                'html'     => '<div class="series-content-10">Series 10 Content</div>',
                'is_active' => true,
            ],
            [
                'id'       => 20,
                'title'    => 'Advanced Gutenberg Blocks',
                'html'     => '<div class="series-content-20">Series 20 Content</div>',
                'is_active' => false,
            ],
        ];

        $output = $this->accordionLayout->render($renderedSeriesList);

        $this->assertStringContainsString('class="seriescraft-accordion"', $output);
        $this->assertStringContainsString('<details class="seriescraft-accordion-item" open>', $output);
        $this->assertStringContainsString('<details class="seriescraft-accordion-item">', $output);
        $this->assertStringContainsString('<summary class="seriescraft-accordion-summary">WordPress Plugin Architecture</summary>', $output);
        $this->assertStringContainsString('<summary class="seriescraft-accordion-summary">Advanced Gutenberg Blocks</summary>', $output);
        $this->assertStringContainsString('Series 10 Content', $output);
        $this->assertStringContainsString('Series 20 Content', $output);
    }

    public function testRenderReturnsEmptyStringWhenNoSeriesProvided(): void
    {
        $output = $this->accordionLayout->render([]);

        $this->assertSame('', $output);
    }
}