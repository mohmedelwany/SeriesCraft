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
		$output = '<div class="seriescraft-layout seriescraft-layout-link-grid">';

		foreach ( $posts as $post ) {
			$is_current   = ( $post['id'] === $current_post_id );
			$card_classes = 'seriescraft-card' . ( $is_current ? ' is-current' : '' );

			$output .= sprintf( '<div class="%s">', esc_attr( $card_classes ) );
			$output .= sprintf( '<span class="seriescraft-part-num">%s</span>', esc_html( (string) $post['part_order'] ) );

			if ( $is_current ) {
				$output .= sprintf(
					'<span class="seriescraft-title">%s <span class="seriescraft-badge">%s</span></span>',
					esc_html( $post['title'] ),
					esc_html( __( 'Reading Now', 'series-craft' ) )
				);
			} else {
				$output .= sprintf(
					'<a href="%s" class="seriescraft-link">%s</a>',
					esc_url( $post['url'] ),
					esc_html( $post['title'] )
				);
			}

			$output .= '</div>';
		}

		$output .= '</div>';

		return $output;
	}
}
