<?php

declare(strict_types=1);

namespace SeriesCraft\Views\Variants;

class MediaListView implements VariantViewInterface
{
    public function render(array $posts, int $currentPostId): string
    {
        $output = '<ul class="seriescraft-layout seriescraft-layout-media-list">';

        foreach ($posts as $post) {
            $isCurrent = ($post['id'] === $currentPostId);
            $itemClasses = 'seriescraft-item seriescraft-media-item' . ($isCurrent ? ' is-current' : '');

            $output .= sprintf('<li class="%s">', esc_attr($itemClasses));

            // Media element rendering
            if (!empty($post['thumbnail'])) {
                $output .= sprintf(
                    '<div class="seriescraft-thumb"><img src="%s" alt="%s" /></div>',
                    esc_url($post['thumbnail']),
                    esc_attr($post['title'])
                );
            } else {
                $output .= '<div class="seriescraft-thumb seriescraft-media-placeholder"></div>';
            }

            $output .= '<div class="seriescraft-content">';
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
            $output .= '</li>';
        }

        $output .= '</ul>';

        return $output;
    }
}