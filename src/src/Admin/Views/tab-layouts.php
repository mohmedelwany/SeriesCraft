<?php
/**
 * Tab template: Layouts.
 *
 * @var string $current_layout
 *
 * @package SeriesCraft\Admin
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<main class="sm-layouts-main">
	<div class="sm-layouts-container">
		<header class="sm-layouts-header">
			<h1 class="sm-layouts-title"><?php esc_html_e( 'Post Layout Settings', 'series-craft' ); ?></h1>
			<p class="sm-layouts-description">
				<?php esc_html_e( 'Configure how your content series and archives are displayed to your readers. These settings will override global theme defaults.', 'series-craft' ); ?>
			</p>
		</header>

		<form action="<?php echo esc_url( admin_url( 'admin.php?page=series-craft&tab=layouts' ) ); ?>" class="sm-layouts-form" method="post" name="content_variant_form">
			<?php wp_nonce_field( \SeriesCraft\Admin\SeriesSettingsPage::NONCE_ACTION_LAYOUT, \SeriesCraft\Admin\SeriesSettingsPage::NONCE_NAME_LAYOUT ); ?>

			<!-- Section: Layout Selection -->
			<section class="sm-layouts-section">
				<div class="sm-layouts-section-header">
					<span class="material-symbols-outlined" data-icon="dashboard_customize">dashboard_customize</span>
					<h3 class="sm-layouts-section-title">
						<?php esc_html_e( 'Display Layout', 'series-craft' ); ?>
						<span class="screen-reader-text"> (<?php esc_html_e( 'Default Post Layout', 'series-craft' ); ?>)</span>
					</h3>
				</div>

				<div class="sm-layouts-cards">
					<!-- Layout Card: Media Grid -->
					<label class="sm-layout-card">
						<input class="sm-layout-input" name="content_variant" type="radio" value="media-grid" <?php checked( $current_layout, 'media-grid' ); ?> />
						<div class="sm-layout-card-content">
							<div class="sm-layout-preview sm-preview-grid-container">
								<div class="sm-preview-grid">
									<div class="sm-preview-item"><span class="material-symbols-outlined">image</span><div class="sm-preview-lines"><div class="sm-preview-line sm-preview-line-title"></div><div class="sm-preview-line sm-preview-line-part"></div></div></div>
									<div class="sm-preview-item"><span class="material-symbols-outlined">image</span><div class="sm-preview-lines"><div class="sm-preview-line sm-preview-line-title"></div><div class="sm-preview-line sm-preview-line-part"></div></div></div>
									<div class="sm-preview-item"><span class="material-symbols-outlined">image</span><div class="sm-preview-lines"><div class="sm-preview-line sm-preview-line-title"></div><div class="sm-preview-line sm-preview-line-part"></div></div></div>
									<div class="sm-preview-item"><span class="material-symbols-outlined">image</span><div class="sm-preview-lines"><div class="sm-preview-line sm-preview-line-title"></div><div class="sm-preview-line sm-preview-line-part"></div></div></div>
									<div class="sm-preview-item"><span class="material-symbols-outlined">image</span><div class="sm-preview-lines"><div class="sm-preview-line sm-preview-line-title"></div><div class="sm-preview-line sm-preview-line-part"></div></div></div>
									<div class="sm-preview-item"><span class="material-symbols-outlined">image</span><div class="sm-preview-lines"><div class="sm-preview-line sm-preview-line-title"></div><div class="sm-preview-line sm-preview-line-part"></div></div></div>
								</div>
							</div>
							<div class="sm-layout-info">
								<div class="sm-layout-text">
									<p class="sm-layout-name"><?php esc_html_e( 'Media Grid Layout', 'series-craft' ); ?></p>
									<p class="sm-layout-desc"><?php esc_html_e( 'Clean multi-column display', 'series-craft' ); ?></p>
								</div>
								<div class="sm-layout-check">
									<span class="material-symbols-outlined" data-icon="check_circle">check_circle</span>
								</div>
							</div>
						</div>
					</label>

					<!-- Layout Card: Link Grid -->
					<label class="sm-layout-card">
						<input class="sm-layout-input" name="content_variant" type="radio" value="link-grid" <?php checked( $current_layout, 'link-grid' ); ?> />
						<div class="sm-layout-card-content">
							<div class="sm-layout-preview sm-preview-grid-container">
								<div class="sm-preview-grid">
									<div class="sm-preview-item"><span class="material-symbols-outlined">link</span><div class="sm-preview-lines"><div class="sm-preview-line sm-preview-line-title"></div><div class="sm-preview-line sm-preview-line-part"></div></div></div>
									<div class="sm-preview-item"><span class="material-symbols-outlined">link</span><div class="sm-preview-lines"><div class="sm-preview-line sm-preview-line-title"></div><div class="sm-preview-line sm-preview-line-part"></div></div></div>
									<div class="sm-preview-item"><span class="material-symbols-outlined">link</span><div class="sm-preview-lines"><div class="sm-preview-line sm-preview-line-title"></div><div class="sm-preview-line sm-preview-line-part"></div></div></div>
									<div class="sm-preview-item"><span class="material-symbols-outlined">link</span><div class="sm-preview-lines"><div class="sm-preview-line sm-preview-line-title"></div><div class="sm-preview-line sm-preview-line-part"></div></div></div>
									<div class="sm-preview-item"><span class="material-symbols-outlined">link</span><div class="sm-preview-lines"><div class="sm-preview-line sm-preview-line-title"></div><div class="sm-preview-line sm-preview-line-part"></div></div></div>
									<div class="sm-preview-item"><span class="material-symbols-outlined">link</span><div class="sm-preview-lines"><div class="sm-preview-line sm-preview-line-title"></div><div class="sm-preview-line sm-preview-line-part"></div></div></div>
								</div>
							</div>
							<div class="sm-layout-info">
								<div class="sm-layout-text">
									<p class="sm-layout-name"><?php esc_html_e( 'Link Grid Layout', 'series-craft' ); ?></p>
									<p class="sm-layout-desc"><?php esc_html_e( 'Clean multi-column display', 'series-craft' ); ?></p>
								</div>
								<div class="sm-layout-check">
									<span class="material-symbols-outlined" data-icon="check_circle">check_circle</span>
								</div>
							</div>
						</div>
					</label>

					<!-- Layout Card: Media List -->
					<label class="sm-layout-card">
						<input class="sm-layout-input" name="content_variant" type="radio" value="media-list" <?php checked( $current_layout, 'media-list' ); ?> />
						<div class="sm-layout-card-content">
							<div class="sm-layout-preview sm-preview-list-container">
								<div class="sm-preview-list">
									<div class="sm-preview-list-item"><span class="material-symbols-outlined">image</span><div class="sm-preview-lines"><div class="sm-preview-line sm-preview-line-title"></div><div class="sm-preview-line sm-preview-line-part"></div></div></div>
									<div class="sm-preview-list-item"><span class="material-symbols-outlined">image</span><div class="sm-preview-lines"><div class="sm-preview-line sm-preview-line-title"></div><div class="sm-preview-line sm-preview-line-part"></div></div></div>
									<div class="sm-preview-list-item"><span class="material-symbols-outlined">image</span><div class="sm-preview-lines"><div class="sm-preview-line sm-preview-line-title"></div><div class="sm-preview-line sm-preview-line-part"></div></div></div>
								</div>
							</div>
							<div class="sm-layout-info">
								<div class="sm-layout-text">
									<p class="sm-layout-name"><?php esc_html_e( 'Media List', 'series-craft' ); ?></p>
									<p class="sm-layout-desc"><?php esc_html_e( 'Display posts with featured images and titles', 'series-craft' ); ?></p>
								</div>
								<div class="sm-layout-check">
									<span class="material-symbols-outlined" data-icon="check_circle">check_circle</span>
								</div>
							</div>
						</div>
					</label>

					<!-- Layout Card: Link List -->
					<label class="sm-layout-card">
						<input class="sm-layout-input" name="content_variant" type="radio" value="link-list" <?php checked( $current_layout, 'link-list' ); ?> />
						<div class="sm-layout-card-content">
							<div class="sm-layout-preview sm-preview-list-container">
								<div class="sm-preview-list">
									<div class="sm-preview-list-item-link"><div class="sm-preview-icon-link"><span class="material-symbols-outlined">link</span></div><div class="sm-preview-lines"><div class="sm-preview-line sm-preview-line-title"></div><div class="sm-preview-line sm-preview-line-part"></div></div></div>
									<div class="sm-preview-list-item-link"><div class="sm-preview-icon-link"><span class="material-symbols-outlined">link</span></div><div class="sm-preview-lines"><div class="sm-preview-line sm-preview-line-title"></div><div class="sm-preview-line sm-preview-line-part"></div></div></div>
									<div class="sm-preview-list-item-link"><div class="sm-preview-icon-link"><span class="material-symbols-outlined">link</span></div><div class="sm-preview-lines"><div class="sm-preview-line sm-preview-line-title"></div><div class="sm-preview-line sm-preview-line-part"></div></div></div>
								</div>
							</div>
							<div class="sm-layout-info">
								<div class="sm-layout-text">
									<p class="sm-layout-name"><?php esc_html_e( 'Link List', 'series-craft' ); ?></p>
									<p class="sm-layout-desc"><?php esc_html_e( 'Minimal link-style display with icons and titles', 'series-craft' ); ?></p>
								</div>
								<div class="sm-layout-check">
									<span class="material-symbols-outlined" data-icon="check_circle">check_circle</span>
								</div>
							</div>
						</div>
					</label>
				</div>
			</section>

			<div class="sm-layouts-actions">
				<button class="button button-primary" type="submit"><?php esc_html_e( 'Save Settings', 'series-craft' ); ?></button>
			</div>
		</form>
	</div>
</main>