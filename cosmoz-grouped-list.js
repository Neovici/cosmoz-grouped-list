/*global cz, document, Polymer, window, d3, nv */
(function () {

	"use strict";

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

			flatData: {
				type: Array,
				computed: '_flattenData(data)',
				notify: true
			}
		},

		observers: [
			'_dataChanged(data.*)'
		],

		_foldedGroups: null,

		_groups: null,

		_dataChanged: function (change) {
			console.log('_dataChanged', change);

			if (change.path === 'data') {
				// new data reference
			} else if (change.path === 'data.splices') {
				// data were removed/added
			} else {
				// items changed
			}
		},

		_flattenData: function (data) {
			if (!data) {
				return;
			}

			if (!(data instanceof Array) || !(data[0] instanceof Object)) {
				return;
			}

			var
				fData = [],
				groups = new WeakMap();

			data.forEach(function (group) {
				if (group.items) {
					fData = fData.concat(group, group.items);
					groups.set(group, true);
				} else {
					fData = fData.concat(group);
				}
			});

			this._foldedGroups = new WeakMap();
			this._groups = groups;

			return fData;
		},


		getGroup: function (item) {
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
			return !!this._foldedGroups.get(group);
		},

		isGroup: function (item) {
			return !!this._groups.get(item);
		},

		_getTemplate: function (item) {

			var
				index = this.flatData.indexOf(item);

			if (this.isGroup(item)) {
				return Polymer.dom(this).querySelector('#groupTemplate');
			} else {
				return Polymer.dom(this).querySelector('#itemTemplate');
			}
		},

		_getFolded: function (item) {
			var folded = this.isGroup(item) && this.isFolded(item);
			return folded;
		},

		toggleFold: function (templateInstance) {
			var
				item = templateInstance.item,
				group = this.isGroup(item) ? item : this.getGroup(item),
				isFolded = this.isFolded(group);

			if (isFolded) {
				this.unfoldGroup(group);
			} else {
				this.foldGroup(group);
			}

			templateInstance.folded = !isFolded;

		},

		unfoldGroup: function (group) {
			if (!this.isFolded(group)) {
				return;
			}

			this._foldedGroups.set(group, false);
			var groupIndex = this.flatData.indexOf(group);
			this.splice.apply(this, ['flatData', groupIndex + 1, 0].concat(group.items));

		},

		foldGroup: function (group) {
			if (this.isFolded(group)) {
				return;
			}
			this._foldedGroups.set(group, true);
			var groupIndex = this.flatData.indexOf(group);
			this.splice('flatData', groupIndex + 1, group.items.length);
		},

		updateSizes: function (group) {
			var list = this.$.list,
				that = this;
			group.items.forEach(function (item) {
				that.notify(item);
				list.updateSizeForItem(item);
			});
		}
	});
}());