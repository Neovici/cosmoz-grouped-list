const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export const generateListDemoData = (groupsMin, groupsMax, itemsMin, itemsMax) => {
	const
		data = [],
		groupsCount = getRandomInt(groupsMin, groupsMax);
	let n = 0,
		itemsCount,
		group;

	// Adds an empty group at the beginning
	data.push({
		name: 'Group 00',
		items: []
	});

	for (let i = 0; i < groupsCount; i += 1) {
		group =	 {
			name: 'Group ' + i,
			items: []
		};

		itemsCount = getRandomInt(itemsMin, itemsMax);
		for (let j = 0; j < itemsCount; j += 1) {
			group.items.push({
				id: n,
				name: group.name + ' item ' + j,
				value: 0
			});
			n += 1;
		}
		data.push(group);
	}
	// eslint-disable-next-line no-console
	console.log('generated ' + n + ' data items');
	return data;
};
