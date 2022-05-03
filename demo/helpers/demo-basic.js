import {
	PolymerElement, html
} from '@polymer/polymer';
import { html as litHtml } from 'lit-html';
import '../../cosmoz-grouped-list.js';

class DemoBasic extends PolymerElement {
	/* eslint-disable-next-line max-lines-per-function */
	static get template() {
		return html`
			<style>
				:host {
					display: flex;
					flex-direction: column;
				}
				cosmoz-grouped-list { flex: auto}
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
			<cosmoz-grouped-list id="groupedList" data="{{ data }}" selected-items="{{ selectedItems }}"
				render-item="[[ renderItem ]]" render-group="[[ renderGroup ]]">
			</cosmoz-grouped-list>
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


	renderItem(item, index, { selected, toggleSelect }) {
		return litHtml`
			<div class="item-template" style="border-bottom: 1px solid grey;" @click=${ toggleSelect }>
				<div>
					ID:<span class="item-id">${ item.id }</span>
					NAME:<span class="item-name">${ item.name }</span>
					VALUE:<span class="item-value">${ item.value }</span>
					SELECTED: <span class="item-selected">${ selected }</span>
				</div>
			</div>
		`;
	}

	renderGroup(item, index, { selected, toggleSelect }) {
		return litHtml`
			<div class="group-template" @click=${ toggleSelect }>
			 	<div>
			 		NAME:<span class="item-name">${ item.name }</span>
			 		VALUE: <span class="item-value">${ item.value }</span>
			 		SELECTED: <span class="item-selected">${ selected }</span>
			 	</div>
			</div>
		`;
	}
}
customElements.define(DemoBasic.is, DemoBasic);
