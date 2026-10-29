<?php
/**
 * MediaGridView definition.
 *
 * @package SeriesCraft\Views\Variants
 */

declare(strict_types=1);

namespace SeriesCraft\Views\Variants;

use SeriesCraft\Services\ThumbnailResolver;

/**
 * Class MediaGridView
 *
 * Renders series posts in a media grid layout with thumbnails.
 */
class MediaGridView implements VariantViewInterface {

	/**
	 * Renders the HTML markup for the series posts layout.
	 *
	 * @param array<int, array{id: int, title: string, url: string, part_order: int, thumbnail: string|null}> $posts           List of series posts.
	 * @param int                                                                                             $current_post_id Current post ID.
	 * @return string Rendered HTML markup.
	 */
	public function render( array $posts, int $current_post_id ): string {
		$output = '<section class="sc-layout-media-grid sm-series-variant sm-media-grid seriescraft-layout seriescraft-layout-media-grid"><div class="sc-media-grid__grid sm-media-grid__grid">';

		foreach ( $posts as $index => $post ) {
			$post_id     = (int) ( $post['id'] ?? $post['ID'] ?? 0 );
			$is_current  = ( $post_id === $current_post_id );
			$part_number = $post['part_order'] ?? ( $index + 1 );
			$link_url    = (string) ( $post['url'] ?? '' );
			$title       = (string) ( $post['title'] ?? '' );

			$thumbnail_url = ! empty( $post['thumbnail'] ) ? (string) $post['thumbnail'] : '';
			$thumbnail_id  = ( empty( $thumbnail_url ) && $post_id > 0 && function_exists( 'get_post_thumbnail_id' ) )
				? get_post_thumbnail_id( $post_id )
				: 0;

			if ( empty( $thumbnail_url ) && $thumbnail_id && function_exists( 'wp_get_attachment_image_url' ) ) {
				$thumbnail_url = (string) wp_get_attachment_image_url( $thumbnail_id, 'medium' );
			}

			if ( empty( $thumbnail_url ) && $post_id > 0 ) {
				$thumbnail_url = ThumbnailResolver::resolve_post_image( $post_id );
			}

			$is_placeholder = false;

			if ( empty( $thumbnail_url ) ) {
				$fallback_url   = defined( 'SERIESCRAFT_URL' )
					? SERIESCRAFT_URL . 'assets/images/placeholder.png'
					: ( function_exists( 'plugins_url' ) ? plugins_url( 'assets/images/placeholder.png', dirname( __DIR__, 3 ) . '/seriescraft.php' ) : '' );
				$thumbnail_url  = function_exists( 'apply_filters' )
					? (string) apply_filters( 'seriescraft_placeholder_image_url', $fallback_url, $post_id )
					: $fallback_url;
				$is_placeholder = true;
			}

			$img_class  = 'sc-media-grid__image' . ( $is_placeholder ? ' sc-media-grid__image--placeholder' : '' );
			$card_class = $is_current
				? 'sc-media-grid__card sc-media-grid__card--current seriescraft-card sm-media-grid-card sm-media-grid-card--current is-current'
				: 'sc-media-grid__card sc-media-grid__card--default seriescraft-card sm-media-grid-card sm-media-grid-card--default';

			$output .= sprintf(
				'<a href="%s" class="%s">',
				esc_url( $link_url ),
				esc_attr( $card_class )
			);

			if ( $is_current ) {
				$output .= sprintf(
					'<div class="sc-media-grid__badge-wrap reading-now"><span class="sc-media-grid__badge sc-badge seriescraft-badge">%s</span></div>',
					esc_html( __( 'Reading Now', 'series-craft' ) )
				);
			}

			$output .= sprintf(
				'<div class="sc-media-grid__header sm-media-grid-card-img sm-media-grid__header seriescraft-thumb"><img src="%s" alt="%s" class="%s" loading="lazy" /></div>',
				esc_url( $thumbnail_url ),
				esc_attr( $title ),
				esc_attr( $img_class )
			);

			$output .= '<div class="sc-media-grid__content sm-preview-lines seriescraft-content">';
			$output .= sprintf(
				'<h3 class="sc-media-grid__title seriescraft-title sm-media-grid__title">%s</h3>',
				esc_html( $title )
			);
			$output .= '<div class="sc-media-grid__divider"></div>';
			$output .= sprintf(
				'<span class="sc-media-grid__part-num seriescraft-part-num">Part %d</span>',
				intval( $part_number )
			);
			$output .= '</div>';

			$output .= '</a>';
		}

		$output .= '</div></section>';

		return $output;
	}
}
