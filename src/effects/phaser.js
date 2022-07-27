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
} from './core.js'
import '../tone.js'

/**
 * Phaser effect.
 */
export default class Phaser extends EffectsNode {

    /**
     * @param {AudioContext} context
     * @param {object} opts
     */
     constructor(context, opts = {}) {
        super(context)
        Tone.setContext(context)
        opts = optsMerge(this.meta.params, opts)
        const input = new GainNode(context)
        const ph = new Tone.Phaser()
        Object.defineProperties(this, {
            frequency: {value: ph.frequency},
            wet: {value: ph.wet},
            quality: {value: ph.Q},
            base: paramProp(
                () => ph.baseFrequency,
                value => ph.baseFrequency = value
            ),
            octaves: paramProp(
                () => ph.octaves,
                value => ph.octaves = value
            ),
            stages: paramProp(
                () => ph.stages,
                value => ph.stages = value
            ),
        })
        Tone.connect(setOrigin(this, input), ph)
        ph.connect(this.output)
        this.update(opts)
    }
}

const tdefs = Tone.Phaser.getDefaults()

Phaser.Meta = {
    name: 'Phaser',
    params: {
        wet: {
            type: 'float',
            default: tdefs.wet,
            min: 0.01,
            max: 1.0,
            step: 0.01,
        },
        base: {
            type: 'integer',
            default: tdefs.base,
            min: 1,
            max: 1000,
            step: 1,
        },
        frequency: {
            type: 'float',
            default: tdefs.frequency,
            min: 0.01,
            max: 16.0,
            step: 0.01,
        },
        octaves: {
            type: 'integer',
            default: tdefs.octaves,
            min: 1,
            max: 5,
            step: 1,
        },
        stages: {
            type: "integer",
            default: tdefs.stages,
            min: 0,
            max: 10,
            step: 1,
        },
        quality: {
            type: "integer",
            default: tdefs.Q,
            min: 0,
            max: 10,
            step: 1,
        },
    },
}

export {Phaser}
