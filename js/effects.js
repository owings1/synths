
/**
 * Overdrive effect module for the Web Audio API.
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
export class Overdrive extends GainNode {

    /**
     * @param {AudioContext} context
     * @param {object} opts
     * @param {number} opts.preBand
     * @param {number} opts.color
     * @param {number} opts.drive
     * @param {number} opts.postCut
     */
    constructor(ctx, opts) {
        super(ctx)
        this.output = ctx.createGain()
      
        // Internal AudioNodes
        this._bandpass = ctx.createBiquadFilter()
        this._bpWet = ctx.createGain()
        this._bpDry = ctx.createGain()
        this._ws = ctx.createWaveShaper()
        this._lowpass = ctx.createBiquadFilter()
      
        // AudioNode graph routing
        super.connect(this._bandpass) // input node
        this._bandpass.connect(this._bpWet)
        this._bandpass.connect(this._bpDry)
        this._bpWet.connect(this._ws)
        this._bpDry.connect(this._ws)
        this._ws.connect(this._lowpass)
        this._lowpass.connect(this.output)
      

        const that = this
        this.color = {
            get value() { return that._bandpass.frequency.value },
            set value(value) {
                // that._bandpass.frequency.value = value
                that._bandpass.frequency.setValueAtTime(value, 0)
            },
        }
        this.preBand = {
            get value() { return that._bpWet.gain.value },
            set value(value) {
                value = Number(value)
                that._bpWet.gain.setValueAtTime(value, 0)
                that._bpDry.gain.setValueAtTime(1 - value, 0)
            }
        }
        this.drive = {
            get value() { return that._drive },
            set value(value) {
                value = Number(value)
                that._drive = value
                that._ws.curve = makeDistortionCurve(value * 100, 22050)
            }
        }
        this.postCut = {
            get value() { return that._lowpass.frequency.value },
            set value(value) {
                that._lowpass.frequency.setValueAtTime(value, 0)
            }
        }
        // Defaults
        opts = opts || {}
        Object.entries(this.meta.params).forEach(([name, param]) => {
            opts[name] = opts[name] || param.defaultValue
        })
        this.gain.value = opts.gain
        this._bandpass.frequency.value = opts.color
        this._bpWet.gain.value = opts.preBand
        this._lowpass.frequency.value = opts.postCut
      
        // Inverted preBand value
        this._bpDry.gain.value = 1 - opts.preBand
        this.drive.value = opts.drive
    }

    /**
     * AudioNode prototype `connect` method.
     * 
     * @param {AudioNode} dest
     */
    connect(dest) {
        return this.output.connect(dest.input ? dest.input : dest)
    }

    /**
     * AudioNode prototype `disconnect` method.
     */
    disconnect() {
        this.output.disconnect()
    }

    get meta() {
        return Overdrive.Meta
    }

    // /** @type {float} */
    // get preBand() {
    //     return this._bpWet.gain.value
    // }

    // set preBand(value) {
    //     value = Number(value)
    //     this._bpWet.gain.setValueAtTime(value, 0)
    //     this._bpDry.gain.setValueAtTime(1 - value, 0)
    // }

    // /** @type {float} */
    // get color() {
    //     return this._bandpass.frequency.value
    // }

    // set color(value) {
    //     this._bandpass.frequency.setValueAtTime(value, 0)
    // }

    // /** @type {float} */
    // get drive() {
    //     return this._drive
    // }

    // set drive(value) {
    //     value = Number(value)
    //     this._drive = value
    //     this._ws.curve = makeDistortionCurve(value * 100, 22050)
    // }

    // /** @type {float} */
    // get postCut() {
    //     return this._lowpass.frequency.value
    // }

    // set postCut(value) {
    //     this._lowpass.frequency.setValueAtTime(value, 0)
    // }
}

Overdrive.Meta = {
    name: "Overdrive",
    params: {
        preBand: {
            min: 0,
            max: 1.0,
            defaultValue: 0.5,
            type: "float",
        },
        color: {
            min: 0,
            max: 22050,
            defaultValue: 800,
            type: "float",
        },
        drive: {
            min: 0.0,
            max: 1.0,
            defaultValue: 0.5,
            type: "float",
        },
        postCut: {
            min: 0,
            max: 22050,
            defaultValue: 3000,
            type: "float",
        },
        gain: {
            min: 1.0,
            max: 3.0,
            defaultValue: 2.0,
            type: "float",
        }
    },
}

const DEG = Math.PI / 180

export function makeDistortionCurve(amount = 50, n = 44100) {
    const k = Number(amount)
    const curve = new Float32Array(n)
    for (let i = 0; i < n; i++) {
        const x = i * 2 / n - 1
        curve[i] = (3 + k) * x * 20 * DEG / (Math.PI + k + Math.abs(x))
    }
    return curve
}