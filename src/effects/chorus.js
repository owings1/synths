/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */
 import {
    EffectsNode,
    optsMerge,
    paramProp,
    setOrigin,
    symOutpt,
} from './core.js'
import '../tone.js'

/**
 * Chorus effect.
 */
export default class Chorus extends EffectsNode {

    /**
     * @param {AudioContext} context
     * @param {object} opts
     */
     constructor(context, opts = {}) {
        super(context)
        Tone.setContext(context)
        opts = optsMerge(this.meta.params, opts)
        const input = new GainNode(context)
        const cn = new Tone.Chorus()
        Object.defineProperties(this, {
            wet: {value: cn.wet},
            frequency: {value: cn.frequency},
            depth: paramProp(
                () => cn.depth,
                value => cn.depth = value
            ),
            delay: paramProp(
                () => cn.delayTime,
                value => cn.delayTime = value
            ),
            spread: paramProp(
                () => cn.spread,
                value => cn.spread = value
            ),
        })
        Tone.connect(setOrigin(this, input), cn)
        cn.connect(this[symOutpt])
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
