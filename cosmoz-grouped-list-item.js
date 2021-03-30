import {
	component, useEffect
} from 'haunted';
import { cache } from 'lit-html/directives/cache';

const
	init = Symbol('init'),
	ListItem = host => {
		const {
			item, selectedItems, visibleColumns, renderItemRow, renderGroupRow, updateSize
		} = host;

		useEffect(() => {
			if (!host[init]) {
				host[init] = true;
				return;
			}

			updateSize(item);
		}, [item]);

		return cache(item.items instanceof Array
			? renderGroupRow(item, selectedItems)
			: renderItemRow(item, selectedItems, visibleColumns));
	};

customElements.define('cosmoz-grouped-list-item', component(ListItem, { useShadowDOM: false }));
