<?php
/**
 * VariantViewInterface definition.
 *
 * @package SeriesCraft\Views\Variants
 */

declare(strict_types=1);

namespace SeriesCraft\Views\Variants;

/**
 * Interface VariantViewInterface
 *
 * Contract for series layout variant views.
 */
interface VariantViewInterface {

	/**
	 * Renders the HTML markup for the series posts layout.
	 *
	 * @param array<int, array{id: int, title: string, url: string, part_order: int, thumbnail: string|null}> $posts           List of series posts.
	 * @param int                                                                                             $current_post_id Current post ID.
	 * @return string Rendered HTML markup.
	 */
	public function render( array $posts, int $current_post_id ): string;
}
