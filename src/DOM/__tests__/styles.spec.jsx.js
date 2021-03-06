import createDOMTree from '../createTree';
import { render } from '../rendering';
import createTemplate from '../../core/createTemplate';
import { addTreeConstructor } from '../../core/createTemplate';
import { shortCuts, cssToJSName } from '../../util/styleAccessor';

addTreeConstructor( 'dom', createDOMTree );

/**
 * DO NOT MODIFY! We are facking Inferno to get JSX working!
 */
const Inferno = { createTemplate };

describe( 'CSS style properties (JSX)', () => {

	let container;

	beforeEach(() => {
		container = document.createElement('div');
	});

	afterEach(() => {
		container.innerHTML = '';
	});

	it('should set and remove dynamic styles', () => {

		const styles = {display: 'none', fontFamily: 'Arial', lineHeight: 1.2};

		render(<div style={styles} />, container);
		expect(container.firstChild.style.fontFamily).to.equal('Arial');
		expect(container.firstChild.style.lineHeight).to.equal('1.2');

		render(<div />, container);
		expect(container.firstChild.style.fontFamily).to.equal('');
		expect(container.firstChild.style.lineHeight).to.equal('');

	});

	it('should update styles if initially null', () => {

		let styles = null;
		render(<div style={styles} />, container);

		styles = {display: 'block'};

		render(<div style={styles} />, container);
		expect(container.firstChild.style.display).to.equal('block');
	});

	it('should update styles if updated to null multiple times', () => {
		var styles = null;

		render(<div style={undefined} />, container);

		render(<div style={styles} />, container);
		expect(container.firstChild.style.display).to.equal('');

		styles = {display: 'block'};

		render(<div style={styles} />, container);
		expect(container.firstChild.style.display).to.equal('block');

		render(<div style={null} />, container);
		expect(container.firstChild.style.display).to.equal('');

		render(<div style={styles} />, container);
		expect(container.firstChild.style.display).to.equal('block');

		render(<div style={null} />, container);
		expect(container.firstChild.style.display).to.equal('');
	});

	it('should update styles when `style` changes from null to object', () => {
		const styles = {color: 'red'};
		render(<div style={123} />, container);
		render(<div style={styles} />, container);
		render(<div />, container);
		render(<div style={styles} />, container);

		const stubStyle = container.firstChild.style;
		expect(stubStyle.color).to.equal('red');
	});

	it('should support different unit types - em and mm', () => {
		const styles = {height: '200em', width:'20mm'};
		render(<div style={styles} />, container);
		render(<div />, container);
		render(<div style={styles} />, container);

		const stubStyle = container.firstChild.style;
		expect(stubStyle.height).to.equal('200em');
		expect(stubStyle.width).to.equal('20mm');
	});

	it('should clear all the styles when removing `style`', () => {
		const styles = {display: 'none', color: 'red'};
		render(<div style={styles} />, container);

		const stubStyle = container.firstChild.style;

		render(<div />, container);
		expect(stubStyle.display).to.equal('none');
		expect(stubStyle.color).to.equal('red');
	});

	describe( 'Shorthand CSS Styles', () => {
		Object.keys( shortCuts ).forEach( shortCut => {
			let stylePropName = cssToJSName( shortCut );
			let shorthands = shortCuts[shortCut];
			let mustBeString = ( /style/ig ).test( shortCut );

			if ( shorthands.length ) {
				let val = mustBeString ? 'dotted' : 1;
				let style = { [stylePropName]: val };
				let comparator = mustBeString ? val : val + 'px';

				describe( `Set ${shortCut} CSS properties from shorthand: ${JSON.stringify( style ) }`, () => {
					beforeEach( () => {
						render( <div style={ style } />, container );
					} );
					shorthands.forEach( cssProperty => {
						it( `should set ${cssProperty} to ${style[stylePropName]}px`, () => {
							expect( container.firstChild.style[cssProperty] ).to.equal( comparator );
						} );
					} );
				} );
			}

			if ( shorthands.length ) {
				[{
					numbers: [ 1, 2 ],
					strings: [ 'dotted', 'solid' ]
				}, {
					numbers: [ 1, 2, 3, 4 ],
					strings: [ 'dotted', 'solid', 'dashed', 'double' ]
				}].forEach( vals => {

					let values = mustBeString ? vals.strings : vals.numbers.map( x => x + 'px' );
					let val = values.join( ' ' );
					let style = { [stylePropName]: val };

					describe( `Set ${shortCut} CSS properties from shorthand: ${JSON.stringify( style ) }`, () => {
						beforeEach( () => {
							render( <div style={ style } />, container );
						} );
						shorthands.forEach( ( cssProperty, index ) => {
							let comparator = values[index % values.length];

							it( `should set ${cssProperty} to ${comparator}`, () => {
								expect( container.firstChild.style[cssProperty] ).to.equal( comparator );
							} );
						} );
					} );
				} );
			}
		} );
	} );
});
