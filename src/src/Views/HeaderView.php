<?php
/**
 * HeaderView definition.
 *
 * @package SeriesCraft\Views
 */

declare(strict_types=1);

namespace SeriesCraft\Views;

/**
 * Class HeaderView
 *
 * Renders the series box header including title and part badge.
 */
class HeaderView {

	/**
	 * Series title.
	 *
	 * @var string
	 */
	private string $series_title;

	/**
	 * Current part number (1-based, or 0 if unassigned).
	 *
	 * @var int
	 */
	private int $current_part;

	/**
	 * Total parts in series.
	 *
	 * @var int
	 */
	private int $total_parts;

	/**
	 * Custom styles for the series.
	 *
	 * @var array<string, mixed>
	 */
	private array $styles;

	/**
	 * Constructor.
	 *
	 * @param string               $series_title Series title.
	 * @param int                  $current_part Current part number.
	 * @param int                  $total_parts  Total parts in series.
	 * @param array<string, mixed> $styles       Optional custom styles array.
	 */
	public function __construct(
		string $series_title,
		int $current_part,
		int $total_parts,
		array $styles = array()
	) {
		$this->series_title = $series_title;
		$this->current_part = $current_part;
		$this->total_parts  = $total_parts;
		$this->styles       = $styles;
	}

	/**
	 * Renders the header HTML markup.
	 *
	 * @return string Rendered HTML markup.
	 */
	public function render(): string {
		$output  = '<header class="sc-header sm-header seriescraft-header">';
		$output .= '<div class="sc-header__title-wrap">';
		$output .= sprintf( '<h3 class="sc-header__title seriescraft-series-title">%s</h3>', esc_html( $this->series_title ) );
		$output .= '</div>';

		if ( $this->current_part > 0 && $this->total_parts > 0 ) {
			/* translators: 1: current part number, 2: total parts count */
			$badge_text = sprintf( __( 'Part %1$d of %2$d', 'series-craft' ), $this->current_part, $this->total_parts );
			$output    .= sprintf(
				'<span class="sc-header__badge sc-badge seriescraft-position-badge bg-primary">%s</span>',
				esc_html( $badge_text )
			);
		}

		$output .= '</header>';

		return $output;
	}
}
