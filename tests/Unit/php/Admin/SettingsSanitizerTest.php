<?php
/**
 * SettingsSanitizerTest unit test suite.
 *
 * @package SeriesCraft\Tests\Unit\Admin
 */

declare(strict_types=1);

namespace SeriesCraft\Tests\Unit\php\Admin;

use Brain\Monkey;
use Brain\Monkey\Functions;
use PHPUnit\Framework\TestCase;
use SeriesCraft\Admin\SettingsSanitizer;

/**
 * Class SettingsSanitizerTest
 *
 * Pure isolated unit tests for administrative configuration options sanitization and validation.
 */
class SettingsSanitizerTest extends TestCase {

	/**
	 * Setup before each test run.
	 */
	protected function setUp(): void {
		parent::setUp();
		Monkey\setUp();

		Functions\when( 'sanitize_key' )->alias(
			static function ( $key ) {
				return preg_replace( '/[^a-z0-9_-]/', '', strtolower( (string) $key ) );
			}
		);
	}

	/**
	 * Tear down after each test run.
	 */
	protected function tearDown(): void {
		Monkey\tearDown();
		parent::tearDown();
	}

	/**
	 * Test 1: Verifies sanitize_post_types preserves valid registered post types and filters unallowed candidates.
	 *
	 * @return void
	 */
	public function test_sanitize_post_types_filters_against_allowed_candidates(): void {
		$allowed   = array( 'post', 'page', 'tutorial', 'book' );
		$candidate = array( 'post', 'tutorial', 'unregistered_cpt', '<script>alert(1)</script>', 'UPPERCASE_KEY' );

		$sanitized = SettingsSanitizer::sanitize_post_types( $candidate, $allowed );

		$this->assertSame( array( 'post', 'tutorial' ), $sanitized );
	}

	/**
	 * Test 2: Verifies sanitize_post_types falls back to DEFAULT_POST_TYPES on non-array or empty inputs.
	 *
	 * @return void
	 */
	public function test_sanitize_post_types_falls_back_on_malformed_input(): void {
		$allowed = array( 'post', 'page' );

		$this->assertSame( array( 'post' ), SettingsSanitizer::sanitize_post_types( null, $allowed ) );
		$this->assertSame( array( 'post' ), SettingsSanitizer::sanitize_post_types( 'not-an-array', $allowed ) );
		$this->assertSame( array( 'post' ), SettingsSanitizer::sanitize_post_types( 12345, $allowed ) );
		$this->assertSame( array( 'post' ), SettingsSanitizer::sanitize_post_types( array(), $allowed ) );
		$this->assertSame( array( 'post' ), SettingsSanitizer::sanitize_post_types( array( 'invalid_only' ), $allowed ) );
		$this->assertSame( array( 'post' ), SettingsSanitizer::sanitize_post_types( array( '', null, false ), $allowed ) );
	}

	/**
	 * Test 3: Verifies sanitize_post_types deduplicates and normalizes keys.
	 *
	 * @return void
	 */
	public function test_sanitize_post_types_deduplicates_and_normalizes(): void {
		$candidate = array( 'post', 'post', 'custom_post', 'custom_post' );

		$sanitized = SettingsSanitizer::sanitize_post_types( $candidate );

		$this->assertSame( array( 'post', 'custom_post' ), $sanitized );
	}

	/**
	 * Test 4: Verifies sanitize_layout passes permitted whitelist layouts unaltered.
	 *
	 * @return void
	 */
	public function test_sanitize_layout_allows_permitted_whitelist(): void {
		$valid_layouts = array( 'media-grid', 'link-grid', 'media-list', 'link-list' );

		foreach ( $valid_layouts as $layout ) {
			$this->assertSame( $layout, SettingsSanitizer::sanitize_layout( $layout ) );
		}
	}

	/**
	 * Test 5: Verifies sanitize_layout falls back to default layout for arbitrary or invalid strings.
	 *
	 * @return void
	 */
	public function test_sanitize_layout_falls_back_on_invalid_layout(): void {
		$this->assertSame( 'link-list', SettingsSanitizer::sanitize_layout( 'invalid-layout-slug' ) );
		$this->assertSame( 'link-list', SettingsSanitizer::sanitize_layout( '<script>malicious</script>' ) );
		$this->assertSame( 'link-list', SettingsSanitizer::sanitize_layout( 999 ) );
		$this->assertSame( 'link-list', SettingsSanitizer::sanitize_layout( null ) );
		$this->assertSame( 'link-list', SettingsSanitizer::sanitize_layout( array() ) );
	}

	/**
	 * Test 6: Verifies sanitize_layout respects custom valid default fallback.
	 *
	 * @return void
	 */
	public function test_sanitize_layout_respects_custom_default_fallback(): void {
		$this->assertSame( 'media-grid', SettingsSanitizer::sanitize_layout( 'unsupported_layout', 'media-grid' ) );
		$this->assertSame( 'link-list', SettingsSanitizer::sanitize_layout( 'unsupported_layout', 'also_invalid_default' ) );
	}

	/**
	 * Test 7: Verifies get_allowed_layouts returns exact ALLOWED_LAYOUTS constant.
	 *
	 * @return void
	 */
	public function test_get_allowed_layouts_matches_constant(): void {
		$this->assertSame( SettingsSanitizer::ALLOWED_LAYOUTS, SettingsSanitizer::get_allowed_layouts() );
	}
}
