/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */
import {
    EffectsNode,
    makeDistortionCurve,
    optsMerge,
    paramProp,
    setOrigin,
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
                input.curve = makeDistortionCurve(drive * 1000)
            }),
            feedback: {value: fb.gain},
        })
        setOrigin(this, input)
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