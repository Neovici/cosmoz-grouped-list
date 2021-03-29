import {
	component, useEffect
} from 'haunted';

const ListItem = host => {
	const {
		item, index, selectedItems, visibleColumns, renderItemRow, renderGroupRow
	} = host;

	useEffect(() => {
		if (!host.__hasRenderedOnce) {
			host.__hasRenderedOnce = true;
			return;
		}

		host.dispatchEvent(new CustomEvent('update-item-size', {
			bubbles: true,
			composed: true,
			detail: { item }
		}));
	}, [item]);

	return item.items instanceof Array
		? renderGroupRow(item, selectedItems)
		: renderItemRow(item, selectedItems, visibleColumns);
};

customElements.define('cosmoz-grouped-list-item', component(ListItem, { useShadowDOM: false }));
