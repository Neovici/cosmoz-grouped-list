import {
	PolymerElement, html
} from '@polymer/polymer';

/**
 * # TemplateSelector
 *
 * @customElement
 * @polymer
 * @demo demo/full.html Full Demo
 */
export class TemplateSelector extends PolymerElement {
	static get template() {
		return html`
		<style>
			:host ::slotted([hidden]) {
				display: none !important;
			}

			/* This will give a row with an opened dropdown a z-index higher than all other rows */
			:host(.has-dropdown) {
				z-index: 100;
			}
		</style>
		<slot></slot>
`;
	}

	static get is() {
		return 'cosmoz-grouped-list-template-selector';
	}
	static get properties() {
		return {
			index: {
				type: Number
			},
			item: {
				type: Object,
				observer: '_onItemChanged'
			},
			hidden: {
				type: Boolean,
				observer: '_onHiddenChanged'
			}
		};
	}
	/**
	 * Set drop down open and close handlers.
	 * @returns {void}
	 */
	constructor() {
		super();
		this._boundOnDropdownOpen = this._onDropdownOpen.bind(this);
		this._boundOnDropdownClose = this._onDropdownClose.bind(this);
	}
	/**
	 * Add event listeners for the drop down open and close and dispatch
	 * an event that the selector has changed if needed.
	 * @returns {void}
	 */
	connectedCallback() {
		super.connectedCallback();

		this.addEventListener('paper-dropdown-open', this._boundOnDropdownOpen);
		this.addEventListener('paper-dropdown-close', this._boundOnDropdownClose);

		const {
			index,
			item,
			hidden
		} = this;

		if (index == null && item == null) {
			return;
		}
		this._fireChange({
			index,
			item,
			hidden
		});
	}
	/**
	 * Remove event listeners for the drop down open and close and
	 * dispatch an event that the selector has changed.
	 * @returns {void}
	 */
	disconnectedCallback() {
		super.disconnectedCallback();
		this.removeEventListener('paper-dropdown-open', this._boundOnDropdownOpen);
		this.removeEventListener('paper-dropdown-close', this._boundOnDropdownClose);
		this._fireChange({ hidden: true });
	}
	/**
	 * Check if the changed item contains something and if so dispatch
	 * an event that the selector has changed.
	 * @param {object} item Item.
	 * @returns {void}
	 */
	_onItemChanged(item) {
		if (item == null || this.hidden) {
			return;
		}
		this._fireChange({
			index: this.index,
			item
		});
	}
	/**
	 * Dispatch an event that the selector has changed with the hidden
	 * status.
	 * @param {boolean} hidden Hidden status.
	 * @returns {void}
	 */
	_onHiddenChanged(hidden) {
		this._fireChange({
			index: this.index,
			hidden,
			item: this.item
		});
	}
	/**
	 * Dispatch an event that the selector has changed.
	 * @param {object} props Properties.
	 * @returns {void}
	 */
	_fireChange(props = {}) {
		this.dispatchEvent(new CustomEvent('cosmoz-selector-changed', {
			bubbles: true,
			composed: true,
			detail: Object.assign({
				selector: this
			}, props)
		}));
	}
	/**
	 * Add has drop down style class to the class list.
	 * @param {object} event Polymer event object.
	 * @returns {void}
	 */
	_onDropdownOpen(event) { // eslint-disable-line no-unused-vars
		this.classList.add('has-dropdown');
	}
	/**
	 * Remove has drop down style class from the class list.
	 * @param {object} event Polymer event object.
	 * @returns {void}
	 */
	_onDropdownClose(event) { // eslint-disable-line no-unused-vars
		this.classList.remove('has-dropdown');
	}
}
customElements.define(TemplateSelector.is, TemplateSelector);
