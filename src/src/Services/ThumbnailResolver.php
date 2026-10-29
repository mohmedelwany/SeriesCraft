<?php
/**
 * ThumbnailResolver definition.
 *
 * @package SeriesCraft\Services
 */

declare(strict_types=1);

namespace SeriesCraft\Services;

/**
 * Class ThumbnailResolver
 *
 * Resolves post thumbnail from featured image, image blocks in post content, or inline HTML images.
 */
class ThumbnailResolver {

	/**
	 * Resolves the primary thumbnail URL for a given post ID or content.
	 *
	 * Checks in order:
	 * 1. WordPress Featured Image (`post_thumbnail`).
	 * 2. Image blocks (`core/image`, `core/cover`, `core/media-text`) in post content.
	 * 3. Standard `<img>` tags in raw post content.
	 *
	 * @param int         $post_id Target post ID.
	 * @param string|null $content Optional post content override.
	 * @return string Resolved image URL, or empty string if no image was found.
	 */
	public static function resolve_post_image( int $post_id, ?string $content = null ): string {
		// 1. Resolve WordPress Featured Image.
		if ( $post_id > 0 ) {
			if ( function_exists( 'get_post_thumbnail_id' ) ) {
				$thumb_id = (int) get_post_thumbnail_id( $post_id );
				if ( $thumb_id > 0 && function_exists( 'wp_get_attachment_image_url' ) ) {
					$thumb_url = wp_get_attachment_image_url( $thumb_id, 'medium' );
					if ( ! empty( $thumb_url ) ) {
						return (string) $thumb_url;
					}
				}
			}

			if ( function_exists( 'get_the_post_thumbnail_url' ) ) {
				$thumb_url = get_the_post_thumbnail_url( $post_id, 'medium' );
				if ( ! empty( $thumb_url ) ) {
					return (string) $thumb_url;
				}
			}
		}

		// 2. Resolve image from post content (Image blocks or inline HTML).
		if ( null === $content && $post_id > 0 && function_exists( 'get_post' ) ) {
			$post_obj = get_post( $post_id );
			if ( $post_obj && isset( $post_obj->post_content ) ) {
				$content = (string) $post_obj->post_content;
			}
		}

		if ( ! empty( $content ) ) {
			$extracted_url = self::extract_image_from_content( (string) $content );
			if ( ! empty( $extracted_url ) ) {
				return $extracted_url;
			}
		}

		return '';
	}

	/**
	 * Extracts the first image URL from post content.
	 *
	 * Supports Gutenberg image blocks (core/image, core/cover, core/media-text) and HTML <img> tags.
	 *
	 * @param string $content Post content markup.
	 * @return string Extracted image URL, or empty string.
	 */
	public static function extract_image_from_content( string $content ): string {
		$trimmed = trim( $content );
		if ( empty( $trimmed ) ) {
			return '';
		}

		// 1. Parse Gutenberg blocks if blocks are present.
		if ( function_exists( 'has_blocks' ) && has_blocks( $trimmed ) && function_exists( 'parse_blocks' ) ) {
			$blocks    = parse_blocks( $trimmed );
			$block_url = self::find_image_in_blocks( $blocks );
			if ( ! empty( $block_url ) ) {
				return $block_url;
			}
		}

		// 2. Check for wp:image comment or JSON data directly.
		if ( preg_match( '/<!--\s*wp:image\s+({.*?})\s*-->/s', $trimmed, $matches ) ) {
			$json_data = json_decode( $matches[1], true );
			if ( is_array( $json_data ) ) {
				if ( ! empty( $json_data['id'] ) && function_exists( 'wp_get_attachment_image_url' ) ) {
					$url = wp_get_attachment_image_url( (int) $json_data['id'], 'medium' );
					if ( ! empty( $url ) ) {
						return (string) $url;
					}
				}
				if ( ! empty( $json_data['url'] ) ) {
					return (string) $json_data['url'];
				}
			}
		}

		// 3. Fallback: Extract first <img> tag src.
		if ( preg_match( '/<img[^>]+src=["\']([^"\']+)["\']/i', $trimmed, $matches ) ) {
			return (string) $matches[1];
		}

		return '';
	}

	/**
	 * Recursively searches parsed Gutenberg block structures for the first image URL.
	 *
	 * @param array<int, array<string, mixed>> $blocks Array of parsed blocks.
	 * @return string Image URL or empty string.
	 */
	public static function find_image_in_blocks( array $blocks ): string {
		foreach ( $blocks as $block ) {
			if ( ! is_array( $block ) ) {
				continue;
			}

			$block_name = $block['blockName'] ?? '';
			if ( in_array( $block_name, array( 'core/image', 'core/cover', 'core/media-text' ), true ) ) {
				$attrs = (array) ( $block['attrs'] ?? array() );

				if ( ! empty( $attrs['id'] ) && function_exists( 'wp_get_attachment_image_url' ) ) {
					$url = wp_get_attachment_image_url( (int) $attrs['id'], 'medium' );
					if ( ! empty( $url ) ) {
						return (string) $url;
					}
				}

				if ( ! empty( $attrs['url'] ) ) {
					return (string) $attrs['url'];
				}

				if ( ! empty( $attrs['mediaUrl'] ) ) {
					return (string) $attrs['mediaUrl'];
				}
			}

			// Search inner blocks recursively (columns, groups, etc.).
			if ( ! empty( $block['innerBlocks'] ) && is_array( $block['innerBlocks'] ) ) {
				$inner_url = self::find_image_in_blocks( $block['innerBlocks'] );
				if ( ! empty( $inner_url ) ) {
					return $inner_url;
				}
			}

			// Check innerHTML for fallback <img> src.
			if ( ! empty( $block['innerHTML'] ) && is_string( $block['innerHTML'] ) ) {
				if ( preg_match( '/<img[^>]+src=["\']([^"\']+)["\']/i', $block['innerHTML'], $matches ) ) {
					return (string) $matches[1];
				}
			}
		}

		return '';
	}
}
