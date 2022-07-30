/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */
import {InstrumentWrapper as Base, paramProp} from '../core.js'
import Tone from '../../lib/tone.js'
 
/**
 * AMSynth wrapper
 */
export default class AMSynth extends Base {
 
    /**
     * @param {AudioContext} context
     * @param {object} opts
     */
    constructor(context, opts = {}) {
        super(context)
        Tone.setContext(context)
        opts = Base.mergeOpts(this.meta.params, opts)
        this.instrument = new Tone.AMSynth()
        Object.defineProperties(this, {
            portamento: paramProp(
                () => this.instrument.portamento,
                value => this.instrument.portamento = value
            ),
        })
        this.instrument.connect(this.output)
        this.update(opts)
    }

    get detune() {
        return this.instrument.detune
    }

    get harmonicity() {
        return this.instrument.harmonicity
    }
}

const tdefs = Tone.AMSynth.getDefaults()
 
AMSynth.Meta = {
    name: 'AMSynth',
    params: {
        portamento: {
            type: 'float',
            default: tdefs.portamento,
            min: 0.0,
            max: 0.1,
            step: 0.0001,
            unit: 's',
            help: 'glide time between notes (seconds)'
        },
        harmonicity: {
            type: 'float',
            default: tdefs.harmonicity,
            min: 1.0,
            max: 4.0,
            step: 0.01,
            help: "ratio between the two voices. 1 is no change, 2 is an octave, etc."
        },
    }
}

export {AMSynth}
 