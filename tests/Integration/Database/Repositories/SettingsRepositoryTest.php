<?php
/**
 * SettingsRepositoryTest integration test suite.
 *
 * @package SeriesCraft\Tests\Integration\Database\Repositories
 */

declare(strict_types=1);

namespace SeriesCraft\Tests\Integration\Database\Repositories;

use SeriesCraft\Database\Repositories\SettingsRepository;
use SeriesCraft\Tests\Integration\IntegrationTestCase;

/**
 * Class SettingsRepositoryTest
 *
 * Integration test suite directly testing the SettingsRepository data layer,
 * options persistence, and legacy migration fallbacks.
 */
class SettingsRepositoryTest extends IntegrationTestCase {

	/**
	 * Repository instance under test.
	 *
	 * @var SettingsRepository
	 */
	private SettingsRepository $repository;

	/**
	 * Setup before each test run.
	 */
	protected function setUp(): void {
		parent::setUp();

		$this->repository = new SettingsRepository();

		// Clean options before each test.
		delete_option( SettingsRepository::OPTION_SUPPORTED_POST_TYPES );
		delete_option( SettingsRepository::LEGACY_OPTION_SUPPORTED_POST_TYPES );
		delete_option( SettingsRepository::OPTION_DEFAULT_LAYOUT );
		delete_option( SettingsRepository::LEGACY_OPTION_DEFAULT_LAYOUT );
	}

	/**
	 * Clean up state after each test.
	 */
	protected function tearDown(): void {
		delete_option( SettingsRepository::OPTION_SUPPORTED_POST_TYPES );
		delete_option( SettingsRepository::LEGACY_OPTION_SUPPORTED_POST_TYPES );
		delete_option( SettingsRepository::OPTION_DEFAULT_LAYOUT );
		delete_option( SettingsRepository::LEGACY_OPTION_DEFAULT_LAYOUT );

		parent::tearDown();
	}

	/**
	 * Test 1: Verifies repository returns default supported post types ('post') when empty.
	 */
	public function test_01_returns_default_supported_post_types_when_empty(): void {
		$post_types = $this->repository->get_supported_post_types();

		$this->assertSame(
			array( 'post' ),
			$post_types,
			'Failed: Default supported post types should be array("post").'
		);
	}

	/**
	 * Test 2: Verifies fallback to legacy option when modern option key is absent.
	 */
	public function test_02_reads_legacy_supported_post_types_fallback(): void {
		update_option( SettingsRepository::LEGACY_OPTION_SUPPORTED_POST_TYPES, array( 'post', 'page' ) );

		$post_types = $this->repository->get_supported_post_types();

		$this->assertSame(
			array( 'post', 'page' ),
			$post_types,
			'Failed: Did not fall back to legacy sm_supported_post_types option.'
		);
	}

	/**
	 * Test 3: Verifies saving and reading supported post types using the modern key.
	 */
	public function test_03_persists_and_retrieves_supported_post_types(): void {
		$to_save = array( 'post', 'page', 'custom_book' );
		$saved   = $this->repository->set_supported_post_types( $to_save );

		$this->assertTrue( $saved, 'Failed: set_supported_post_types returned false.' );

		$retrieved = $this->repository->get_supported_post_types();
		$this->assertSame( $to_save, $retrieved );

		// Verify database option key directly.
		$direct_db_value = get_option( SettingsRepository::OPTION_SUPPORTED_POST_TYPES );
		$this->assertSame( $to_save, $direct_db_value );
	}

	/**
	 * Test 4: Verifies repository returns default layout ('link-list') when empty.
	 */
	public function test_04_returns_default_layout_when_empty(): void {
		$layout = $this->repository->get_default_layout();

		$this->assertSame(
			'link-list',
			$layout,
			'Failed: Default layout should be "link-list".'
		);
	}

	/**
	 * Test 5: Verifies fallback to legacy content_variant layout option.
	 */
	public function test_05_reads_legacy_default_layout_fallback(): void {
		update_option( SettingsRepository::LEGACY_OPTION_DEFAULT_LAYOUT, 'media-grid' );

		$layout = $this->repository->get_default_layout();

		$this->assertSame(
			'media-grid',
			$layout,
			'Failed: Did not fall back to legacy content_variant layout option.'
		);
	}

	/**
	 * Test 6: Verifies saving and reading layout using the modern key.
	 */
	public function test_06_persists_and_retrieves_default_layout(): void {
		$saved = $this->repository->set_default_layout( 'media-list' );

		$this->assertTrue( $saved, 'Failed: set_default_layout returned false.' );

		$retrieved = $this->repository->get_default_layout();
		$this->assertSame( 'media-list', $retrieved );

		// Verify database option key directly.
		$direct_db_value = get_option( SettingsRepository::OPTION_DEFAULT_LAYOUT );
		$this->assertSame( 'media-list', $direct_db_value );
	}
}