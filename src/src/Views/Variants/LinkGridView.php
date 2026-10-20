<?php

declare(strict_types=1);

namespace SeriesCraft\Views\Variants;

class LinkGridView implements VariantViewInterface
{
    public function render(array $posts, int $currentPostId): string
    {
        $output = '<div class="seriescraft-layout seriescraft-layout-link-grid">';

        foreach ($posts as $post) {
            $isCurrent = ($post['id'] === $currentPostId);
            $cardClasses = 'seriescraft-card' . ($isCurrent ? ' is-current' : '');

            $output .= sprintf('<div class="%s">', esc_attr($cardClasses));
            $output .= sprintf('<span class="seriescraft-part-num">%s</span>', esc_html((string) $post['part_order']));

            if ($isCurrent) {
                $output .= sprintf(
                    '<span class="seriescraft-title">%s <span class="seriescraft-badge">%s</span></span>',
                    esc_html($post['title']),
                    esc_html(__('Reading Now', 'seriescraft'))
                );
            } else {
                $output .= sprintf(
                    '<a href="%s" class="seriescraft-link">%s</a>',
                    esc_url($post['url']),
                    esc_html($post['title'])
                );
            }

            $output .= '</div>';
        }

        $output .= '</div>';

        return $output;
    }
}