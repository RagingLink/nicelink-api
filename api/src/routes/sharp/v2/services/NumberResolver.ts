import * as mathjs from 'mathjs';
import { Static, Type } from '@sinclair/typebox';

import API from '../../../../api.js';
import Image from '../Image.js';

// Re-think names maybe?
export const DynamicNumber = Type.Union([Type.Number(), Type.String()], { dynamicNumber: true });
export const OptionalDynamicNumber = Type.Union([Type.Number(), Type.String(), Type.Undefined()]);
export type DynamicNumberType = Static<typeof DynamicNumber>;
export type OptionalDynamicNumberType = Static<typeof OptionalDynamicNumber>;

export default class NumberResolver {
    private evaluate: mathjs.MathJsInstance['evaluate'];

    public constructor(public readonly logger: API['logger']) {
        // Recommended settings
        const math = mathjs.create(mathjs.all);
        math.import({
            // most important (hardly any functional impact)
            'import':     function () { throw new Error('Function import is disabled'); },
            'createUnit': function () { throw new Error('Function createUnit is disabled'); },
            'reviver':    function () { throw new Error('Function reviver is disabled'); },

            // extra (has functional impact)
            //'evaluate':   function () { throw new Error('Function evaluate is disabled'); },
            //'parse':      function () { throw new Error('Function parse is disabled'); },
            'simplify':   function () { throw new Error('Function simplify is disabled'); },
            'derivative': function () { throw new Error('Function derivative is disabled'); },
            'resolve':    function () { throw new Error('Function resolve is disabled'); }
        }, { override: true });
        this.evaluate = math.evaluate;
    }

    public eval(image: Image, input?: OptionalDynamicNumberType): number | undefined;
    public eval(image: Image, ...input: OptionalDynamicNumberType[]): (number | undefined)[];
    public eval(image: Image, ...input: OptionalDynamicNumberType[]): (number | undefined) | (number | undefined)[] {
        if (input.length > 1) {
            return input.map((ele) => this.eval(image, ele));
        }
        if (typeof input[0] === 'number')
            return input[0];
        if (input[0] === '' || input[0] === undefined)
            return;
        const scope = new Scope(image);
        const result = this.evaluate(input[0], scope);
        if (typeof result !== 'number' || isNaN(result))
            return;
        return result;
    };
}

// THis alone could have a ton of potential, for example using width/height of other (parent) images
// I'm just not sure how I want to implement this (and how the information about other images will be exposed)
class Scope extends Map {
    public constructor(public readonly image: Image) {
        super();
    };

    public get(key: string): number {
        if (key === 'width')
            return this.image.width;
        if (key === 'height')
            return this.image.height;
        return NaN;
    }

    public has(key: string): boolean {
        if (['width', 'height'].includes(key))
            return true;
        return false;
    }
}
