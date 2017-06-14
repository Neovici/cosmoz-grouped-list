/*global cz, document, Polymer, window, WeakMap */
(function () {

	'use strict';

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

		created: function () {
			this._templateSelectors = [];
			this._renderedItems = [];
			this._physicalItens = [];
		},

		attached: function () {
			this._isAttached = true;
			this._debounceRender();
		},

		detached: function () {
			this._isAttached = false;
			this.cancelDebouncer('render');
		},

		_dataChanged: function (change) {
			if (change.path === 'data' || change.path.slice(-8) === '.splices') {
				this._debounceRender();
			} else if (change.path.slice(-7) !== '.length') {
				if (!this._forwardItemPath(change.path, change.value)) {
					this._debounceRender();
				}
			}
		},

		_debounceRender: function () {
			this.debounce('render', this._render);
		},

		_render: function () {
			if (!this._isAttached) {
				return;
			}

			this._flatData = this._prepareData(this.data);
		},

		_forwardItemPath: function (path, value) {
			var pathArray = path.split('.'),
				itemPath,
				groupIndex,
				itemIndex,
				templateInstance,
				item;

			if (this._groupsMap !== null) {
				if (pathArray.length === 5) {
					// item property changed, path looks like data.#2.items.#0.value
					if (pathArray[1][0] === '#') {
						groupIndex = parseInt(pathArray[1].slice(1), 10);
					} else {
						groupIndex = parseInt(pathArray[1], 10);
					}
					if (pathArray[3][0] === '#') {
						itemIndex = parseInt(pathArray[3].slice(1), 10);
					} else {
						itemIndex = parseInt(pathArray[3], 10);
					}

					item = this.data[groupIndex].items[itemIndex];
					templateInstance = this._getModelFromItem(item);
					if (templateInstance) {
						itemPath = ['item'].concat(pathArray.slice(4));
						templateInstance.notifyPath(itemPath, value);
						return true;
					}
				}
			} else if (pathArray.length === 3) {
				// item property change when no grouping
				// path looks like data.#0.value
				if (pathArray[1][0] === '#') {
					itemIndex = parseInt(pathArray[1].slice(1), 10);
				} else {
					itemIndex = parseInt(pathArray[1], 10);
				}
				item = this.data[itemIndex];
				templateInstance = this._getModelFromItem(item);
				if (templateInstance) {
					itemPath = ['item'].concat(pathArray.slice(2));
					templateInstance.notifyPath(itemPath, value);
					return true;
				}
			}
		},

		_resetAllTemplates: function () {
			if (this._templateSelectors.length > 0) {
				this._templateSelectors.forEach(function (selector) {
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

		_scrollTargetChanged: function (scrollTarget, isAttached)  {
			if (scrollTarget && isAttached) {
				this.classList.add('has-scroll-target');
				this.$.list.scrollTarget = scrollTarget;
			} else {
				this.$.list.scrollTarget = undefined;
				this.classList.remove('has-scroll-target');
			}
		},

		_prepareData: function (data) {

			this.selectedItems = [];

			if (!data || !data.length) {
				this._expandedItems = null;
				this._foldedGroups = null;
				this._groupsMap = null;
				return null;
			}

			this._itemsMap = new WeakMap();

			if (data.length === 0 || !data[0].items) {
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

		_onTemplateSelectorCreated: function (event) {
			var	selector = event.detail.selector;
			selector.selectorId = this._templateSelectorsCount;
			selector.groupedList = this;
			this._templateSelectors[selector.selectorId] = selector;
			this._templateSelectorsCount += 1;
		},

		_onTemplateSelectorItemChanged: function (event) {
			var item = event.detail.item,
				selector = event.detail.selector,
				selectorId = selector.selectorId,
				currentTemplateInstance = selector.templateInstance,
				currentTemplate = selector.template,
				newTemplate,
				newTemplateInstance,
				isGroup = this.isGroup(item),
				element;

			this._renderedItems[selectorId] = item;

			if (isGroup) {
				newTemplate = this._getGroupTemplate();
			} else {
				newTemplate = this._getItemTemplate();
			}

			if (newTemplate !== currentTemplate) {
				newTemplateInstance = newTemplate.getInstance();
				element = newTemplateInstance.__element;
				if (!element) {
					// Copied from iron-list to get first child of template instance
					element = newTemplateInstance.root.querySelector('*');
					newTemplateInstance.__element = element;
					Polymer.dom(this).appendChild(newTemplateInstance.root);
				}

				element.setAttribute('slot', selector.slotName);
				if (currentTemplate) {
					selector.element.setAttribute('slot', 'reusableTemplate');
					currentTemplate.releaseInstance(currentTemplateInstance);
				}

				// This is needed when using Shady DOM to redistribute the element content to the right slot.
				this.distributeContent();

				selector.template = newTemplate;
				selector.element = element;
				selector.templateInstance = newTemplateInstance;
			} else {
				newTemplateInstance = currentTemplateInstance;
			}

			newTemplateInstance.item = item;

			if (isGroup) {
				newTemplateInstance.selected = this.isGroupSelected(item);
				newTemplateInstance.folded = this.isFolded(item);
			} else {
				newTemplateInstance.expanded = this.isExpanded(item);
				newTemplateInstance.selected = this.isItemSelected(item);
			}
		},

		_getItemTemplate: function () {
			if (!this._itemTemplate) {
				this._itemTemplate = Polymer.dom(this).querySelector('#itemTemplate');
			}
			return this._itemTemplate;
		},

		_getGroupTemplate: function () {
			if (!this._groupTemplate) {
				this._groupTemplate = Polymer.dom(this).querySelector('#groupTemplate');
			}
			return this._groupTemplate;
		},

		/**
		 * Utility method that returns the element that displays the first visible item in the list.
		 * This method is mainly aimed at `cosmoz-omnitable`.
		 */
		getFirstVisibleItemElement: function () {
			var i,
				element;

			if (!this._renderedItems) {
				return;
			}

			i = this.$.list.firstVisibleIndex;

			for (; i < this._renderedItems.length ; i += 1) {
				if (!this.isGroup(this._renderedItems[i])) {
					element = this._templateSelectors[i];
					// iron-list sets the hidden attribute on its reusable children when there are not used anymore
					if (element.getAttribute('hidden') === null) {
						return element;
					}
				}
			}
		},

		/**
		 * Utility method to remove an item from the list.
		 * This method simply removes the specified item from the `data` using
		 * Polymer array mutation methods.
		 * Cannot be used to remove a group.
		 */
		removeItem: function (item) {
			if (this._groupsMap) {
				return this.data.some(function (group, groupIndex) {
					var index = group.items.indexOf(item);
					if (index >= 0) {
						this.splice('data.' + groupIndex + '.items', index, 1);
						return true;
					}
				}, this);
			} else {
				var i = this.data.indexOf(item);
				if (i >= 0) {
					this.splice('data', i, 1);
				}
			}
		},

		isGroup: function (item) {
			return this._groupsMap && this._groupsMap.get(item) !== undefined;
		},

		/**
		 * Returns the group of the specified item
		 */
		getItemGroup: function (item) {
			if (!this._groupsMap) {
				return;
			}
			var foundGroup;
			this.data.some(function (group) {
				var found = group.items.indexOf(item) > -1;
				if (found) {
					foundGroup = group;
				}
				return found;
			});

			return foundGroup;
		},

		isFolded: function (group) {
			var groupState = this._groupsMap && this._groupsMap.get(group);
			return groupState && groupState.folded;
		},

		toggleFold: function (templateInstance) {
			var item = templateInstance.item,
				group = this.isGroup(item) ? item : this.getItemGroup(item),
				isFolded = this.isFolded(group);

			if (isFolded) {
				this.unfoldGroup(group);
			} else {
				this.foldGroup(group);
			}

			templateInstance.folded = !isFolded;
		},

		unfoldGroup: function (group) {
			var groupState = this._groupsMap && this._groupsMap.get(group),
				groupFlatIndex;

			if (groupState && groupState.folded) {
				groupState.folded = false;
				groupFlatIndex = this._flatData.indexOf(group);
				this.splice.apply(this, ['_flatData', groupFlatIndex + 1, 0].concat(group.items));
			}

		},

		foldGroup: function (group) {
			var groupState = this._groupsMap && this._groupsMap.get(group),
				groupFlatIndex;

			if (groupState && !groupState.folded) {
				groupState.folded = true;
				groupFlatIndex = this._flatData.indexOf(group);
				this.splice('_flatData', groupFlatIndex + 1, group.items.length);
			}
		},

		selectItem: function (item) {
			var model = this._getModelFromItem(item);

			if (!this.isItemSelected(item)) {
				this.push('selectedItems', item);
			}
			if (model) {
				model['selected'] = true;
			}
		},

		deselectItem: function (item) {
			var selectedIndex = this.selectedItems.indexOf(item),
				model = this._getModelFromItem(item),
				group = this.getItemGroup(item),
				groupState,
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

		isItemSelected: function (item) {
			return this.selectedItems.indexOf(item) >= 0;
		},

		selectGroup: function (group) {
			var model = this._getModelFromItem(group),
				groupState = this._groupsMap && this._groupsMap.get(group);

			if (groupState) {
				groupState.selected = true;
			}

			if (model) {
				model['selected'] = true;
			}

			group.items.forEach(function (item) {
				this.selectItem(item);
			}, this);
		},

		deselectGroup: function (group) {
			var model = this._getModelFromItem(group),
				groupState = this._groupsMap && this._groupsMap.get(group);

			if (groupState) {
				groupState.selected = false;
			}
			if (model) {
				model['selected'] = false;
			}
			group.items.forEach(function (item) {
				this.deselectItem(item);
			}, this);
		},

		isGroupSelected: function (group) {
			var groupState = this._groupsMap && this._groupsMap.get(group);
			return groupState !== undefined && groupState.selected;
		},

		selectAll: function () {

			var i;

			this.splice('selectedItems', 0);

			if (this._groupsMap) {

				this.data.forEach(function (group) {
					var model = this._getModelFromItem(group),
						groupState = this._groupsMap.get(group);

					groupState.selected = true;
					this.splice.apply(this, ['selectedItems', this.selectedItems.length - 1, 0].concat(group.items));
				}, this);
			} else {
				this.splice.apply(this, ['selectedItems', 0, 0].concat(this.data));
			}

			// Set the selected property to all visible items
			this._templateSelectors.forEach(function (selector) {
				if (selector.templateInstance) {
					selector.templateInstance.selected = true;
				}
			});
		},

		deselectAll: function () {

			var i;

			this.splice('selectedItems', 0);

			if (this._groupsMap) {

				this.data.forEach(function (group) {
					var model = this._getModelFromItem(group),
						groupState = this._groupsMap.get(group);

					groupState.selected = false;
				}, this);
			}

			// Set the selected property to all visible items
			this._templateSelectors.forEach(function (selector) {
				if (selector.templateInstance) {
					selector.templateInstance.selected = false;
				}
			});
		},

		updateSize: function (item) {
			// this.notify(item);
			this.$.list.updateSizeForItem(item);
		},

		updateSizes: function (group) {
			group.items.forEach(function (item) {
				this.updateSize(item);
			}, this);
		},

		toggleCollapse: function (item) {
			var model = this._getModelFromItem(item),
				itemState = this._itemsMap.get(item);

			model.expanded = !model.expanded;

			if (!itemState) {
				itemState = { selected: false, expanded: false };
				this._itemsMap.set(item, itemState);
			}

			itemState.expanded = model.expanded;

			this.$.list.updateSizeForItem(item);
		},

		isExpanded: function (item) {
			var itemState = this._itemsMap ? this._itemsMap.get(item) : undefined;
			return itemState !== undefined && itemState.expanded;
		},

		_getModelFromItem: function (item) {
			var	physicalIndex = this._renderedItems.indexOf(item);
			if (physicalIndex >= 0) {
				return this._templateSelectors[physicalIndex].templateInstance;
			}
		}
	});
}());
