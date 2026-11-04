<?php
/**
 * SeriesTaxonomyAdmin file.
 *
 * @package SeriesCraft\Taxonomy
 */

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
class SeriesTaxonomyAdmin {

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
	 *
	 * @var SeriesRepositoryInterface
	 */
	private SeriesRepositoryInterface $repository;

	/**
	 * Constructor.
	 *
	 * @param SeriesRepositoryInterface $repository Series repository instance.
	 */
	public function __construct( SeriesRepositoryInterface $repository ) {
		$this->repository = $repository;
	}

	/**
	 * Registers required WordPress admin actions.
	 *
	 * @return void
	 */
	public function register(): void {
		add_action( SeriesTaxonomy::TAXONOMY . '_edit_form_fields', array( $this, 'render_order_field' ) );
		add_action( 'edited_' . SeriesTaxonomy::TAXONOMY, array( $this, 'save_order_field' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_scripts' ) );
	}

	/**
	 * Enqueues jQuery UI Sortable and inline scripts on the series term editing screen.
	 *
	 * @param string $hook_suffix Current admin page hook suffix.
	 * @return void
	 */
	public function enqueue_scripts( string $hook_suffix ): void {
		if ( 'term.php' !== $hook_suffix ) {
			return;
		}

		$screen = get_current_screen();
		if ( ! $screen || SeriesTaxonomy::TAXONOMY !== $screen->taxonomy ) {
			return;
		}

		wp_enqueue_script( 'jquery-ui-sortable' );

		$css_url = defined( 'SCFT_PLUGIN_URL' )
			? SCFT_PLUGIN_URL . 'assets/css/admin.css'
			: content_url( 'plugins/SeriesCraft/assets/css/admin.css' );

		wp_enqueue_style(
			'seriescraft-admin-taxonomy',
			$css_url,
			array( 'dashicons' ),
			defined( 'SCFT_PLUGIN_VERSION' ) ? SCFT_PLUGIN_VERSION : '1.0.0'
		);

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$term_id  = isset( $_GET['tag_ID'] ) ? (int) $_GET['tag_ID'] : 0;
		$rest_url = function_exists( 'rest_url' )
			? rest_url( 'series-craft/v1/series/' . $term_id . '/order' )
			: '/wp-json/series-craft/v1/series/' . $term_id . '/order';

		$rest_nonce = function_exists( 'wp_create_nonce' ) ? wp_create_nonce( 'wp_rest' ) : '';

		$inline_js = sprintf(
			'jQuery(function($) {
    var $sortable = $("#series-order-sortable");
    var $input = $("#series_post_order");
    var $status = $("#sc-order-status");
    var restUrl = %s;
    var restNonce = %s;

    if ($sortable.length && $sortable.sortable) {
        $sortable.sortable({
            placeholder: "ui-sortable-placeholder",
            cursor: "grabbing",
            update: function() {
                var order = $sortable.sortable("toArray", { attribute: "data-post-id" });
                $input.val(order.join(","));

                if (restUrl && order.length > 0) {
                    $status.html("<span class=\"sc-status-saving\"><span class=\"spinner is-active\"></span> Saving order...</span>").show();
                    var numericIds = order.map(function(id) { return parseInt(id, 10); }).filter(function(id) { return !isNaN(id) && id > 0; });

                    fetch(restUrl, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-WP-Nonce": restNonce
                        },
                        body: JSON.stringify({ post_ids: numericIds })
                    })
                    .then(function(res) {
                        if (!res.ok) throw new Error("HTTP " + res.status);
                        return res.json();
                    })
                    .then(function() {
                        $status.html("<span class=\"sc-status-success\">✓ Order saved</span>");
                        setTimeout(function() {
                            $status.fadeOut(400, function() { $(this).empty().show(); });
                        }, 2500);
                    })
                    .catch(function(err) {
                        $status.html("<span class=\"sc-status-error\">Save error: " + err.message + "</span>");
                    });
                }
            }
        });
    }
});',
			wp_json_encode( $rest_url ),
			wp_json_encode( $rest_nonce )
		);

		wp_add_inline_script( 'jquery-ui-sortable', $inline_js );
	}

	/**
	 * Renders the classic post reordering UI inside the term edit screen.
	 *
	 * @param WP_Term $term Current taxonomy term object.
	 * @return void
	 */
	public function render_order_field( WP_Term $term ): void {
		$posts    = $this->repository->get_series_posts( (int) $term->term_id );
		$post_ids = array_map( static fn( $post ): int => (int) $post->ID, $posts );

		wp_nonce_field( self::NONCE_ACTION, self::NONCE_NAME );
		?>
		<tr class="form-field series-order-wrap">
			<th scope="row">
				<label><?php esc_html_e( 'Series Post Order', 'series-craft' ); ?></label>
			</th>
			<td>
				<input type="hidden" id="series_post_order" name="series_post_order" value="<?php echo esc_attr( implode( ',', $post_ids ) ); ?>" />
				<ul id="series-order-sortable" class="sc-sortable-post-list">
					<?php if ( empty( $posts ) ) : ?>
						<li class="sc-sortable-empty">
							<?php esc_html_e( 'No posts assigned to this series yet.', 'series-craft' ); ?>
						</li>
					<?php else : ?>
						<?php foreach ( $posts as $post ) : ?>
							<li class="sc-sortable-post-item" data-post-id="<?php echo esc_attr( (string) $post->ID ); ?>">
								<span class="sc-sortable-handle dashicons dashicons-menu" aria-hidden="true"></span>
								<span class="sc-sortable-title"><?php echo esc_html( $post->post_title ); ?></span>
							</li>
						<?php endforeach; ?>
					<?php endif; ?>
				</ul>
				<div id="sc-order-status" class="sc-order-status" aria-live="polite"></div>
				<p class="description">
					<?php esc_html_e( 'Drag and drop posts to define explicit sequence order, then click Update.', 'series-craft' ); ?>
				</p>
			</td>
		</tr>
		<?php
	}

	/**
	 * Saves reordered posts from submitted term form data.
	 *
	 * @param int $term_id Current taxonomy term ID.
	 * @return void
	 */
	public function save_order_field( int $term_id ): void {
		if ( ! isset( $_POST[ self::NONCE_NAME ] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST[ self::NONCE_NAME ] ) ), self::NONCE_ACTION ) ) {
			return;
		}

		if ( ! current_user_can( 'manage_categories' ) ) {
			return;
		}

		if ( empty( $_POST['series_post_order'] ) ) {
			return;
		}

		$raw_order   = sanitize_text_field( wp_unslash( $_POST['series_post_order'] ) );
		$ordered_ids = array_filter(
			array_map( 'intval', explode( ',', $raw_order ) ),
			static fn( int $id ): bool => $id > 0
		);

		if ( ! empty( $ordered_ids ) ) {
			$this->repository->update_series_order( $term_id, array_values( $ordered_ids ) );
		}
	}
}