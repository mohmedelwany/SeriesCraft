<?php
/**
 * SeriesTaxonomyTest file.
 *
 * @package SeriesCraft\Tests\Integration\Taxonomy
 */

declare(strict_types=1);

namespace SeriesCraft\Tests\Integration\Taxonomy;

use SeriesCraft\Tests\Integration\IntegrationTestCase;
use SeriesCraft\Taxonomy\SeriesTaxonomy;

/**
 * Class SeriesTaxonomyTest
 *
 * Integration test suite for Series custom taxonomy registration and capabilities.
 * Covers project requirement 3.1:
 * - Verifies custom taxonomy registration in WordPress.
 * - Validates REST API support and endpoint base for Gutenberg compatibility.
 * - Asserts taxonomy association with configured object/post types.
 * - Ensures correct access control capabilities are enforced.
 *
 * @package SeriesCraft\Tests\Integration\Taxonomy
 */
class SeriesTaxonomyTest extends IntegrationTestCase {

	/**
	 * Taxonomy service under test.
	 *
	 * @var SeriesTaxonomy
	 */
	private SeriesTaxonomy $taxonomy;

	/**
	 * Setup test fixture before each test run.
	 */
	protected function setUp(): void {
		parent::setUp();
		$this->taxonomy = new SeriesTaxonomy();
	}

	/**
	 * Test 1: Verify that the custom taxonomy 'series' is successfully registered in WordPress.
	 */
	public function test_01_it_registers_series_custom_taxonomy(): void {
		$this->taxonomy->register();

		$this->assertTrue(
			taxonomy_exists( SeriesTaxonomy::TAXONOMY ),
			'Failed: Taxonomy series is not registered in WordPress.'
		);
	}

	/**
	 * Test 2: Verify that REST API support is enabled with the expected rest_base for Gutenberg integration.
	 */
	public function test_02_it_registers_taxonomy_with_rest_support(): void {
		$this->taxonomy->register();

		$taxonomy_object = get_taxonomy( SeriesTaxonomy::TAXONOMY );

		$this->assertNotNull( $taxonomy_object, 'Failed: Taxonomy object does not exist.' );
		$this->assertTrue( $taxonomy_object->show_in_rest, 'Failed: show_in_rest flag is not enabled.' );
		$this->assertSame(
			SeriesTaxonomy::REST_BASE,
			$taxonomy_object->rest_base,
			'Failed: REST API base does not match the expected constant.'
		);
	}

	/**
	 * Test 3: Verify that the taxonomy can be associated with dynamically configured post types.
	 */
	public function test_03_it_supports_configured_post_types(): void {
		$configured_types = array( 'post', 'page' );
		$this->taxonomy->register( $configured_types );

		$taxonomy_object = get_taxonomy( SeriesTaxonomy::TAXONOMY );

		$this->assertNotNull( $taxonomy_object, 'Failed: Taxonomy object does not exist.' );
		$this->assertContains( 'post', $taxonomy_object->object_type, 'Failed: Taxonomy is not associated with post.' );
		$this->assertContains( 'page', $taxonomy_object->object_type, 'Failed: Taxonomy is not associated with page.' );
	}

	/**
	 * Test 4: Verify that administrative and editing capabilities are properly configured.
	 */
	public function test_04_it_registers_with_manage_categories_capabilities(): void {
		$this->taxonomy->register();

		$taxonomy_object = get_taxonomy( SeriesTaxonomy::TAXONOMY );

		$this->assertNotNull( $taxonomy_object, 'Failed: Taxonomy object does not exist.' );
		$this->assertSame( 'manage_categories', $taxonomy_object->cap->manage_terms );
		$this->assertSame( 'manage_categories', $taxonomy_object->cap->edit_terms );
		$this->assertSame( 'manage_categories', $taxonomy_object->cap->delete_terms );
		$this->assertSame( 'edit_posts', $taxonomy_object->cap->assign_terms );
	}
}
