/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */
import {BaseNode} from '../core.js'
import '../tone.js'

/**
 * Tremolo effect.
 */
export default class Tremolo extends BaseNode {

    /**
     * @param {AudioContext} context
     * @param {object} opts
     */
     constructor(context, opts = {}) {
        super(context)
        Tone.setContext(context)
        opts = BaseNode.mergeOpts(this.meta.params, opts)
        const input = new GainNode(context)
        const tn = new Tone.Tremolo()
        Object.defineProperties(this, {
            frequency: {value: tn.frequency},
            depth: {value: tn.depth},
            wet: {value: tn.wet},
        })
        Tone.connect(BaseNode.setInput(this, input), tn)
        tn.connect(this.output)
        tn.start()
        this.update(opts)
    }
}

Tremolo.Meta = {
    name: 'Tremolo',
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

export {Tremolo}
