/* eslint-disable max-lines */
import { flushAsynchronousOperations } from '@polymer/iron-test-helpers/test-helpers';
import {
	spy as sinonSpy,
	assert as sinonAssert
} from 'sinon/pkg/sinon-esm.js';

import {
	assert, html, fixture
} from '@open-wc/testing';

import '../cosmoz-grouped-list.js';

const getInstanceByItemProperty = (element, item, property) => {
		const instance = element._getInstanceByProperty('item', item);
		return element._getInstanceProperty(instance, property);
	},
	basicHtmlFixture = html`
		<cosmoz-grouped-list style="min-height: 300px">
			<template slot="templates" data-type="item">
				<div class="item-template" style="border-bottom: 1px solid grey;">
					<div>
						ID:<span class="item-id">{{ item.id }}</span>
						NAME:<span class="item-name">{{ item.name }}</span>
						VALUE:<span class="item-value">{{ item.value }}</span>
						SELECTED: <span class="item-selected">{{ selected }}</span>
						EXPANDED: <span class="item-expanded">{{ expanded }}</span>
					</div>
				</div>
			</template>
			<template slot="templates" data-type="group">
				<div class="group-template">
					NAME:<span class="item-name">{{ item.name }}</span>
					VALUE: <span class="item-value">{{ item.value }}</span>
					SELECTED: <span class="item-selected">{{ selected }}</span>
					FOLDED: <span class="item-expanded">{{ folded }}</span>
				</div>
			</template>
		</cosmoz-grouped-list>
	`;

suite('empty', () => {
	let element;
	setup(async () => {
		element = await fixture(basicHtmlFixture);
		element._templatesObserver.flush();
		element.data = [];
	});

	test('does not render any items', () => {
		assert.lengthOf(element.shadowRoot.querySelectorAll('cosmoz-grouped-list-template-selector'), 0);
	});

	test('during init, it only updates selectedItems once', () => {
		const el = document.createElement('cosmoz-grouped-list'),
			spy = sinonSpy();

		el.addEventListener('selected-items-changed', spy);
		el.data = [];

		document.body.appendChild(el);

		flushAsynchronousOperations(); // flush _render debouncer

		assert.isTrue(spy.calledOnce);
	});

	test('it maintains selection accross data updates', () => {
		const data = [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }];

		element.data = data;

		element.selectItem(data[2]);
		element.selectItem(data[3]);

		element.data = data.concat([{ id: 4 }, { id: 5 }]);
		flushAsynchronousOperations(); // flush _render debouncer
		assert.deepEqual(element.data, [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }]);
		assert.deepEqual(element.selectedItems, [{ id: 2 }, { id: 3 }]);

		element.data = [data[2]];
		flushAsynchronousOperations(); // flush _render debouncer
		assert.deepEqual(element.data, [{ id: 2 }]);
		assert.deepEqual(element.selectedItems, [{ id: 2 }]);

		element.data = data;
		flushAsynchronousOperations(); // flush _render debouncer
		assert.deepEqual(element.data, [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }]);
		assert.deepEqual(element.selectedItems, [{ id: 2 }]);

		element.deselectItem(data[2]);
		flushAsynchronousOperations(); // flush _render debouncer
		assert.deepEqual(element.data, [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }]);
		assert.deepEqual(element.selectedItems, []);

		element.data = [{ id: 6 }];
		flushAsynchronousOperations(); // flush _render debouncer
		assert.deepEqual(element.data, [{ id: 6 }]);
		assert.deepEqual(element.selectedItems, []);
	});

	test('it clears selection when all selected items are removed from the dataset', () => {
		const data = [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }];

		element.data = data;

		element.selectItem(data[2]);
		element.selectItem(data[3]);
		flushAsynchronousOperations(); // flush _render debouncer
		assert.deepEqual(element.data, [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }]);
		assert.deepEqual(element.selectedItems, [{ id: 2 }, { id: 3 }]);

		element.data = data.splice(0, 2);
		flushAsynchronousOperations(); // flush _render debouncer
		assert.deepEqual(element.data, [{ id: 0 }, { id: 1 }]);
		assert.deepEqual(element.selectedItems, []);
	});
});

suite('flat data', () => {
	let element,
		items;

	setup(async () => {
		element = await fixture(basicHtmlFixture);
		items = [{
			id: 'i0',
			name: 'item 0',
			value: 0
		}, {
			id: 'i1',
			name: 'item 1',
			value: 1
		}, {
			id: 'i2',
			name: 'item 2',
			value: 1
		}];

		element._templatesObserver.flush();
		element.data = items;
		flushAsynchronousOperations();
	});

	test('attaches a iron-list element', () => {
		const list = element.$.list;
		assert.equal(list.is, 'iron-list');
		assert.equal(list.items.length, 3);
		assert.equal(list.items[0], items[0]);
	});

	test('top level items are items', () => {
		assert.isFalse(element.isGroup(items[0]));
		assert.isFalse(element.isGroup(items[1]));
		assert.isFalse(element.isGroup(items[3]));
	});

	test('selects items', () => {
		const item = items[0];
		element.selectItem(item);

		assert.isTrue(getInstanceByItemProperty(element, item, 'selected'));
		assert.isTrue(element.isItemSelected(item));
		assert.equal(element.selectedItems.length, 1);
		assert.equal(element.selectedItems[0], item);
	});

	test('removing a selected item does not clear rest of selection [#41]', () => {
		const allItems = items.slice();
		element.selectItem(allItems[0]);
		element.selectItem(allItems[1]);
		element.selectItem(allItems[2]);
		element.removeItem(allItems[0]);

		flushAsynchronousOperations();

		assert.isUndefined(element._getInstanceByProperty('item', allItems[0]));
		assert.isTrue(getInstanceByItemProperty(element, allItems[1], 'selected'));
		assert.isTrue(getInstanceByItemProperty(element, allItems[2], 'selected'));

		assert.isFalse(element.isItemSelected(allItems[0]));
		assert.isTrue(element.isItemSelected(allItems[1]));
		assert.isTrue(element.isItemSelected(allItems[2]));

		assert.equal(element.selectedItems.length, 2);
		assert.equal(element.selectedItems[0], allItems[1]);
		assert.equal(element.selectedItems[1], allItems[2]);
	});

	test('select all items [#977]', () => {
		const allItems = items.slice();
		element.selectAll();

		assert.isTrue(element.isItemSelected(allItems[0]));
		assert.isTrue(element.isItemSelected(allItems[1]));
		assert.isTrue(element.isItemSelected(allItems[2]));

		assert.equal(element.selectedItems.length, 3);
		assert.equal(element.selectedItems[0], allItems[0]);
		assert.equal(element.selectedItems[1], allItems[1]);
		assert.equal(element.selectedItems[2], allItems[2]);
	});
});

suite('empty-groups', () => {
	let element;
	setup(async () => {
		element = await fixture(basicHtmlFixture);
		element._templatesObserver.flush();
		element.data = [{
			name: 'Group 0',
			id: 'g0',
			items: []
		}, {
			name: 'Group 1',
			id: 'g1',
			items: [{
				id: 'g1-0',
				name: 'Group 1 item 0',
				value: 0
			}, {
				id: 'g1-1',
				name: 'Group 1 item 1',
				value: 1
			}]
		}];
		flushAsynchronousOperations();
	});

	test('does not render empty groups by default', () => {
		assert.lengthOf(element.shadowRoot.querySelectorAll('cosmoz-grouped-list-template-selector'), 3);
	});

	test('renders empty groups when `displayEmptyGroups` is true', () => {
		element.displayEmptyGroups = true;
		// force render, because displayEmptyGroups is not observed
		element._render();
		flushAsynchronousOperations();
		assert.lengthOf(element.shadowRoot.querySelectorAll('cosmoz-grouped-list-template-selector'), 4);
	});
});

suite('basic', () => {
	let element,
		groups;

	setup(async () => {
		element = await fixture(basicHtmlFixture);

		groups = [{
			name: 'Group 0',
			id: 'g0',
			items: [{
				id: 'g0-0',
				name: 'Group 0 item 0',
				value: 0
			}, {
				id: 'g0-1',
				name: 'Group 0 item 1',
				value: 1
			}]
		}, {
			name: 'Group 1',
			id: 'g1',
			items: [{
				id: 'g1-0',
				name: 'Group 1 item 0',
				value: 0
			}, {
				id: 'g1-1',
				name: 'Group 1 item 1',
				value: 1
			}]
		}];
		element._templatesObserver.flush();
		element.data = groups;
		flushAsynchronousOperations();
	});

	test('instantiates a cosmoz-grouped-list element', () => {
		assert.equal(element.constructor.is, 'cosmoz-grouped-list');
		assert.isTrue(element.hasRenderedData);
	});

	test('attaches a iron-list element', () => {
		const list = element.$.list;
		assert.equal(list.is, 'iron-list');
		assert.equal(list.items.length, 6);
		assert.equal(list.items[0], groups[0]);
	});

	test('attaches cosmoz-grouped-list-template-selector', () => {
		assert.lengthOf(element.$.list.queryAllEffectiveChildren('cosmoz-grouped-list-template-selector'), 6);
		assert.isTrue(element.hasRenderedData);
	});

	test('top level items are groups', () => {
		assert.isTrue(element.isGroup(groups[0]));
		assert.isTrue(element.isGroup(groups[1]));
		assert.isFalse(element.isGroup(groups[2]));
	});

	test('item belongs to group', () => {
		assert.equal(element.getItemGroup(groups[0].items[0]), groups[0]);
		assert.equal(element.getItemGroup(groups[0].items[1]), groups[0]);

		assert.equal(element.getItemGroup(groups[1].items[0]), groups[1]);
		assert.equal(element.getItemGroup(groups[1].items[1]), groups[1]);
	});

	test('ungrouped items are dropped', () => {
		assert.isUndefined(element.getItemGroup({}));
		assert.isUndefined(element.getItemGroup(groups[2]));
	});

	test('selects an item', () => {
		const item = groups[0].items[0];

		element.selectItem(item);
		assert.isTrue(getInstanceByItemProperty(element, item, 'selected'));
		assert.isTrue(element.isItemSelected(item));
		assert.equal(element.selectedItems.length, 1);
		assert.equal(element.selectedItems[0], item);
	});

	test('deselects an item', () => {
		const item = groups[1].items[0];

		element.selectItem(item);
		assert.isTrue(element.isItemSelected(item));
		assert.equal(element.selectedItems[0], item);
		assert.isTrue(getInstanceByItemProperty(element, item, 'selected'));

		element.deselectItem(item);
		assert.isFalse(getInstanceByItemProperty(element, item, 'selected'));
		assert.isFalse(element.isItemSelected(item));
		assert.equal(element.selectedItems.length, 0);
	});

	test('selects a group', () => {
		const group = groups[1];

		element.toggleSelectGroup(group, false);
		assert.isTrue(element.isGroupSelected(group));
		assert.equal(element.selectedItems.length, 2);
		assert.equal(element.selectedItems[0], group.items[0]);
		assert.equal(element.selectedItems[1], group.items[1]);
		assert.isTrue(getInstanceByItemProperty(element, group, 'selected'));
		assert.isTrue(getInstanceByItemProperty(element, group.items[0], 'selected'));
		assert.isTrue(getInstanceByItemProperty(element, group.items[1], 'selected'));
	});

	test('deselects a group', () => {
		const group = groups[0];

		element.toggleSelectGroup(group, false);
		assert.isTrue(element.isGroupSelected(group));
		assert.equal(element.selectedItems.length, 2);
		assert.equal(element.selectedItems[0], group.items[0]);
		assert.equal(element.selectedItems[1], group.items[1]);
		assert.isTrue(getInstanceByItemProperty(element, group, 'selected'));
		assert.isTrue(getInstanceByItemProperty(element, group.items[0], 'selected'));
		assert.isTrue(getInstanceByItemProperty(element, group.items[1], 'selected'));

		element.toggleSelectGroup(group, true);
		assert.isFalse(element.isGroupSelected(group));
		assert.equal(element.selectedItems.length, 0);
		assert.isFalse(getInstanceByItemProperty(element, group, 'selected'));
		assert.isFalse(getInstanceByItemProperty(element, group.items[0], 'selected'));
		assert.isFalse(getInstanceByItemProperty(element, group.items[1], 'selected'));
	});

	test('deselecting an item from group deselects the group', () => {
		const group = groups[1],
			item =	group.items[1];

		element.toggleSelectGroup(group, false);
		assert.isTrue(element.isGroupSelected(group));
		assert.equal(element.selectedItems.length, 2);
		assert.equal(element.selectedItems[0], group.items[0]);
		assert.equal(element.selectedItems[1], group.items[1]);
		assert.isTrue(getInstanceByItemProperty(element, group, 'selected'));
		assert.isTrue(getInstanceByItemProperty(element, group.items[0], 'selected'));
		assert.isTrue(getInstanceByItemProperty(element, group.items[1], 'selected'));

		element.deselectItem(item);
		assert.isFalse(element.isGroupSelected(group));
		assert.equal(element.selectedItems.length, 1);
		assert.isFalse(getInstanceByItemProperty(element, group, 'selected'));
		assert.isFalse(getInstanceByItemProperty(element, item, 'selected'));
		// other items in group remain selected
		assert.isTrue(getInstanceByItemProperty(element, group.items[0], 'selected'));
	});

	test('removing a selected item does not clear rest of selection [#41]', () => {
		const group = groups[0],
			firstItem = group.items[0],
			secondItem = group.items[1];
		element.toggleSelectGroup(group, false);
		assert.equal(element.selectedItems.length, 2);
		assert.equal(element.selectedItems[0], firstItem);
		assert.equal(element.selectedItems[1], secondItem);
		element.removeItem(firstItem);
		flushAsynchronousOperations();
		assert.isFalse(element.isItemSelected(firstItem));
		assert.isTrue(element.isItemSelected(secondItem));

		assert.equal(element.selectedItems.length, 1);
		assert.equal(element.selectedItems[0], secondItem);

	});

	test('selects all items', () => {
		element.selectAll();
		assert.isNotNull(element.selectedItems[0]);
		assert.lengthOf(element.selectedItems, 4);
		assert.equal(element.selectedItems[0], groups[0].items[0]);
		assert.equal(element.selectedItems[1], groups[0].items[1]);
		assert.equal(element.selectedItems[2], groups[1].items[0]);
		assert.equal(element.selectedItems[3], groups[1].items[1]);
		assert.isTrue(getInstanceByItemProperty(element, groups[0], 'selected'));
		assert.isTrue(getInstanceByItemProperty(element, groups[0].items[0], 'selected'));
		assert.isTrue(getInstanceByItemProperty(element, groups[0].items[1], 'selected'));
		assert.isTrue(getInstanceByItemProperty(element, groups[1], 'selected'));
		assert.isTrue(getInstanceByItemProperty(element, groups[1].items[0], 'selected'));
		assert.isTrue(getInstanceByItemProperty(element, groups[1].items[1], 'selected'));
	});

	test('deselect all items', () => {
		element.selectAll();
		assert.equal(element.selectedItems[0], groups[0].items[0]);
		assert.isTrue(getInstanceByItemProperty(element, groups[0].items[0], 'selected'));
		assert.isTrue(getInstanceByItemProperty(element, groups[0].items[1], 'selected'));
		assert.isTrue(getInstanceByItemProperty(element, groups[1], 'selected'));
		assert.isTrue(getInstanceByItemProperty(element, groups[1].items[0], 'selected'));
		assert.isTrue(getInstanceByItemProperty(element, groups[1].items[1], 'selected'));

		element.deselectAll();
		assert.lengthOf(element.selectedItems, 0);
		assert.isFalse(getInstanceByItemProperty(element, groups[0].items[0], 'selected'));
		assert.isFalse(getInstanceByItemProperty(element, groups[0].items[1], 'selected'));
		assert.isFalse(getInstanceByItemProperty(element, groups[1], 'selected'));
		assert.isFalse(getInstanceByItemProperty(element, groups[1].items[0], 'selected'));
		assert.isFalse(getInstanceByItemProperty(element, groups[1].items[1], 'selected'));
	});

	test('folds a group', () => {
		const group = groups[1];
		assert.isFalse(getInstanceByItemProperty(element, group, 'folded'));
		assert.isFalse(element.isFolded(group));

		element.foldGroup(group);
		assert.isTrue(element.isFolded(group));
		assert.isTrue(getInstanceByItemProperty(element, group, 'folded'));
	});

	test('unfolds a folded group', () => {
		const group = groups[1];
		assert.isFalse(getInstanceByItemProperty(element, group, 'folded'));
		assert.isFalse(element.isFolded(group));

		element.foldGroup(group);
		assert.isTrue(element.isFolded(group));
		assert.isTrue(getInstanceByItemProperty(element, group, 'folded'));

		element.unfoldGroup(group);
		assert.isFalse(getInstanceByItemProperty(element, group, 'folded'));
		assert.isFalse(element.isFolded(group));
	});

	test('toggles collapse on an item', () => {
		const item = groups[1].items[1];
		assert.isFalse(getInstanceByItemProperty(element, item, 'expanded'));
		assert.isFalse(element.isExpanded(item));

		element.toggleCollapse(item);
		assert.isTrue(getInstanceByItemProperty(element, item, 'expanded'));
		assert.isTrue(element.isExpanded(item));
	});

	test('highlights an item', () => {
		const item = groups[0].items[0];

		element.highlightItem(item);
		assert.isTrue(getInstanceByItemProperty(element, item, 'highlighted'));
		assert.isTrue(element.isItemHighlighted(item));
		assert.equal(element.highlightedItems.length, 1);
		assert.equal(element.highlightedItems[0], item);
	});

	test('unhighlights a highlighted item', () => {
		const item = groups[0].items[0];

		element.highlightItem(item);
		assert.isTrue(getInstanceByItemProperty(element, item, 'highlighted'));
		assert.isTrue(element.isItemHighlighted(item));
		assert.equal(element.highlightedItems.length, 1);
		assert.equal(element.highlightedItems[0], item);

		element.highlightItem(item, true);
		assert.isFalse(getInstanceByItemProperty(element, item, 'highlighted'));
		assert.isFalse(element.isItemHighlighted(item));
		assert.equal(element.highlightedItems.length, 0);
	});

	test('_onTemplatesChange does not return constructors if they already exist', () => {
		element._ctors = {
			item: {},
			group: {}
		};
		assert.isUndefined(element._onTemplatesChange({ addedNodes: []}));
	});

	test('_getInstance types are item, group', () => {
		assert.equal(element._getInstance('item').__type, 'item');
		assert.equal(element._getInstance('group').__type, 'group');
	});

	test('_getInstance returns prevInstance if it exists and has the required type', () => {
		const itemInstance = element._getInstance('item');
		assert.deepEqual(element._getInstance('item', {}, itemInstance), itemInstance);
	});

	test('_getInstance calls _reuseInstance if prevInstance has different type', () => {
		const itemInstance = element._getInstance('item'),
			spy = sinonSpy(element, '_reuseInstance');
		element._getInstance('group', {}, itemInstance);
		sinonAssert.calledOnce(spy);
		spy.restore();
	});

	test('_removeInstance handles null instance parameter', () => {
		assert.isUndefined(element._removeInstance());
	});


	test('_dataChanged calls _forwardItemPath for item changes', () => {
		const spy = sinonSpy(element, '_forwardItemPath');
		element.set('data.0.value', -1);
		sinonAssert.calledOnce(spy);
		sinonAssert.calledWith(spy, 'data.0.value', -1);
		element.set('data.0.items.value', -2);
		sinonAssert.calledWith(spy, 'data.0.items.value', -2);
	});

	test('_dataChanged calls _debounceRender for splices changes', () => {
		const spy = sinonSpy(element, '_debounceRender'),
			newData = [{
				name: 'Group 0',
				id: 'g0',
				items: [{
					id: 'g0-0',
					name: 'Group 0 item 0',
					value: 0
				}]
			}];
		element.data = newData;
		sinonAssert.calledOnce(spy);
	});

	test('_dataChanged calls _debounceRender for other changes in data', () => {
		const spy = sinonSpy(element, '_debounceRender'),
			newData = [{
				name: 'Group 0',
				id: 'g0',
				items: [{
					id: 'g0-0',
					name: 'Group 0 item 0',
					value: 0
				}]
			}],
			change = {
				path: 'other',
				value: newData,
				base: newData
			};
		element._dataChanged(change);
		sinonAssert.calledOnce(spy);
		spy.restore();
	});

	test('_render does not set _flatData if element is not attached', () => {
		const flatData = element._flatData,
			newData = [{
				name: 'Group 0',
				id: 'g0',
				items: [{
					id: 'g0-0',
					name: 'Group 0 item 0',
					value: 0
				}]
			}];

		element.parentNode.removeChild(element);
		element.data = newData;
		assert.equal(flatData, element._flatData);
	});

	test('removeItem removes one item from data', () => {
		const first = element.data[0].items[0],
			length = element.data[0].items.length;

		element.removeItem(first);
		assert.equal(element.data[0].items.length, length - 1);
	});
});

suite('compare items function', () => {
	let element;

	setup(async () => {
		element = await fixture(basicHtmlFixture);
		element._templatesObserver.flush();
		element.data = [];
		flushAsynchronousOperations();
	});


	test('compare by id', () => {
		const data = [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }];

		element.data = data;
		element.compareItemsFn = (a, b) => a.id === b.id;

		element.selectItem(data[0]);
		element.selectItem(data[1]);
		assert.deepEqual(element.selectedItems, [{ id: 0 }, { id: 1 }]);

		element.data = [{ id: 0 }, { id: 1 }, { id: 5 }];
		flushAsynchronousOperations(); // flush _render debouncer
		assert.deepEqual(element.selectedItems, [{ id: 0 }, { id: 1 }]);

		element.data = [{ id: 0 }, { id: 5 }];
		flushAsynchronousOperations(); // flush _render debouncer
		assert.deepEqual(element.selectedItems, [{ id: 0 }]);
	});
});


suite('getFirstVisibleItemElement', () => {
	let element;
	setup(async () => {
		element = await fixture(basicHtmlFixture);
		element._templatesObserver.flush();
		element.data = new Array(200).fill().map((_, i) => ({
			id: `id-${ i }`,
			title: `Item ${ i }`,
			value: i
		}));
		flushAsynchronousOperations();
	});
	test('getFirstVisibleItemElement calls _getInstanceByProperty', () => {
		const spy = sinonSpy(element, '_getInstanceByProperty'),
			first = element.getFirstVisibleItemElement();
		sinonAssert.called(spy);
		assert.isNotNull(first);
		assert.isNotNull(first.offsetParent);
		spy.restore();
	});

	test('getFirstVisibleItemElement handles null _flatData', () => {
		element._flatData = null;
		assert.isFalse(element.getFirstVisibleItemElement());
	});
});
