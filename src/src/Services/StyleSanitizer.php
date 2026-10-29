<?php
/**
 * StyleSanitizer definition.
 *
 * @package SeriesCraft\Services
 */

declare(strict_types=1);

namespace SeriesCraft\Services;

/**
 * Class StyleSanitizer
 *
 * Sanitizes visual style inputs and generates scoped inline CSS custom properties.
 */
class StyleSanitizer {

	/**
	 * Allowed CSS border style values.
	 *
	 * @var array<string>
	 */
	private const ALLOWED_BORDER_STYLES = array(
		'none',
		'solid',
		'dashed',
		'dotted',
		'double',
	);

	/**
	 * Maps style properties to CSS custom variable names.
	 *
	 * @var array<string, string>
	 */
	private const CSS_VARIABLE_MAP = array(
		'title_color'       => '--sc-title-color',
		'header_background' => '--sc-header-bg',
		'button_color'      => '--sc-button-color',
		'border_width'      => '--sc-border-width',
		'border_style'      => '--sc-border-style',
		'border_color'      => '--sc-border-color',
		'padding_top'       => '--sc-padding-top',
		'padding_bottom'    => '--sc-padding-bottom',
		'padding_left'      => '--sc-padding-left',
		'padding_right'     => '--sc-padding-right',
		'margin_top'        => '--sc-margin-top',
		'margin_bottom'     => '--sc-margin-bottom',
		'margin_left'       => '--sc-margin-left',
		'margin_right'      => '--sc-margin-right',
	);

	/**
	 * Sanitizes raw styling inputs.
	 *
	 * @param array<string, mixed> $raw_styles Key-value pairs of raw style properties.
	 * @return array<string, string> Sanitized styling properties.
	 */
	public function sanitize( array $raw_styles ): array {
		$sanitized = array();

		foreach ( $raw_styles as $key => $value ) {
			if ( ! is_string( $value ) || ! array_key_exists( $key, self::CSS_VARIABLE_MAP ) ) {
				continue;
			}

			$cleaned = trim( $value );

			if ( false !== strpos( $key, 'color' ) || 'header_background' === $key ) {
				$sanitized[ $key ] = $this->sanitize_color( $cleaned );
			} elseif ( 'border_style' === $key ) {
				$sanitized[ $key ] = in_array( strtolower( $cleaned ), self::ALLOWED_BORDER_STYLES, true )
					? strtolower( $cleaned )
					: '';
			} else {
				$sanitized[ $key ] = $this->sanitize_dimension( $cleaned );
			}
		}

		return $sanitized;
	}

	/**
	 * Normalizes style array by flattening nested keys and camelCase aliases.
	 *
	 * @param array<string, mixed> $styles Input styles.
	 * @return array<string, mixed> Normalized flat key-value pairs.
	 */
	public function normalize_styles( array $styles ): array {
		$normalized = $styles;

		// CamelCase and lowercase aliases.
		if ( isset( $styles['titleColor'] ) && ! isset( $normalized['title_color'] ) ) {
			$normalized['title_color'] = $styles['titleColor'];
		} elseif ( isset( $styles['titlecolor'] ) && ! isset( $normalized['title_color'] ) ) {
			$normalized['title_color'] = $styles['titlecolor'];
		}

		if ( isset( $styles['headerBackgroundColor'] ) && ! isset( $normalized['header_background'] ) ) {
			$normalized['header_background'] = $styles['headerBackgroundColor'];
		} elseif ( isset( $styles['headerbackgroundcolor'] ) && ! isset( $normalized['header_background'] ) ) {
			$normalized['header_background'] = $styles['headerbackgroundcolor'];
		} elseif ( isset( $styles['header_bg_color'] ) && ! isset( $normalized['header_background'] ) ) {
			$normalized['header_background'] = $styles['header_bg_color'];
		}

		if ( isset( $styles['buttonColor'] ) && ! isset( $normalized['button_color'] ) ) {
			$normalized['button_color'] = $styles['buttonColor'];
		} elseif ( isset( $styles['buttoncolor'] ) && ! isset( $normalized['button_color'] ) ) {
			$normalized['button_color'] = $styles['buttoncolor'];
		}

		// Direct border properties.
		if ( isset( $styles['borderColor'] ) && ! isset( $normalized['border_color'] ) ) {
			$normalized['border_color'] = $styles['borderColor'];
		} elseif ( isset( $styles['bordercolor'] ) && ! isset( $normalized['border_color'] ) ) {
			$normalized['border_color'] = $styles['bordercolor'];
		}
		if ( isset( $styles['borderWidth'] ) && ! isset( $normalized['border_width'] ) ) {
			$normalized['border_width'] = $styles['borderWidth'];
		} elseif ( isset( $styles['borderwidth'] ) && ! isset( $normalized['border_width'] ) ) {
			$normalized['border_width'] = $styles['borderwidth'];
		}
		if ( isset( $styles['borderStyle'] ) && ! isset( $normalized['border_style'] ) ) {
			$normalized['border_style'] = $styles['borderStyle'];
		} elseif ( isset( $styles['borderstyle'] ) && ! isset( $normalized['border_style'] ) ) {
			$normalized['border_style'] = $styles['borderstyle'];
		}

		// Nested border object.
		if ( isset( $styles['border'] ) && is_array( $styles['border'] ) ) {
			if ( ! empty( $styles['border']['width'] ) && ! isset( $normalized['border_width'] ) ) {
				$normalized['border_width'] = $styles['border']['width'];
			}
			if ( ! empty( $styles['border']['style'] ) && ! isset( $normalized['border_style'] ) ) {
				$normalized['border_style'] = $styles['border']['style'];
			}
			if ( ! empty( $styles['border']['color'] ) && ! isset( $normalized['border_color'] ) ) {
				$normalized['border_color'] = $styles['border']['color'];
			}
		}

		// Nested padding object.
		if ( isset( $styles['padding'] ) && is_array( $styles['padding'] ) ) {
			foreach ( array( 'top', 'bottom', 'left', 'right' ) as $side ) {
				if ( ! empty( $styles['padding'][ $side ] ) && ! isset( $normalized[ 'padding_' . $side ] ) ) {
					$normalized[ 'padding_' . $side ] = $styles['padding'][ $side ];
				}
			}
		}

		// Nested margin object.
		if ( isset( $styles['margin'] ) && is_array( $styles['margin'] ) ) {
			foreach ( array( 'top', 'bottom', 'left', 'right' ) as $side ) {
				if ( ! empty( $styles['margin'][ $side ] ) && ! isset( $normalized[ 'margin_' . $side ] ) ) {
					$normalized[ 'margin_' . $side ] = $styles['margin'][ $side ];
				}
			}
		}

		return $normalized;
	}

	/**
	 * Generates a scoped inline CSS block using CSS variables.
	 *
	 * @param int                  $series_id Target series ID to scope the styles to.
	 * @param array<string, mixed> $styles    Sanitized or raw style key-value pairs.
	 * @return string Generated CSS rules or empty string if no valid properties exist.
	 */
	public function generate_inline_css( int $series_id, array $styles ): string {
		$styles = $this->normalize_styles( $styles );
		$rules  = array();

		foreach ( $styles as $key => $value ) {
			if ( ! is_scalar( $value ) || '' === (string) $value || ! isset( self::CSS_VARIABLE_MAP[ $key ] ) ) {
				continue;
			}

			$variable_name = self::CSS_VARIABLE_MAP[ $key ];
			$rules[]       = sprintf( '%s: %s;', $variable_name, (string) $value );
			if ( 'button_color' === $key ) {
				$rules[] = sprintf( '--sm-hover-color: %s;', (string) $value );
			}
		}

		if ( empty( $rules ) ) {
			return '';
		}

		$selector     = sprintf( '.seriescraft-series-%d, [data-sm-series-term-id="%d"]', $series_id, $series_id );
		$declarations = implode( ' ', $rules );

		return sprintf( '%s { %s }', $selector, $declarations );
	}

	/**
	 * Validates hex colors.
	 *
	 * @param string $color Raw color string.
	 * @return string Validated hex color or empty string.
	 */
	private function sanitize_color( string $color ): string {
		if ( preg_match( '/^#([a-fA-F0-9]{3}|[a-fA-F0-9]{6}|[a-fA-F0-9]{8})$/', $color ) ) {
			return $color;
		}

		return '';
	}

	/**
	 * Validates dimensions (px, rem, em, %, vh, vw, etc.).
	 *
	 * @param string $dimension Raw dimension string.
	 * @return string Validated dimension or empty string.
	 */
	private function sanitize_dimension( string $dimension ): string {
		if ( preg_match( '/^-?\d+(\.\d+)?(px|rem|em|%|vh|vw|ch)$/', $dimension ) ) {
			return $dimension;
		}

		return '';
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
		if ( 'generateInlineCss' === $name ) {
			return $this->generate_inline_css( ...$arguments );
		}

		// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
		throw new \BadMethodCallException( sprintf( 'Call to undefined method %s::%s()', __CLASS__, $name ) );
	}
}
