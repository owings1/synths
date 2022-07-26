/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */

import {
    EffectsNode,
    optsMerge,
    setOrigin,
    symOutpt,
} from './core.js'



/**
 * Basic highpass filter.
 */
export default class Highpass extends EffectsNode {

    /**
     * @param {AudioContext} context
     * @param {object} opts
     * @param {Number} opts.gain
     * @param {Number} opts.cutoff
     * @param {Number} opts.quality
     */
     constructor(context, opts = {}) {
        super(context)
        opts = optsMerge(this.meta.params, opts)
        const bq = new BiquadFilterNode(context)
        bq.type = 'highpass'
        Object.defineProperties(this, {
            cutoff: {value: bq.frequency},
            quality: {value: bq.Q},
        })
        setOrigin(this, bq).connect(this[symOutpt])
        this.update(opts)
    }
}

Highpass.Meta = {
    name: 'Highpass',
    params: {
        gain: {
            type: "float",
            default: 1.0,
            min: 0.0,
            max: 3.0,
            step: 0.01,
        },
        cutoff: {
            type: "integer",
            default: 100,
            min: 40,
            max: 2000,
            step: 1,
            unit: 'Hz',
        },
        quality: {
            type: "integer",
            default: 1,
            min: 0,
            max: 10,
            step: 1,
        },
    },
}

export {Highpass}
