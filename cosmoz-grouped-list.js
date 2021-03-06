/* eslint-disable max-lines */
import {
	PolymerElement, html
} from '@polymer/polymer';
import { timeOut } from '@polymer/polymer/lib/utils/async.js';
import {
	Debouncer, enqueueDebouncer
} from '@polymer/polymer/lib/utils/debounce.js';
import { useShadow } from '@polymer/polymer/lib/utils/settings';

import '@polymer/iron-list/iron-list.js';

import { templatizing } from './cosmoz-templatizing-mixin.js';
import './cosmoz-grouped-list-template-selector.js';

const symbols = {
	group: Symbol('group')
};

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
export class CosmozGroupedList extends templatizing(PolymerElement) {
	static get template() {
		return html`
		<style>
			:host {
				display: flex;
				position: relative;
				flex-direction: column;
			}

			:host(:not(.has-scroll-target)) #list {
				position: absolute;
				top: 0;
				right: 0;
				bottom: 0;
				left: 0;
			}

			:host(.has-scroll-target) #list {
				flex: 1;
			}
		</style>

		<iron-list id="list" items="[[ _flatData ]]" as="item">
			<template>
				<cosmoz-grouped-list-template-selector item="[[ item ]]" index="[[ index ]]" on-cosmoz-selector-changed="_onTemplateSelectorChanged"
					part="template-selector"></cosmoz-grouped-list-template-selector>
			</template>
		</iron-list>
		<slot name="templates" id="templates"></slot>
	`;
	}

	constructor() {
		super();

		this._itemsState = new WeakMap();

		this.selectedItems = [];

		this._boundRender = this._render.bind(this);
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
				notify: true,
				observer: '_selectionChanged'
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

			highlightedItems: {
				type: Array,
				value() {
					return [];
				},
				notify: true
			},

			/**
			 * Indicates wether this grouped-list should render groups without items.
			 */
			displayEmptyGroups: {
				type: Boolean,
				value: false

			},

			_flatData: {
				type: Array
			}

		};
	}
	/**
	 * Get component observers.
	 * @returns {string} Observers.
	 */
	static get observers() {
		return [
			'_dataChanged(data.*)',
			'_scrollTargetChanged(scrollTarget)'
		];
	}

	/**
	 * Polymer `connectedCallback` livecycle function.
	 *
	 * @return {void}
	 */
	connectedCallback() {
		super.connectedCallback();
		this._debounceRender();
	}

	/**
	 * Polymer `disconnectedCallback` livecycle function.
	 *
	 * @return {void}
	 */
	disconnectedCallback() {
		super.disconnectedCallback();
		this._renderDebouncer.cancel();
	}
	/**
	 * Forward item path if necessary and debounce render.
	 * @param {object} change Change notifier.
	 * @returns {void}
	 */
	_dataChanged(change) {
		if (change.path === 'data' || change.path.slice(-8) === '.splices') {
			this._debounceRender();
		} else if (change.path.slice(-7) !== '.length') {
			if (!this._forwardItemPath(change.path, change.value)) {
				this._debounceRender();
			}
		}
	}
	/**
	 * Debounce render.
	 * @returns {void}
	 */
	_debounceRender() {
		enqueueDebouncer(
			this._renderDebouncer = Debouncer.debounce(
				this._renderDebouncer,
				timeOut.after(30),
				this._boundRender
			)
		);
	}
	/**
	 * Prepare and set flat data.
	 * @returns {void}
	 */
	_render() {
		if (!this.isConnected) {
			return;
		}
		this._flatData = this._prepareData(this.data);
	}
	/**
	 * Forward item path.
	 * @param {string} path Path.
	 * @param {any} value Value.
	 * @returns {void}
	 */
	_forwardItemPath(path, value) {
		const match = path.match(/data(?:\.#?(\d+)\.items)?\.#?(\d+)(\..+)$/ui);

		if (!match) {
			return;
		}

		const groupIndex = match[1],
			itemIndex = match[2],
			propertyPath = 'item' + match[3],
			items = groupIndex ? this.data[groupIndex].items : this.data,
			item = items ? items[itemIndex] : null;

		if (item == null) {
			// eslint-disable-next-line no-console
			console.warn('Item not found when forwarding path', path);
			return;
		}

		const instance = this._getInstanceByProperty('item', item);

		if (!instance) {
			// eslint-disable-next-line no-console
			console.warn('Template instance for item not found when forwarding path', path);
			return;
		}

		instance._setPendingPropertyOrPath(propertyPath, value, false, true);
		instance._flushProperties(true);

		return true;
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
	_prepareData(data) {
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
				return acc.concat(item, item.items.map(i => Object.assign(i, { [symbols.group]: item })));
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

	_onTemplateSelectorChanged(e, {
		item, index, hidden, selector
	}) {
		const
			fidx = this._flatData ? this._flatData.indexOf(item) : '',
			idx = index == null ? fidx : index,
			prevInstance = selector.__instance;

		if (!item) {
			return;
		}

		if (hidden && prevInstance != null) {
			this._reuseInstance(prevInstance);
			selector.__instance = null;
			return;
		}

		const slotName = this._getSlotByIndex(idx) + Date.now(),
			isGroup = this.isGroup(item),
			type = this._getItemType(item),
			props = {
				[this.as]: item,
				[this.indexAs]: idx,
				selected: isGroup ? this.isGroupSelected(item) : this.isItemSelected(item),
				folded: isGroup ? this.isFolded(item) : undefined,
				expanded: isGroup ? undefined : this.isExpanded(item),
				highlighted: this.isItemHighlighted(item)
			},
			instance = this._getInstance(type, props, prevInstance, item != null),
			slot = selector.querySelector('slot') ?? selector.appendChild(document.createElement('slot'));

		slot.setAttribute('name', slotName);
		instance.element.setAttribute('slot', slotName);
		this.appendChild(
			useShadow
				? instance.root
				: instance.element
		);
		selector.__instance = instance;
	}

	/**
	 * Utility method that returns the element that displays the first visible item in the list.
	 * This method is mainly aimed at `cosmoz-omnitable`.
	 * @returns {HTMLElement|null} The first visible element or null
	 */
	getFirstVisibleItemElement() {
		const { _flatData: flat } = this;
		if (!Array.isArray(flat) || flat.length === 0) {
			return false;
		}
		const { firstVisibleIndex } = this.$.list;
		return this._instances.find(i => i.__type === 'item' && i._getProperty('index') >= firstVisibleIndex && i.element?.offsetParent != null)?.element;
	}

	/**
	 * Returns true if this list has rendered data.
	 * This property returns true if at least one group or item has been rendered by iron-list.
	 * If getFirstVisibleItemElement returns undefined, but hasRenderedData returns true,
	 * this means we are displaying only group templates.
	 */
	get hasRenderedData() {
		const {
			_flatData: flat,
			_instances: instances
		} = this;
		if (!Array.isArray(flat) || flat.length === 0) {
			return false;
		}
		return instances.some(instance => instance?.element.offsetParent != null);
	}

	/**
	 * Utility method to remove an item from the list.
	 * This method simply removes the specified item from the `data` using
	 * Polymer array mutation methods.
	 * Cannot be used to remove a group.
	 * @deprecated
	 * @param {Object} item The item to remove
	 * @returns {Boolean|undefined} true/false or null
	 */
	removeItem(item) {
		if (this.data[0].items) {
			return this.data.some((group, groupIndex) => {
				const index = group.items.indexOf(item);
				if (index >= 0) {
					this.splice('data.' + groupIndex + '.items', index, 1);
					return true;
				}
				return false;
			}, this);
		}
		const i = this.data.indexOf(item);
		if (i >= 0) {
			this.splice('data', i, 1);
		}
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
		this._forwardPropertyByItem(group, 'folded', false, true);

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
		this._forwardPropertyByItem(group, 'folded', true, true);
	}
	/**
	 * Highlight or un-highlight an item.
	 * @param {object} item Item.
	 * @param {boolean} reverse Set to true to un-highlight.
	 * @returns {void}
	 */
	highlightItem(item, reverse) {
		const highlightedIndex = this.highlightedItems.indexOf(item);

		if (highlightedIndex === -1 && !reverse) {
			this.push('highlightedItems', item);
		}

		if (highlightedIndex > -1 && reverse) {
			this.splice('highlightedItems', highlightedIndex, 1);
		}
		this._forwardPropertyByItem(item, 'highlighted', !reverse, true);
	}

	/**
	 * Check if item is selected.
	 * @param {object} item Item.
	 * @returns {boolean} Whether item is selected.
	 */
	isItemSelected(item) {
		return this.selectedItems.includes(item);
	}

	/**
	 * Check if group is selected.
	 * @param {object} group Group.
	 * @returns {boolean} Whether group is selected.
	 */
	isGroupSelected(group) {
		return group?.items?.every(this.isItemSelected, this);
	}

	/**
	 * Check if item.group is selected.
	 * @param {object} item Item.
	 * @returns {boolean} Whether item is selected.
	 */
	isSelected(item) {
		return this.isItemSelected(item) || this.isGroupSelected(item);
	}


	/**
	 * Add an item/group to the list of selected items.
	 * @param {object} item Item to select.
	 * @returns {void}
	 */
	select(item) {
		const items = item.items ?? [item],
			selection = this.selectedItems;
		this.selectedItems = [...selection, ...items.filter(i => !selection.includes(i))];
		this._lastSelection = item;
	}

	/**
	 * Removes an item/group from the list of selected items.
	 * @param {object} item Item to select.
	 * @returns {void}
	 */
	deselect(item) {
		const items = item.items ?? [item],
			selection = this.selectedItems;
		this.selectedItems = selection.filter(i => !items.includes(i));
		this._lastSelection = item;
	}

	/**
	 * Toggles the selection of an item/group.
	 * @param {object} item Item to select.
	 * @param {boolean=} selected Select or deselect, fallback to toggling.
	 * @returns {void}
	 */
	toggleSelect(item, selected = !this.isSelected(item)) {
		return selected ? this.select(item) : this.deselect(item);
	}

	selectOnly(item) {
		this.selectedItems = item.items?.slice() || [item];
		this._lastSelection = item;
	}


	toggleSelectTo(item, selected) {
		const last = this._lastSelection ? this._flatData.findIndex(i => this.compareItemsFn(i, this._lastSelection)) : -1;
		if (last < 0) {
			return this.toggleSelect(item, selected);
		}
		const [from, to] = [last, this._flatData.indexOf(item)].sort((a, b) => a - b);
		this._flatData.slice(from, to + 1).forEach((item, i, items) => {
			if (i > 0 && i < items.length - 1 && this.isGroup(item)) {
				return;
			}
			this.toggleSelect(item, selected);
		});
		this._lastSelection = item;
	}

	/**
	 * Select all items.
	 * @returns {void}
	 */
	selectAll() {
		this.selectedItems = this.data.flatMap(item => item.items || item);
		this._lastSelection = undefined;
	}
	/**
	 * Deselect all selected items.
	 * @returns {void}
	 */
	deselectAll() {
		this.selectedItems = [];
		this._lastSelection = undefined;
	}

	/**
	 * Toggles group selection.
	 * @param {object} group Group.
	 * @param {boolean} selected Whether selected.
	 * @returns {void}
	 */
	toggleSelectGroup(group, selected) {
		this.toggleSelect(group, !selected);
	}
	/**
	 * Add an item to the list of selected items and set it as selected.
	 * @param {object}	item Item to select.
	 * @returns {void}
	 * @deprecated
	 */
	selectItem(item) {
		this.select(item);
	}

	/**
	 * Remove an item to the list of selected items and set it as deselected.
	 * @param {object} item Item to deselect.
	 * @deprecated
	 * @returns {void}
	 */
	deselectItem(item) {
		this.deselect(item);
	}

	_selectionChanged(selection, prev) {
		const removed = prev?.slice() ?? [],
			groups = new Set();

		for (const item of selection) {
			const i = removed.indexOf(item);
			if (i < 0) {
				this._forwardPropertyByItem(item, 'selected', true, true);
				groups.add(item[symbols.group]);
			} else {
				removed.splice(i, 1);
			}
		}
		for (const item of removed) {
			this._forwardPropertyByItem(item, 'selected', false, true);
			groups.add(item[symbols.group]);
		}

		for (const group of groups) {
			this._forwardPropertyByItem(group, 'selected', this.isGroupSelected(group), true);
		}
	}


	/**
	 * Check if item is highlighted.
	 * @param {object} item Item.
	 * @returns {boolean} Whether item is highlighted.
	 */
	isItemHighlighted(item) {
		return this.highlightedItems.indexOf(item) >= 0;
	}
	/**
	 * Update size for an item.
	 * @param {object} item Item to update size on.
	 * @returns {void}
	 */
	updateSize(item) {
		// Do not attempt to update size of item is not visible (for example when groups are folded)
		if (this._flatData.indexOf(item) >= 0) {
			this.$.list.updateSizeForItem(item);
		}
	}
	/**
	 * Update item sizes in a group.
	 * @param {object} group Group to update item sizes in.
	 * @returns {void}
	 */
	updateSizes(group) {
		group.items.forEach(this.updateSize, this);
	}
	/**
	 * Toggle collapse status on an item.
	 * @param {object} item Item.
	 * @returns {void}
	 */
	toggleCollapse(item) {
		const state = this._getItemState(item),
			willExpand = state.expanded = !state.expanded;
		this._forwardPropertyByItem(item, 'expanded', willExpand, true);
		this.$.list.updateSizeForItem(item);
	}
	/**
	 * Determine if an item is expanded.
	 * @param {object} item Item.
	 * @returns {boolean} Whether the item is expanded.
	 */
	isExpanded(item) {
		return this._getItemState(item).expanded;
	}
	/**
	 * Get slot by index.
	 * @param {number} index Index.
	 * @returns {string} Slot.
	 */
	_getSlotByIndex(index) {
		return `cosmoz-glts-${ index }`;
	}
	/**
	 * Get item type.
	 * @param {object} item Item.
	 * @param {boolean} isGroup Whether item is a group.
	 * @returns {string} Item type.
	 */
	_getItemType(item) {
		return this.isGroup(item) ? 'group' : 'item';
	}
}
customElements.define(CosmozGroupedList.is, CosmozGroupedList);
