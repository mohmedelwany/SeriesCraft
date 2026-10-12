<?php

declare(strict_types=1);

namespace SeriesCraft\Database\Repositories;

use SeriesCraft\Taxonomy\SeriesTaxonomy;
use WP_Post;
use WP_Term;

/**
 * Class SeriesRepository
 *
 * Implements data access operations for series terms and explicit post ordering.
 * Uses WordPress term_relationships.term_order and synchronizes sm_series_order meta.
 *
 * @package SeriesCraft\Database\Repositories
 */
class SeriesRepository implements SeriesRepositoryInterface
{
    /**
     * Retrieves all posts assigned to a series ordered explicitly by numerical position.
     *
     * @param int $termId Series taxonomy term ID.
     * @return array<WP_Post> Ordered list of WP_Post objects.
     */
    public function getSeriesPosts(int $termId): array
    {
        global $wpdb;

        // Query posts joined with term_relationships to sort strictly by term_order ascending.
        $query = $wpdb->prepare(
            "SELECT p.* FROM {$wpdb->posts} p
             INNER JOIN {$wpdb->term_relationships} tr ON p.ID = tr.object_id
             INNER JOIN {$wpdb->term_taxonomy} tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
             WHERE tt.term_id = %d AND tt.taxonomy = %s AND p.post_status = 'publish'
             ORDER BY tr.term_order ASC, p.post_date ASC",
            $termId,
            SeriesTaxonomy::TAXONOMY
        );

        /** @var array<object> $results */
        $results = $wpdb->get_results($query);

        return array_map(static fn(object $post): WP_Post => new WP_Post($post), $results);
    }

    /**
     * Persists an explicit numerical order for posts in a specific series.
     *
     * @param int $termId Series taxonomy term ID.
     * @param array<int> $postIds Ordered list of post IDs.
     * @return bool True on success, false on failure.
     */
    public function updateSeriesOrder(int $termId, array $postIds): bool
    {
        global $wpdb;

        $termTaxonomy = get_term($termId, SeriesTaxonomy::TAXONOMY);
        if (!$termTaxonomy instanceof WP_Term) {
            return false;
        }

        $termTaxonomyId = (int) $termTaxonomy->term_taxonomy_id;

        foreach ($postIds as $index => $postId) {
            $order = $index + 1;

            // 1. Update term_order in wp_term_relationships
            $wpdb->update(
                $wpdb->term_relationships,
                ['term_order' => $order],
                [
                    'object_id'        => $postId,
                    'term_taxonomy_id' => $termTaxonomyId,
                ],
                ['%d'],
                ['%d', '%d']
            );

            // 2. Synchronize legacy/fallback post meta
            update_post_meta($postId, 'sm_series_order', $order);
        }

        clean_term_cache($termId, SeriesTaxonomy::TAXONOMY);

        return true;
    }

    /**
     * Retrieves all series taxonomy terms assigned to a specific post.
     *
     * @param int $postId Target post ID.
     * @return array<WP_Term> Array of assigned series WP_Term objects.
     */
    public function getPostSeries(int $postId): array
    {
        /** @var array<WP_Term>|false $terms */
        $terms = get_the_terms($postId, SeriesTaxonomy::TAXONOMY);

        if (!is_array($terms)) {
            return [];
        }

        return $terms;
    }
}