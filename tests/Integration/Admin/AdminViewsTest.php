<?php
/**
 * AdminViewsTest integration test suite.
 *
 * @package SeriesCraft\Tests\Integration\Admin
 */

declare(strict_types=1);

namespace SeriesCraft\Tests\Integration\Admin;

use SeriesCraft\Admin\SeriesSettingsPage;
use SeriesCraft\Tests\Integration\IntegrationTestCase;

/**
 * Class AdminViewsTest
 *
 * Validates security, CSRF protection, empty states, checked states,
 * and escaping across administrative view templates:
 * - src/src/Admin/Views/tab-custom-post-types.php
 * - src/src/Admin/Views/tab-layouts.php
 */
class AdminViewsTest extends IntegrationTestCase {

	/**
	 * Helper to render the custom post types view template.
	 *
	 * @param array<string, \WP_Post_Type> $eligible_post_types Eligible post types map.
	 * @param array<int, string>           $supported_types    Currently supported types.
	 * @return string Rendered HTML markup.
	 */
	private function render_cpt_view( array $eligible_post_types, array $supported_types ): string {
		ob_start();
		$view_path = dirname( __DIR__, 3 ) . '/src/src/Admin/Views/tab-custom-post-types.php';
		include $view_path;
		return (string) ob_get_clean();
	}

	/**
	 * Helper to render the layouts view template.
	 *
	 * @param string $current_layout Currently active layout slug.
	 * @return string Rendered HTML markup.
	 */
	private function render_layouts_view( string $current_layout ): string {
		ob_start();
		$view_path = dirname( __DIR__, 3 ) . '/src/src/Admin/Views/tab-layouts.php';
		include $view_path;
		return (string) ob_get_clean();
	}

	/**
	 * Extracts the value of a nonce field from HTML markup.
	 *
	 * @param string $html       HTML markup containing the nonce field.
	 * @param string $nonce_name The name attribute of the nonce input.
	 * @return string The nonce value, or empty string if not found.
	 */
	private function extract_nonce_value( string $html, string $nonce_name ): string {
		$pattern = '/name="' . preg_quote( $nonce_name, '/' ) . '"\s+value="([^"]+)"/i';
		if ( preg_match( $pattern, $html, $matches ) ) {
			return $matches[1];
		}
		// Fallback for reversed attribute order: value="..." name="..."
		$reversed_pattern = '/value="([^"]+)"\s+name="' . preg_quote( $nonce_name, '/' ) . '"/i';
		if ( preg_match( $reversed_pattern, $html, $matches ) ) {
			return $matches[1];
		}
		return '';
	}

	/**
	 * Test 1: Verifies Custom Post Types view renders CSRF nonce, correct action URL, and submit button.
	 */
	public function test_cpt_view_renders_csrf_nonce_and_form_action(): void {
		$eligible_post_types = (array) get_post_types( array( 'public' => true ), 'objects' );
		$supported_types    = array( 'post' );

		$output = $this->render_cpt_view( $eligible_post_types, $supported_types );

		$expected_action = esc_url( admin_url( 'admin.php?page=series-craft&tab=custom-post-types' ) );
		$this->assertStringContainsString( 'action="' . $expected_action . '"', $output );
		$this->assertStringContainsString( 'method="post"', $output );
		$this->assertStringContainsString( 'name="' . SeriesSettingsPage::NONCE_NAME_CPT . '"', $output );

		$nonce = $this->extract_nonce_value( $output, SeriesSettingsPage::NONCE_NAME_CPT );
		$this->assertNotEmpty( $nonce, 'Nonce field value should not be empty.' );
		$this->assertSame(
			1,
			wp_verify_nonce( $nonce, SeriesSettingsPage::NONCE_ACTION_CPT ),
			'Rendered nonce should verify against NONCE_ACTION_CPT.'
		);

		$this->assertStringContainsString( '<button class="button button-primary" type="submit"', $output );
		$this->assertStringContainsString( 'Save Settings', $output );
	}

	/**
	 * Test 2: Verifies Custom Post Types view displays empty state notice when no public post types exist.
	 */
	public function test_cpt_view_renders_empty_state_when_no_types_eligible(): void {
		$eligible_post_types = array();
		$supported_types    = array( 'post' );

		$output = $this->render_cpt_view( $eligible_post_types, $supported_types );

		$this->assertStringContainsString( '<p class="sm-cpt-empty">No public post types found.</p>', $output );
		$this->assertStringNotContainsString( 'sm-cpt-checkboxes', $output );
		$this->assertStringNotContainsString( 'name="supported_post_types[]"', $output );
	}

	/**
	 * Test 3: Verifies Custom Post Types view renders checkboxes with accurate checked states and escaped labels.
	 */
	public function test_cpt_view_renders_checkboxes_with_checked_states_and_escaping(): void {
		$post_cpt = get_post_type_object( 'post' );
		$page_cpt = get_post_type_object( 'page' );

		$xss_cpt        = new \stdClass();
		$xss_cpt->label = '<script>alert("xss")</script> & News';
		$xss_cpt->name  = 'xss_cpt';

		$eligible_post_types = array(
			'post'    => $post_cpt,
			'page'    => $page_cpt,
			'xss_cpt' => (object) $xss_cpt,
		);
		$supported_types = array( 'post' );

		$output = $this->render_cpt_view( $eligible_post_types, $supported_types );

		// Checkbox for 'post' must be checked.
		$this->assertMatchesRegularExpression(
			'/<input[^>]+value="post"[^>]+checked(?:=\'checked\'|="checked")?/i',
			$output,
			'The post checkbox must be checked.'
		);

		// Checkbox for 'page' must NOT be checked.
		$this->assertDoesNotMatchRegularExpression(
			'/<input[^>]+value="page"[^>]+checked/i',
			$output,
			'The page checkbox must not be checked.'
		);

		// Label with HTML/symbols must be escaped using esc_html.
		$this->assertStringContainsString( '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; News', $output );
		$this->assertStringNotContainsString( '<script>alert("xss")</script>', $output );
	}

	/**
	 * Test 4: Verifies Layouts view renders CSRF nonce, correct action URL, and submit button.
	 */
	public function test_layouts_view_renders_csrf_nonce_and_form_action(): void {
		$output = $this->render_layouts_view( 'media-grid' );

		$expected_action = esc_url( admin_url( 'admin.php?page=series-craft&tab=layouts' ) );
		$this->assertStringContainsString( 'action="' . $expected_action . '"', $output );
		$this->assertStringContainsString( 'method="post"', $output );
		$this->assertStringContainsString( 'name="content_variant_form"', $output );
		$this->assertStringContainsString( 'name="' . SeriesSettingsPage::NONCE_NAME_LAYOUT . '"', $output );

		$nonce = $this->extract_nonce_value( $output, SeriesSettingsPage::NONCE_NAME_LAYOUT );
		$this->assertNotEmpty( $nonce, 'Layout nonce field value should not be empty.' );
		$this->assertSame(
			1,
			wp_verify_nonce( $nonce, SeriesSettingsPage::NONCE_ACTION_LAYOUT ),
			'Rendered nonce should verify against NONCE_ACTION_LAYOUT.'
		);

		$this->assertStringContainsString( '<button class="button button-primary" type="submit"', $output );
		$this->assertStringContainsString( 'Save Settings', $output );
	}

	/**
	 * Test 5: Verifies Layouts view renders all 4 layout options and correctly checks the active layout.
	 */
	public function test_layouts_view_renders_all_four_options_and_marks_active_layout_checked(): void {
		// Test active layout = media-grid.
		$output = $this->render_layouts_view( 'media-grid' );

		$this->assertMatchesRegularExpression(
			'/<input[^>]+value="media-grid"[^>]+checked(?:=\'checked\'|="checked")?/i',
			$output,
			'media-grid must be checked when active.'
		);
		$this->assertDoesNotMatchRegularExpression(
			'/<input[^>]+value="link-grid"[^>]+checked/i',
			$output,
			'link-grid must not be checked when media-grid is active.'
		);
		$this->assertDoesNotMatchRegularExpression(
			'/<input[^>]+value="media-list"[^>]+checked/i',
			$output,
			'media-list must not be checked when media-grid is active.'
		);
		$this->assertDoesNotMatchRegularExpression(
			'/<input[^>]+value="link-list"[^>]+checked/i',
			$output,
			'link-list must not be checked when media-grid is active.'
		);

		// Test active layout = link-list.
		$output_link = $this->render_layouts_view( 'link-list' );

		$this->assertMatchesRegularExpression(
			'/<input[^>]+value="link-list"[^>]+checked(?:=\'checked\'|="checked")?/i',
			$output_link,
			'link-list must be checked when active.'
		);
		$this->assertDoesNotMatchRegularExpression(
			'/<input[^>]+value="media-grid"[^>]+checked/i',
			$output_link,
			'media-grid must not be checked when link-list is active.'
		);
	}

	/**
	 * Test 6: Verifies Layouts view renders escaped titles and descriptions for all wireframe cards.
	 */
	public function test_layouts_view_renders_escaped_card_labels_and_descriptions(): void {
		$output = $this->render_layouts_view( 'media-grid' );

		$this->assertStringContainsString( 'Media Grid Layout', $output );
		$this->assertStringContainsString( 'Link Grid Layout', $output );
		$this->assertStringContainsString( 'Media List', $output );
		$this->assertStringContainsString( 'Link List', $output );

		$this->assertStringContainsString( 'Clean multi-column display', $output );
		$this->assertStringContainsString( 'Display posts with featured images and titles', $output );
		$this->assertStringContainsString( 'Minimal link-style display with icons and titles', $output );
	}
}
