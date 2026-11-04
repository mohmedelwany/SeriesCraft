<?php
/**
 * LinkGridView definition.
 *
 * @package SeriesCraft\Views\Variants
 */

declare(strict_types=1);

namespace SeriesCraft\Views\Variants;

/**
 * Class LinkGridView
 *
 * Renders series posts in a link grid layout.
 */
class LinkGridView implements VariantViewInterface {

	/**
	 * Renders the HTML markup for the series posts layout.
	 *
	 * @param array<int, array{id: int, title: string, url: string, part_order: int, thumbnail: string|null}> $posts           List of series posts.
	 * @param int                                                                                             $current_post_id Current post ID.
	 * @return string Rendered HTML markup.
	 */
	public function render( array $posts, int $current_post_id ): string {
		$output = '<section class="sc-layout-link-grid sm-series-variant sm-link-grid seriescraft-layout seriescraft-layout-link-grid"><div class="sc-link-grid__grid sm-link-grid__grid">';

		foreach ( $posts as $index => $post ) {
			$is_current  = ( (int) $post['id'] === $current_post_id );
			$part_number = $post['part_order'] ?? ( $index + 1 );
			$link_url    = (string) $post['url'];
			$title       = (string) $post['title'];

			$card_class = $is_current
				? 'sc-link-grid__card sc-link-grid__card--current seriescraft-card sm-link-grid__card sm-link-grid__card--current is-current'
				: 'sc-link-grid__card sc-link-grid__card--default seriescraft-card sm-link-grid__card sm-link-grid__card--default';

			$output .= sprintf(
				'<a href="%s" class="%s">',
				esc_url( $link_url ),
				esc_attr( $card_class )
			);

			if ( $is_current ) {
				$output .= sprintf(
					'<div class="sc-link-grid__badge-wrap reading-now"><span class="sc-link-grid__badge sc-badge seriescraft-badge">%s</span></div>',
					esc_html( __( 'Reading Now', 'series-craft' ) )
				);
			}

			$output .= '<div class="sc-link-grid__icon sm-link-grid__icon"><span class="material-symbols-outlined">link</span></div>';

			$output .= '<div class="sc-link-grid__content">';
			$output .= sprintf(
				'<h3 class="sc-link-grid__title seriescraft-title sm-link-grid__title">%s</h3>',
				esc_html( $title )
			);
			$output .= '<div class="sc-link-grid__divider"></div>';
			$output .= sprintf(
				'<span class="sc-link-grid__part-num seriescraft-part-num">Part %d</span>',
				intval( $part_number )
			);
			$output .= '</div>';

			$output .= '<div class="sc-link-grid__bottom-bar"></div>';
			$output .= '</a>';
		}

		$output .= '</div></section>';

		return $output;
	}
}
