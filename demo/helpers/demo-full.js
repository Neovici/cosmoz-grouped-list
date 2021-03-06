import {
	PolymerElement, html
} from '@polymer/polymer';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu-light.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-listbox/paper-listbox.js';

import '../../cosmoz-grouped-list.js';
import { generateListDemoData } from './demo-list-helper.js';

class DemoFull extends PolymerElement {
	/* eslint-disable-next-line max-lines-per-function */
	static get template() {
		return html`
			<style>
				:host {
					display: flex;
					flex-direction: column;
				}

				.actions {
					display: flex;
					align-items: center;
					flex-wrap: wrap;
				}

				cosmoz-grouped-list, .group-name { flex: auto }

				.group-header {
					padding: 5px;
					background-color: #ccc;
					font-weight: bold;
				}

				.extra-content.expanded {
					display: block;
				}

				.extra-content {
					display: none;
				}

				.action {
					padding: 5px;
					margin: 5px 5px 10px 5px;
				}

				.item-template {
					display: flex;
					flex-direction: column;
				}

				.item-template[highlighted] {
					background-color: #dcdcff;
				}

				.group-template {
					display: flex;
					align-items: center;
					padding: 5px;
					background-color: #ccc;
					font-weight: bold;
				}
			</style>
			<h3>cosmoz-grouped-list demo</h3>
			<div class="actions">
				<button class="action" on-click="_newData">generate new data with grouping</button>
				<button class="action" on-click="_newSmallData">generate new small data with grouping</button>
				<button class="action" on-click="_newFlatData">generate new data without grouping</button>
				<button class="action" on-click="_emptyData">empty data</button>
				<button class="action" on-click="_emptySelectedItems">Empty selectedItems</button>
				<button class="action" on-click="_changeOuterValue">Increment outer binding value</button>
				<input class="action" value="{{itemValue::input}}">
				<button class="action" on-click="_changeItemValue">change item value</button>
				<button class="action" on-click="_firstVisibleItem">First visible item</button>
			</div>
			<div class="actions">
				<button class="action" on-click="selectAll">Select all</button>
				<button class="action" on-click="deselectAll">Deselect all</button>
				<button class="action" on-click="removeSelected">Remove selected items</button>
				<div class="action">Selected items count = {{selectedItems.length}}</div>
			</div>
			<!--<div class="actions">
				<label class="action">Group index</label>
				<input class="action" value="{{groupIndex::input}}">
				<label class="action">Item index</label>
				<input class="action" value="{{itemIndex::input}}">
				<label class="action">Item value</label>
				<input class="action" value="{{itemValue::input}}">
				<button class="action" class="action" on-click="_changeItemValue">change item value</button>
			</div>-->
			<cosmoz-grouped-list id="groupedList" data="{{ data }}" selected-items="{{ selectedItems }}">
				<template slot="templates" data-type="item">
					<div highlighted$="[[highlighted]]" class="item-template" style="border-bottom: 1px solid grey;">
						<div on-click="highlight">
							<div>Outer binding: <span>[[outerValue]]</span></div>
							<div>Id: <span>{{item.id}}</span></div>
							<div>Name: <span>{{item.name}}</span></div>
							<div>Value: <span>{{item.value}}</span></div>
							<div>Highlighted: <span>[[highlighted]]</span></div>
						</div>
						<div on-click="toggleSelect">Selected: <span>{{ selected }}</span> (click to select/deselect)</div>
						<paper-dropdown-menu-light no-animations label="dropdown menu">
							<paper-listbox slot="dropdown-content">
								<paper-item>Item 1</paper-item>
								<paper-item>Item 2</paper-item>
								<paper-item>Item 3</paper-item>
								<paper-item>Item 4</paper-item>
							</paper-listbox>
						</paper-dropdown-menu-light>
						<div on-click="toggleCollapse">[+]</div>
						<div class$="{{_computeExtraContentClass(expanded)}}">
							Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed quis
							posuere turpis, quis commodo neque. Aenean dapibus consequat dolor,
							et vestibulum enim volutpat a. Donec vel dui at diam tristique
							condimentum dapibus ac elit. Sed consequat nibh id nibh posuere
							egestas. Phasellus blandit convallis tellus, nec pharetra orci
							viverra ut. In at arcu consectetur, tempus velit sit amet, congue
							diam. Suspendisse potenti. In ac tristique nulla, quis elementum nisi.
						</div>
					</div>
				</template>
				<template slot="templates" data-type="group">
					<div class="group-template">
						<div class="group-name" on-click="toggleSelect"><span>[[item.name]]</span>(selected=<span>{{selected}}</span>)</div>
						<div>[[ item.items.length ]]</div>
						<iron-icon icon="[[ getFoldIcon(folded) ]]" on-click="toggleFold"></iron-icon>
					</div>
				</template>
			</cosmoz-grouped-list>
		`;
	}

	static get is() {
		return 'demo-full';
	}
	static get properties() {
		return {
			data: {
				type: Array,
				notify: true
			},
			selectedItems: {
				type: Array
			},
			outerValue: {
				type: Number,
				value: 0
			},
			groupIndex: {
				type: Number,
				value: 2
			},
			itemIndex: {
				type: Number,
				value: 0
			},
			itemValue: {
				type: Number,
				value: 100
			}
		};
	}

	connectedCallback() {
		super.connectedCallback();
		window.setTimeout(() => {
			this.data = generateListDemoData(10, 13, 1, 7);
		}, 16);
	}

	removeSelected() {
		if (this.selectedItems.length === 0) {
			return;
		}
		// !!!WARN: do not use removeItem using forEach on this.selectedItems,
		// as removing an item will remove it from the selection
		for (let i = this.selectedItems.length - 1; i >= 0; i -= 1) {
			const item = this.selectedItems[i];
			this.$.groupedList.removeItem(item);
		}
	}

	toggleFold(event) {
		const { model: { item }} = event;
		this.$.groupedList.toggleFold(item);
	}

	toggleSelect(event) {
		this.$.groupedList.toggleSelect(event.model.item);
	}

	getFoldIcon(folded) {
		if (folded) {
			return 'expand-more';
		}
		return 'expand-less';
	}

	highlight(event) {
		const
			model = event.model,
			item = model.item,
			highlighted = model.highlighted;
		this.$.groupedList.highlightItem(item, highlighted);
	}

	selectAll() {
		this.$.groupedList.selectAll();
	}

	deselectAll() {
		this.$.groupedList.deselectAll();
	}

	_emptySelectedItems() {
		this.selectedItems = [];
	}

	toggleCollapse(event) {
		this.$.groupedList.toggleCollapse(event.model.item);
	}

	_computeExtraContentClass(expanded) {
		return expanded ? 'extra-content expanded' : 'extra-content';
	}

	_changeItemValue() {
		if (this.data[0].items) {
			this.set('data.' + this.groupIndex + '.items.' + this.itemIndex + '.value', this.itemValue);
		} else {
			this.set('data.' + this.itemIndex + '.value', this.itemValue);
		}
	}
	_changeOuterValue() {
		this.outerValue += 1;
	}

	_emptyData() {
		this.data = [];
	}

	_newData() {
		this.data = generateListDemoData(10, 15, 1, 7);
	}

	_newSmallData() {
		this.data = generateListDemoData(1, 1, 2, 3);
	}

	_newFlatData() {
		const data = generateListDemoData(3, 3, 50, 80);
		this.data = data[3].items;
	}
	_firstVisibleItem() {
		// eslint-disable-next-line no-console
		console.log(this.$.groupedList.getFirstVisibleItemElement());
	}
}
customElements.define(DemoFull.is, DemoFull);
