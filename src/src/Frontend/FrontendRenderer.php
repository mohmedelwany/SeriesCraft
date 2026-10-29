<?php
/**
 * FrontendRenderer definition.
 *
 * @package SeriesCraft\Frontend
 */

declare(strict_types=1);

namespace SeriesCraft\Frontend;

use SeriesCraft\Database\Repositories\SeriesRepositoryInterface;
use SeriesCraft\Services\NavigationService;
use SeriesCraft\Services\StyleSanitizer;
use SeriesCraft\Services\ThumbnailResolver;
use SeriesCraft\Views\AccordionLayout;
use SeriesCraft\Views\HeaderView;
use SeriesCraft\Views\NavigationView;
use SeriesCraft\Views\Variants\LinkListView;
use SeriesCraft\Views\Variants\LinkGridView;
use SeriesCraft\Views\Variants\MediaListView;
use SeriesCraft\Views\Variants\MediaGridView;
use SeriesCraft\Views\Variants\VariantViewInterface;

/**
 * Class FrontendRenderer
 *
 * Injects series navigation boxes and variant layouts into single post content.
 */
class FrontendRenderer {



	/**
	 * Series repository instance.
	 *
	 * @var SeriesRepositoryInterface
	 */
	private SeriesRepositoryInterface $repository;

	/**
	 * Navigation service instance.
	 *
	 * @var NavigationService
	 */
	private NavigationService $navigation_service;

	/**
	 * Style sanitizer instance.
	 *
	 * @var StyleSanitizer
	 */
	private StyleSanitizer $style_sanitizer;

	/**
	 * Accordion layout instance.
	 *
	 * @var AccordionLayout
	 */
	private AccordionLayout $accordion_layout;

	/**
	 * Constructor.
	 *
	 * @param SeriesRepositoryInterface $repository         Series repository instance.
	 * @param NavigationService         $navigation_service Navigation service instance.
	 * @param StyleSanitizer            $style_sanitizer    Style sanitizer instance.
	 * @param AccordionLayout           $accordion_layout   Accordion layout instance.
	 */
	public function __construct(
		SeriesRepositoryInterface $repository,
		NavigationService $navigation_service,
		StyleSanitizer $style_sanitizer,
		AccordionLayout $accordion_layout
	) {
		$this->repository         = $repository;
		$this->navigation_service = $navigation_service;
		$this->style_sanitizer    = $style_sanitizer;
		$this->accordion_layout   = $accordion_layout;
	}

	/**
	 * Registry of post IDs that have already had their series rendered in the current request.
	 *
	 * @var array<int, bool>
	 */
	private array $rendered_posts = array();

	/**
	 * Filters post content to inject the series navigation and layout.
	 *
	 * @param string $content The original post content.
	 * @return string Filtered content with injected series markup.
	 */
	public function filter_content( string $content ): string {
		// Prevent modifying or appending content in editor, admin, REST API, or JSON request contexts.
		if ( (function_exists( 'is_admin' ) && is_admin()) || (defined( 'REST_REQUEST' ) && REST_REQUEST) || (function_exists( 'wp_is_json_request' ) && wp_is_json_request()) ) {
			return $content;
		}

		$is_single = false;
		if ( function_exists( 'is_singular' ) ) {
			$is_single = is_singular( 'post' );
		} elseif ( function_exists( 'is_single' ) ) {
			$is_single = is_single();
		}
		if ( ! $is_single ) {
			return $content;
		}

		if ( function_exists( 'in_the_loop' ) && ! in_the_loop() ) {
			return $content;
		}
		if ( function_exists( 'is_main_query' ) && ! is_main_query() ) {
			return $content;
		}

		$current_post_id = (int) get_the_ID();
		if ( $current_post_id <= 0 ) {
			return $content;
		}

		if ( isset( $this->rendered_posts[ $current_post_id ] ) ) {
			return $content;
		}

		// Prevent duplicate injection if content already contains the series layout markup or block.
		if ( false !== strpos( $content, 'seriescraft-wrapper' ) || false !== strpos( $content, 'sm-series-layout' ) ) {
			return $content;
		}
		if ( function_exists( 'has_block' ) && has_block( 'seriescraft/series-list', $content ) ) {
			return $content;
		}

		$series_markup = $this->render_for_post( $current_post_id );
		if ( empty( $series_markup ) ) {
			return $content;
		}

		$position = 'top';
		if ( function_exists( 'get_option' ) ) {
			$position_opt = get_option( 'seriescraft_position', '' );
			if ( empty( $position_opt ) ) {
				$position_opt = get_option( 'sm_position', 'top' );
			}
			if ( ! empty( $position_opt ) ) {
				$position = (string) $position_opt;
			}
		}

		if ( 'bottom' === $position ) {
			return $content . $series_markup;
		}

		return $series_markup . $content;
	}

	/**
	 * Unified render callback for 'seriescraft/series-list' block.
	 *
	 * Context 1: Single post assigned to a series -> Renders active variant layout with Reading Now badge & nav.
	 * Context 2: Standalone / Archive listing -> Renders series card grid based on mode, limit, user, topic.
	 * Context 3: Editor canvas with no series assigned -> Renders empty preview prompt.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 * @param string               $content    Block inner content.
	 * @return string Rendered block HTML.
	 */
	public function render_series_block( array $attributes = array(), string $content = '' ): string {
		unset( $content );

		$preview_series_id = 0;
		if ( isset( $_GET['preview_series_id'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			// phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$preview_series_id = (int) $_GET['preview_series_id'];
		}

		$preview_series_ids = null;
		if ( isset( $_GET['preview_series_ids'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			// phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$decoded_series_ids = json_decode( wp_unslash( (string) $_GET['preview_series_ids'] ), true );
			if ( is_array( $decoded_series_ids ) ) {
				$preview_series_ids = array_values( array_unique( array_filter( array_map( 'absint', $decoded_series_ids ) ) ) );
			}
		}

		$preview_title = '';
		if ( isset( $_GET['preview_title'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			// phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$preview_title = sanitize_text_field( wp_unslash( (string) $_GET['preview_title'] ) );
		}

		$preview_image = '';
		if ( isset( $_GET['preview_image'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			// phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$preview_image = esc_url_raw( wp_unslash( (string) $_GET['preview_image'] ) );
		}

		$series_id = 0;
		if ( ! empty( $attributes['seriesId'] ) ) {
			$series_id = (int) $attributes['seriesId'];
		} elseif ( ! empty( $attributes['series_id'] ) ) {
			$series_id = (int) $attributes['series_id'];
		} elseif ( $preview_series_id > 0 ) {
			$series_id = $preview_series_id;
		} elseif ( isset( $_GET['series_id'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			// phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$series_id = (int) $_GET['series_id'];
		}

		$current_post_id = 0;
		if ( isset( $attributes['postId'] ) ) {
			$current_post_id = (int) $attributes['postId'];
		} elseif ( isset( $attributes['post_id'] ) ) {
			$current_post_id = (int) $attributes['post_id'];
		} elseif ( isset( $_GET['post_id'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			// phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$current_post_id = (int) $_GET['post_id'];
		} elseif ( function_exists( 'get_the_ID' ) ) {
			$current_post_id = (int) get_the_ID();
		}

		$layout_override = '';
		if ( ! empty( $attributes['layout'] ) ) {
			$layout_override = sanitize_text_field( (string) $attributes['layout'] );
		} elseif ( isset( $_GET['layout'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			// phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$layout_override = sanitize_text_field( (string) $_GET['layout'] );
		}

		if ( $current_post_id > 0 && isset( $this->rendered_posts[ $current_post_id ] ) ) {
			unset( $this->rendered_posts[ $current_post_id ] );
		}

		$has_explicit_series = ! empty( $attributes['seriesId'] ) || ! empty( $attributes['series_id'] );
		if ( $current_post_id > 0 && ! $has_explicit_series && null !== $preview_series_ids ) {
			$preview_series = $this->repository->getSeriesForPost( $current_post_id, $preview_series_ids );
			if ( ! empty( $preview_series ) ) {
				return $this->render_for_post( $current_post_id, $preview_series, $preview_title, $preview_image );
			}

			return '<div class="sc-series-block sc-series-empty-preview">' .
				esc_html( __( 'Series block: add a series in the sidebar to see it rendered here.', 'series-craft' ) ) .
				'</div>';
		}

		if ( $current_post_id > 0 && $preview_series_id > 0 && ! $has_explicit_series ) {
			$assigned_series = $this->repository->getSeriesForPost( $current_post_id );
			if ( count( $assigned_series ) > 1 ) {
				return $this->render_for_post( $current_post_id, $assigned_series, $preview_title, $preview_image );
			}
		}

		// Context 1: Explicit series term ID provided.
		if ( $series_id > 0 ) {
			return $this->render_for_series( $series_id, $current_post_id, $layout_override, $preview_title, $preview_image );
		}

		// If post ID is present, check if post is assigned to a series.
		if ( $current_post_id > 0 ) {
			$series_list = $this->repository->getSeriesForPost( $current_post_id );
			if ( ! empty( $series_list ) ) {
				// Context 1: Post assigned to a series.
				return $this->render_for_post( $current_post_id, $series_list, $preview_title, $preview_image );
			}

			// Context 3: Editor canvas with no series assigned yet.
			$is_editor_preview = isset( $_GET['preview_key'] ) || isset( $_GET['post_id'] ) || (function_exists( 'is_admin' ) && is_admin()); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			if ( $is_editor_preview ) {
				return '<div class="sc-series-block sc-series-empty-preview">' .
					esc_html( __( 'Series block: add a series in the sidebar to see it rendered here.', 'series-craft' ) ) .
					'</div>';
			}
		}

		// Context 2: Standalone / Archive listing.
		$mode           = sanitize_text_field( (string) ($attributes['mode'] ?? 'all') );
		$limit          = (int) ($attributes['limit'] ?? 5);
		$selected_user  = (int) ($attributes['selectedUser'] ?? ($attributes['userId'] ?? 0));
		$selected_topic = sanitize_text_field( (string) ($attributes['selectedTopic'] ?? '') );

		return $this->render_series_listing( $mode, $limit, $selected_user, $selected_topic );
	}

	/**
	 * Renders standalone series archive cards / grid listing.
	 *
	 * @param string $mode           Display mode (all, top, user, topics).
	 * @param int    $limit          Maximum count of items.
	 * @param int    $selected_user  Filter by author ID.
	 * @param string $selected_topic Filter by taxonomy/topic.
	 * @return string Rendered series listing HTML.
	 */
	public function render_series_listing( string $mode = 'all', int $limit = 5, int $selected_user = 0, string $selected_topic = '' ): string {
		unset( $selected_user, $selected_topic );

		$args = array(
			'taxonomy'   => 'series',
			'hide_empty' => ('top' === $mode),
		);

		if ( 'top' === $mode ) {
			$args['orderby'] = 'count';
			$args['order']   = 'DESC';
			$args['number']  = $limit > 0 ? $limit : 5;
		} else {
			$args['orderby'] = 'name';
			$args['order']   = 'ASC';
			if ( $limit > 0 && ('user' === $mode || 'topics' === $mode || 'topic' === $mode) ) {
				$args['number'] = $limit;
			}
		}

		$terms = function_exists( 'get_terms' ) ? get_terms( $args ) : array();

		if ( is_wp_error( $terms ) || ! is_array( $terms ) || empty( $terms ) ) {
			return '<div class="sc-series-block sc-series-listing-empty"><p>' .
				esc_html__( 'No series found.', 'series-craft' ) .
				'</p></div>';
		}

		$html = '<div class="sc-series-block sc-series-card-grid wp-block-seriescraft-series-list">';
		foreach ( $terms as $term ) {
			if ( ! is_object( $term ) || ! isset( $term->term_id ) ) {
				continue;
			}

			$term_link = function_exists( 'get_term_link' ) ? get_term_link( $term ) : '#';
			if ( is_wp_error( $term_link ) ) {
				$term_link = '#';
			}

			$count      = (int) ($term->count ?? 0);
			$part_label = sprintf(
				/* translators: %d: number of parts in the series */
				_n( '%d Part', '%d Parts', $count, 'series-craft' ),
				$count
			);

			$html .= '<article class="sc-series-card">';
			$html .= '<div class="sc-series-card__content">';
			$html .= '<h3 class="sc-series-card__title"><a href="' . esc_url( (string) $term_link ) . '">' . esc_html( (string) $term->name ) . '</a></h3>';
			if ( ! empty( $term->description ) ) {
				$html .= '<p class="sc-series-card__description">' . esc_html( (string) $term->description ) . '</p>';
			}
			$html .= '<span class="sc-series-card__badge sc-badge">' . esc_html( $part_label ) . '</span>';
			$html .= '</div>';
			$html .= '</article>';
		}
		$html .= '</div>';

		return $html;
	}

	/**
	 * Renders series navigation HTML and styles for a specific series term ID.
	 *
	 * @param int    $series_id       Series term ID.
	 * @param int    $current_post_id Current post ID (optional).
	 * @param string $layout_override Optional layout variant override.
	 * @param string $preview_title   Optional real-time live preview post title.
	 * @param string $preview_image   Optional real-time live preview post image URL.
	 * @return string Rendered series HTML.
	 */
	public function render_for_series( int $series_id, int $current_post_id = 0, string $layout_override = '', string $preview_title = '', string $preview_image = '' ): string {
		if ( $series_id <= 0 ) {
			return '';
		}

		$term        = function_exists( 'get_term' ) ? get_term( $series_id, 'series' ) : null;
		$series_name = ($term && isset( $term->name )) ? (string) $term->name : '';
		if ( empty( $series_name ) ) {
			$series_name = function_exists( '__' ) ? __( 'Series Navigation', 'series-craft' ) : 'Series Navigation';
		}

		$meta_settings = function_exists( 'get_term_meta' ) ? get_term_meta( $series_id, 'sm_series_settings', true ) : array();
		if ( ! is_array( $meta_settings ) ) {
			if ( is_string( $meta_settings ) ) {
				$decoded       = json_decode( $meta_settings, true );
				$meta_settings = is_array( $decoded ) ? $decoded : array();
			} else {
				$meta_settings = array();
			}
		}

		$default_layout = function_exists( 'get_option' ) ? get_option( 'seriescraft_default_layout', 'link-list' ) : 'link-list';
		$layout_variant = ! empty( $layout_override )
			? (string) $layout_override
			: ( ! empty( $meta_settings['layout'] )
				? (string) $meta_settings['layout']
				: ( ! empty( $meta_settings['content_variant'] )
					? (string) $meta_settings['content_variant']
					: (string) $default_layout));

		$raw_styles = (array) ($meta_settings['custom_styles'] ?? ($meta_settings['style'] ?? array()));

		$ordered_posts = $this->repository->get_series_posts( $series_id );
		$posts_data    = array();

		foreach ( $ordered_posts as $index => $post_obj ) {
			$post_content  = isset( $post_obj->post_content ) ? (string) $post_obj->post_content : null;
			$thumbnail_url = ThumbnailResolver::resolve_post_image( (int) $post_obj->ID, $post_content );
			if ( empty( $thumbnail_url ) ) {
				$thumbnail_url = null;
			}

			if ( $current_post_id > 0 && (int) $post_obj->ID === $current_post_id && ! empty( $preview_image ) ) {
				$thumbnail_url = $preview_image;
			}

			$post_title = function_exists( 'get_the_title' ) ? get_the_title( $post_obj->ID ) : ($post_obj->post_title ?? '');
			if ( $current_post_id > 0 && (int) $post_obj->ID === $current_post_id && ! empty( $preview_title ) ) {
				$post_title = $preview_title;
			}

			$posts_data[] = array(
				'id'         => (int) $post_obj->ID,
				'title'      => $post_title,
				'url'        => function_exists( 'get_permalink' ) ? (string) get_permalink( $post_obj->ID ) : '',
				'part_order' => $index + 1,
				'thumbnail'  => $thumbnail_url,
			);
		}

		$effective_post_id = $current_post_id > 0 ? $current_post_id : (( ! empty( $preview_title ) || ! empty( $preview_image ) || isset( $_GET['preview_series_id'] )) ? -1 : 0); // phpcs:ignore WordPress.Security.NonceVerification.Recommended

		if ( 0 !== $effective_post_id ) {
			$exists = false;
			foreach ( $posts_data as &$p ) {
				if ( (int) $p['id'] === $effective_post_id ) {
					$exists = true;
					if ( ! empty( $preview_title ) ) {
						$p['title'] = $preview_title;
					}
					if ( ! empty( $preview_image ) ) {
						$p['thumbnail'] = $preview_image;
					}
					break;
				}
			}
			unset( $p );

			if ( ! $exists ) {
				$current_title = ! empty( $preview_title ) ? $preview_title : '';
				if ( empty( $current_title ) && $current_post_id > 0 && function_exists( 'get_the_title' ) ) {
					$current_title = (string) get_the_title( $current_post_id );
				}
				if ( empty( $current_title ) || 'Auto Draft' === $current_title ) {
					$current_title = function_exists( '__' ) ? __( '(Untitled)', 'series-craft' ) : '(Untitled)';
				}

				$current_thumb = ! empty( $preview_image ) ? $preview_image : null;
				if ( empty( $current_thumb ) && $current_post_id > 0 ) {
					$resolved_thumb = ThumbnailResolver::resolve_post_image( $current_post_id );
					if ( ! empty( $resolved_thumb ) ) {
						$current_thumb = $resolved_thumb;
					}
				}

				$posts_data[] = array(
					'id'         => $effective_post_id,
					'title'      => $current_title,
					'url'        => ($current_post_id > 0 && function_exists( 'get_permalink' )) ? (string) get_permalink( $current_post_id ) : '#',
					'part_order' => count( $posts_data ) + 1,
					'thumbnail'  => $current_thumb,
				);
			}
		}

		$nav_context = $this->navigation_service->get_navigation_context( $effective_post_id, $posts_data );
		$inline_css  = $this->style_sanitizer->generate_inline_css( $series_id, $raw_styles );

		$accumulated_styles = ! empty( $inline_css ) ? sprintf( '<style>%s</style>', $inline_css ) : '';
		$series_inner_html  = $this->render_series_box( $series_id, $series_name, $layout_variant, $posts_data, $effective_post_id, $nav_context, $raw_styles );

		return $accumulated_styles . $series_inner_html;
	}

	/**
	 * Renders series navigation HTML and styles for a post.
	 *
	 * @param int        $post_id     Post ID.
	 * @param array|null $series_list  Optional pre-fetched series list.
	 * @param string     $preview_title Optional live preview post title.
	 * @param string     $preview_image Optional live preview post image URL.
	 * @return string Rendered series markup.
	 */
	public function render_for_post( int $post_id, ?array $series_list = null, string $preview_title = '', string $preview_image = '' ): string {
		if ( $post_id <= 0 ) {
			return '';
		}

		if ( isset( $this->rendered_posts[ $post_id ] ) ) {
			return '';
		}

		if ( null === $series_list ) {
			$series_list = $this->repository->getSeriesForPost( $post_id );
		}
		if ( empty( $series_list ) ) {
			return '';
		}

		$this->rendered_posts[ $post_id ] = true;

		$rendered_series_list = array();
		$accumulated_styles   = '';

		foreach ( $series_list as $series ) {
			$series_id      = (int) $series['id'];
			$series_name    = (string) $series['name'];
			$layout_variant = (string) ($series['layout'] ?? 'link-list');
			$raw_styles     = (array) ($series['styles'] ?? array());
			$posts          = (array) ($series['posts'] ?? array());

			$current_post_found = false;
			foreach ( $posts as &$post ) {
				if ( (int) ($post['id'] ?? 0) !== $post_id ) {
					continue;
				}
				$current_post_found = true;
				if ( '' !== $preview_title ) {
					$post['title'] = $preview_title;
				}
				if ( '' !== $preview_image ) {
					$post['thumbnail'] = $preview_image;
				}
			}
			unset( $post );

			if ( ! $current_post_found ) {
				$current_title = '' !== $preview_title
					? $preview_title
					: (function_exists( 'get_the_title' ) ? (string) get_the_title( $post_id ) : '');
				if ( '' === $current_title || 'Auto Draft' === $current_title ) {
					$current_title = __( '(Untitled)', 'series-craft' );
				}

				$current_thumbnail = $preview_image;
				if ( '' === $current_thumbnail ) {
					$current_thumbnail = ThumbnailResolver::resolve_post_image( $post_id );
				}

				$posts[] = array(
					'id'         => $post_id,
					'title'      => $current_title,
					'url'        => function_exists( 'get_permalink' ) ? (string) get_permalink( $post_id ) : '#',
					'part_order' => count( $posts ) + 1,
					'thumbnail'  => ! empty( $current_thumbnail ) ? $current_thumbnail : null,
				);
			}

			$nav_context = $this->navigation_service->get_navigation_context( $post_id, $posts );
			$inline_css  = $this->style_sanitizer->generate_inline_css( $series_id, $raw_styles );

			if ( ! empty( $inline_css ) ) {
				$accumulated_styles .= sprintf( '<style>%s</style>', $inline_css );
			}

			$series_inner_html = $this->render_series_box( $series_id, $series_name, $layout_variant, $posts, $post_id, $nav_context, $raw_styles );

			$rendered_series_list[] = array(
				'id'        => $series_id,
				'title'     => $series_name,
				'html'      => $series_inner_html,
				'is_active' => true,
			);
		}

		// Multiple series switch to Accordion layout.
		if ( count( $rendered_series_list ) > 1 ) {
			$series_output = $this->accordion_layout->render( $rendered_series_list );
		} else {
			$series_output = $rendered_series_list[0]['html'];
		}

		return $accumulated_styles . $series_output;
	}

	/**
	 * Renders a single series box including header, variant layout, and navigation.
	 *
	 * @param int                                                        $series_id       Series ID.
	 * @param string                                                     $series_name     Series Name.
	 * @param string                                                     $layout_variant  Layout variant slug.
	 * @param array<int, array{id: int, title: string, part_order: int}> $posts           List of posts in series.
	 * @param int                                                        $current_post_id Current post ID.
	 * @param array<string, mixed>                                       $nav_context     Navigation context data.
	 * @param array<string, mixed>                                       $styles          Optional custom styles.
	 * @return string Rendered series box HTML.
	 */
	private function render_series_box(
		int $series_id,
		string $series_name,
		string $layout_variant,
		array $posts,
		int $current_post_id,
		array $nav_context,
		array $styles = array()
	): string {
		$header_view = new HeaderView(
			$series_name,
			(int) ($nav_context['current_part'] ?? 0),
			(int) ($nav_context['total_parts'] ?? 0),
			$styles
		);

		$variant_view = $this->resolve_variant_view( $layout_variant );

		$nav_view = new NavigationView(
			$nav_context['previous_post'] ?? null,
			$nav_context['next_post'] ?? null,
			$styles
		);

		$wrapper_class = sprintf( 'sc-series-box sm-series-layout seriescraft-wrapper seriescraft-series-%d', $series_id );

		return sprintf(
			'<section class="%s" data-sm-series-term-id="%d">%s%s%s</section>',
			esc_attr( $wrapper_class ),
			$series_id,
			$header_view->render(),
			$variant_view->render( $posts, $current_post_id ),
			$nav_view->render()
		);
	}

	/**
	 * Resolves the layout view instance according to the variant key.
	 *
	 * @param string $layout_variant Variant slug.
	 * @return VariantViewInterface Resolved view instance.
	 */
	private function resolve_variant_view( string $layout_variant ): VariantViewInterface {
		$normalized_variant = str_replace( '_', '-', strtolower( trim( $layout_variant ) ) );
		switch ( $normalized_variant ) {
			case 'link-grid':
				return new LinkGridView();
			case 'media-list':
				return new MediaListView();
			case 'media-grid':
				return new MediaGridView();
			case 'link-list':
			case 'list':
			default:
				return new LinkListView();
		}
	}

	/**
	 * Magic caller for camelCase method compatibility.
	 *
	 * @param string $name      Method name.
	 * @param array  $arguments Method arguments.
	 * @return mixed
	 * @throws \BadMethodCallException If method does not exist.
	 */
	public function __call( string $name, array $arguments ) {
		if ( 'filterContent' === $name ) {
			return $this->filter_content( ...$arguments );
		}

		// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
		throw new \BadMethodCallException( sprintf( 'Call to undefined method %s::%s()', __CLASS__, $name ) );
	}
}
