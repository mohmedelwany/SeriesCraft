<?php

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
interface SeriesRepositoryInterface
{
    /**
     * Retrieves all posts assigned to a series ordered explicitly by numerical position.
     *
     * @param int $termId Series taxonomy term ID.
     * @return array<WP_Post> Ordered list of WP_Post objects.
     */
    public function getSeriesPosts(int $termId): array;

    /**
     * Persists an explicit numerical order for posts in a specific series.
     *
     * @param int $termId Series taxonomy term ID.
     * @param array<int> $postIds Ordered list of post IDs.
     * @return bool True on success, false on failure.
     */
    public function updateSeriesOrder(int $termId, array $postIds): bool;

    /**
     * Retrieves all series taxonomy terms assigned to a specific post.
     *
     * @param int $postId Target post ID.
     * @return array<WP_Term> Array of assigned series WP_Term objects.
     */
    public function getPostSeries(int $postId): array;
}