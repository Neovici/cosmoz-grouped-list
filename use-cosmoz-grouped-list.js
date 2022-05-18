import { html, nothing } from 'lit-html';
import {
	useMemo,
	useLayoutEffect,
	useCallback
} from 'haunted';
import {
	prepareData,
	isFolded,
	isExpanded,
	byReference,
	isItemFolded
} from './utils';
import { ifDefined } from 'lit-html/directives/if-defined';
import '@polymer/iron-list/iron-list.js';
import { useNotifyProperty } from '@neovici/cosmoz-utils/lib/hooks/use-notify-property';
import { useImperativeApi } from '@neovici/cosmoz-utils/lib/hooks/use-imperative-api';
import { noop } from '@neovici/cosmoz-utils/lib/function';
import { useCollapsibleItems } from './use-collapsible-items';
import { useSelectedItems } from './use-selected-items';

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
			flatData = useMemo(
				() => prepareData(data, displayEmptyGroups, state),
				[data, displayEmptyGroups]
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
							toggleSelect: selected => toggleSelect(item, typeof selected === 'boolean' ? selected : undefined),
							toggleFold: () => toggleFold(item)
						})
						: isItemFolded(item, state)
							? nothing
							: renderItem(item, index, {
								selected: selectedItems.includes(item),
								expanded: isExpanded(item, state),
								toggleSelect: selected => toggleSelect(item, typeof selected === 'boolean' ? selected : undefined),
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

		useLayoutEffect(
			// eslint-disable-next-line no-return-assign
			() => host.querySelector('#list')._resetScrollPosition = noop,
			[]
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

		useImperativeApi(
			api,
			Object.values(api)
		);

		return {
			renderRow,
			scrollTarget,
			flatData
		};
	},
	renderCosmozGroupedList = ({ renderRow, flatData, scrollTarget }) =>
		html`<iron-list
			id="list"
			.items=${ flatData }
			.renderFn=${ renderRow }
			.scrollTarget=${ ifDefined(scrollTarget) }
		>
			<template><div></div></template>
		</iron-list>`;

export { useCosmozGroupedList, renderCosmozGroupedList };
