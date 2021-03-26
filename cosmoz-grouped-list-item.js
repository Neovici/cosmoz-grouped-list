import { component } from 'haunted';

const ListItem = host => {
	const {
		item, index, renderItemRow, renderGroupRow
	} = host;
	console.log(item);

	return item.items instanceof Array
		? renderGroupRow(item)
		: renderItemRow(item);
};

customElements.define('cosmoz-grouped-list-item', component(ListItem, { useShadowDOM: false }));
