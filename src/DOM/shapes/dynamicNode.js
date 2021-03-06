import isVoid from '../../util/isVoid';
import { getValueWithIndex, getTypeFromValue, ValueTypes } from '../../core/variables';
import recreateNode from '../recreateNode';
import { createVirtualList, updateVirtualList } from '../domMutate';

export default function createDynamicNode(valueIndex) {
	const domNodeMap = {};
	let childNodeList = [];
	let keyedChildren = true;
	let nextDomNode;
	const node = {
		overrideItem: null,
		create(item, treeLifecycle, context) {
			let value = getValueWithIndex(item, valueIndex);
			let domNode;
			const type = getTypeFromValue(value);

			switch (type) {
				case ValueTypes.TEXT:
					// Testing the length property are actually faster than testing the
					// string against '', because the interpreter won't have to create a String
					// object from the string literal.
					if (isVoid(value) || value.length === 0) {
						value = '';
					}
					domNode = document.createTextNode(value);
					break;
				case ValueTypes.ARRAY:
					const virtualList = createVirtualList(value, item, childNodeList, treeLifecycle, context);
					domNode = virtualList.domNode;
					keyedChildren = virtualList.keyedChildren;
					treeLifecycle.addTreeSuccessListener(() => {
						if (childNodeList.length > 0) {
							nextDomNode = childNodeList[childNodeList.length - 1].nextSibling || null;
							domNode = childNodeList[0].parentNode;
						}
					});
					break;
				case ValueTypes.TREE:
					domNode = value.create(item, treeLifecycle, context);
					break;
				case ValueTypes.EMPTY_OBJECT:
					if (process.env.NODE_ENV !== 'production') {
						throw Error('Inferno Error: A valid template node must be returned. You may have returned undefined, an array or some other invalid object.');
					}
					break;
				case ValueTypes.FUNCTION:
					if (process.env.NODE_ENV !== 'production') {
						throw Error('Inferno Error: A valid template node must be returned. You may have returned undefined, an array or some other invalid object.');
					}
					break;
				case ValueTypes.FRAGMENT:
					domNode = value.tree.dom.create(value, treeLifecycle, context);
					break;
			}
			domNodeMap[item.id] = domNode;
			return domNode;
		},
		update(lastItem, nextItem, treeLifecycle, context) {
			let domNode = domNodeMap[lastItem.id];
			let nextValue = getValueWithIndex(nextItem, valueIndex);
			const lastValue = getValueWithIndex(lastItem, valueIndex);

			if (nextValue !== lastValue) {
				const nextType = getTypeFromValue(nextValue);
				const lastType = getTypeFromValue(lastValue);

				if (lastType !== nextType) {
					recreateNode(domNode, nextItem, node, treeLifecycle, context);
					return;
				}
				switch (nextType) {
					case ValueTypes.TEXT:
						// Testing the length property are actually faster than testing the
						// string against '', because the interpreter won't have to create a String
						// object from the string literal.
						if (isVoid(nextValue) ||
							nextValue.length === 0) {
							nextValue = '';
						}
						domNode.nodeValue = nextValue;
						break;
					case ValueTypes.ARRAY:
						updateVirtualList(lastValue, nextValue, childNodeList, domNode, nextDomNode, keyedChildren, treeLifecycle, context);
						break;
					case ValueTypes.TREE:
						// TODO
						break;
					case ValueTypes.FRAGMENT:
						nextValue.tree.dom.update(lastValue, nextValue, treeLifecycle, context);
						break;
					default: break;
				}
			}
		},
		remove(item, treeLifecycle) {
			const value = getValueWithIndex(item, valueIndex);
			const type = getTypeFromValue(value);

			if (type === ValueTypes.TREE) {
				value.remove(item, treeLifecycle);
			} else if (type === ValueTypes.FRAGMENT) {
				value.tree.dom.remove(value, treeLifecycle);
			}
		}
	};

	return node;
}