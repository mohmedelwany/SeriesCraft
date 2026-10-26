/**
 * StyleTab Component.
 *
 * Tab 2 in Series Settings Sidebar for managing series colors, borders, dimensions,
 * and resetting to design system defaults.
 *
 * @package SeriesCraft\SettingsSidebar
 */

import React from 'react';
import { __ } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import {
	__experimentalPanelColorGradientSettings as ExpPanelColorGradientSettings,
	PanelColorGradientSettings as CorePanelColorGradientSettings,
	__experimentalSpacingSizesControl as ExpSpacingSizesControl,
	SpacingSizesControl as CoreSpacingSizesControl,
} from '@wordpress/block-editor';
import {
	PanelBody,
	Button,
	__experimentalBorderControl as ExpBorderControl,
	BorderControl as CoreBorderControl,
} from '@wordpress/components';

const SafePanelColorGradientSettings = ExpPanelColorGradientSettings || CorePanelColorGradientSettings;
const SafeSpacingSizesControl = ExpSpacingSizesControl || CoreSpacingSizesControl;
const SafeBorderControl = ExpBorderControl || CoreBorderControl;

/**
 * Dimension and Border controls section.
 *
 * @param {Object} props Component props.
 * @return {JSX.Element} Dimension controls.
 */
export function DimensionSettings( { style, onChangeStyle, onChangeSpacing } ) {
	const colors = useSelect( ( select ) => {
		const blockEditor = select( 'core/block-editor' );
		return blockEditor?.getSettings?.()?.colors ?? [];
	}, [] );

	const BorderComponent = SafeBorderControl || ( ( { label, value, onChange } ) => (
		<div className="sc-fallback-border-control">
			<span>{ label }</span>
			<input
				type="text"
				value={ value?.width || '' }
				onChange={ ( e ) => onChange( { ...value, width: e.target.value } ) }
				aria-label={ label }
			/>
		</div>
	) );

	const SpacingComponent = SafeSpacingSizesControl || ( ( { label, values, onChange } ) => (
		<div className="sc-fallback-spacing-control">
			<span>{ label }</span>
			<input
				type="text"
				value={ values?.top || '' }
				onChange={ ( e ) => onChange( { ...values, top: e.target.value } ) }
				aria-label={ label }
			/>
		</div>
	) );

	return (
		<>
			<PanelBody title={ __( 'Border', 'series-craft' ) } initialOpen={ false }>
				<BorderComponent
					__next40pxDefaultSize={ true }
					colors={ colors }
					label={ __( 'Border', 'series-craft' ) }
					onChange={ ( next ) => onChangeStyle( { border: next } ) }
					value={ style?.border }
					withSlider={ true }
					__experimentalIsRenderedInSidebar={ true }
				/>
			</PanelBody>

			<div className="sm-series-dimensions">
				<PanelBody
					className="sm-series-dimensions-panel"
					title={ __( 'Dimensions', 'series-craft' ) }
					initialOpen={ false }
				>
					<SpacingComponent
						className="sm-series-dimensions-spacing"
						label={ __( 'Padding', 'series-craft' ) }
						values={ style?.padding }
						onChange={ ( next ) => onChangeSpacing( 'padding', next ) }
					/>

					<SpacingComponent
						className="sm-series-dimensions-spacing"
						label={ __( 'Margin', 'series-craft' ) }
						values={ style?.margin }
						onChange={ ( next ) => onChangeSpacing( 'margin', next ) }
					/>
				</PanelBody>
			</div>
		</>
	);
}

/**
 * StyleTab component.
 *
 * @param {Object} props Component props.
 * @param {Object} props.series Active series term object.
 * @param {Object} props.style Current series style settings.
 * @param {boolean} props.isSaving True if currently saving.
 * @param {Function} props.onChangeStyle Callback for style updates.
 * @param {Function} props.onChangeSpacing Callback for spacing updates (dispatches spacing preview).
 * @param {Function} props.onReset Callback to reset styles to defaults.
 * @return {JSX.Element} Rendered style tab.
 */
export function StyleTab( {
	series,
	style = {},
	isSaving = false,
	onChangeStyle,
	onChangeSpacing,
	onReset,
} ) {
	const ColorComponent = SafePanelColorGradientSettings || ( ( { title, settings } ) => (
		<PanelBody title={ title } initialOpen={ true }>
			{ settings.map( ( s, idx ) => (
				<div key={ idx } className="sc-fallback-color-control">
					<label htmlFor={ `sc-color-${ idx }` }>{ s.label }</label>
					<input
						id={ `sc-color-${ idx }` }
						type="text"
						value={ s.colorValue || '' }
						onChange={ ( e ) => s.onColorChange( e.target.value ) }
						aria-label={ s.label }
					/>
				</div>
			) ) }
		</PanelBody>
	) );

	return (
		<div className="sm-tab-content-style" data-testid="sm-tab-content-style">
			<ColorComponent
				title={ __( 'Color', 'series-craft' ) }
				settings={ [
					{
						label: __( 'Title', 'series-craft' ),
						colorValue: style?.titleColor || '',
						onColorChange: ( color ) => onChangeStyle( { titleColor: color || '' } ),
					},
					{
						label: __( 'Header Background', 'series-craft' ),
						colorValue: style?.headerBackgroundColor || '',
						onColorChange: ( color ) => onChangeStyle( { headerBackgroundColor: color || '' } ),
					},
					{
						label: __( 'Button', 'series-craft' ),
						colorValue: style?.buttonColor || '',
						onColorChange: ( color ) => onChangeStyle( { buttonColor: color || '' } ),
					},
				] }
				disableCustomGradients
				__experimentalIsRenderedInSidebar
			/>

			<DimensionSettings
				series={ series }
				style={ style }
				onChangeStyle={ onChangeStyle }
				onChangeSpacing={ onChangeSpacing }
			/>

			<Button
				className="sm-style-reset-button"
				variant="secondary"
				onClick={ onReset }
				disabled={ isSaving }
				isBusy={ isSaving }
			>
				{ __( 'Reset to default styles', 'series-craft' ) }
			</Button>
		</div>
	);
}

export default StyleTab;
