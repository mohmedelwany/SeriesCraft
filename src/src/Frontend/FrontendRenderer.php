<?php

declare(strict_types=1);

namespace SeriesCraft\Frontend;

use SeriesCraft\Database\Repositories\SeriesRepositoryInterface;
use SeriesCraft\Services\NavigationService;
use SeriesCraft\Services\StyleSanitizer;
use SeriesCraft\Views\AccordionLayout;
use SeriesCraft\Views\Variants\LinkListView;
use SeriesCraft\Views\Variants\LinkGridView;
use SeriesCraft\Views\Variants\MediaListView;
use SeriesCraft\Views\Variants\MediaGridView;
use SeriesCraft\Views\Variants\VariantViewInterface;

class FrontendRenderer
{
    private SeriesRepositoryInterface $repository;
    private NavigationService $navigationService;
    private StyleSanitizer $styleSanitizer;
    private AccordionLayout $accordionLayout;

    public function __construct(
        SeriesRepositoryInterface $repository,
        NavigationService $navigationService,
        StyleSanitizer $styleSanitizer,
        AccordionLayout $accordionLayout
    ) {
        $this->repository = $repository;
        $this->navigationService = $navigationService;
        $this->styleSanitizer = $styleSanitizer;
        $this->accordionLayout = $accordionLayout;
    }

    /**
     * Filters post content to inject the series navigation and layout.
     *
     * @param string $content The original post content.
     * @return string Filtered content with injected series markup.
     */
    public function filterContent(string $content): string
    {
        if (!is_single()) {
            return $content;
        }

        $currentPostId = (int) get_the_ID();
        if ($currentPostId <= 0) {
            return $content;
        }

        $seriesList = $this->repository->getSeriesForPost($currentPostId);
        if (empty($seriesList)) {
            return $content;
        }

        $renderedSeriesList = [];
        $accumulatedStyles = '';

        foreach ($seriesList as $series) {
            $seriesId = (int) $series['id'];
            $seriesName = (string) $series['name'];
            $layoutVariant = (string) ($series['layout'] ?? 'link-list');
            $rawStyles = (array) ($series['styles'] ?? []);
            $posts = (array) ($series['posts'] ?? []);

            $navContext = $this->navigationService->getNavigationContext($currentPostId, $posts);
            $inlineCss = $this->styleSanitizer->generateInlineCss($seriesId, $rawStyles);

            if (!empty($inlineCss)) {
                $accumulatedStyles .= sprintf('<style>%s</style>', $inlineCss);
            }

            $seriesInnerHtml = $this->renderSeriesBox($seriesId, $seriesName, $layoutVariant, $posts, $currentPostId, $navContext);

            $renderedSeriesList[] = [
                'id'        => $seriesId,
                'title'     => $seriesName,
                'html'      => $seriesInnerHtml,
                'is_active' => true,
            ];
        }

        // Multiple series switch to Accordion layout
        if (count($renderedSeriesList) > 1) {
            $seriesOutput = $this->accordionLayout->render($renderedSeriesList);
        } else {
            $seriesOutput = $renderedSeriesList[0]['html'];
        }

        $finalMarkup = $accumulatedStyles . $seriesOutput;

        return $finalMarkup . $content;
    }

    /**
     * Renders a single series box including header, variant layout, and navigation.
     */
    private function renderSeriesBox(
        int $seriesId,
        string $seriesName,
        string $layoutVariant,
        array $posts,
        int $currentPostId,
        array $navContext
    ): string {
        $view = $this->resolveVariantView($layoutVariant);
        $variantHtml = $view->render($posts, $currentPostId);

        $wrapperClass = sprintf('seriescraft-wrapper seriescraft-series-%d', $seriesId);

        $output = sprintf('<section class="%s">', esc_attr($wrapperClass));

        // Series Header
        $output .= '<header class="seriescraft-header">';
        $output .= sprintf('<h3 class="seriescraft-series-title">%s</h3>', esc_html($seriesName));
        if (!empty($navContext['position_label'])) {
            $output .= sprintf('<span class="seriescraft-position-badge">%s</span>', esc_html($navContext['position_label']));
        }
        $output .= '</header>';

        // Main Layout Variant
        $output .= $variantHtml;

        // Navigation Footer (Previous / Next)
        if (!empty($navContext['previous_post']) || !empty($navContext['next_post'])) {
            $output .= '<nav class="seriescraft-navigation" aria-label="' . esc_attr(__('Series Navigation', 'seriescraft')) . '">';
            if (!empty($navContext['previous_post'])) {
                $output .= sprintf(
                    '<a href="%s" class="seriescraft-nav-prev" rel="prev">&larr; %s</a>',
                    esc_url(get_permalink($navContext['previous_post']['id'])),
                    esc_html($navContext['previous_post']['title'])
                );
            }

            if (!empty($navContext['next_post'])) {
                $output .= sprintf(
                    '<a href="%s" class="seriescraft-nav-next" rel="next">%s &rarr;</a>',
                    esc_url(get_permalink($navContext['next_post']['id'])),
                    esc_html($navContext['next_post']['title'])
                );
            }

            $output .= '</nav>';
        }

        $output .= '</section>';

        return $output;
    }

    /**
     * Resolves the layout view instance according to the variant key.
     */
    private function resolveVariantView(string $layoutVariant): VariantViewInterface
    {
        return match ($layoutVariant) {
            'link-grid'  => new LinkGridView(),
            'media-list' => new MediaListView(),
            'media-grid' => new MediaGridView(),
            default      => new LinkListView(),
        };
    }
}