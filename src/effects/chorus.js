/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */
import {BaseNode, paramProp} from '../core.js'
import Tone from '../../lib/tone.js'

/**
 * Chorus effect.
 */
export default class Chorus extends BaseNode {

    /**
     * @param {AudioContext} context
     * @param {object} opts
     */
    constructor(context, opts = {}) {
        super(context)
        Tone.setContext(context)
        opts = BaseNode.mergeOpts(this.meta.params, opts)
        const input = new GainNode(context)
        const ch = new Tone.Chorus()
        Object.defineProperties(this, {
            wet: {value: ch.wet},
            frequency: {value: ch.frequency},
            depth: paramProp(
                () => ch.depth,
                value => ch.depth = value
            ),
            delay: paramProp(
                () => ch.delayTime,
                value => ch.delayTime = value
            ),
            spread: paramProp(
                () => ch.spread,
                value => ch.spread = value
            ),
        })
        Tone.connect(BaseNode.setInput(this, input), ch)
        ch.connect(this.output)
        this.update(opts)
    }
}

const tdefs = Tone.Chorus.getDefaults()

Chorus.Meta = {
    name: 'Chorus',
    params: {
        wet: {
            type: 'float',
            default: tdefs.wet,
            min: 0.01,
            max: 1.0,
            step: 0.01,
        },
        frequency: {
            type: 'integer',
            default: tdefs.base,
            min: 1,
            max: 1000,
            step: 1,
        },
        delay: {
            type: 'float',
            default: tdefs.delayTime,
            min: 2.0,
            max: 20.0,
            step: 0.01,
        },
        depth: {
            type: 'float',
            default: tdefs.depth,
            min: 0.01,
            max: 1.0,
            step: 0.01,
        },
        spread: {
            type: "float",
            default: tdefs.spread,
            min: 0.0,
            max: 180.0,
            step: 0.1,
        },
    },
}

export {Chorus}
