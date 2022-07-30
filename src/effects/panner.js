/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */
import {BaseNode} from '../core.js'
import Tone from '../../lib/tone.js'

/**
 * Panner effect.
 */
export default class Panner extends BaseNode {

    /**
     * @param {AudioContext} context
     * @param {object} opts
     */
     constructor(context, opts = {}) {
        super(context)
        Tone.setContext(context)
        opts = BaseNode.mergeOpts(this.meta.params, opts)
        const input = new GainNode(context)
        const pn = new Tone.AutoPanner()
        Object.defineProperties(this, {
            frequency: {value: pn.frequency},
            depth: {value: pn.depth},
            wet: {value: pn.wet},
        })
        Tone.connect(BaseNode.setInput(this, input), pn)
        pn.connect(this.output)
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
