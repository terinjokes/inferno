import { addDOMDynamicAttributes, updateDOMDynamicAttributes, clearListeners } from '../addAttributes';

export default function createNodeWithStaticChild(templateNode, dynamicAttrs) {
	const domNodeMap = {};
	const node = {
		overrideItem: null,
		create(item) {
			const domNode = templateNode.node.cloneNode(true);

			if (dynamicAttrs) {
				addDOMDynamicAttributes(item, domNode, dynamicAttrs, null);
			}
			domNodeMap[item.id] = domNode;
			return domNode;
		},
		update(lastItem, nextItem) {
			const domNode = domNodeMap[lastItem.id];

			if (dynamicAttrs) {
				updateDOMDynamicAttributes(lastItem, nextItem, domNode, dynamicAttrs);
			}
		},
		remove(item) {
			const domNode = domNodeMap[item.id];

			if (dynamicAttrs) {
				clearListeners(item, domNode, dynamicAttrs);
			}
		}
	};

	return node;
}
