import isVoid from '../util/isVoid';
import isStringOrNumber from '../util/isStringOrNumber';
import isSVGElement from '../util/isSVGElement';
import isMathMLElement from '../util/isMathMLElement';
import createRootNodeWithDynamicText from './shapes/rootNodeWithDynamicText';
import createNodeWithDynamicText from './shapes/nodeWithDynamicText';
import createRootNodeWithStaticChild from './shapes/rootNodeWithStaticChild';
import createNodeWithStaticChild from './shapes/nodeWithStaticChild';
import createRootNodeWithDynamicChild from './shapes/rootNodeWithDynamicChild';
import createNodeWithDynamicChild from './shapes/nodeWithDynamicChild';
import createRootNodeWithDynamicSubTreeForChildren from './shapes/rootNodeWithDynamicSubTreeForChildren';
import createNodeWithDynamicSubTreeForChildren from './shapes/nodeWithDynamicSubTreeForChildren';
// import createRootDynamicNode from './shapes/rootDynamicNode';
import createDynamicNode from './shapes/dynamicNode';
import createRootNodeWithComponent from './shapes/rootNodeWithComponent';
import createNodeWithComponent from './shapes/nodeWithComponent';
import createRootDynamicTextNode from './shapes/rootDynamicTextNode';
// import createDynamicTextNode from './shapes/dynamicTextNode';
import { ObjectTypes } 	from '../core/variables';
import isArray from '../util/isArray';
import { addDOMStaticAttributes } from './addAttributes';
import { isRecyclingEnabled } from './recycling';
import createRootVoidNode from './shapes/rootVoidNode';
import createVoidNode from './shapes/voidNode';
import createRootStaticNode from './shapes/rootStaticNode';
import createStaticNode from './shapes/staticNode';

function createElement(schema, domNamespace, parentNode) {
	const MathNamespace = 'http://www.w3.org/1998/Math/MathML';
	const SVGNamespace = 'http://www.w3.org/2000/svg';
	const nodeName = schema && typeof schema.tag === 'string' && schema.tag.toLowerCase();
	const is = schema.attrs && schema.attrs.is;

	let templateNode;

	if (domNamespace === undefined) {
		if (schema.attrs && schema.attrs.xmlns) {
			domNamespace = schema.attrs.xmlns;
		} else {
			switch (nodeName) {
				case 'svg':
					domNamespace = SVGNamespace;
					break;
				case 'math':
					domNamespace = MathNamespace;
					break;
				default:
					// Edge case. In case a namespace element are wrapped inside a non-namespace element, it will inherit wrong namespace.
					// E.g. <div><svg><svg></div> - will not work
					if (parentNode) { // only used by static children
						// check only for top-level element for both mathML and SVG
						if (nodeName === 'svg' && (parentNode.namespaceURI !== SVGNamespace)) {
							domNamespace = SVGNamespace;
						} else if (nodeName === 'math' && (parentNode.namespaceURI !== MathNamespace)) {
							domNamespace = MathNamespace;
						}
					} else if (isSVGElement(nodeName)) {
						domNamespace = SVGNamespace;
					} else if (isMathMLElement(nodeName)) {
						domNamespace = MathNamespace;
					}
			}
		}
	}
	templateNode = domNamespace ?
		is ?
			document.createElementNS(domNamespace, nodeName, is) :
			document.createElementNS(domNamespace, nodeName) :
		is ?
			document.createElement(nodeName, is) :
			document.createElement(nodeName);

	return {
		namespace: domNamespace,
		node: templateNode
	};
}

const recyclingEnabled = isRecyclingEnabled();
const invalidTemplateError = 'Inferno Error: A valid template node must be returned. You may have returned undefined, an array or some other invalid object.';

function createStaticAttributes(node, domNode, excludeAttrs) {
	const attrs = node.attrs;

	if (!isVoid(attrs)) {
		if (excludeAttrs) {
			const newAttrs = { ...attrs };

			for (const attr in excludeAttrs) {
				if (newAttrs[attr]) {
					delete newAttrs[attr];
				}
			}
			addDOMStaticAttributes(node, domNode, newAttrs);
		} else {
			addDOMStaticAttributes(node, domNode, attrs);
		}
	}
}

function createStaticTreeChildren(children, parentNode, domNamespace) {
	if (isArray(children)) {
		for (let i = 0; i < children.length; i++) {
			const childItem = children[i];

			if (isStringOrNumber(childItem)) {
				const textNode = document.createTextNode(childItem);

				parentNode.appendChild(textNode);
			} else {
				createStaticTreeNode(childItem, parentNode, domNamespace);
			}
		}
	} else {
		if (isStringOrNumber(children)) {
			parentNode.textContent = children;
		} else {
			createStaticTreeNode(children, parentNode, domNamespace);
		}
	}
}

function createStaticTreeNode(node, parentNode, domNamespace) {
	let staticNode;

	if (!isVoid(node)) {
		if (isStringOrNumber(node)) {
			staticNode = document.createTextNode(node);
		} else {
			const tag = node.tag;

			if (tag) {
				const Element = createElement(node, domNamespace, parentNode);

				staticNode = Element.node;
				domNamespace = Element.namespace;
				const text = node.text;
				const children = node.children;

				if (!isVoid(text)) {
					if (process.env.NODE_ENV !== 'production') {
						if (!isVoid(children)) {
							throw Error(invalidTemplateError);
						}
						if (!isStringOrNumber(text)) {
							throw Error('Inferno Error: Template nodes with TEXT must only have a StringLiteral or NumericLiteral as a value, this is intended for low-level optimisation purposes.');
						}
					}
					staticNode.textContent = text;
				} else {
					if (!isVoid(children)) {
						createStaticTreeChildren(children, staticNode, domNamespace);
					}
				}
				createStaticAttributes(node, staticNode);
			} else if (node.text) {
				staticNode = document.createTextNode(node.text);
			}
		}
		if (process.env.NODE_ENV !== 'production') {
			if (staticNode === undefined) {
				throw Error(invalidTemplateError);
			}
		}
		if (parentNode === null) {
			return staticNode;
		} else {
			parentNode.appendChild(staticNode);
		}
	}
}

export default function createDOMTree(schema, isRoot, dynamicNodeMap, domNamespace) {
	if (process.env.NODE_ENV !== 'production') {
		if (isVoid(schema)) {
			throw Error(invalidTemplateError);
		}
		if (isArray(schema)) {
			throw Error(invalidTemplateError);
		}
	}

	const dynamicFlags = dynamicNodeMap.get(schema);
	let node;
	let templateNode;

	if (!dynamicFlags) {
		templateNode = createStaticTreeNode(schema, null, domNamespace, schema);
		if (process.env.NODE_ENV !== 'production') {
			if (!templateNode) {
				throw Error(invalidTemplateError);
			}
		}
		if (isRoot) {
			node = createRootStaticNode(templateNode, recyclingEnabled);
		} else {
			node = createStaticNode(templateNode);
		}
	} else {
		if (dynamicFlags.NODE === true) {
			if (isRoot) {
				//		node = createRootDynamicNode( schema.index, domNamespace, recyclingEnabled );
			} else {
				node = createDynamicNode(schema.index, domNamespace);
			}
		} else {
			const tag = schema.tag;
			const text = schema.text;

			if (tag) {
				if (tag.type === ObjectTypes.VARIABLE) {
					const lastAttrs = schema.attrs;
					const attrs = { ...lastAttrs };
					const children = schema.children;

					if (children) {
						if (isArray(children)) {
							if (children.length > 1) {
								attrs.children = [];
								for (let i = 0; i < children.length; i++) {
									const childNode = children[i];

									attrs.children.push(createDOMTree(childNode, false, dynamicNodeMap, domNamespace));
								}
							} else if (children.length === 1) {
								attrs.children = createDOMTree(children[0], false, dynamicNodeMap, domNamespace);
							}
						} else {
							attrs.children = createDOMTree(children, false, dynamicNodeMap, domNamespace);
						}
					}
					if (isRoot) {
						return createRootNodeWithComponent(tag.index, attrs, children, domNamespace, recyclingEnabled);
					} else {
						return createNodeWithComponent(tag.index, attrs, children, domNamespace);
					}
				}

				templateNode = createElement(schema, domNamespace, null).node;

				const attrs = schema.attrs;
				let dynamicAttrs = null;

				if (!isVoid(attrs)) {
					if (dynamicFlags.ATTRS === true) {
						dynamicAttrs = attrs;
					} else if (dynamicFlags.ATTRS !== false) {
						dynamicAttrs = dynamicFlags.ATTRS;
						createStaticAttributes(schema, templateNode, dynamicAttrs);
					} else {
						createStaticAttributes(schema, templateNode);
					}
				}
				const children = schema.children;

				if (!isVoid(text)) {
					if (process.env.NODE_ENV !== 'production') {
						if (!isVoid(children)) {
							throw Error('Inferno Error: Template nodes cannot contain both TEXT and a CHILDREN properties, they must only use one or the other.');
						}
					}
					if (dynamicFlags.TEXT === true) {
						if (isRoot) {
							node = createRootNodeWithDynamicText(templateNode, text.index, dynamicAttrs, recyclingEnabled);
						} else {
							node = createNodeWithDynamicText(templateNode, text.index, dynamicAttrs);
						}
					} else {
						if (isStringOrNumber(text)) {
							templateNode.textContent = text;
						} else {
							if (process.env.NODE_ENV !== 'production') {
								throw Error('Inferno Error: Template nodes with TEXT must only have a StringLiteral or NumericLiteral as a value, this is intended for low-level optimisation purposes.');
							}
						}
						if (isRoot) {
							node = createRootNodeWithStaticChild(templateNode, dynamicAttrs, recyclingEnabled);
						} else {
							node = createNodeWithStaticChild(templateNode, dynamicAttrs);
						}
					}
				} else {
					if (!isVoid(children)) {
						if (children.type === ObjectTypes.VARIABLE) {
							if (isRoot) {
								node = createRootNodeWithDynamicChild(
									templateNode, children.index, dynamicAttrs, recyclingEnabled
								);
							} else {
								node = createNodeWithDynamicChild(
									templateNode, children.index, dynamicAttrs
								);
							}
						} else if (dynamicFlags.CHILDREN === true) {
							let subTreeForChildren = [];

							if (typeof children === 'object') {
								if (isArray(children)) {
									for (let i = 0; i < children.length; i++) {
										const childItem = children[i];

										subTreeForChildren.push(createDOMTree(childItem, false, dynamicNodeMap));
									}
								} else {
									subTreeForChildren = createDOMTree(children, false, dynamicNodeMap);
								}
							}
							if (isRoot) {
								node = createRootNodeWithDynamicSubTreeForChildren(
									templateNode, subTreeForChildren, dynamicAttrs, recyclingEnabled
								);
							} else {
								node = createNodeWithDynamicSubTreeForChildren(
									templateNode, subTreeForChildren, dynamicAttrs
								);
							}
						} else if (isStringOrNumber(children)) {
							templateNode.textContent = children;
							if (isRoot) {
								node = createRootNodeWithStaticChild(templateNode, dynamicAttrs, recyclingEnabled);
							} else {
								node = createNodeWithStaticChild(templateNode, dynamicAttrs);
							}
						} else {
							const childNodeDynamicFlags = dynamicNodeMap.get(children);

							if (childNodeDynamicFlags === undefined) {
								createStaticTreeChildren(children, templateNode);

								if (isRoot) {
									node = createRootNodeWithStaticChild(templateNode, dynamicAttrs, recyclingEnabled);
								} else {
									node = createNodeWithStaticChild(templateNode, dynamicAttrs);
								}
							}
						}
					} else {
						if (isRoot) {
							node = createRootVoidNode(templateNode, dynamicAttrs, recyclingEnabled);
						} else {
							node = createVoidNode(templateNode, dynamicAttrs);
						}
					}
				}
			} else if (text) {
				templateNode = document.createTextNode('');
				// if ( isRoot ) {
				node = createRootDynamicTextNode(templateNode, text.index);
				// } //else {
//					node = createDynamicTextNode( templateNode, text.index );
//				}
			}
		}
	}
	return node;
}
