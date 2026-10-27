<?php
/**
 * SeriesRepositoryInterface file.
 *
 * @package SeriesCraft\Database\Repositories
 */

declare(strict_types=1);

namespace SeriesCraft\Database\Repositories;

use WP_Post;
use WP_Term;

/**
 * Interface SeriesRepositoryInterface
 *
 * Defines the contract for series persistence operations, relational querying,
 * and explicit numerical post ordering.
 *
 * @package SeriesCraft\Database\Repositories
 */
interface SeriesRepositoryInterface {

	/**
	 * Retrieves all posts assigned to a series ordered explicitly by numerical position.
	 *
	 * @param int           $term_id  Series taxonomy term ID.
	 * @param array<string> $statuses Post statuses to include. Defaults to array( 'publish' ).
	 * @return array<WP_Post> Ordered list of WP_Post objects.
	 */
	public function get_series_posts( int $term_id, array $statuses = array( 'publish', 'draft', 'pending' ) ): array;

	/**
	 * Persists an explicit numerical order for posts in a specific series.
	 *
	 * @param int        $term_id  Series taxonomy term ID.
	 * @param array<int> $post_ids Ordered list of post IDs.
	 * @return bool True on success, false on failure.
	 */
	public function update_series_order( int $term_id, array $post_ids ): bool;

	/**
	 * Retrieves all series taxonomy terms assigned to a specific post.
	 *
	 * @param int $post_id Target post ID.
	 * @return array<WP_Term> Array of assigned series WP_Term objects.
	 */
	public function get_post_series( int $post_id ): array;
}
