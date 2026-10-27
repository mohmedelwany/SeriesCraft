<?php
/**
 * Admin settings tab navigation shell.
 *
 * Renders the page heading, update notice and tab navigation, then requires
 * the active tab template resolved (from a whitelist) by SeriesSettingsPage::render().
 *
 * Only the active tab's variables are defined in scope:
 * - tab-custom-post-types.php: $eligible_post_types, $supported_types
 * - tab-layouts.php:           $current_layout
 *
 * @var array<string, string> $tabs         Tab slug => label.
 * @var string                $current_tab  Active tab slug.
 * @var string                $tab_template Absolute path to the active tab template.
 * @var bool                  $is_updated   Whether to show the "settings updated" notice.
 *
 * @package SeriesCraft\Admin
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<div class="wrap seriescraft-admin-settings-wrap">
	<h1 class="wp-heading-inline"><?php echo esc_html__( 'SeriesCraft Settings', 'series-craft' ); ?></h1>
	<hr class="wp-header-end">

	<?php if ( true === $is_updated ) : ?>
		<div class="notice notice-success is-dismissible" style="margin-top: 15px;">
			<p><strong><?php esc_html_e( 'Settings updated successfully.', 'series-craft' ); ?></strong></p>
		</div>
	<?php endif; ?>

	<nav class="nav-tab-wrapper wp-clearfix" aria-label="<?php esc_attr_e( 'Settings Tabs', 'series-craft' ); ?>" style="margin-top: 15px;">
		<?php foreach ( $tabs as $scft_tab_key => $scft_tab_title ) : ?>
			<?php
			$scft_tab_url      = add_query_arg(
				array(
					'page' => \SeriesCraft\Admin\SeriesSettingsPage::PAGE_SLUG,
					'tab'  => $scft_tab_key,
				),
				admin_url( 'admin.php' )
			);
			$scft_active_class = ( $current_tab === $scft_tab_key ) ? ' nav-tab-active' : '';
			?>
			<a href="<?php echo esc_url( $scft_tab_url ); ?>" class="nav-tab<?php echo esc_attr( $scft_active_class ); ?>">
				<?php echo esc_html( $scft_tab_title ); ?>
			</a>
		<?php endforeach; ?>
	</nav>

	<div class="seriescraft-tab-content">
		<?php require $tab_template; ?>
	</div>
</div>
