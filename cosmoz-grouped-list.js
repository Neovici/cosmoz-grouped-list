(function () {

	'use strict';

	const IS_V2 = Polymer.flush != null;

	Polymer({

		is: 'cosmoz-grouped-list',

		properties: {

			data: {
				type: Array
			},

			as: {
				type: String,
				value: 'item'
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
			},

			_isAttached: {
				type: Boolean
			}

		},

		observers: [
			'_dataChanged(data.*)',
			'_scrollTargetChanged(scrollTarget, _isAttached)'
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
		 * The <cosmoz-grouped-list-template> used to render items.
		 */
		_itemTemplate: null,

		/**
		 * The <cosmoz-grouped-list-template> used to render groups.
		 */
		_groupTemplate: null,

		/**
		 * The number of <cosmoz-grouped-list-template-selector> currently used by iron-list.
		 * This number should grows until the viewport is filled by iron-list, then it should not change anymoer.
		 */
		_templateSelectorsCount: 0,

		/**
		 * Array of <cosmoz-grouped-list-template-selector> instantiated by <iron-list>
		 */
		_templateSelectors: null,

		/**
		 * Array of items currently rendered.
		 * Note that an item might be a 'real' item, or a group.
		 */
		_renderedItems: null,

		created() {
			this._templateSelectors = [];
			this._renderedItems = [];
			this._physicalItens = [];
		},

		attached() {
			this._isAttached = true;
			this._debounceRender();
		},

		detached() {
			this._isAttached = false;
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
			if (!this._isAttached) {
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

		_forwardProperty(instance, name, value) {
			if (IS_V2) {
				instance._setPendingProperty(name, value);
			} else {
				instance[name] = value;
			}
		},

		_resetAllTemplates() {
			if (this._templateSelectors.length > 0) {
				this._templateSelectors.forEach(selector => {
					if (selector.element) {
						selector.element.setAttribute('slot', 'reusableTemplate');
						selector.template.releaseInstance(selector.templateInstance);
						selector.element = null;
						selector.template = null;
						selector.templateInstance = null;
					}
				});
			}

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
					console.warn('Incorrect data');
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

		_onTemplateSelectorCreated(event) {
			const	selector = event.detail.selector;
			selector.selectorId = this._templateSelectorsCount;
			selector.groupedList = this;
			this._templateSelectors[selector.selectorId] = selector;
			this._templateSelectorsCount += 1;
		},

		selectorItemChanged(selector, item) {
			const selectorId = selector.selectorId,
				isGroup = this.isGroup(item);
			let element,
				templateInstance;

			this._renderedItems[selectorId] = item;

			const newTemplate = this._getTemplate(isGroup ? 'group' : 'item');

			element = selector.elements[newTemplate.id];

			if (!element) {
				templateInstance =  newTemplate.getInstance();
				element = templateInstance.root.querySelector('*');
				element.__tmplInstance = templateInstance;
				element.setAttribute('slot', selector.slotName);
				Polymer.dom(this).appendChild(templateInstance.root);
				selector.elements[newTemplate.id] = element;
			} else {
				templateInstance = element.__tmplInstance;
			}

			this._forwardProperty(templateInstance, 'item', item);
			this._forwardProperty(templateInstance, 'selected', isGroup ? this.isGroupSelected(item) : this.isItemSelected(item));

			if (isGroup) {
				this._forwardProperty(templateInstance, 'folded', this.isFolded(item));
			} else {
				this._forwardProperty(templateInstance, 'expanded', this.isExpanded(item));
			}

			this._forwardProperty(templateInstance, 'highlighted', this.isItemHighlighted(item));

			if (templateInstance._flushProperties) {
				templateInstance._flushProperties(true);
			}

			selector.show(element, newTemplate.id);
		},

		_getTemplate(type) {
			if (!this['_' + type + 'Template']) {
				this['_' + type + 'Template'] = Polymer.dom(this).querySelector('#' + type + 'Template');
			}
			return this['_' + type + 'Template'];
		},

		/**
		 * Utility method that returns the element that displays the first visible item in the list.
		 * This method is mainly aimed at `cosmoz-omnitable`.
		 * @returns {HTMLElement|null} The first visible element or null
		 */
		getFirstVisibleItemElement() {
			let i,
				selector,
				item,
				selectorIndex;

			if (!this._flatData || !this._renderedItems) {
				return;
			}

			i = this.$.list.firstVisibleIndex;
			for (; i < this._flatData.length ; i += 1) {
				item = this._flatData[i];
				if (!this.isGroup(item)) {
					selectorIndex = this._renderedItems.indexOf(item);
					if (selectorIndex >= 0) {
						selector = this._templateSelectors[selectorIndex];
						// iron-list sets the hidden attribute on its reusable children when there are not used anymore
						if (selector.getAttribute('hidden') === null) {
							return selector.currentElement;
						}
					}
				}
			}
		},

		/**
		 * Returns true if this list has rendered data.
		 * This property returns true if at least one group or item has been rendered by iron-list.
		 * If getFirstVisibleItemElement returns undefined, but hasRenderedData returns true,
		 * this means we are displaying only group templates.
		 */
		get hasRenderedData() {
			if (this._flatData && this._flatData.length > 0) {
				return this._templateSelectors.some(selector => {
					if (selector.getAttribute('hidden') === null) {
						return true;
					}
				});
			}
			return false;
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
			return this.data.find(group => {
				return Array.isArray(group.items) && group.items.indexOf(item) > -1;
			}) || null;
		},

		isFolded(group) {
			const groupState = this._groupsMap && this._groupsMap.get(group);
			return groupState && groupState.folded;
		},

		toggleFold(templateInstance) {
			const item = templateInstance.item,
				group = this.isGroup(item) ? item : this.getItemGroup(item),
				isFolded = this.isFolded(group);

			if (isFolded) {
				this.unfoldGroup(group);
			} else {
				this.foldGroup(group);
			}

			templateInstance.folded = !isFolded;
		},

		unfoldGroup(group) {
			const groupState = this._groupsMap && this._groupsMap.get(group);

			if (groupState && groupState.folded) {
				groupState.folded = false;
				const groupFlatIndex = this._flatData.indexOf(group);
				this.splice.apply(this, ['_flatData', groupFlatIndex + 1, 0].concat(group.items));
			}

		},

		foldGroup(group) {
			const groupState = this._groupsMap && this._groupsMap.get(group);

			if (groupState && !groupState.folded) {
				groupState.folded = true;
				const groupFlatIndex = this._flatData.indexOf(group);
				this.splice('_flatData', groupFlatIndex + 1, group.items.length);
			}
		},

		selectItem(item) {
			const model = this._getModelFromItem(item);

			if (!this.isItemSelected(item)) {
				this.push('selectedItems', item);
			}
			if (model) {
				model['selected'] = true;
			}
		},

		highlightItem(item, reverse) {
			const model = this._getModelFromItem(item),
				highlightedIndex = this.highlightedItems.indexOf(item);

			if (highlightedIndex === -1 && !reverse) {
				this.push('highlightedItems', item);
			}

			if (highlightedIndex > -1 && reverse) {
				this.splice('highlightedItems', highlightedIndex, 1);
			}

			if (model) {
				model['highlighted'] = !reverse;
			}
		},

		deselectItem(item) {
			const selectedIndex = this.selectedItems.indexOf(item),
				model = this._getModelFromItem(item),
				group = this.getItemGroup(item);
			let	groupState,
				groupModel;


			if (selectedIndex >= 0) {
				this.splice('selectedItems', selectedIndex, 1);
			}

			if (model) {
				model['selected'] = false;
			}

			// If the containing group was selected, then deselect it
			// as all items are not selected anymore
			if (group && this.isGroupSelected(group)) {
				groupState = this._groupsMap.get(group);
				groupModel = this._getModelFromItem(group);
				if (groupModel) {
					groupModel['selected'] = false;
				}
				groupState.selected = false;
			}
		},

		isItemSelected(item) {
			return this.selectedItems.indexOf(item) >= 0;
		},

		isItemHighlighted(item) {
			return this.highlightedItems.indexOf(item) >= 0;
		},

		toggleSelectGroup(group, selected) {
			const model = this._getModelFromItem(group),
				groupState = this._groupsMap && this._groupsMap.get(group);

			if (groupState) {
				groupState.selected = selected ? false : true;
			}

			if (model) {
				model['selected'] = selected ? false : true;
			}
			const temp = selected ? 'deselectItem' : 'selectItem';
			group.items.forEach(this[temp], this);
		},

		isGroupSelected(group) {
			const groupState = this._groupsMap && this._groupsMap.get(group);
			return groupState !== undefined && groupState.selected;
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
			this._templateSelectors.forEach(selector => {
				const templateInstance = selector.currentElement && selector.currentElement.__tmplInstance;
				if (templateInstance) {
					templateInstance.selected = true;
				}
			});
		},

		deselectAll() {

			this.splice('selectedItems', 0, this.selectedItems.length);

			if (this._groupsMap) {

				this.data.forEach(group => {
					const groupState = this._groupsMap.get(group);
					if (groupState) {
						groupState.selected = false;
					}
				}, this);
			}

			// Set the selected property to all visible items
			this._templateSelectors.forEach(selector => {
				const templateInstance = selector.currentElement && selector.currentElement.__tmplInstance;
				if (templateInstance) {
					templateInstance.selected = false;
				}
			});
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
			const model = this._getModelFromItem(item);
			let itemState = this._itemsMap.get(item);

			if (!model) {
				return;
			}

			model.expanded = !model.expanded;

			if (!itemState) {
				itemState = { selected: false, expanded: false };
				this._itemsMap.set(item, itemState);
			}

			itemState.expanded = model.expanded;

			this.$.list.updateSizeForItem(item);
		},

		isExpanded(item) {
			const itemState = this._itemsMap ? this._itemsMap.get(item) : undefined;
			return itemState !== undefined && itemState.expanded;
		},

		_getModelFromItem(item) {
			const	physicalIndex = this._renderedItems.indexOf(item);
			if (physicalIndex >= 0) {
				return this._templateSelectors[physicalIndex].currentElement.__tmplInstance;
			}
		}
	});
}());
