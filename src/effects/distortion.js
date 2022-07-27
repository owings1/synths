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
} from './core.js'

/**
 * Basic distortion effect.
 */
export default class Distortion extends EffectsNode {

    /**
     * @param {AudioContext} context
     * @param {object} opts
     * @param {Number} opts.gain
     * @param {Number} opts.drive
     */
    constructor(context, opts = {}) {
        super(context)
        opts = optsMerge(this.meta.params, opts)
        const input = new WaveShaperNode(context)
        input.oversample = '4x'
        const fb = new GainNode(context)
        let drive
        Object.defineProperties(this, {
            drive: paramProp(() => drive, value => {
                drive = Number(value)
                input.curve = makeCurve(drive * 1000)
            }),
            feedback: {value: fb.gain},
        })
        EffectsNode.setInput(this, input)
            .connect(fb)
            .connect(input)
            .connect(this.output)
        this.update(opts)
    }
}

Distortion.Meta = {
    name: "Distortion",
    params: {
        gain: {
            type: "float",
            default: 1.2,
            min: 1.0,
            max: 3.0,
            step: 0.01,
        },
        drive: {
            type: "float",
            default: 0.4,
            min: 0.0,
            max: 1.0,
            step: 0.01,
        },
        feedback: {
            type: "float",
            default: 0.0,
            min: 0.0,
            max: 1.0,
            step: 0.01,
        },
    }
}

export {Distortion}


const DEG = Math.PI / 180

/**
 * Make a distortion curve array
 * 
 * From:
 *  - https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createWaveShaper
 *  - https://stackoverflow.com/a/22313408
 *  - https://alexanderleon.medium.com/web-audio-series-part-2-designing-distortion-using-javascript-and-the-web-audio-api-446301565541
 * 
 * @param {Number} amount
 * @param {integer} samples
 * @return {Float32Array}
 */
export function makeCurve(amount = 50, samples = 512) {
    const k = Number(amount)
    const curve = new Float32Array(samples)
    for (let i = 0; i < samples; i++) {
        const x = i * 2 / samples - 1
        curve[i] = (3 + k) * x * 20 * DEG / (Math.PI + k + Math.abs(x))
    }
    return curve
}