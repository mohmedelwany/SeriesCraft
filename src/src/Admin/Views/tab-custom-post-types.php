<?php
/**
 * Tab template: Custom Post Types.
 *
 * @var array<string, \WP_Post_Type> $eligible_post_types
 * @var array<int, string>           $supported_types
 *
 * @package SeriesCraft\Admin
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<div class="sm-cpt-wrapper">
	<div class="sm-cpt-container">
		<header class="sm-cpt-header">
			<h1 class="sm-cpt-title"><?php esc_html_e( 'Custom Post Types', 'series-craft' ); ?></h1>
			<p class="sm-cpt-intro"><?php esc_html_e( 'Select the post types that should support series functionality.', 'series-craft' ); ?></p>
		</header>

		<form method="post" action="<?php echo esc_url( admin_url( 'admin.php?page=series-craft&tab=custom-post-types' ) ); ?>" class="sm-cpt-form">
			<?php wp_nonce_field( \SeriesCraft\Admin\SeriesSettingsPage::NONCE_ACTION_CPT, \SeriesCraft\Admin\SeriesSettingsPage::NONCE_NAME_CPT ); ?>

			<section class="sm-cpt-section">
				<h2 class="sm-cpt-section-title"><?php esc_html_e( 'Supported Post Types', 'series-craft' ); ?></h2>
				<p class="sm-cpt-section-desc"><?php esc_html_e( 'Check the post types where you want to enable series features.', 'series-craft' ); ?></p>

				<fieldset class="sm-cpt-fieldset">
					<?php if ( empty( $eligible_post_types ) ) : ?>
						<p class="sm-cpt-empty"><?php esc_html_e( 'No public post types found.', 'series-craft' ); ?></p>
					<?php else : ?>
						<div class="sm-cpt-checkboxes">
							<?php foreach ( $eligible_post_types as $scft_slug => $scft_post_type ) : ?>
								<?php $scft_is_checked = in_array( $scft_slug, $supported_types, true ); ?>
								<label class="sm-cpt-checkbox-label">
									<input
										type="checkbox"
										name="supported_post_types[]"
										value="<?php echo esc_attr( $scft_slug ); ?>"
										class="sm-cpt-checkbox"
										<?php checked( $scft_is_checked ); ?>
									/>
									<span class="sm-cpt-checkbox-text"><?php echo esc_html( $scft_post_type->label ); ?></span>
									<span class="sm-cpt-checkbox-desc"><?php echo esc_html( $scft_slug ); ?></span>
								</label>
							<?php endforeach; ?>
						</div>
					<?php endif; ?>
				</fieldset>
			</section>

			<div class="sm-cpt-actions">
				<button class="button button-primary" type="submit"><?php esc_html_e( 'Save Settings', 'series-craft' ); ?></button>
			</div>
		</form>
	</div>
</div>