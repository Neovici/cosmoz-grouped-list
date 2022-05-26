import { html } from 'lit-html';
import { useMemo, useLayoutEffect, useCallback } from 'haunted';
import { prepareData, isFolded, isExpanded, byReference } from './utils';
import { ifDefined } from 'lit-html/directives/if-defined';
import '@polymer/iron-list/iron-list.js';
import { useNotifyProperty } from '@neovici/cosmoz-utils/lib/hooks/use-notify-property';
import { useImperativeApi } from '@neovici/cosmoz-utils/lib/hooks/use-imperative-api';
import { useCollapsibleItems } from './use-collapsible-items';
import { useSelectedItems } from './use-selected-items';
import './cosmoz-grouped-list-row';

const styles = {
		host: {
			position: 'relative',
			display: 'flex',
			flexDirection: 'column'
		},
		hasScrollTargettrue: {
			flex: 1,
			position: 'static'
		},
		hasScrollTargetfalse: {
			flex: 'initial',
			position: 'absolute',
			top: 0,
			right: 0,
			bottom: 0,
			left: 0
		}
	},
	// eslint-disable-next-line max-lines-per-function
	useCosmozGroupedList = host => {
		const {
				data,
				renderItem,
				renderGroup,
				scrollTarget,
				displayEmptyGroups,
				compareItemsFn = byReference
			} = host,
			updateSize = useCallback(
				item => host.querySelector('#list').updateSizeForItem(item),
				[]
			),
			{ toggleFold, toggleCollapse, state, signal } = useCollapsibleItems(
				item => requestAnimationFrame(() => updateSize(item)),
				() => requestAnimationFrame(() => host.querySelector('#list')._update())
			),
			// TODO: verifica de ce apar 1000 de rows cand dai collapse la un grup
			flatData = useMemo(
				() => prepareData(data, displayEmptyGroups, state),
				[data, displayEmptyGroups, signal]
			),
			{
				selectedItems,
				isItemSelected,
				isGroupSelected,
				isSelected,
				select,
				deselect,
				selectOnly,
				selectAll,
				deselectAll,
				toggleSelect,
				toggleSelectTo
			} = useSelectedItems({
				initial: [],
				compareItemsFn,
				data,
				flatData
			}),
			renderRow = useCallback(
				(item, index) =>
					// eslint-disable-next-line no-nested-ternary
					Array.isArray(item.items)
						? renderGroup(item, index, {
							selected: isGroupSelected(item, selectedItems),
							folded: isFolded(item, state),
							toggleSelect: selected =>
								toggleSelect(
									item,
									typeof selected === 'boolean' ? selected : undefined
								),
							toggleFold: () => toggleFold(item)
						})
						: renderItem(item, index, {
							selected: selectedItems.includes(item),
							expanded: isExpanded(item, state),
							toggleSelect: selected =>
								toggleSelect(
									item,
									typeof selected === 'boolean' ? selected : undefined
								),
							toggleCollapse: () => toggleCollapse(item)
						}),
				[renderItem, renderGroup, selectedItems, toggleSelect, signal]
			);

		useLayoutEffect(() => Object.assign(host.style, styles.host), []);
		useLayoutEffect(
			() =>
				Object.assign(
					host.querySelector('#list').style,
					styles['hasScrollTarget' + !!scrollTarget]
				),
			[scrollTarget]
		);

		useNotifyProperty('selectedItems', selectedItems);
		const api = {
			toggleFold,
			toggleCollapse,
			updateSize,
			isItemSelected,
			isGroupSelected,
			isSelected,
			select,
			deselect,
			selectOnly,
			selectAll,
			deselectAll,
			toggleSelect,
			toggleSelectTo
		};

		useImperativeApi(api, Object.values(api));

		return {
			renderRow,
			scrollTarget,
			flatData
		};
	},
	renderCosmozGroupedList = ({ renderRow, flatData, scrollTarget }) =>
		html`<iron-list
			id="list"
			.as="item"
			.renderFn=${ renderRow }
			.items=${ flatData }
			.scrollTarget=${ ifDefined(scrollTarget) }
			@update-item-size=${ event =>
		event.target.parentNode.updateSizeForIndex(event.detail.index) }
		>
			<template
				><cosmoz-grouped-list-row
					item="[[ item ]]"
					index="[[ index ]]"
					tab-index="[[ tabIndex ]]"
					render-fn="[[ renderFn ]]"
				></cosmoz-grouped-list-row
			></template>
		</iron-list>`;

export { useCosmozGroupedList, renderCosmozGroupedList };
