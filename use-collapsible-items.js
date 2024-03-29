import { useCallback } from '@pionjs/pion';
import { useWeakState } from './use-weak-state';
import { isGroup } from './utils';

export const useCollapsibleItems = () => {
	const { setItemState, state, signal } = useWeakState(),
		toggleFold = useCallback((item, folded) => {
			if (!isGroup(item)) {
				return;
			}

			setItemState(item, (state) => ({
				folded: folded !== undefined ? folded : !state.folded,
			}));
		}, []),
		toggleCollapse = useCallback((item, collapsed) => {
			if (isGroup(item)) {
				return;
			}

			setItemState(item, (state) => ({
				expanded: collapsed !== undefined ? !collapsed : !state.expanded,
			}));
		}, []);

	return {
		state,
		signal,
		toggleFold,
		toggleCollapse,
	};
};
