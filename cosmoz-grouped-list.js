/* eslint-disable max-lines */
import {
	PolymerElement, html
} from '@polymer/polymer';
import '@polymer/iron-list/iron-list.js';
import './cosmoz-grouped-list-item.js';
import { isEmpty } from '@neovici/cosmoz-utils/lib/template';

/**
`<cosmoz-grouped-list>` is an example implementation of grouping for iron-list
with features like group count display and folding

### Usage

	<cosmoz-grouped-list data="{{ data }}"></cosmoz-grouped-list>

@group Cosmoz Elements
@element cosmoz-grouped-list
@demo demo/full.html Full Demo
@demo demo/basic.html Basic Demo
@appliesMixin templatizing
*/
export class CosmozGroupedList extends PolymerElement {
	static get template() {
		return html`
		<style>
			cosmoz-grouped-list {
				display: flex;
				position: relative;
				flex-direction: column;
			}

			cosmoz-grouped-list(:not(.has-scroll-target)) #list {
				position: absolute;
				top: 0;
				right: 0;
				bottom: 0;
				left: 0;
			}

			cosmoz-grouped-list(.has-scroll-target) #list {
				flex: 1;
			}
		</style>

		<iron-list id="list" items="[[ _flatData ]]" as="item">
			<template>
				<cosmoz-grouped-list-item
					item-row$="[[ isEmpty(item.items) ]]"
					item="[[ item ]]"
					index="[[ index ]]"
					visible-columns="[[ visibleColumns ]]"
					selected-items="[[ selectedItems ]]"
					render-item-row="[[ _renderItemRow ]]"
					render-group-row="[[ _renderGroupRow ]]"
				></cosmoz-grouped-list-item>
				<!--cosmoz-grouped-list-template-selector item="[[ item ]]" index="[[ index ]]" on-cosmoz-selector-changed="_onTemplateSelectorChanged">
				</cosmoz-grouped-list-template-selector-->
			</template>
		</iron-list>
	`;
	}

	isEmpty() {
		return isEmpty(...arguments);
	}

	constructor() {
		super();

		this._itemsState = new WeakMap();

		this.selectedItems = [];

		this._renderItemRow = this._renderItemRow.bind(this);
		this._renderGroupRow = this._renderGroupRow.bind(this);
	}

	_attachDom(dom) {
		this.appendChild(dom);
	}

	/**
	 * Get component name.
	 * @returns {string} Name.
	 */
	static get is() {
		return 'cosmoz-grouped-list';
	}
	/**
	 * Get component properties.
	 * @returns {string} Properties.
	 */
	static get properties() {
		return {

			data: {
				type: Array
			},

			scrollTarget: {
				type: HTMLElement
			},

			selectedItems: {
				type: Array,
				notify: true
			},

			/**
			 * This function is used to determine which items are kept selected across data updates
			 */
			compareItemsFn: {
				type: Function,
				value: () => function (a, b) {
					return a === b;
				}
			},

			/**
			 * Indicates wether this grouped-list should render groups without items.
			 */
			displayEmptyGroups: {
				type: Boolean,
				value: false

			},

			_flatData: {
				type: Array,
				computed: '_prepareData(data)'
			},

			renderItemRow: {
				type: Function
			},

			renderGroupRow: {
				type: Function
			}
		};
	}
	/**
	 * Get component observers.
	 * @returns {string} Observers.
	 */
	static get observers() {
		return [
			'_scrollTargetChanged(scrollTarget)'
		];
	}

	/**
	 * Add or remove has scroll target classes and set or remove list scroll
	 * target.
	 * @param {object} scrollTarget Scroll target.
	 * @returns {void}
	 */
	_scrollTargetChanged(scrollTarget)	{
		if (scrollTarget === undefined) {
			return;
		}
		if (scrollTarget) {
			this.classList.add('has-scroll-target');
			this.$.list.scrollTarget = scrollTarget;
		} else {
			this.$.list.scrollTarget = undefined;
			this.classList.remove('has-scroll-target');
		}
	}
	/**
	 * Prepare data.
	 * @param {array} data Data.
	 * @returns {void|array} Prepared data.
	 */
	_prepareData(data = null) {
		if (!Array.isArray(data)) {
			return;
		}

		// data should be either all items or all grouped items, never mixed
		this._assertDataIsHomogeneous(data);

		const flatData = data.reduce((acc, item) => {
			// simple items
			if (!item.items) {
				return acc.concat(item);
			}

			// groups with items
			if (item.items.length) {
				return acc.concat(item, item.items);
			}

			// groups without items
			if (this.displayEmptyGroups) {
				return acc.concat(item);
			}

			return acc;
		}, []);

		// keep selected items across data updates
		if (this.selectedItems.length > 0) {
			this.selectedItems = flatData.filter(
				i => this.selectedItems.find(
					item =>	this.compareItemsFn(i, item)
				)
			);
		}

		return flatData;
	}

	_getItemState(item) {
		if (!this._itemsState.has(item)) {
			const state = {
				selected: false,
				folded: false,
				expanded: false
			};
			this._itemsState.set(item, state);
			return state;
		}

		return this._itemsState.get(item);
	}

	/**
	 * Asserts that data is either all items or all groups, never mixed.
	 * @param	 {Array} data the data
	 * @return {void}
	 */
	_assertDataIsHomogeneous(data) {
		if (!Array.isArray(data) || data.length === 0) {
			return;
		}

		const firstItemIsAGroup = Array.isArray(data[0].items),
			isHomogeneous = data.every(group => Array.isArray(group.items) === firstItemIsAGroup);

		if (!isHomogeneous) {
			throw new Error('Data must be homogeneous.');
		}
	}

	/**
	 * Utility method that returns the element that displays the first visible item in the list.
	 * This method is mainly aimed at `cosmoz-omnitable`.
	 * @returns {HTMLElement|null} The first visible element or null
	 */
	getFirstVisibleItemElement() {
		if (!Array.isArray(this._flatData) || this._flatData.length === 0) {
			return false;
		}
		return this.$.list.querySelector('cosmoz-grouped-list-item[item-row]');
	}

	/**
	 * Returns true if this list has rendered data.
	 * This property returns true if at least one group or item has been rendered by iron-list.
	 * If getFirstVisibleItemElement returns undefined, but hasRenderedData returns true,
	 * this means we are displaying only group templates.
	 */
	get hasRenderedData() {
		return this.$.list.querySelector('cosmoz-grouped-list-item').length >= 1;
	}

	/**
	 * Determine if item is a group.
	 * @param {object} item Item.
	 * @returns {boolean} Whether item is group.
	 */
	isGroup(item) {
		return item ? item.items instanceof Array : false;
	}

	/**
	 * Returns the group of the specified item
	 * @param {Object} item The item to search for
	 * @returns {Object|null} The group the item is in or null
	 */
	getItemGroup(item) {
		return this.data.find(group => Array.isArray(group.items) && group.items.indexOf(item) > -1);
	}

	/**
	 * Check if group is folded.
	 * @param {object} group Group.
	 * @returns {boolean} Whether group is folded.
	 */
	isFolded(group) {
		return this._getItemState(group).folded;
	}
	/**
	 * Fold or unfold an item depending on previous state.
	 * @param {object} item Item to fold or unfold.
	 * @returns {void}
	 */
	toggleFold(item) {
		const group = this.isGroup(item) ? item : this.getItemGroup(item),
			isFolded = this.isFolded(group);

		if (isFolded) {
			this.unfoldGroup(group);
		} else {
			this.foldGroup(group);
		}
	}
	/**
	 * Unfold a group.
	 * @param {object} group Group to unfold.
	 * @returns {void}
	 */
	unfoldGroup(group) {
		const groupState = this._getItemState(group);

		if (!groupState.folded) {
			return;
		}

		groupState.folded = false;
		const groupFlatIndex = this._flatData.indexOf(group);
		this.splice.apply(this, ['_flatData', groupFlatIndex + 1, 0].concat(group.items));
		// this._forwardPropertyByItem(group, 'folded', false, true);

	}
	/**
	 * Fold a group.
	 * @param {object} group Group to fold.
	 * @returns {void}
	 */
	foldGroup(group) {
		const groupState = this._getItemState(group);

		if (groupState.folded) {
			return;
		}

		groupState.folded = true;
		const groupFlatIndex = this._flatData.indexOf(group);
		this.splice('_flatData', groupFlatIndex + 1, group.items.length);
		// this._forwardPropertyByItem(group, 'folded', true, true);
	}
	/**
	 * Add an item to the list of selected items and set it as selected.
	 * @param {object}	item Item to select.
	 * @returns {void}
	 */
	selectItem(item) {
		if (!this.isItemSelected(item)) {
			const state = this._getItemState(item);
			state.selected = true;
			this.selectedItems = this.selectedItems.concat(item);
		}
		// this._forwardPropertyByItem(item, 'selected', true, true);
	}
	/**
	 * Remove an item to the list of selected items and set it as deselected.
	 * @param {object} item Item to deselect.
	 * @returns {void}
	 */
	deselectItem(item) {
		const index = this.selectedItems.indexOf(item),
			state = this._getItemState(item);
		state.selected = false;
		if (index >= 0) {
			this.selectedItems = this.selectedItems.splice(index, 1);
		}
		// this._forwardPropertyByItem(item, 'selected', false, true);

		// If the containing group was selected, then deselect it
		// as all items are not selected anymore
		const group = this.getItemGroup(item);
		if (group && this.isGroupSelected(group)) {
			const groupState = this._getItemState(group);
			groupState.selected = false;
			// this._forwardPropertyByItem(group, 'selected', false, true);
		}
	}

	/**
	 * Check if item is selected.
	 * @param {object} item Item.
	 * @returns {boolean} Whether item is selected.
	 */
	isItemSelected(item) {
		return this.selectedItems.indexOf(item) >= 0;
	}

	/**
	 * Toggle group selection.
	 * @param {object} group Group.
	 * @param {boolean} selected Whether selected.
	 * @returns {void}
	 */
	toggleSelectGroup(group, selected) {
		const groupState = this._getItemState(group),
			willSelect = !selected,
			itemAction = willSelect ? 'selectItem' : 'deselectItem';

		groupState.selected = willSelect;
		// this._forwardPropertyByItem(group, 'selected', willSelect, true);
		group.items.forEach(this[itemAction], this);
	}

	/**
	 * Check if group is selected.
	 * @param {object} group Group.
	 * @returns {boolean} Whether group is selected.
	 */
	isGroupSelected(group) {
		return this._getItemState(group).selected;
	}

	/**
	 * Select all items.
	 * @returns {void}
	 */
	selectAll() {
		const selected = this.data.reduce((all, item) =>	{
			const state = this._getItemState(item);
			state.selected = true;
			// select both groups and flat items
			return all.concat(item.items || item);
		}, []);
		this.set('selectedItems', selected);
	}
	/**
	 * Deselect all selected items.
	 * @returns {void}
	 */
	deselectAll() {
		this.set('selectedItems', []);

		this.data.forEach(groupOrItem => {
			if (!groupOrItem.items) {
				const state = this._getItemState(groupOrItem);
				state.selected = false;
				return;
			}

			const groupState = this._getItemState(groupOrItem);
			groupState.selected = false;
		});
	}
	/**
	 * Update size for an item.
	 * @param {object} item Item to update size on.
	 * @returns {void}
	 */
	updateSize(item) {
		// Do not attempt to update size of item is not visible (for example when groups are folded)
		if (this._flatData.indexOf(item) >= 0) {
			requestAnimationFrame(() => this.$.list.updateSizeForItem(item));
		}
	}

	/**
	 * Toggle collapse status on an item.
	 * @param {object} item Item.
	 * @returns {void}
	 */
	toggleCollapse(item) {
		const state = this._getItemState(item),
			willExpand = state.expanded = !state.expanded;
		// this._forwardPropertyByItem(item, 'expanded', willExpand, true);
		this.$.list.updateSizeForItem(item);
	}

	_renderItemRow(item, selectedItems, visibleColumns) {
		return this.renderItemRow(item, selectedItems, visibleColumns, this._getItemState(item));
	}

	_renderGroupRow(group, selectedItems) {
		return this.renderGroupRow(group, selectedItems, this._getItemState(group));
	}
}
customElements.define(CosmozGroupedList.is, CosmozGroupedList);
