<?php
/**
 * AccordionLayout definition.
 *
 * @package SeriesCraft\Views
 */

declare(strict_types=1);

namespace SeriesCraft\Views;

/**
 * Class AccordionLayout
 *
 * Renders multiple series enclosed in an expandable accordion layout.
 */
class AccordionLayout {



	/**
	 * Renders multiple series enclosed within expandable details/summary tags.
	 *
	 * @param array<int, array{id: int, title: string, html: string, is_active?: bool}> $rendered_series_list List of rendered series items.
	 * @return string Rendered HTML output.
	 */
	public function render( array $rendered_series_list ): string {
		if ( empty( $rendered_series_list ) ) {
			return '';
		}

		$output = '<div class="seriescraft-accordion">';

		foreach ( $rendered_series_list as $series ) {
			$open_attribute = '';

			$output .= sprintf( '<details class="seriescraft-accordion-item"%s>', $open_attribute );
			$output .= sprintf(
				'<summary class="seriescraft-accordion-summary">%s</summary>',
				esc_html( $series['title'] )
			);
			$output .= sprintf(
				'<div class="seriescraft-accordion-content">%s</div>',
				sprintf( '<div class="seriescraft-accordion-body">%s</div>', $series['html'] )
			);
			$output .= '</details>';
		}

		$output .= '</div>';

		return $output;
	}
}
