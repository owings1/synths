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
import '../tone.js'

/**
 * Panner effect.
 */
export default class Panner extends EffectsNode {

    /**
     * @param {AudioContext} context
     * @param {object} opts
     */
     constructor(context, opts = {}) {
        super(context)
        Tone.setContext(context)
        opts = optsMerge(this.meta.params, opts)
        const gn = new GainNode(context)
        const pn = new Tone.AutoPanner()
        Object.defineProperties(this, {
            frequency: {value: pn.frequency},
            depth: {value: pn.depth},
            wet: {value: pn.wet},
        })
        Tone.connect(setOrigin(this, gn), pn)
        pn.connect(this[symOutpt])
        pn.start()
        this.update(opts)
    }
}

Panner.Meta = {
    name: 'Panner',
    params: {
        wet: {
            type: 'float',
            default: 0.5,
            min: 0.01,
            max: 1.0,
            step: 0.01,
        },
        frequency: {
            type: 'float',
            default: 2.0,
            min: 0.01,
            max: 16.0,
            step: 0.01,
        },
        depth: {
            type: 'float',
            default: 0.5,
            min: 0.01,
            max: 1.0,
            step: 0.01,
        },
    },
}

export {Panner}
