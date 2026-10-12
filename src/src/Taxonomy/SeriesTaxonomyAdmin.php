<?php

declare(strict_types=1);

namespace SeriesCraft\Taxonomy;

use SeriesCraft\Database\Repositories\SeriesRepositoryInterface;
use WP_Term;

/**
 * Class SeriesTaxonomyAdmin
 *
 * Provides a classic WordPress taxonomy screen fallback for reordering series posts
 * using jQuery UI sortable drag-and-drop.
 *
 * @package SeriesCraft\Taxonomy
 */
class SeriesTaxonomyAdmin
{
    /**
     * Security nonce action name.
     */
    public const NONCE_ACTION = 'series_craft_save_order';

    /**
     * Security nonce field name.
     */
    public const NONCE_NAME = 'series_craft_order_nonce';

    /**
     * Repository instance.
     */
    private SeriesRepositoryInterface $repository;

    /**
     * Constructor.
     *
     * @param SeriesRepositoryInterface $repository
     */
    public function __construct(SeriesRepositoryInterface $repository)
    {
        $this->repository = $repository;
    }

    /**
     * Registers required WordPress admin actions.
     *
     * @return void
     */
    public function register(): void
    {
        add_action(SeriesTaxonomy::TAXONOMY . '_edit_form_fields', [$this, 'renderOrderField']);
        add_action('edited_' . SeriesTaxonomy::TAXONOMY, [$this, 'saveOrderField']);
        add_action('admin_enqueue_scripts', [$this, 'enqueueScripts']);
    }

    /**
     * Enqueues jQuery UI Sortable and inline scripts on the series term editing screen.
     *
     * @param string $hookSuffix Current admin page hook suffix.
     * @return void
     */
    public function enqueueScripts(string $hookSuffix): void
    {
        if ($hookSuffix !== 'term.php') {
            return;
        }

        $screen = get_current_screen();
        if (!$screen || $screen->taxonomy !== SeriesTaxonomy::TAXONOMY) {
            return;
        }

        wp_enqueue_script('jquery-ui-sortable');

        $inlineJs = <<<'JS'
jQuery(function($) {
    var $sortable = $("#series-order-sortable");
    var $input = $("#series_post_order");

    if ($sortable.length && $sortable.sortable) {
        $sortable.sortable({
            update: function() {
                var order = $sortable.sortable("toArray", { attribute: "data-post-id" });
                $input.val(order.join(","));
            }
        });
    }
});
JS;

        wp_add_inline_script('jquery-ui-sortable', $inlineJs);
    }

    /**
     * Renders the classic post reordering UI inside the term edit screen.
     *
     * @param WP_Term $term Current taxonomy term object.
     * @return void
     */
    public function renderOrderField(WP_Term $term): void
    {
        $posts = $this->repository->getSeriesPosts((int) $term->term_id);
        $postIds = array_map(static fn($post): int => (int) $post->ID, $posts);

        wp_nonce_field(self::NONCE_ACTION, self::NONCE_NAME);
        ?>
        <tr class="form-field series-order-wrap">
            <th scope="row">
                <label><?php esc_html_e('Series Post Order', 'series-craft'); ?></label>
            </th>
            <td>
                <input type="hidden" id="series_post_order" name="series_post_order" value="<?php echo esc_attr(implode(',', $postIds)); ?>" />
                <ul id="series-order-sortable" style="max-width: 500px; margin: 0; padding: 0; list-style: none;">
                    <?php if (empty($posts)) : ?>
                        <li style="padding: 10px; background: #f6f7f7; border: 1px solid #dcdcde;">
                            <?php esc_html_e('No posts assigned to this series yet.', 'series-craft'); ?>
                        </li>
                    <?php else : ?>
                        <?php foreach ($posts as $post) : ?>
                            <li data-post-id="<?php echo esc_attr((string) $post->ID); ?>" style="padding: 8px 12px; margin-bottom: 6px; background: #fff; border: 1px solid #ccd0d4; border-radius: 4px; cursor: move; display: flex; align-items: center; justify-content: space-between;">
                                <span><?php echo esc_html($post->post_title); ?></span>
                                <span class="dashicons dashicons-menu" aria-hidden="true" style="color: #8c8f94;"></span>
                            </li>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </ul>
                <p class="description">
                    <?php esc_html_e('Drag and drop posts to define explicit sequence order, then click Update.', 'series-craft'); ?>
                </p>
            </td>
        </tr>
        <?php
    }

    /**
     * Saves reordered posts from submitted term form data.
     *
     * @param int $termId Current taxonomy term ID.
     * @return void
     */
    public function saveOrderField(int $termId): void
    {
        if (!isset($_POST[self::NONCE_NAME]) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST[self::NONCE_NAME])), self::NONCE_ACTION)) {
            return;
        }

        if (!current_user_can('manage_categories')) {
            return;
        }

        if (empty($_POST['series_post_order'])) {
            return;
        }

        $rawOrder = sanitize_text_field(wp_unslash($_POST['series_post_order']));
        $orderedIds = array_filter(
            array_map('intval', explode(',', $rawOrder)),
            static fn(int $id): bool => $id > 0
        );

        if (!empty($orderedIds)) {
            $this->repository->updateSeriesOrder($termId, array_values($orderedIds));
        }
    }
}