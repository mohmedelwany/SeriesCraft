/**
 * SeriesStyleSettings Component.
 *
 * Controls for Per-Series visual styling:
 * - Title color
 * - Header background
 * - Button/icon colors
 * - Border
 * - Spacing (Padding & Margin)
 * - Reset to default styles
 */

import { __ } from '@wordpress/i18n';
import {
	PanelBody,
	Button,
	ColorPalette,
	TextControl,
	SelectControl,
} from '@wordpress/components';

const PRESET_COLORS = [
	{ name: 'Default Blue', color: '#0073aa' },
	{ name: 'Dark Slate', color: '#111111' },
	{ name: 'Emerald', color: '#10b981' },
	{ name: 'Crimson', color: '#ef4444' },
	{ name: 'Purple', color: '#8b5cf6' },
	{ name: 'Amber', color: '#f59e0b' },
];

/**
 * Series Style Settings tab controls.
 *
 * @param {Object}   props               Component props.
 * @param {Object}   props.series        Series term object.
 * @param {Object}   props.styles        Custom styles object for this series.
 * @param {Function} props.onChangeStyle Callback when any style value changes.
 * @param {Function} props.onResetStyles Callback to reset styles to defaults.
 * @param {boolean}  props.isSaving      Whether settings are currently saving.
 * @return {JSX.Element} Rendered style controls.
 */
export default function SeriesStyleSettings( {
	series,
	styles = {},
	onChangeStyle,
	onResetStyles,
	isSaving = false,
} ) {
	const titleColor = styles.titleColor || styles.title_color || '';
	const headerBackgroundColor = styles.headerBackgroundColor || styles.header_bg_color || '';
	const buttonColor = styles.buttonColor || styles.button_color || '';

	const border = typeof styles.border === 'object' && styles.border !== null
		? styles.border
		: { color: styles.border_color || '', width: styles.border_width || '', style: styles.border_style || 'solid' };

	const padding = typeof styles.padding === 'object' && styles.padding !== null
		? styles.padding
		: { top: '', right: '', bottom: '', left: '' };

	const margin = typeof styles.margin === 'object' && styles.margin !== null
		? styles.margin
		: { top: '', right: '', bottom: '', left: '' };

	const handleColorChange = ( key, value ) => {
		if ( onChangeStyle ) {
			onChangeStyle( series.id, {
				...styles,
				[ key ]: value || '',
			} );
		}
	};

	const handleBorderChange = ( borderField, value ) => {
		if ( onChangeStyle ) {
			onChangeStyle( series.id, {
				...styles,
				border: {
					...border,
					[ borderField ]: value,
				},
				// Keep flat legacy compatibility keys synchronized
				border_color: borderField === 'color' ? value : border.color,
				border_width: borderField === 'width' ? value : border.width,
				border_style: borderField === 'style' ? value : border.style,
			} );
		}
	};

	const handleSpacingChange = ( type, side, value ) => {
		const currentSpacing = type === 'padding' ? padding : margin;
		if ( onChangeStyle ) {
			onChangeStyle( series.id, {
				...styles,
				[ type ]: {
					...currentSpacing,
					[ side ]: value,
				},
			} );
		}
	};

	const hasCustomStyles = Boolean(
		titleColor ||
		headerBackgroundColor ||
		buttonColor ||
		border.color ||
		border.width ||
		padding.top ||
		padding.bottom ||
		margin.top ||
		margin.bottom
	);

	return (
		<div className="sc-tab-content-style sm-tab-content-style" data-testid="series-style-settings">
			{ /* Color Controls */ }
			<PanelBody title={ __( 'Color Settings', 'series-craft' ) } initialOpen={ true }>
				<div className="sc-color-setting-item">
					<p className="sc-setting-label">{ __( 'Title Color', 'series-craft' ) }</p>
					<ColorPalette
						colors={ PRESET_COLORS }
						value={ titleColor }
						onChange={ ( color ) => handleColorChange( 'titleColor', color ) }
					/>
				</div>

				<div className="sc-color-setting-item mt-3">
					<p className="sc-setting-label">{ __( 'Header Background', 'series-craft' ) }</p>
					<ColorPalette
						colors={ PRESET_COLORS }
						value={ headerBackgroundColor }
						onChange={ ( color ) => handleColorChange( 'headerBackgroundColor', color ) }
					/>
				</div>

				<div className="sc-color-setting-item mt-3">
					<p className="sc-setting-label">{ __( 'Button & Icon Color', 'series-craft' ) }</p>
					<ColorPalette
						colors={ PRESET_COLORS }
						value={ buttonColor }
						onChange={ ( color ) => handleColorChange( 'buttonColor', color ) }
					/>
				</div>
			</PanelBody>

			{ /* Border Controls */ }
			<PanelBody title={ __( 'Border Settings', 'series-craft' ) } initialOpen={ false }>
				<div className="sc-border-setting-item">
					<p className="sc-setting-label">{ __( 'Border Color', 'series-craft' ) }</p>
					<ColorPalette
						colors={ PRESET_COLORS }
						value={ border.color }
						onChange={ ( color ) => handleBorderChange( 'color', color || '' ) }
					/>
					<TextControl
						label={ __( 'Border Width', 'series-craft' ) }
						value={ border.width || '' }
						placeholder="e.g. 1px"
						onChange={ ( val ) => handleBorderChange( 'width', val ) }
					/>
					<SelectControl
						label={ __( 'Border Style', 'series-craft' ) }
						value={ border.style || 'solid' }
						options={ [
							{ label: 'Solid', value: 'solid' },
							{ label: 'Dashed', value: 'dashed' },
							{ label: 'Dotted', value: 'dotted' },
							{ label: 'None', value: 'none' },
						] }
						onChange={ ( val ) => handleBorderChange( 'style', val ) }
						__next40pxDefaultSize={ true }
						__nextHasNoMarginBottom={ true }
					/>
				</div>
			</PanelBody>

			{ /* Spacing Controls (Padding & Margin) */ }
			<PanelBody title={ __( 'Spacing & Dimensions', 'series-craft' ) } initialOpen={ false }>
				<div className="sc-spacing-controls">
					<p className="sc-setting-label font-semibold">{ __( 'Padding', 'series-craft' ) }</p>
					<div className="sc-spacing-grid grid grid-cols-2 gap-2 mb-3">
						<TextControl
							label={ __( 'Top', 'series-craft' ) }
							value={ padding.top || '' }
							placeholder="0px"
							onChange={ ( val ) => handleSpacingChange( 'padding', 'top', val ) }
						/>
						<TextControl
							label={ __( 'Bottom', 'series-craft' ) }
							value={ padding.bottom || '' }
							placeholder="0px"
							onChange={ ( val ) => handleSpacingChange( 'padding', 'bottom', val ) }
						/>
						<TextControl
							label={ __( 'Left', 'series-craft' ) }
							value={ padding.left || '' }
							placeholder="0px"
							onChange={ ( val ) => handleSpacingChange( 'padding', 'left', val ) }
						/>
						<TextControl
							label={ __( 'Right', 'series-craft' ) }
							value={ padding.right || '' }
							placeholder="0px"
							onChange={ ( val ) => handleSpacingChange( 'padding', 'right', val ) }
						/>
					</div>

					<p className="sc-setting-label font-semibold mt-3">{ __( 'Margin', 'series-craft' ) }</p>
					<div className="sc-spacing-grid grid grid-cols-2 gap-2">
						<TextControl
							label={ __( 'Top', 'series-craft' ) }
							value={ margin.top || '' }
							placeholder="0px"
							onChange={ ( val ) => handleSpacingChange( 'margin', 'top', val ) }
						/>
						<TextControl
							label={ __( 'Bottom', 'series-craft' ) }
							value={ margin.bottom || '' }
							placeholder="0px"
							onChange={ ( val ) => handleSpacingChange( 'margin', 'bottom', val ) }
						/>
						<TextControl
							label={ __( 'Left', 'series-craft' ) }
							value={ margin.left || '' }
							placeholder="0px"
							onChange={ ( val ) => handleSpacingChange( 'margin', 'left', val ) }
						/>
						<TextControl
							label={ __( 'Right', 'series-craft' ) }
							value={ margin.right || '' }
							placeholder="0px"
							onChange={ ( val ) => handleSpacingChange( 'margin', 'right', val ) }
						/>
					</div>
				</div>
			</PanelBody>

			{ /* Reset button */ }
			<div className="sc-style-reset-section mt-4">
				<Button
					className="sc-style-reset-button sm-style-reset-button"
					variant="secondary"
					disabled={ ! hasCustomStyles || isSaving }
					isBusy={ isSaving }
					onClick={ () => onResetStyles && onResetStyles( series.id ) }
				>
					{ __( 'Reset to default styles', 'series-craft' ) }
				</Button>
			</div>
		</div>
	);
}
