import { PolymerElement, html } from '@polymer/polymer';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu-light.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/iron-icon/iron-icon';
import '@polymer/iron-icons';

import '../../cosmoz-grouped-list.js';
import { generateListDemoData } from './demo-list-helper.js';
import { html as litHtml } from 'lit-html';

const getFoldIcon = folded => {
		if (folded) {
			return 'expand-more';
		}
		return 'expand-less';
	},
	_computeExtraContentClass = expanded => {
		return expanded ? 'extra-content expanded' : 'extra-content';
	};
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
			<cosmoz-grouped-list id="groupedList" data="[[ data ]]" selected-items="{{ selectedItems }}"
				render-item="[[ renderItem(outerValue) ]]" render-group="[[ renderGroup ]]"
				compare-items-fn="[[ compareItemsFn ]]"></cosmoz-grouped-list>
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

		this.data = this.data.reduce((results, item) => {
			if (item.items?.length > 0) {
				return [
					...results,
					{
						...item,
						items: item.items.filter(i => !this.selectedItems.includes(i))
					}
				];
			}

			if (!this.selectedItems.includes(item)) {
				return [...results, item];
			}

			return results;
		}, []);
	}

	toggleFold(event) {
		const {
			model: { item }
		} = event;
		this.$.groupedList.toggleFold(item);
	}

	toggleSelect(event) {
		this.$.groupedList.toggleSelect(event.model.item);
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

	_changeItemValue() {
		if (this.data[0].items) {
			this.set(
				'data.' + this.groupIndex + '.items.' + this.itemIndex + '.value',
				this.itemValue
			);
		} else {
			this.set('data.' + this.itemIndex + '.value', this.itemValue);
		}
		this.data = this.data.slice();
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

	compareItemsFn(a, b) {
		return a.id === b.id;
	}

	renderItem(outerValue) {
		return (
			item,
			index,
			{ selected, expanded, toggleSelect, toggleCollapse }
		) => {
			return litHtml`
			<div class="item-template" style="border-bottom: 1px solid grey;">
				<div>
					<div>Outer binding: <span>${ outerValue }</span></div>
					<div>Id: <span>${ item.id }</span></div>
					<div>Name: <span>${ item.name }</span></div>
					<div>Value: <span>${ item.value }</span></div>
				</div>
				<div @click=${ toggleSelect }>Selected: <span>${ selected }</span> (click to select/deselect)</div>
				<paper-dropdown-menu-light no-animations label="dropdown menu">
					<paper-listbox slot="dropdown-content">
						<paper-item>Item 1</paper-item>
						<paper-item>Item 2</paper-item>
						<paper-item>Item 3</paper-item>
						<paper-item>Item 4</paper-item>
					</paper-listbox>
				</paper-dropdown-menu-light>
				<div @click=${ toggleCollapse }>[+]</div>
				<div class="${ _computeExtraContentClass(expanded) }">
					Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed quis
					posuere turpis, quis commodo neque. Aenean dapibus consequat dolor,
					et vestibulum enim volutpat a. Donec vel dui at diam tristique
					condimentum dapibus ac elit. Sed consequat nibh id nibh posuere
					egestas. Phasellus blandit convallis tellus, nec pharetra orci
					viverra ut. In at arcu consectetur, tempus velit sit amet, congue
					diam. Suspendisse potenti. In ac tristique nulla, quis elementum nisi.
				</div>
			</div>`;
		};
	}
	renderGroup(item, index, { selected, folded, toggleSelect, toggleFold }) {
		return litHtml`
			<div class="group-template">
				<div class="group-name" @click=${ toggleSelect }>
					<span>${ item.name }</span>
					(selected=<span>${ selected }</span>)
				</div>
				<div>${ item.items.length }</div>
				<iron-icon icon="${ getFoldIcon(folded) }" @click=${ toggleFold }></iron-icon>
			</div>`;
	}
}
customElements.define(DemoFull.is, DemoFull);
