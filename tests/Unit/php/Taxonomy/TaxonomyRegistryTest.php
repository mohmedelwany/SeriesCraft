<?php
/**
 * TaxonomyRegistryTest unit test suite.
 *
 * @package SeriesCraft\Tests\Unit\Taxonomy
 */

declare(strict_types=1);

namespace SeriesCraft\Tests\Unit\php\Taxonomy;

use Brain\Monkey;
use Brain\Monkey\Functions;
use PHPUnit\Framework\TestCase;
use SeriesCraft\Taxonomy\SeriesTaxonomy;
use SeriesCraft\Taxonomy\TaxonomyRegistry;

/**
 * Class TaxonomyRegistryTest
 *
 * Isolated unit test suite for TaxonomyRegistry alias and inheritance.
 */
class TaxonomyRegistryTest extends TestCase {

	/**
	 * Setup before each test run.
	 */
	protected function setUp(): void {
		parent::setUp();
		Monkey\setUp();

		Functions\when( '__' )->returnArg();
		Functions\when( '_x' )->returnArg();
	}

	/**
	 * Tear down after each test run.
	 */
	protected function tearDown(): void {
		Monkey\tearDown();
		parent::tearDown();
	}

	/**
	 * Test 1: Verifies that TaxonomyRegistry inherits directly from SeriesTaxonomy with type safety.
	 *
	 * @return void
	 */
	public function test_taxonomy_registry_inherits_from_series_taxonomy(): void {
		$this->assertTrue(
			is_subclass_of( TaxonomyRegistry::class, SeriesTaxonomy::class ),
			'Failed: TaxonomyRegistry must extend SeriesTaxonomy.'
		);

		$registry = new TaxonomyRegistry();

		$this->assertInstanceOf( SeriesTaxonomy::class, $registry );
		$this->assertSame( 'series', TaxonomyRegistry::TAXONOMY );
		$this->assertSame( 'series', TaxonomyRegistry::REST_BASE );
	}

	/**
	 * Test 2: Verifies that register calls WordPress register_taxonomy with default object types.
	 *
	 * @return void
	 */
	public function test_register_delegates_to_register_taxonomy_with_default_post_types(): void {
		$registry = new TaxonomyRegistry();

		Functions\expect( 'register_taxonomy' )
			->once()
			->with(
				SeriesTaxonomy::TAXONOMY,
				array( 'post' ),
				\Mockery::on(
					static function ( $args ) {
						return is_array( $args )
							&& true === $args['show_in_rest']
							&& SeriesTaxonomy::REST_BASE === $args['rest_base']
							&& true === $args['show_ui']
							&& false === $args['hierarchical'];
					}
				)
			);

		$registry->register();

		$this->addToAssertionCount( 1 );
	}

	/**
	 * Test 3: Verifies that register forwards custom configured post types to register_taxonomy.
	 *
	 * @return void
	 */
	public function test_register_forwards_custom_object_types(): void {
		$registry     = new TaxonomyRegistry();
		$custom_types = array( 'post', 'lesson', 'tutorial' );

		Functions\expect( 'register_taxonomy' )
			->once()
			->with(
				SeriesTaxonomy::TAXONOMY,
				$custom_types,
				\Mockery::type( 'array' )
			);

		$registry->register( $custom_types );

		$this->addToAssertionCount( 1 );
	}

	/**
	 * Test 4: Verifies that register falls back to default post types when invalid input is provided.
	 *
	 * @return void
	 */
	public function test_register_falls_back_to_default_types_on_invalid_input(): void {
		$registry = new TaxonomyRegistry();

		Functions\expect( 'register_taxonomy' )
			->once()
			->with(
				SeriesTaxonomy::TAXONOMY,
				array( 'post' ),
				\Mockery::type( 'array' )
			);

		$registry->register( array() );

		$this->addToAssertionCount( 1 );
	}
}
