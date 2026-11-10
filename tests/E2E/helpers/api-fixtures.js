// @ts-check
/**
 * E2E Helper Module: WordPress & SeriesCraft REST API Fixtures
 *
 * Provides deterministic REST API data seeding and teardown utilities for creating
 * and cleaning up series taxonomy terms, posts, post ordering, and series settings
 * using `/?rest_route=` query routing across Playwright E2E test suites.
 *
 * @covers
 * - Backend (PHP): src/src/Taxonomy/SeriesTaxonomy.php, src/src/Api/Controllers/SeriesRestController.php, src/src/Api/Controllers/SettingsRestController.php
 * - Frontend (JS/React): resources/js/api/seriesClient.js
 *
 * Test Scenarios:
 * 1. Retrieve authenticated `wp_rest` nonce via AJAX or `window.wpApiSettings`.
 * 2. Create and delete `series` terms and `post` entities via `/wp/v2/` REST routes.
 * 3. Configure per-series layout/custom styles via `/series-craft/v1/series/<id>/settings`.
 * 4. Persist explicit series post ordering via `/series-craft/v1/series/<id>/order`.
 * 5. Track and automatically clean up seeded posts and series terms in reverse order (`FixtureTracker`).
 */

/**
 * Retrieve a valid `wp_rest` nonce for the currently authenticated browser session.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>}
 */
export async function getRestNonce( page ) {
	// 1. Try built-in WordPress core rest-nonce AJAX action first (fast, no navigation needed).
	const response = await page.request.get( '/wp-admin/admin-ajax.php?action=rest-nonce' );
	if ( response.ok() ) {
		const nonce = ( await response.text() ).trim();
		if ( nonce && nonce !== '0' && nonce !== '-1' ) {
			return nonce;
		}
	}

	// 2. Fallback: read wpApiSettings.nonce from an admin screen.
	if ( ! page.url().includes( '/wp-admin/' ) ) {
		await page.goto( '/wp-admin/' );
	}
	const nonceFromWindow = await page.evaluate( () => {
		// @ts-ignore
		return window.wpApiSettings?.nonce || '';
	} );
	if ( nonceFromWindow ) {
		return nonceFromWindow;
	}

	throw new Error( 'Unable to retrieve WordPress REST API nonce (`wp_rest`). Ensure the user is authenticated.' );
}

/**
 * Build a `/?rest_route=` URL with optional query parameters.
 *
 * @param {string} route     REST route starting with `/` (e.g. `/wp/v2/posts`).
 * @param {Record<string, string|number|boolean>} [params] Additional query params.
 * @returns {string}
 */
export function buildRestUrl( route, params = {} ) {
	const searchParams = new URLSearchParams( { rest_route: route } );
	for ( const [ key, value ] of Object.entries( params ) ) {
		searchParams.set( key, String( value ) );
	}
	return `/?${ searchParams.toString() }`;
}

/**
 * Create a new `series` taxonomy term via the WordPress REST API.
 * Optionally configures SeriesCraft layout and custom styles.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Object} [options]
 * @param {string} [options.name]          Series name (defaults to unique timestamped name).
 * @param {string} [options.description]   Series description.
 * @param {string} [options.layout]        Optional layout variant (`link-list`, `link-grid`, `media-list`, `media-grid`).
 * @param {Record<string, any>} [options.customStyles] Optional custom style object.
 * @param {FixtureTracker} [tracker]       Optional tracker for automatic cleanup.
 * @returns {Promise<{ id: number, name: string, slug: string, description: string }>}
 */
export async function createSeries( page, options = {}, tracker = undefined ) {
	const nonce = await getRestNonce( page );
	const name = options.name ?? `E2E Series ${ Date.now() }-${ Math.floor( Math.random() * 1000 ) }`;
	const description = options.description ?? '';

	const response = await page.request.post( buildRestUrl( '/wp/v2/series' ), {
		headers: {
			'X-WP-Nonce': nonce,
			'Content-Type': 'application/json',
		},
		data: {
			name,
			description,
		},
	} );

	if ( ! response.ok() ) {
		const errorText = await response.text();
		throw new Error( `Failed to create series "${ name }" (HTTP ${ response.status() }): ${ errorText }` );
	}

	const term = await response.json();

	if ( tracker ) {
		tracker.trackSeries( term.id );
	}

	if ( options.layout || options.customStyles ) {
		await updateSeriesSettings( page, term.id, {
			layout: options.layout,
			customStyles: options.customStyles,
		} );
	}

	return {
		id: term.id,
		name: term.name,
		slug: term.slug,
		description: term.description,
	};
}

/**
 * Update per-series layout and custom style settings via `/series-craft/v1/series/<id>/settings`.
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} seriesId
 * @param {Object} settings
 * @param {string} [settings.layout]
 * @param {Record<string, any>} [settings.customStyles]
 * @returns {Promise<Record<string, any>>}
 */
export async function updateSeriesSettings( page, seriesId, settings = {} ) {
	const nonce = await getRestNonce( page );
	/** @type {Record<string, any>} */
	const payload = {};
	if ( settings.layout ) {
		payload.layout = settings.layout;
	}
	if ( settings.customStyles ) {
		payload.custom_styles = settings.customStyles;
	}

	const response = await page.request.post(
		buildRestUrl( `/series-craft/v1/series/${ seriesId }/settings` ),
		{
			headers: {
				'X-WP-Nonce': nonce,
				'Content-Type': 'application/json',
			},
			data: payload,
		}
	);

	if ( ! response.ok() ) {
		const errorText = await response.text();
		throw new Error( `Failed to update settings for series ${ seriesId } (HTTP ${ response.status() }): ${ errorText }` );
	}

	return await response.json();
}

/**
 * Create a WordPress post via REST API and optionally assign it to one or more series.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Object} [options]
 * @param {string} [options.title]       Post title.
 * @param {string} [options.content]     Post HTML/block content.
 * @param {'publish'|'draft'|'pending'} [options.status] Post status (default: `publish`).
 * @param {number[]} [options.seriesIds] Array of series term IDs to assign.
 * @param {FixtureTracker} [tracker]     Optional tracker for automatic cleanup.
 * @returns {Promise<{ id: number, title: string, link: string, status: string, series: number[] }>}
 */
export async function createPost( page, options = {}, tracker = undefined ) {
	const nonce = await getRestNonce( page );
	const title = options.title ?? `E2E Post ${ Date.now() }-${ Math.floor( Math.random() * 1000 ) }`;
	const content = options.content ?? '<p>SeriesCraft E2E test post content.</p>';
	const status = options.status ?? 'publish';
	const seriesIds = options.seriesIds ?? [];

	const response = await page.request.post( buildRestUrl( '/wp/v2/posts' ), {
		headers: {
			'X-WP-Nonce': nonce,
			'Content-Type': 'application/json',
		},
		data: {
			title,
			content,
			status,
			series: seriesIds,
		},
	} );

	if ( ! response.ok() ) {
		const errorText = await response.text();
		throw new Error( `Failed to create post "${ title }" (HTTP ${ response.status() }): ${ errorText }` );
	}

	const post = await response.json();

	if ( tracker ) {
		tracker.trackPost( post.id );
	}

	return {
		id: post.id,
		title: post.title?.rendered ?? title,
		link: post.link,
		status: post.status,
		series: post.series ?? [],
	};
}

/**
 * Explicitly set the post sequence order for a series via `/series-craft/v1/series/<id>/order`.
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} seriesId
 * @param {number[]} postIds Ordered array of post IDs.
 * @returns {Promise<Record<string, any>>}
 */
export async function setSeriesOrder( page, seriesId, postIds ) {
	const nonce = await getRestNonce( page );
	const response = await page.request.post(
		buildRestUrl( `/series-craft/v1/series/${ seriesId }/order` ),
		{
			headers: {
				'X-WP-Nonce': nonce,
				'Content-Type': 'application/json',
			},
			data: {
				post_ids: postIds,
			},
		}
	);

	if ( ! response.ok() ) {
		const errorText = await response.text();
		throw new Error( `Failed to set post order for series ${ seriesId } (HTTP ${ response.status() }): ${ errorText }` );
	}

	return await response.json();
}

/**
 * Force-delete a post via the WordPress REST API.
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} postId
 */
export async function deletePost( page, postId ) {
	const nonce = await getRestNonce( page );
	await page.request.delete( buildRestUrl( `/wp/v2/posts/${ postId }`, { force: true } ), {
		headers: {
			'X-WP-Nonce': nonce,
		},
	} );
}

/**
 * Force-delete a series term via the WordPress REST API.
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} seriesId
 */
export async function deleteSeries( page, seriesId ) {
	const nonce = await getRestNonce( page );
	await page.request.delete( buildRestUrl( `/wp/v2/series/${ seriesId }`, { force: true } ), {
		headers: {
			'X-WP-Nonce': nonce,
		},
	} );
}

/**
 * Tracks created posts and series terms during a test and cleans them up in reverse order.
 */
export class FixtureTracker {
	constructor() {
		/** @type {number[]} */
		this.postIds = [];
		/** @type {number[]} */
		this.seriesIds = [];
	}

	/**
	 * @param {number} id
	 */
	trackPost( id ) {
		if ( id > 0 && ! this.postIds.includes( id ) ) {
			this.postIds.push( id );
		}
	}

	/**
	 * @param {number} id
	 */
	trackSeries( id ) {
		if ( id > 0 && ! this.seriesIds.includes( id ) ) {
			this.seriesIds.push( id );
		}
	}

	/**
	 * Delete all tracked posts and series terms via REST API.
	 *
	 * @param {import('@playwright/test').Page} page
	 */
	async cleanup( page ) {
		for ( const postId of this.postIds.reverse() ) {
			await deletePost( page, postId ).catch( () => {} );
		}
		this.postIds = [];

		for ( const seriesId of this.seriesIds.reverse() ) {
			await deleteSeries( page, seriesId ).catch( () => {} );
		}
		this.seriesIds = [];
	}
}

