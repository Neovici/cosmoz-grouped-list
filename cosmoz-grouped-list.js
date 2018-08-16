(function () {

	'use strict';

	const IS_V2 = Polymer.flush != null;

	Polymer({

		is: 'cosmoz-grouped-list',

		properties: {

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
				type: Array,
			}

		},
		behaviors: [
			Cosmoz.GroupedListTemplatizeBehavior
		],

		observers: [
			'_dataChanged(data.*)',
			'_scrollTargetChanged(scrollTarget, isAttached)'
		],

		/**
		 * A map of (group,state).
		 * If source data is grouped, then this map stores group level items, with an associated state object indicating wether
		 * the group is folded and selected.
		 */
		_groupsMap: null,

		/**
		 * A map of (item,state), used to store an object indicating wether an item is selected and expanded.
		 */
		_itemsMap: null,

		/**
		 * Polymer `attached` livecycle function.
		 *
		 * @return {void}
		 */
		attached() {
			this._debounceRender();
		},

		/**
		 * Polymer `detached` livecycle function.
		 *
		 * @return {void}
		 */
		detached() {
			this.cancelDebouncer('render');
		},

		_dataChanged(change) {
			if (change.path === 'data' || change.path.slice(-8) === '.splices') {
				this._debounceRender();
			} else if (change.path.slice(-7) !== '.length') {
				if (!this._forwardItemPath(change.path, change.value)) {
					this._debounceRender();
				}
			}
		},

		_debounceRender() {
			this.debounce('render', this._render);
		},

		_render() {
			if (!this.isAttached) {
				return;
			}
			this._flatData = this._prepareData(this.data);
		},

		_forwardItemPath(path, value) {
			const match = path.match(/data(?:\.#?(\d+)\.items)?\.#?(\d+)(\..+)$/i);

			if (!match) {
				return;
			}

			const
				groupIndex = match[1],
				itemIndex =  match[2],
				propertyPath = 'item' + match[3],
				item =  groupIndex ? this.data[groupIndex].items[itemIndex] : itemIndex ? this.data[itemIndex] : null;

			if (item == null) {
				console.warn('Item not found when forwarding path', path);
				return;
			}

			const instance = this._getModelFromItem(item);

			if (!instance) {
				console.warn('Template instance for item not found when forwarding path', path);
				return;
			}

			if (IS_V2) {
				instance._setPendingPropertyOrPath(propertyPath, value, false, true);
			} else {
				instance.notifyPath(propertyPath, value, true);
			}

			if (instance._flushProperties) {
				instance._flushProperties(true);
			}

			return true;
		},

		_scrollTargetChanged(scrollTarget, isAttached)  {
			if (! (scrollTarget === undefined || isAttached === undefined)) {
				if (scrollTarget && isAttached) {
					this.classList.add('has-scroll-target');
					this.$.list.scrollTarget = scrollTarget;
				} else {
					this.$.list.scrollTarget = undefined;
					this.classList.remove('has-scroll-target');
				}
			}
		},

		_prepareData(data = null) {

			this.selectedItems = [];

			if (data === null || data.length === 0 || data[0] === undefined) {
				this._expandedItems = this._foldedGroups = this._groupsMap = null;
				return null;
			}
			this._itemsMap = new WeakMap();

			if (!data[0].items) {
				// no grouping, so render items as a standard list
				this._groupsMap = null;
				return data.slice();
			}
			this._groupsMap = new WeakMap();

			return data.reduce(function (flatData, group) {
				if (!group.items) {
					console.warn('Incorrect data, group does not have items');
					return flatData;
				}

				this._groupsMap.set(group, {
					selected: false,
					folded: false
				});

				if (group.items.length) {
					return flatData.concat(group, group.items);
				} else if (this.displayEmptyGroups) {
					return flatData.concat(group);
				}
				return flatData;
			}.bind(this), []);
		},

		_onTemplateSelectorChanged(e, {item, index, hidden, selector}) {
			const idx = index != null ? index : this._flatData ? this._flatData.indexOf(item) : '',
				prevInstance = selector.__instance;
			if (hidden && prevInstance !== null) {
				this._reuseInstance(prevInstance);
				selector.__instance = null;
				return;
			}
			const slotName = this._getSlotByIndex(idx) + Date.now(),
				isGroup = this.isGroup(item),
				type = this._getItemType(item, isGroup),
				props = {
					[this.as]: item,
					[this.indexAs]: idx,
					selected: isGroup ? this.isGroupSelected(item) : this.isItemSelected(item),
					folded: isGroup ? this.isFolded(item) : undefined,
					expanded: !isGroup ? this.isExpanded(item) : undefined,
					highlighted: this.isItemHighlighted(item),
				},
				instance = this._getInstance(type, props, prevInstance);

			let slot = Polymer.dom(selector).querySelector('slot');
			if (slot == null) {
				slot = Polymer.dom(selector).querySelector('content');
				slot.setAttribute('select', '[slot="' + slotName + '"]');
			} else {
				slot.setAttribute('name', slotName);
			}
			instance.element.setAttribute('slot', slotName);
			Polymer.dom(this).appendChild(instance.root);
			selector.__instance = instance;
		},


		/**
		 * Utility method that returns the element that displays the first visible item in the list.
		 * This method is mainly aimed at `cosmoz-omnitable`.
		 * @returns {HTMLElement|null} The first visible element or null
		 */
		getFirstVisibleItemElement() {
			const {_flatData: flat} = this;
			if (!Array.isArray(flat) || flat.length === 0) {
				return false;
			}

			let {firstVisibleIndex: index} = this.$.list,
				instance = null;

			while (index < flat.length && !instance) {
				instance =  this._getInstanceByProperty('index', index);
				if (instance) {
					instance = instance.__type === 'item' && instance;
				}
				index++;
			}

			if (instance) {
				return instance.element;
			}
		},

		/**
		 * Returns true if this list has rendered data.
		 * This property returns true if at least one group or item has been rendered by iron-list.
		 * If getFirstVisibleItemElement returns undefined, but hasRenderedData returns true,
		 * this means we are displaying only group templates.
		 */
		get hasRenderedData() {
			const {_flatData: flat, _instances: instances} = this;
			if (!Array.isArray(flat) || flat.length === 0) {
				return false;
			}
			return instances.some(instance => instance !== null);
		},

		/**
		 * Utility method to remove an item from the list.
		 * This method simply removes the specified item from the `data` using
		 * Polymer array mutation methods.
		 * Cannot be used to remove a group.
		 * @param {Object} item The item to remove
		 * @returns {Boolean|undefined} true/false or null
		 */
		removeItem(item) {
			if (this._groupsMap) {
				return this.data.some((group, groupIndex) => {
					const index = group.items.indexOf(item);
					if (index >= 0) {
						this.splice('data.' + groupIndex + '.items', index, 1);
						return true;
					}
				}, this);
			}
			const i = this.data.indexOf(item);
			if (i >= 0) {
				this.splice('data', i, 1);
			}
		},

		isGroup(item) {
			return this._groupsMap && this._groupsMap.get(item) !== undefined;
		},

		/**
		 * Returns the group of the specified item
		 * @param {Object} item The item to search for
		 * @returns {Object|null} The group the item is in or null
		 */
		getItemGroup(item) {
			if (!this._groupsMap) {
				return;
			}
			return this.data.find(group => Array.isArray(group.items) && group.items.indexOf(item) > -1);
		},

		isFolded(group) {
			const groupState = this._groupsMap && this._groupsMap.get(group);
			return groupState && groupState.folded;
		},

		toggleFold(item) {
			const group = this.isGroup(item) ? item : this.getItemGroup(item),
				isFolded = this.isFolded(group);

			if (isFolded) {
				this.unfoldGroup(group);
			} else {
				this.foldGroup(group);
			}
		},

		unfoldGroup(group) {
			const groupState = this._groupsMap && this._groupsMap.get(group);

			if (groupState && groupState.folded) {
				groupState.folded = false;
				const groupFlatIndex = this._flatData.indexOf(group);
				this.splice.apply(this, ['_flatData', groupFlatIndex + 1, 0].concat(group.items));
				this._forwardPropertyByItem(group, 'folded', false, true);
			}
		},

		foldGroup(group) {
			const groupState = this._groupsMap && this._groupsMap.get(group);
			if (groupState && !groupState.folded) {
				groupState.folded = true;
				const groupFlatIndex = this._flatData.indexOf(group);
				this.splice('_flatData', groupFlatIndex + 1, group.items.length);
				this._forwardPropertyByItem(group, 'folded', true, true);
			}
		},

		selectItem(item) {
			if (!this.isItemSelected(item)) {
				this.push('selectedItems', item);
			}
			this._forwardPropertyByItem(item, 'selected', true, true);
		},

		highlightItem(item, reverse) {
			const	highlightedIndex = this.highlightedItems.indexOf(item);

			if (highlightedIndex === -1 && !reverse) {
				this.push('highlightedItems', item);
			}

			if (highlightedIndex > -1 && reverse) {
				this.splice('highlightedItems', highlightedIndex, 1);
			}
			this._forwardPropertyByItem(item, 'highlighted', !reverse, true);
		},

		deselectItem(item) {
			const index = this.selectedItems.indexOf(item);
			if (index >= 0) {
				this.splice('selectedItems', index, 1);
			}
			this._forwardPropertyByItem(item, 'selected', false, true);
			// If the containing group was selected, then deselect it
			// as all items are not selected anymore
			const group = this.getItemGroup(item);
			if (group && this.isGroupSelected(group)) {
				const groupState = this._groupsMap.get(group);
				groupState.selected = false;
				this._forwardPropertyByItem(group, 'selected', false, true);
			}
		},

		isItemSelected(item) {
			return this.selectedItems.indexOf(item) >= 0;
		},

		isItemHighlighted(item) {
			return this.highlightedItems.indexOf(item) >= 0;
		},

		toggleSelectGroup(group, selected) {
			const groupState = this._groupsMap && this._groupsMap.get(group);
			const willSelect = selected ? false : true;
			const itemAction = willSelect ? 'selectItem' : 'deselectItem';
			if (groupState) {
				groupState.selected = willSelect;
			}
			this._forwardPropertyByItem(group, 'selected', willSelect, true);
			group.items.forEach(this[itemAction], this);
		},

		isGroupSelected(group) {
			const groupState = this._groupsMap && this._groupsMap.get(group);
			return groupState !== undefined && groupState.selected;
		},

		_toggleSelected(value) {
			this._instances.forEach(instance => this._forwardProperty(instance, 'selected', value, true));
		},

		selectAll() {
			const groups = this._groupsMap;
			let	selected = this.data;

			if (groups) {
				selected = selected.reduce((all, group) =>  {
					const state = groups.get(group);
					if (state) {
						state.selected = true;
					}
					return all.concat(group.items || []);
				}, []);
			}
			this.splice.apply(this, ['selectedItems', 0, this.selectedItems.length].concat(selected));

			// Set the selected property to all visible items
			this._toggleSelected(true);
		},

		deselectAll() {

			this.splice('selectedItems', 0, this.selectedItems.length);

			if (this._groupsMap) {

				this.data.forEach(group => {
					const groupState = this._groupsMap.get(group);
					if (groupState) {
						groupState.selected = false;
					}
				});
			}

			// Set the selected property to all visible items
			this._toggleSelected(false);
		},

		updateSize(item) {
			// Do not attempt to update size of item is not visible (for example when groups are folded)
			if (this._flatData.indexOf(item) >= 0) {
				this.$.list.updateSizeForItem(item);
			}
		},

		updateSizes(group) {
			group.items.forEach(this.updateSize, this);
		},

		toggleCollapse(item) {
			const	state = this._itemsMap.get(item) || { selected: false, expanded: false },
				willExpand = state.expanded = !state.expanded;
			this._itemsMap.set(item, state);
			this._forwardPropertyByItem(item, 'expanded', willExpand, true);
			this.$.list.updateSizeForItem(item);
		},

		isExpanded(item) {
			const itemState = this._itemsMap ? this._itemsMap.get(item) : undefined;
			return itemState !== undefined && itemState.expanded;
		},

		_getSlotByIndex(index) {
			return `cosmoz-glts-${index}`;
		},

		_getItemType(item, isGroup = this.isGroup(item)) {
			return isGroup ? 'group' : 'item';
		}
	});
}());
