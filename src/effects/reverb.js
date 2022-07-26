/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */
import {
    EffectsNode,
    paramProp,
    optsMerge,
    setOrigin,
    symOutpt,
} from './core.js'

const Samples = {
    1: {
        label: 'Greek 7 Echo Hall',
        url: '../../samples/reverb/Greek 7 Echo Hall.wav',
    },
    2: {
        label: 'Narrow Bumpy Space',
        url: '../../samples/reverb/Narrow Bumpy Space.wav',
    },
}

/**
 * Reverb effect using Convolver from audio sample
 */
export default class Reverb extends EffectsNode {
    /**
     * @param {AudioContext} context
     * @param {object} opts
     * @param {Number} opts.intensity
     */
    constructor(context, opts) {
        super(context)
        opts = optsMerge(this.meta.params, opts)
        const input = new GainNode(context)
        const wet = new GainNode(context)
        const cv = new ConvolverNode(context)
        let sample
        Object.defineProperties(this, {
            intensity: {value: wet.gain},
            sample: paramProp(() => sample, value => {
                value = Number(value)
                if (value !== sample) {
                    let {url} = Samples[value]
                    sample = value
                    loadSample(context, url).then(buf =>{
                        cv.buffer = buf
                    })
                }
            })
        })
        setOrigin(this, input)
            .connect(wet)
            .connect(cv)
            .connect(this[symOutpt])
        input.connect(this[symOutpt]) // dry
        this.update(opts)
    }
}

Reverb.Meta = {
    name: 'Reverb',
    params: {
        intensity: {
            type: "float",
            default: 0.1,
            min: 0.0,
            max: 6.0,
            step: 0.01,
        },
        sample: {
            type: 'enum',
            default: 1,
            values: Object.fromEntries(
                Object.entries(Samples).map(
                    ([key, {label}]) => [key, label]
                )
            )
        }
    },
}
export {Reverb}


const symBuffs = Symbol('buffs')

/**
 * Load audio sample
 * 
 * @param {AudioContext} context
 * @param {String} path
 * @return {Promise<AudioBuffer>}
 */
async function loadSample(context, path) {
    const url = new URL(path, import.meta.url).href
    if (!context[symBuffs]) {
        context[symBuffs] = Object.create(null)
    }
    const buffs = context[symBuffs]
    if (!buffs[url]) {
        const res = await fetch(url)
        const buf = await res.arrayBuffer()
        buffs[url] = await context.decodeAudioData(buf)
    }
    return buffs[url]
}