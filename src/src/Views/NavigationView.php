<?php
/**
 * NavigationView definition.
 *
 * @package SeriesCraft\Views
 */

declare(strict_types=1);

namespace SeriesCraft\Views;

/**
 * Class NavigationView
 *
 * Renders previous/next navigation buttons and placeholders for series navigation.
 */
class NavigationView {

	/**
	 * Previous post data.
	 *
	 * @var array<string, mixed>|null
	 */
	private ?array $prev_post;

	/**
	 * Next post data.
	 *
	 * @var array<string, mixed>|null
	 */
	private ?array $next_post;

	/**
	 * Custom styles array.
	 *
	 * @var array<string, mixed>
	 */
	private array $styles;

	/**
	 * Constructor.
	 *
	 * @param array<string, mixed>|null $prev_post Previous post in series.
	 * @param array<string, mixed>|null $next_post Next post in series.
	 * @param array<string, mixed>      $styles    Optional custom styles array.
	 */
	public function __construct(
		?array $prev_post,
		?array $next_post,
		array $styles = array()
	) {
		$this->prev_post = $prev_post;
		$this->next_post = $next_post;
		$this->styles    = $styles;
	}

	/**
	 * Renders navigation buttons HTML.
	 *
	 * @return string Rendered navigation HTML markup or empty string.
	 */
	public function render(): string {
		if ( empty( $this->prev_post ) && empty( $this->next_post ) ) {
			return '';
		}

		$output = '<nav class="sc-nav sm-layout-navigation seriescraft-navigation" aria-label="' . esc_attr( __( 'Series Navigation', 'series-craft' ) ) . '">';

		if ( ! empty( $this->prev_post ) ) {
			$prev_id  = (int) ( $this->prev_post['id'] ?? 0 );
			$prev_url = ! empty( $this->prev_post['url'] )
				? (string) $this->prev_post['url']
				: ( function_exists( 'get_permalink' ) && $prev_id > 0 ? (string) get_permalink( $prev_id ) : '' );

			$output .= sprintf(
				'<a href="%s" class="sc-nav__btn sc-nav__btn--prev seriescraft-nav-prev" rel="prev" aria-label="%s"><span class="material-symbols-outlined">arrow_back</span></a>',
				esc_url( $prev_url ),
				esc_attr( __( 'Previous Post', 'series-craft' ) )
			);
		} else {
			$output .= '<div class="sc-nav__placeholder seriescraft-nav-empty">' . esc_html( __( 'No Previous', 'series-craft' ) ) . '</div>';
		}

		if ( ! empty( $this->next_post ) ) {
			$next_id  = (int) ( $this->next_post['id'] ?? 0 );
			$next_url = ! empty( $this->next_post['url'] )
				? (string) $this->next_post['url']
				: ( function_exists( 'get_permalink' ) && $next_id > 0 ? (string) get_permalink( $next_id ) : '' );

			$output .= sprintf(
				'<a href="%s" class="sc-nav__btn sc-nav__btn--next seriescraft-nav-next" rel="next" aria-label="%s"><span class="material-symbols-outlined">arrow_forward</span></a>',
				esc_url( $next_url ),
				esc_attr( __( 'Next Post', 'series-craft' ) )
			);
		} else {
			$output .= '<div class="sc-nav__placeholder seriescraft-nav-empty">' . esc_html( __( 'No Next', 'series-craft' ) ) . '</div>';
		}

		$output .= '</nav>';

		return $output;
	}
}
