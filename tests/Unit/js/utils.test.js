/**
 * Hello-World unit test — JS tier.
 *
 * Pure Node.js test; no WordPress or browser dependency.
 * Verifies the Jest pipeline is wired correctly.
 *
 * Add real utility / helper tests here as JS source files are added to src/.
 */

describe( 'SeriesCraft JS utilities (Hello World)', () => {
	test( 'arithmetic sanity check', () => {
		expect( 1 + 1 ).toBe( 2 );
	} );

	test( 'string helpers work in Node', () => {
		const slug = 'series-craft';
		expect( slug ).toMatch( /^[a-z-]+$/ );
		expect( slug.split( '-' ) ).toHaveLength( 2 );
	} );

	test( 'plugin slug is correctly formatted', () => {
		const pluginSlug = 'series-craft';
		expect( pluginSlug ).toBe( pluginSlug.toLowerCase() );
		expect( pluginSlug ).not.toContain( ' ' );
	} );
} );
