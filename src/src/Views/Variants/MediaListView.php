<?php
/**
 * MediaListView definition.
 *
 * @package SeriesCraft\Views\Variants
 */

declare(strict_types=1);

namespace SeriesCraft\Views\Variants;

use SeriesCraft\Services\ThumbnailResolver;

/**
 * Class MediaListView
 *
 * Renders series posts in a media list layout with thumbnails.
 */
class MediaListView implements VariantViewInterface {

	/**
	 * Renders the HTML markup for the series posts layout.
	 *
	 * @param array<int, array{id: int, title: string, url: string, part_order: int, thumbnail: string|null}> $posts           List of series posts.
	 * @param int                                                                                             $current_post_id Current post ID.
	 * @return string Rendered HTML markup.
	 */
	public function render( array $posts, int $current_post_id ): string {
		$output = '<div class="sc-layout-media-list sc-media-list sm-series-variant sm-media-list seriescraft-layout seriescraft-layout-media-list">';

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

			$img_class = 'sc-media-list__image' . ( $is_placeholder ? ' sc-media-list__image--placeholder' : '' );

			if ( $is_current ) {
				$output .= sprintf(
					'<a href="%s" class="sc-media-list__item sc-media-list__item--current seriescraft-item seriescraft-media-item sm-media-list__item sm-media-list__item--current is-current">',
					esc_url( $link_url )
				);

				$output .= sprintf(
					'<div class="sc-media-list__thumbnail sm-media-list__thumbnail seriescraft-thumb"><img src="%s" alt="%s" class="%s" loading="lazy" /></div>',
					esc_url( $thumbnail_url ),
					esc_attr( $title ),
					esc_attr( $img_class )
				);

				$output .= '<div class="sc-media-list__content seriescraft-content">';
				$output .= sprintf(
					'<h4 class="sc-media-list__title seriescraft-title sm-media-list__title">%s <span class="sc-media-list__badge sc-badge seriescraft-badge">%s</span></h4>',
					esc_html( $title ),
					esc_html( __( 'Reading Now', 'series-craft' ) )
				);
				$output .= sprintf(
					'<span class="sc-media-list__part-num seriescraft-part-num">Part %d • %s</span>',
					intval( $part_number ),
					esc_html( __( 'Reading Now', 'series-craft' ) )
				);
				$output .= '</div>';

				$output .= '<span class="material-symbols-outlined sc-media-list__status sc-media-list__status--current">check_circle</span>';
				$output .= '</a>';
			} else {
				$output .= sprintf(
					'<a href="%s" class="sc-media-list__item sc-media-list__item--default seriescraft-item seriescraft-media-item sm-media-list__item sm-media-list__item--default">',
					esc_url( $link_url )
				);

				$output .= sprintf(
					'<div class="sc-media-list__thumbnail sm-media-list__thumbnail seriescraft-thumb"><img src="%s" alt="%s" class="%s" loading="lazy" /></div>',
					esc_url( $thumbnail_url ),
					esc_attr( $title ),
					esc_attr( $img_class )
				);

				$output .= '<div class="sc-media-list__content seriescraft-content">';
				$output .= sprintf(
					'<h4 class="sc-media-list__title seriescraft-title sm-media-list__title">%s</h4>',
					esc_html( $title )
				);
				$output .= sprintf(
					'<span class="sc-media-list__part-num seriescraft-part-num">Part %d</span>',
					intval( $part_number )
				);
				$output .= '</div>';

				$output .= '<span class="material-symbols-outlined sc-media-list__status">arrow_forward</span>';
				$output .= '</a>';
			}
		}

		$output .= '</div>';

		return $output;
	}
}
