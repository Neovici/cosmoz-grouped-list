import {
	renderCosmozGroupedList,
	useCosmozGroupedList
} from './use-cosmoz-grouped-list.js';
import { component } from 'haunted';

const CosmozGroupedList = host =>
	renderCosmozGroupedList(useCosmozGroupedList(host));

customElements.define(
	'cosmoz-grouped-list',
	component(CosmozGroupedList, { useShadowDOM: false })
);
