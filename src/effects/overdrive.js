/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 * 
 * `Overdrive` class adapted from code by Nick Thompson
 */
import {
    EffectsNode,
    makeDistortionCurve,
    optsMerge,
    paramProp,
    setOrigin,
} from './core.js'

const SAMPLES = 22050
/**
 * Overdrive effect.
 * 
 * @see https://github.com/web-audio-components/overdrive
 * 
 * Copyright (c) 2012 Nick Thompson
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * -----
 * Adapted to class.
 */
export default class Overdrive extends EffectsNode {

    /**
     * @param {AudioContext} context
     * @param {object} opts
     * @param {Number} opts.gain
     * @param {Number} opts.drive
     * @param {Number} opts.color
     * @param {Number} opts.wet
     * @param {Number} opts.postCut
     */
    constructor(context, opts = {}) {
        super(context)
        opts = optsMerge(this.meta.params, opts)
        const input = new BiquadFilterNode(context)
        const ws = new WaveShaperNode(context)
        const lp = new BiquadFilterNode(context)
        const fb = new GainNode(context)
        let drive
        Object.defineProperties(this, {
            color: {value: input.frequency},
            drive: paramProp(() => drive, value => {
                drive = Number(value)
                ws.curve = makeDistortionCurve(value * 100, SAMPLES)
            }),
            feedback: {value: fb.gain},
            postCut: {value: lp.frequency},
        })
        setOrigin(this, input)
            .connect(ws)
            .connect(lp)
            .connect(this.output)
        lp.connect(fb).connect(input) // feedback
        this.update(opts)
    }
}

Overdrive.Meta = {
    name: "Overdrive",
    params: {
        gain: {
            type: "float",
            default: 2.0,
            min: 1.0,
            max: 3.0,
            step: 0.01,
        },
        drive: {
            type: "float",
            default: 0.5,
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
        color: {
            type: "integer",
            default: 800,
            min: 0,
            max: 22050,
            step: 1,
        },
        postCut: {
            label: "post-cut",
            type: "integer",
            default: 3000,
            min: 0,
            max: 22050,
            step: 1,
            unit: 'Hz',
        },
    },
}

export {Overdrive}
