<?php
/**
 * FrontendRenderer definition.
 *
 * @package SeriesCraft\Frontend
 */

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

/**
 * Class FrontendRenderer
 *
 * Injects series navigation boxes and variant layouts into single post content.
 */
class FrontendRenderer {

	/**
	 * Series repository instance.
	 *
	 * @var SeriesRepositoryInterface
	 */
	private SeriesRepositoryInterface $repository;

	/**
	 * Navigation service instance.
	 *
	 * @var NavigationService
	 */
	private NavigationService $navigation_service;

	/**
	 * Style sanitizer instance.
	 *
	 * @var StyleSanitizer
	 */
	private StyleSanitizer $style_sanitizer;

	/**
	 * Accordion layout instance.
	 *
	 * @var AccordionLayout
	 */
	private AccordionLayout $accordion_layout;

	/**
	 * Constructor.
	 *
	 * @param SeriesRepositoryInterface $repository         Series repository instance.
	 * @param NavigationService         $navigation_service Navigation service instance.
	 * @param StyleSanitizer            $style_sanitizer    Style sanitizer instance.
	 * @param AccordionLayout           $accordion_layout   Accordion layout instance.
	 */
	public function __construct(
		SeriesRepositoryInterface $repository,
		NavigationService $navigation_service,
		StyleSanitizer $style_sanitizer,
		AccordionLayout $accordion_layout
	) {
		$this->repository         = $repository;
		$this->navigation_service = $navigation_service;
		$this->style_sanitizer    = $style_sanitizer;
		$this->accordion_layout   = $accordion_layout;
	}

	/**
	 * Filters post content to inject the series navigation and layout.
	 *
	 * @param string $content The original post content.
	 * @return string Filtered content with injected series markup.
	 */
	public function filter_content( string $content ): string {
		if ( ! is_single() ) {
			return $content;
		}

		$current_post_id = (int) get_the_ID();
		if ( $current_post_id <= 0 ) {
			return $content;
		}

		$series_list = $this->repository->getSeriesForPost( $current_post_id );
		if ( empty( $series_list ) ) {
			return $content;
		}

		$rendered_series_list = array();
		$accumulated_styles   = '';

		foreach ( $series_list as $series ) {
			$series_id      = (int) $series['id'];
			$series_name    = (string) $series['name'];
			$layout_variant = (string) ( $series['layout'] ?? 'link-list' );
			$raw_styles     = (array) ( $series['styles'] ?? array() );
			$posts          = (array) ( $series['posts'] ?? array() );

			$nav_context = $this->navigation_service->get_navigation_context( $current_post_id, $posts );
			$inline_css  = $this->style_sanitizer->generate_inline_css( $series_id, $raw_styles );

			if ( ! empty( $inline_css ) ) {
				$accumulated_styles .= sprintf( '<style>%s</style>', $inline_css );
			}

			$series_inner_html = $this->render_series_box( $series_id, $series_name, $layout_variant, $posts, $current_post_id, $nav_context );

			$rendered_series_list[] = array(
				'id'        => $series_id,
				'title'     => $series_name,
				'html'      => $series_inner_html,
				'is_active' => true,
			);
		}

		// Multiple series switch to Accordion layout.
		if ( count( $rendered_series_list ) > 1 ) {
			$series_output = $this->accordion_layout->render( $rendered_series_list );
		} else {
			$series_output = $rendered_series_list[0]['html'];
		}

		$final_markup = $accumulated_styles . $series_output;

		return $final_markup . $content;
	}

	/**
	 * Renders a single series box including header, variant layout, and navigation.
	 *
	 * @param int                                                        $series_id       Series ID.
	 * @param string                                                     $series_name     Series Name.
	 * @param string                                                     $layout_variant  Layout variant slug.
	 * @param array<int, array{id: int, title: string, part_order: int}> $posts           List of posts in series.
	 * @param int                                                        $current_post_id Current post ID.
	 * @param array<string, mixed>                                       $nav_context     Navigation context data.
	 * @return string Rendered series box HTML.
	 */
	private function render_series_box(
		int $series_id,
		string $series_name,
		string $layout_variant,
		array $posts,
		int $current_post_id,
		array $nav_context
	): string {
		$view         = $this->resolve_variant_view( $layout_variant );
		$variant_html = $view->render( $posts, $current_post_id );

		$wrapper_class = sprintf( 'seriescraft-wrapper seriescraft-series-%d', $series_id );

		$output = sprintf( '<section class="%s">', esc_attr( $wrapper_class ) );

		// Series Header.
		$output .= '<header class="seriescraft-header">';
		$output .= sprintf( '<h3 class="seriescraft-series-title">%s</h3>', esc_html( $series_name ) );
		if ( ! empty( $nav_context['position_label'] ) ) {
			$output .= sprintf( '<span class="seriescraft-position-badge">%s</span>', esc_html( $nav_context['position_label'] ) );
		}
		$output .= '</header>';

		// Main Layout Variant.
		$output .= $variant_html;

		// Navigation Footer (Previous / Next).
		if ( ! empty( $nav_context['previous_post'] ) || ! empty( $nav_context['next_post'] ) ) {
			$output .= '<nav class="seriescraft-navigation" aria-label="' . esc_attr( __( 'Series Navigation', 'series-craft' ) ) . '">';
			if ( ! empty( $nav_context['previous_post'] ) ) {
				$output .= sprintf(
					'<a href="%s" class="seriescraft-nav-prev" rel="prev">&larr; %s</a>',
					esc_url( get_permalink( $nav_context['previous_post']['id'] ) ),
					esc_html( $nav_context['previous_post']['title'] )
				);
			}

			if ( ! empty( $nav_context['next_post'] ) ) {
				$output .= sprintf(
					'<a href="%s" class="seriescraft-nav-next" rel="next">%s &rarr;</a>',
					esc_url( get_permalink( $nav_context['next_post']['id'] ) ),
					esc_html( $nav_context['next_post']['title'] )
				);
			}

			$output .= '</nav>';
		}

		$output .= '</section>';

		return $output;
	}

	/**
	 * Resolves the layout view instance according to the variant key.
	 *
	 * @param string $layout_variant Variant slug.
	 * @return VariantViewInterface Resolved view instance.
	 */
	private function resolve_variant_view( string $layout_variant ): VariantViewInterface {
		switch ( $layout_variant ) {
			case 'link-grid':
				return new LinkGridView();
			case 'media-list':
				return new MediaListView();
			case 'media-grid':
				return new MediaGridView();
			case 'link-list':
			default:
				return new LinkListView();
		}
	}

	/**
	 * Magic caller for camelCase method compatibility.
	 *
	 * @param string $name      Method name.
	 * @param array  $arguments Method arguments.
	 * @return mixed
	 * @throws \BadMethodCallException If method does not exist.
	 */
	public function __call( string $name, array $arguments ) {
		if ( 'filterContent' === $name ) {
			return $this->filter_content( ...$arguments );
		}

		// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
		throw new \BadMethodCallException( sprintf( 'Call to undefined method %s::%s()', __CLASS__, $name ) );
	}
}
