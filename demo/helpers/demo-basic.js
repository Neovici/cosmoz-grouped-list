import {
	PolymerElement, html
} from '@polymer/polymer';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '../../cosmoz-grouped-list.js';

class DemoBasic extends PolymerElement {
	/* eslint-disable-next-line max-lines-per-function */
	static get template() {
		return html`
			<style include="iron-flex iron-flex-alignment iron-positioning">
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
					@apply --layout-vertical;
				}

				.group-template {
					@apply --layout-horizontal;
					@apply --layout-center;
					padding: 5px;
					background-color: #ccc;
					font-weight: bold;
				}
			</style>
			<div class="layout vertical fit">
				<h3>cosmoz-grouped-list demo</h3>
				<cosmoz-grouped-list id="groupedList" data="{{ data }}" selected-items="{{ selectedItems }}" class="flex">
					<template slot="templates" data-type="item">
						<div class="item-template" style="border-bottom: 1px solid grey;">
							<div>
								ID:<span class="item-id">{{ item.id }}</span>
								NAME:<span class="item-name">{{ item.name }}</span>
								VALUE:<span class="item-value">{{ item.value }}</span>
							</div>
						</div>
					</template>
					<template slot="templates" data-type="group">
						<div class="group-template">
							NAME:<span class="item-name">{{ item.name }}</span>
							VALUE: <span class="item-value">{{ item.value }}</span>
							SELECTED: <span class="item-selected">{{ selected }}</span>
						</div>
					</template>
				</cosmoz-grouped-list>
			</div>
		`;
	}

	static get is() {
		return 'demo-basic';
	}
	static get properties() {
		return {
			data: {
				type: Array,
				notify: true,
				value: () => [{
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
				}]
			},
			selectedItems: {
				type: Array
			}
		};
	}
}
customElements.define(DemoBasic.is, DemoBasic);
