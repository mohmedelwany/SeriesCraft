<?php

declare(strict_types=1);

namespace SeriesCraft\Services;

class StyleSanitizer
{
    /**
     * Allowed CSS border style values.
     *
     * @var array<string>
     */
    private const ALLOWED_BORDER_STYLES = [
        'none',
        'solid',
        'dashed',
        'dotted',
        'double',
    ];

    /**
     * Maps style properties to CSS custom variable names.
     *
     * @var array<string, string>
     */
    private const CSS_VARIABLE_MAP = [
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
    ];

    /**
     * Sanitizes raw styling inputs.
     *
     * @param array<string, mixed> $rawStyles Key-value pairs of raw style properties.
     * @return array<string, string> Sanitized styling properties.
     */
    public function sanitize(array $rawStyles): array
    {
        $sanitized = [];

        foreach ($rawStyles as $key => $value) {
            if (!is_string($value) || !array_key_exists($key, self::CSS_VARIABLE_MAP)) {
                continue;
            }

            $cleaned = trim($value);

            if (str_contains($key, 'color') || $key === 'header_background') {
                $sanitized[$key] = $this->sanitizeColor($cleaned);
            } elseif ($key === 'border_style') {
                $sanitized[$key] = in_array(strtolower($cleaned), self::ALLOWED_BORDER_STYLES, true)
                    ? strtolower($cleaned)
                    : '';
            } else {
                $sanitized[$key] = $this->sanitizeDimension($cleaned);
            }
        }

        return $sanitized;
    }

    /**
     * Generates a scoped inline CSS block using CSS variables.
     *
     * @param int $seriesId Target series ID to scope the styles to.
     * @param array<string, string> $styles Sanitized style key-value pairs.
     * @return string Generated CSS rules or empty string if no valid properties exist.
     */
    public function generateInlineCss(int $seriesId, array $styles): string
    {
        $rules = [];

        foreach ($styles as $key => $value) {
            if ($value === '' || !isset(self::CSS_VARIABLE_MAP[$key])) {
                continue;
            }

            $variableName = self::CSS_VARIABLE_MAP[$key];
            $rules[] = sprintf('%s: %s;', $variableName, $value);
        }

        if (empty($rules)) {
            return '';
        }

        $selector = sprintf('.seriescraft-series-%d', $seriesId);
        $declarations = implode(' ', $rules);

        return sprintf('%s { %s }', $selector, $declarations);
    }

    /**
     * Validates hex colors.
     */
    private function sanitizeColor(string $color): string
    {
        if (preg_match('/^#([a-fA-F0-9]{3}|[a-fA-F0-9]{6}|[a-fA-F0-9]{8})$/', $color)) {
            return $color;
        }

        return '';
    }

    /**
     * Validates dimensions (px, rem, em, %, vh, vw, etc.).
     */
    private function sanitizeDimension(string $dimension): string
    {
        if (preg_match('/^-?\d+(\.\d+)?(px|rem|em|%|vh|vw|ch)$/', $dimension)) {
            return $dimension;
        }

        return '';
    }
}