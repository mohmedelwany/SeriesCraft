<?php

declare(strict_types=1);

namespace SeriesCraft\Views;

class AccordionLayout
{
    /**
     * Renders multiple series enclosed within expandable details/summary tags.
     *
     * @param array<int, array{id: int, title: string, html: string, is_active?: bool}> $renderedSeriesList
     * @return string
     */
    public function render(array $renderedSeriesList): string
    {
        if (empty($renderedSeriesList)) {
            return '';
        }

        $output = '<div class="seriescraft-accordion">';

        foreach ($renderedSeriesList as $series) {
            $isOpen = !empty($series['is_active']);
            $openAttribute = $isOpen ? ' open' : '';

            $output .= sprintf('<details class="seriescraft-accordion-item"%s>', $openAttribute);
            $output .= sprintf(
                '<summary class="seriescraft-accordion-summary">%s</summary>',
                esc_html($series['title'])
            );
            $output .= sprintf(
                '<div class="seriescraft-accordion-content">%s</div>',
                $series['html']
            );
            $output .= '</details>';
        }

        $output .= '</div>';

        return $output;
    }
}