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
				notify: true
			},

			_isAttached: {
				type: Boolean
			}

		},

		observers: [
			'_dataChanged(data.*)',
			'_scrollTargetChanged(scrollTarget, _isAttached)'
		],

		_templateSelectorsKeys: null,

		_templateSelectorsCount: null,

		_templateSelectors: null,

		_physicalItems: null,

		_templateInstances: null,

		_dataCollection: null,

		_groupsMap: null,

		_itemsMap: null,

		attached: function () {
			this._isAttached = true;
		},

		_dataChanged: function (change) {
			var pathParts;
			if (change.path === 'data') {
				this._flatData = this._prepareData(change.value);
			} else if (change.path === 'data.splices') {
				this._groupsAddedOrRemoved(change);
			} else {
				pathParts = change.path.split('.').slice(1);
				if (pathParts.length === 3 && pathParts[1] === 'items' && pathParts[2] === 'splices') {
					// items were added or removed
					this._itemsAddedOrRemoved(pathParts, change);
				} else {
					// Forward an item property change
					this._forwardItemPath(pathParts, change.value);
				}
			}
		},

		/**
		 * Utility method that must be used when changing an item's property value.
		 */
		notifyItemPath: function (item, path, value) {
			var group, gKey, iKey;

			if (this._groupsMap) {
				group = this.getItemGroup(item);
				gKey = this._dataCollection.getKey(group);
				iKey = Polymer.Collection.get(group.items).getKey(item);
				this.notifyPath('data.' + gKey + '.items.' + iKey + '.' + path, value);
			} else {
				iKey = this._dataCollection.getKey(item);
				// TODO(pasleq): this will cause a call to _dataChanged, that will call _forwardItemPath
				// Would it better (and correct) to directly call _forwardItemPath ?
				this.notifyPath('data.' + iKey + '.' + path, value);
			}

		},

		_forwardItemPath: function (pathParts, value) {
			var group, groupItemsCollection, item, itemPath, physicalIndex, templateInstance;
			if (pathParts.length >= 4 && pathParts[1] === 'items') {
				// Path looks like data.#0.items.#0.path
				group = this._dataCollection.getItem(pathParts[0]);

				groupItemsCollection = Polymer.Collection.get(group.items);

				item = groupItemsCollection.getItem(pathParts[2]);

				itemPath = pathParts.slice(3).join('.');

				physicalIndex = this._physicalItems.indexOf(item);

				// Notify only displayed items
				if (physicalIndex >= 0) {
					templateInstance = this._templateInstances[physicalIndex];
					templateInstance.notifyPath('item.' + itemPath, value);
				}
			} else if (pathParts.length >= 2) {
				// Path looks like data.#0.path
				item = this._dataCollection.getItem(pathParts[0]);
				itemPath = pathParts.slice(1).join('.');
				physicalIndex = this._physicalItems.indexOf(item);
				if (physicalIndex >= 0) {
					templateInstance = this._templateInstances[physicalIndex];
					templateInstance.notifyPath('item.' + itemPath, value);
				}
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

		_itemsAddedOrRemoved: function (pathParts, change) {
			// Simplest case : a single splice of removed items
			// We just need to remove these items from _flatData

			var
				indexSplices = change.value.indexSplices,
				splice,
				group, groupIndex;
			if (indexSplices && indexSplices.length === 1 && indexSplices[0].addedCount === 0) {
				splice = indexSplices[0];
				group = this._dataCollection.getItem(pathParts[0]);
				// Find the index of the group in _flatData
				groupIndex = this._flatData.indexOf(group);
				if (group.items.length === 0 && !this.displayEmptyGroups) {
					this.splice('_flatData', groupIndex, splice.removed.length + 1);
				} else {
					this.splice('_flatData', groupIndex + splice.index + 1, splice.removed.length);
				}
				splice.removed.forEach(function (item) {
					this.deselectItem(item);
				}, this);
			} else {
				// TODO(pasleq): other cases
				console.warn('Not implemented');
			}
		},

		_groupsAddedOrRemoved: function (change) {
			var
				splices = change.value.indexSplices,
				splice,
				startGroup,
				startItem,
				startIndex,
				count = 0,
				i;

			if (splices && splices.length === 1 && splices[0].addedCount === 0) {
				if (this._groupsMap) {
					// Simplest case: a single splice of removed groups
					splice = splices[0];
					startGroup = this.data[splice.index];
					startIndex = this._flatData.indexOf(startGroup);
					for (i = 0 ; i < splice.removed.length ; i += 1) {
						count += 1;
						count += this.data[startIndex + i].items.length;
					}
					this.splice('_flatData', startIndex, count);
				} else {
					// Data is not grouped, simply remove items
					splice = splices[0];
					startItem = splice.removed[0];
					startIndex = this._flatData.indexOf(startItem);
					this.splice('_flatData', startIndex, splice.removed.length);
					splice.removed.forEach(function (item) {
						this.deselectItem(item);
					}, this);
				}

			} else {
				console.warn('Not implemented');
			}
		},

		_prepareData: function (data) {

			var flatData;

			this.selectedItems = [];

			if (data && data.length) {

				this._dataCollection = Polymer.Collection.get(data);

				this._itemsMap = new WeakMap();


				if (!this._physicalItems) {
					this._templateSelectorsKeys = new WeakMap();
					this._templateSelectorsCount = 0;
					this._physicalItems = [];
					this._templateInstances = [];
					this._templateSelectors = [];
				}

				if (data.length === 0 || !data[0].items) {
					// no grouping, so render items as a standard list
					flatData = data.slice();
					this._groupsMap = null;
				} else {
					flatData = [];
					this._groupsMap = new WeakMap();
					data.forEach(function (group) {
						if (group.items) {
							if (group.items.length) {
								flatData = flatData.concat(group, group.items);
							} else if (this.displayEmptyGroups) {
								flatData = flatData.concat(group);
							}
							this._groupsMap.set(group, { selected: false, folded: false });
						} else {
							console.warn('Incorrect data');
						}
					}, this);

				}
			} else {
				flatData = null;

				this._expandedItems = null;

				this._selectedItemsCollection = null;

				this._dataCollection = null;

				this._foldedGroups = null;
				this._groupsMap = null;
			}

			return flatData;
		},


		created: function () {

			this._boundTemplateInstanceFunction = this._getTemplateInstance.bind(this);
		},

		_getSelectorContext: function (item) {

			if (this.isGroup(item)) {
				return {
					item: item,
					isGroup: true,
					isSelected: this.isGroupSelected(item),
					isFolded: this.isFolded(item),
					getTemplateInstanceFunction: this._boundTemplateInstanceFunction
				};
			} else {
				return {
					item: item,
					isGroup: false,
					isSelected: this.isItemSelected(item),
					isExpanded: this.isExpanded(item),
					getTemplateInstanceFunction: this._boundTemplateInstanceFunction
				};

			}
		},

		_getTemplateInstance: function (context, selector, previousTemplateInstance) {
			var
				groupTemplate = Polymer.dom(this).querySelector('#groupTemplate'),
				itemTemplate = Polymer.dom(this).querySelector('#itemTemplate');

			if (context.isGroup) {
				if (previousTemplateInstance) {
					itemTemplate.releaseInstance(previousTemplateInstance);
				}
				return groupTemplate.getInstance();
			} else {
				if (previousTemplateInstance) {
					groupTemplate.releaseInstance(previousTemplateInstance);
				}
				return itemTemplate.getInstance();
			}
		},

		_onTemplateSelectorItemChanged: function (event) {
			var
				item = event.detail.item,
				selector = event.detail.selector,
				selectorIndex,
				templateInstance;

			selectorIndex = this._templateSelectorsKeys.get(selector);

			if (selectorIndex === undefined) {
				selectorIndex = this._templateSelectorsCount;
				this._templateSelectorsKeys.set(selector, selectorIndex);
				this._templateSelectorsCount += 1;
				this._templateSelectors[selectorIndex] = selector;
			}

			this._physicalItems[selectorIndex] = item;

			if (this.isGroup(item)) {
				templateInstance = selector.renderGroup(Polymer.dom(this).querySelector('#groupTemplate'), this.isFolded(item), this.isGroupSelected(item));
			} else {
				templateInstance = selector.renderItem(Polymer.dom(this).querySelector('#itemTemplate'), this.isExpanded(item), this.isItemSelected(item));
			}

			this._templateInstances[selectorIndex] = templateInstance;
		},

		/**
		 * Utility method that returns the element that displays the first visible item in the list.
		 * This method is mainly aimed at `cosmoz-omnitable`.
		 */
		getFirstVisibleItemElement: function () {
			var i;

			if (!this._physicalItems) {
				return;
			}

			i = this.$.list.firstVisibleIndex;

			for (; i < this._physicalItems.length ; i += 1) {
				if (!this.isGroup(this._physicalItems[i])) {
					return this._templateSelectors[i].querySelector('#itemTemplate');
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
			var i;

			if (this._groupsMap) {
				this.data.some(function (group, groupIndex) {
					var index = group.items.indexOf(item);
					if (index >= 0) {
						this.splice('data.' + groupIndex + '.items', index, 1);
						return true;

					}
				}.bind(this));
			} else {
				i = this.data.indexOf(item);
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
			var foundGroup;
			if (!this._groupsMap) {
				return;
			}
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
			var
				item = templateInstance.item,
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
			var
				groupState = this._groupsMap && this._groupsMap.get(group),
				groupFlatIndex;

			if (groupState && groupState.folded) {
				groupState.folded = false;
				groupFlatIndex = this._flatData.indexOf(group);
				this.splice.apply(this, ['_flatData', groupFlatIndex + 1, 0].concat(group.items));
			}

		},

		foldGroup: function (group) {
			var
				groupState = this._groupsMap && this._groupsMap.get(group),
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
			var
				selectedIndex = this.selectedItems.indexOf(item),
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
			var
				model = this._getModelFromItem(group),
				groupState = this._groupsMap && this._groupsMap.get(group);

			if (groupState) {
				groupState.selected = true;
			}

			if (model) {
				model['selected'] = true;
			}

			group.items.forEach(function (item) {
				this.selectItem(item);
			}.bind(this));
		},

		deselectGroup: function (group) {
			var
				model = this._getModelFromItem(group),
				groupState = this._groupsMap && this._groupsMap.get(group);

			if (groupState) {
				groupState.selected = false;
			}
			if (model) {
				model['selected'] = false;
			}
			group.items.forEach(function (item) {
				this.deselectItem(item);
			}.bind(this));
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
					var
						model = this._getModelFromItem(group),
						groupState = this._groupsMap.get(group);

					groupState.selected = true;
					this.splice.apply(this, ['selectedItems', this.selectedItems.length - 1, 0].concat(group.items));
				}, this);
			} else {
				this.splice.apply(this, ['selectedItems', 0, 0].concat(this.data));
			}

			// Set the selected property to all visible items
			for (i = 0; i < this._templateInstances.length ; i+= 1) {
				this._templateInstances[i].selected = true;
			}
		},

		deselectAll: function () {

			var i;

			this.splice('selectedItems', 0);

			if (this._groupsMap) {

				this.data.forEach(function (group) {
					var
						model = this._getModelFromItem(group),
						groupState = this._groupsMap.get(group);

					groupState.selected = false;
				}, this);
			}

			// Set the selected property to all visible items
			for (i = 0; i < this._templateInstances.length ; i+= 1) {
				this._templateInstances[i].selected = false;
			}
		},



		updateSizes: function (group) {
			var
				list = this.$.list,
				that = this;
			group.items.forEach(function (item) {
				that.notify(item);
				list.updateSizeForItem(item);
			});
		},

		toggleCollapse: function (item) {
			var
				model = this._getModelFromItem(item),
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
			var itemState = this._itemsMap.get(item);
			return itemState !== undefined && itemState.expanded;
		},

		_getModelFromItem: function (item) {
			var
				physicalIndex = this._physicalItems.indexOf(item),
				templateInstance;
			if (physicalIndex >= 0) {
				templateInstance = this._templateInstances[physicalIndex];
				return templateInstance;
			}
		}
	});
}());
