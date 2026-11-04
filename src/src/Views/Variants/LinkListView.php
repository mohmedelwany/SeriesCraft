<?php
/**
 * LinkListView definition.
 *
 * @package SeriesCraft\Views\Variants
 */

declare(strict_types=1);

namespace SeriesCraft\Views\Variants;

/**
 * Class LinkListView
 *
 * Renders series posts in a link list layout.
 */
class LinkListView implements VariantViewInterface {

	/**
	 * Renders the HTML markup for the series posts layout.
	 *
	 * @param array<int, array{id: int, title: string, url: string, part_order: int, thumbnail: string|null}> $posts           List of series posts.
	 * @param int                                                                                             $current_post_id Current post ID.
	 * @return string Rendered HTML markup.
	 */
	public function render( array $posts, int $current_post_id ): string {
		$output = '<div class="sc-layout-link-list sc-link-list sm-series-variant sm-link-list seriescraft-layout seriescraft-layout-link-list">';

		foreach ( $posts as $index => $post ) {
			$is_current  = ( (int) $post['id'] === $current_post_id );
			$part_number = $post['part_order'] ?? ( $index + 1 );
			$link_url    = (string) $post['url'];
			$title       = (string) $post['title'];

			if ( $is_current ) {
				$output .= sprintf(
					'<a href="%s" class="sc-link-list__item sc-link-list__item--current seriescraft-item sm-link-list__item sm-link-list__item--current is-current">',
					esc_url( $link_url )
				);

				$output .= '<div class="sc-link-list__icon-wrap sm-link-list__icon-wrap"><span class="material-symbols-outlined sc-link-list__icon">link</span></div>';

				$output .= '<div class="sc-link-list__content">';
				$output .= sprintf(
					'<h4 class="sc-link-list__title seriescraft-title sm-link-list__title">%s <span class="sc-link-list__badge sc-badge seriescraft-badge">%s</span></h4>',
					esc_html( $title ),
					esc_html( __( 'Reading Now', 'series-craft' ) )
				);
				$output .= sprintf(
					'<span class="sc-link-list__part-num seriescraft-part-num">Part %d • %s</span>',
					intval( $part_number ),
					esc_html( __( 'Reading Now', 'series-craft' ) )
				);
				$output .= '</div>';

				$output .= '<span class="material-symbols-outlined sc-link-list__status sc-link-list__status--current">check_circle</span>';
				$output .= '</a>';
			} else {
				$output .= sprintf(
					'<a href="%s" class="sc-link-list__item sc-link-list__item--default seriescraft-item sm-link-list__item sm-link-list__item--default">',
					esc_url( $link_url )
				);

				$output .= '<div class="sc-link-list__icon-wrap sm-link-list__icon-wrap"><span class="material-symbols-outlined sc-link-list__icon">link</span></div>';

				$output .= '<div class="sc-link-list__content">';
				$output .= sprintf(
					'<h4 class="sc-link-list__title seriescraft-title sm-link-list__title">%s</h4>',
					esc_html( $title )
				);
				$output .= sprintf(
					'<span class="sc-link-list__part-num seriescraft-part-num">Part %d</span>',
					intval( $part_number )
				);
				$output .= '</div>';

				$output .= '<span class="material-symbols-outlined sc-link-list__status">arrow_forward</span>';
				$output .= '</a>';
			}
		}

		$output .= '</div>';

		return $output;
	}
}
