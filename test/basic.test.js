/* eslint-disable max-lines */
import { spy as sinonSpy } from 'sinon';
import { assert, html, fixture, nextFrame } from '@open-wc/testing';

import '../cosmoz-grouped-list.js';

const renderItem = (item, index, { selected, expanded }) => html`
		I:${ item.id }-${ item.name }-${ item.value }-${ selected }-${ expanded }
	`,
	renderGroup = (item, index, { selected, folded }) => html`
		G:${ item.name }-${ item.value }-${ selected }-${ folded }
	`,
	basicHtmlFixture = html`
		<cosmoz-grouped-list
			style="min-height: 300px"
			.renderItem=${ renderItem }
			.renderGroup=${ renderGroup }
		></cosmoz-grouped-list>
	`;

suite('empty', () => {
	let element;
	setup(async () => {
		element = await fixture(basicHtmlFixture);
		element.data = [];
	});

	test('does not render any items', () => {
		assert.equal(element.innerText, '');
	});

	test('during init, it only updates selectedItems once', async () => {
		const el = document.createElement('cosmoz-grouped-list'),
			spy = sinonSpy();

		el.addEventListener('selected-items-changed', spy);
		el.data = [];

		document.body.appendChild(el);

		await nextFrame();

		assert.isTrue(spy.calledOnce);
	});

	test('it maintains selection accross data updates', async () => {
		const data = [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }];

		element.data = data;

		element.select(data[2]);
		element.select(data[3]);

		element.data = data.concat([{ id: 4 }, { id: 5 }]);
		await nextFrame();
		await nextFrame();

		assert.equal(
			element.innerText,
			'I:0---false-\nI:1---false-\nI:2---true-\nI:3---true-\nI:4---false-\nI:5---false-'
		);

		element.data = [data[2]];
		await nextFrame();
		await nextFrame();

		assert.equal(element.innerText, 'I:2---true-');

		element.data = data;
		await nextFrame();
		await nextFrame();

		assert.equal(
			element.innerText,
			'I:0---false-\nI:1---false-\nI:2---true-\nI:3---false-'
		);

		element.deselect(data[2]);
		await nextFrame();
		await nextFrame();

		assert.equal(
			element.innerText,
			'I:0---false-\nI:1---false-\nI:2---false-\nI:3---false-'
		);

		element.data = [{ id: 6 }];
		await nextFrame();
		await nextFrame();

		assert.equal(element.innerText, 'I:6---false-');
	});

	test('it clears selection when all selected items are removed from the dataset', async () => {
		const data = [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }];

		element.data = data;

		element.select(data[2]);
		element.select(data[3]);
		await nextFrame();
		await nextFrame();

		assert.equal(
			element.innerText,
			'I:0---false-\nI:1---false-\nI:2---true-\nI:3---true-'
		);

		element.data = data.splice(0, 2);
		await nextFrame();
		await nextFrame();

		assert.equal(element.innerText, 'I:0---false-\nI:1---false-');
	});
});

suite('flat data', () => {
	let element,
		items;

	setup(async () => {
		element = await fixture(basicHtmlFixture);
		items = [
			{
				id: 'i0',
				name: 'item 0',
				value: 0
			},
			{
				id: 'i1',
				name: 'item 1',
				value: 1
			},
			{
				id: 'i2',
				name: 'item 2',
				value: 1
			}
		];

		element.data = items;
		await nextFrame();
		await nextFrame();
	});

	test('selects items', async () => {
		const item = items[0];
		element.select(item);
		await nextFrame();
		await nextFrame();

		assert.equal(
			element.innerText,
			'I:i0-item 0-0-true-\nI:i1-item 1-1-false-\nI:i2-item 2-1-false-'
		);
	});

	test('removing a selected item does not clear rest of selection [#41]', async () => {
		element.select(items[0]);
		element.select(items[1]);
		element.select(items[2]);
		element.data = [items[1], items[2]];

		await nextFrame();
		await nextFrame();

		assert.equal(element.innerText, 'I:i1-item 1-1-true-\nI:i2-item 2-1-true-');
	});

	test('select all items [#977]', async () => {
		element.selectAll();

		await nextFrame();
		await nextFrame();

		assert.equal(
			element.innerText,
			'I:i0-item 0-0-true-\nI:i1-item 1-1-true-\nI:i2-item 2-1-true-'
		);
	});
});

suite('empty-groups', () => {
	let element;
	setup(async () => {
		element = await fixture(basicHtmlFixture);
		element.data = [
			{
				name: 'Group 0',
				id: 'g0',
				items: []
			},
			{
				name: 'Group 1',
				id: 'g1',
				items: [
					{
						id: 'g1-0',
						name: 'Group 1 item 0',
						value: 0
					},
					{
						id: 'g1-1',
						name: 'Group 1 item 1',
						value: 1
					}
				]
			}
		];
		await nextFrame();
		await nextFrame();
	});

	test('does not render empty groups by default', () => {
		assert.equal(
			element.innerText,
			'G:Group 1--false-\nI:g1-0-Group 1 item 0-0-false-\nI:g1-1-Group 1 item 1-1-false-'
		);
	});

	test('renders empty groups when `displayEmptyGroups` is true', async () => {
		element.displayEmptyGroups = true;

		await nextFrame();
		await nextFrame();

		assert.equal(
			element.innerText,
			'G:Group 0--true-\nG:Group 1--false-\nI:g1-0-Group 1 item 0-0-false-\nI:g1-1-Group 1 item 1-1-false-'
		);
	});
});

suite('basic', () => {
	let element,
		groups;

	setup(async () => {
		element = await fixture(basicHtmlFixture);

		groups = [
			{
				name: 'Group 0',
				id: 'g0',
				items: [
					{
						id: 'g0-0',
						name: 'Group 0 item 0',
						value: 0
					},
					{
						id: 'g0-1',
						name: 'Group 0 item 1',
						value: 1
					}
				]
			},
			{
				name: 'Group 1',
				id: 'g1',
				items: [
					{
						id: 'g1-0',
						name: 'Group 1 item 0',
						value: 0
					},
					{
						id: 'g1-1',
						name: 'Group 1 item 1',
						value: 1
					}
				]
			}
		];
		element.data = groups;
		await nextFrame();
		await nextFrame();
	});

	test('selects an item', async () => {
		const item = groups[0].items[0];

		element.select(item);
		await nextFrame();
		await nextFrame();

		assert.equal(
			element.innerText,
			'G:Group 0--false-\nI:g0-0-Group 0 item 0-0-true-\nI:g0-1-Group 0 item 1-1-false-\n' +
				'G:Group 1--false-\nI:g1-0-Group 1 item 0-0-false-\nI:g1-1-Group 1 item 1-1-false-'
		);
	});

	test('deselects an item', async () => {
		const item = groups[1].items[0];

		element.select(item);
		await nextFrame();
		await nextFrame();

		assert.equal(
			element.innerText,
			'G:Group 0--false-\nI:g0-0-Group 0 item 0-0-false-\nI:g0-1-Group 0 item 1-1-false-\n' +
				'G:Group 1--false-\nI:g1-0-Group 1 item 0-0-true-\nI:g1-1-Group 1 item 1-1-false-'
		);

		element.deselect(item);
		await nextFrame();
		await nextFrame();

		assert.equal(
			element.innerText,
			'G:Group 0--false-\nI:g0-0-Group 0 item 0-0-false-\nI:g0-1-Group 0 item 1-1-false-\n' +
				'G:Group 1--false-\nI:g1-0-Group 1 item 0-0-false-\nI:g1-1-Group 1 item 1-1-false-'
		);
	});

	test('selects a group', async () => {
		const group = groups[1];

		element.toggleSelect(group, true);
		await nextFrame();
		await nextFrame();

		assert.equal(
			element.innerText,
			'G:Group 0--false-\nI:g0-0-Group 0 item 0-0-false-\nI:g0-1-Group 0 item 1-1-false-\n' +
				'G:Group 1--true-\nI:g1-0-Group 1 item 0-0-true-\nI:g1-1-Group 1 item 1-1-true-'
		);
	});

	test('deselects a group', async () => {
		const group = groups[0];

		element.toggleSelect(group, true);
		await nextFrame();
		await nextFrame();

		assert.equal(
			element.innerText,
			'G:Group 0--true-\nI:g0-0-Group 0 item 0-0-true-\nI:g0-1-Group 0 item 1-1-true-\n' +
				'G:Group 1--false-\nI:g1-0-Group 1 item 0-0-false-\nI:g1-1-Group 1 item 1-1-false-'
		);

		element.toggleSelect(group, false);
		await nextFrame();
		await nextFrame();

		assert.equal(
			element.innerText,
			'G:Group 0--false-\nI:g0-0-Group 0 item 0-0-false-\nI:g0-1-Group 0 item 1-1-false-\n' +
				'G:Group 1--false-\nI:g1-0-Group 1 item 0-0-false-\nI:g1-1-Group 1 item 1-1-false-'
		);
	});

	test('deselecting an item from group deselects the group', async () => {
		const group = groups[1],
			item = group.items[1];

		element.toggleSelect(group, true);
		await nextFrame();
		await nextFrame();

		assert.equal(
			element.innerText,
			'G:Group 0--false-\nI:g0-0-Group 0 item 0-0-false-\nI:g0-1-Group 0 item 1-1-false-\n' +
				'G:Group 1--true-\nI:g1-0-Group 1 item 0-0-true-\nI:g1-1-Group 1 item 1-1-true-'
		);

		element.deselect(item);
		await nextFrame();
		await nextFrame();

		assert.equal(
			element.innerText,
			'G:Group 0--false-\nI:g0-0-Group 0 item 0-0-false-\nI:g0-1-Group 0 item 1-1-false-\n' +
				'G:Group 1--false-\nI:g1-0-Group 1 item 0-0-true-\nI:g1-1-Group 1 item 1-1-false-'
		);
	});

	test('removing a selected item does not clear rest of selection [#41]', async () => {
		const group = groups[0];

		element.toggleSelect(group, true);
		await nextFrame();
		await nextFrame();

		assert.equal(
			element.innerText,
			'G:Group 0--true-\nI:g0-0-Group 0 item 0-0-true-\nI:g0-1-Group 0 item 1-1-true-\n' +
				'G:Group 1--false-\nI:g1-0-Group 1 item 0-0-false-\nI:g1-1-Group 1 item 1-1-false-'
		);

		element.data = [{ ...groups[0], items: [group.items[1]]}, groups[1]];
		await nextFrame();
		await nextFrame();

		assert.equal(
			element.innerText,
			'G:Group 0--true-\nI:g0-1-Group 0 item 1-1-true-\n' +
				'G:Group 1--false-\nI:g1-0-Group 1 item 0-0-false-\nI:g1-1-Group 1 item 1-1-false-'
		);

	});

	test('selects all items', async () => {
		element.selectAll();
		await nextFrame();
		await nextFrame();

		assert.equal(
			element.innerText,
			'G:Group 0--true-\nI:g0-0-Group 0 item 0-0-true-\nI:g0-1-Group 0 item 1-1-true-\n' +
				'G:Group 1--true-\nI:g1-0-Group 1 item 0-0-true-\nI:g1-1-Group 1 item 1-1-true-'
		);
	});

	test('deselect all items', async () => {
		element.selectAll();
		await nextFrame();
		await nextFrame();

		assert.equal(
			element.innerText,
			'G:Group 0--true-\nI:g0-0-Group 0 item 0-0-true-\nI:g0-1-Group 0 item 1-1-true-\n' +
				'G:Group 1--true-\nI:g1-0-Group 1 item 0-0-true-\nI:g1-1-Group 1 item 1-1-true-'
		);

		element.deselectAll();
		await nextFrame();
		await nextFrame();

		assert.equal(
			element.innerText,
			'G:Group 0--false-\nI:g0-0-Group 0 item 0-0-false-\nI:g0-1-Group 0 item 1-1-false-\n' +
				'G:Group 1--false-\nI:g1-0-Group 1 item 0-0-false-\nI:g1-1-Group 1 item 1-1-false-'
		);
	});

	test('folds a group', async () => {
		const group = groups[1];

		assert.equal(
			element.innerText,
			'G:Group 0--false-\nI:g0-0-Group 0 item 0-0-false-\nI:g0-1-Group 0 item 1-1-false-\n' +
				'G:Group 1--false-\nI:g1-0-Group 1 item 0-0-false-\nI:g1-1-Group 1 item 1-1-false-'
		);

		element.toggleFold(group, true);
		await nextFrame();
		await nextFrame();

		assert.equal(
			element.innerText,
			'G:Group 0--false-\nI:g0-0-Group 0 item 0-0-false-\nI:g0-1-Group 0 item 1-1-false-\n' +
				'G:Group 1--false-true'
		);
	});

	test('unfolds a folded group', async () => {
		const group = groups[1];

		assert.equal(
			element.innerText,
			'G:Group 0--false-\nI:g0-0-Group 0 item 0-0-false-\nI:g0-1-Group 0 item 1-1-false-\n' +
				'G:Group 1--false-\nI:g1-0-Group 1 item 0-0-false-\nI:g1-1-Group 1 item 1-1-false-'
		);

		element.toggleFold(group, true);
		await nextFrame();
		await nextFrame();

		assert.equal(
			element.innerText,
			'G:Group 0--false-\nI:g0-0-Group 0 item 0-0-false-\nI:g0-1-Group 0 item 1-1-false-\n' +
				'G:Group 1--false-true'
		);

		element.toggleFold(group, false);
		await nextFrame();
		await nextFrame();

		assert.equal(
			element.innerText,
			'G:Group 0--false-\nI:g0-0-Group 0 item 0-0-false-\nI:g0-1-Group 0 item 1-1-false-\n' +
				'G:Group 1--false-false\nI:g1-0-Group 1 item 0-0-false-\nI:g1-1-Group 1 item 1-1-false-'
		);
	});

	test('toggles collapse on an item', async () => {
		const item = groups[1].items[1];
		assert.equal(
			element.innerText,
			'G:Group 0--false-\nI:g0-0-Group 0 item 0-0-false-\nI:g0-1-Group 0 item 1-1-false-\n' +
				'G:Group 1--false-\nI:g1-0-Group 1 item 0-0-false-\nI:g1-1-Group 1 item 1-1-false-'
		);

		element.toggleCollapse(item);
		await nextFrame();
		await nextFrame();

		assert.equal(
			element.innerText,
			'G:Group 0--false-\nI:g0-0-Group 0 item 0-0-false-\nI:g0-1-Group 0 item 1-1-false-\n' +
				'G:Group 1--false-\nI:g1-0-Group 1 item 0-0-false-\nI:g1-1-Group 1 item 1-1-false-true'
		);
	});

	test('updates after data changes', async () => {
		element.data = [groups[1]];
		await nextFrame();
		await nextFrame();

		assert.equal(
			element.innerText,
			'G:Group 1--false-\nI:g1-0-Group 1 item 0-0-false-\nI:g1-1-Group 1 item 1-1-false-'
		);
	});
});

suite('compare items function', () => {
	let element;

	setup(async () => {
		element = await fixture(basicHtmlFixture);
		element.data = [];
		await nextFrame();
		await nextFrame();
	});

	test('compare by id', async () => {
		const data = [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }];

		element.data = data;
		element.compareItemsFn = (a, b) => a.id === b.id;

		element.select(data[0]);
		element.select(data[1]);
		await nextFrame();
		await nextFrame();

		assert.equal(
			element.innerText,
			'I:0---true-\nI:1---true-\nI:2---false-\nI:3---false-'
		);

		element.data = [{ id: 0 }, { id: 1 }, { id: 5 }];
		await nextFrame();
		await nextFrame();

		assert.equal(
			element.innerText,
			'I:0---true-\nI:1---true-\nI:5---false-'
		);

		element.data = [{ id: 0 }, { id: 5 }];
		await nextFrame();
		await nextFrame();

		assert.equal(
			element.innerText,
			'I:0---true-\nI:5---false-'
		);
	});
});