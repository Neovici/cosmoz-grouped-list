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

			warmUp: {
				type: Number,
				value: 30
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

		_groupsMap: null,

		_itemsMap: null,

		_itemTemplate: null,

		_groupTemplate: null,

		_warmUpTemplate: null,

		_templateSelectorsCount: null,

		_physicalItems: null,

		_templateInstances: null,

		_templates: null,

		_slots: null,

		created: function () {
			this._physicalItems = [];
			this._templateInstances = [];
			this._templates = [];
			this._slots = [];
			this._templateSelectorsCount = 0;

		},

		attached: function () {
			this._isAttached = true;
			this._warmUp();
		},

		detached: function () {
			this._isAttached = false;
		},

		_warmUp: function () {
			if (this._getWarmUpTemplate()) {
				var warmUpData = [];
				for (var i = 0; i < this.warmUp; i++) {
					warmUpData[i] = { warmUp: i};
				}
				this._flatData = warmUpData;
			}
			this._warmUpCount = 0;
		},

		_dataChanged: function (change) {
			var emptyData;

			// Polymer 2.0 will remove key-based path and splice notifications
			// for arrays. Handle any data changed by resetting the data array.
			if (this._templateInstances && this._templateInstances.length) {
				emptyData = [];
				this._templateInstances.forEach(function (instance) {
					emptyData.push({});
				}, this);
				this._flatData = emptyData;
			}

			this.debounce('prepareData', function () {
				this._flatData = this._prepareData(this.data);
			}.bind(this));
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

			var flatData;

			this.selectedItems = [];

			if (data && data.length) {

				this._itemsMap = new WeakMap();

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

				this._foldedGroups = null;
				this._groupsMap = null;
			}

			return flatData;
		},

		_onTemplateSelectorCreated: function (event) {
			var
				selector = event.detail.selector,
				slot;

			selector.selectorId = this._templateSelectorsCount;

			this._slots[selector.selectorId] = selector;

			this._templateSelectorsCount += 1;
		},


		_onTemplateSelectorItemChanged: function (event) {
			var
				item = event.detail.item,
				selector = event.detail.selector,
				selectorId = selector.selectorId,
				currentTemplateInstance = this._templateInstances[selectorId],
				currentTemplate = this._templates[selectorId],
				slot = this._slots[selectorId],
				template,
				templateInstance,
				isGroup = this.isGroup(item),
				isWarmUp = item.warmUp >= 0;


			this._physicalItems[selectorId] = item;

			if (isWarmUp) {
				template = this._getWarmUpTemplate();
				this._warmUpCount += 1;
			} else if (isGroup) {
				template = this._getGroupTemplate();
			} else {
				template = this._getItemTemplate();
			}

			if (template !== currentTemplate) {
				templateInstance = template.getInstance();
			} else {
				templateInstance = currentTemplateInstance;
			}

			if (!isWarmUp) {
				templateInstance.item = item;

				if (isGroup) {
					templateInstance.selected = this.isGroupSelected(item);
					templateInstance.folded = this.isFolded(item);
				} else {
					templateInstance.expanded = this.isExpanded(item);
					templateInstance.selected = this.isItemSelected(item);
				}
			}

			if (templateInstance !== currentTemplateInstance) {
				if (currentTemplateInstance) {
					this._detachInstance(currentTemplateInstance, slot);
				}

				Polymer.dom(slot).appendChild(templateInstance.root);

				if (currentTemplate) {
					currentTemplate.releaseInstance(currentTemplateInstance);
				}
			}

			this._templates[selectorId] = template;
			this._templateInstances[selectorId] = templateInstance;
		},

		_detachInstance: function (templateInstance, slot) {
			var
				parent = Polymer.dom(slot),
				children = parent.childNodes,
				i;
			if (children) {
				for (i = 0 ; i < children.length ; i+=1) {
					parent.removeChild(children[i]);
					templateInstance.root.appendChild(children[i]);
				}
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

		_getWarmUpTemplate: function () {
			if (!this._warmUpTemplate) {
				this._warmUpTemplate = Polymer.dom(this).querySelector('#warmUpTemplate');
			}
			return this._warmUpTemplate;
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
					var element = this._slots[i];
					return element;
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
			var itemState = this._itemsMap ? this._itemsMap.get(item) : undefined;
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
