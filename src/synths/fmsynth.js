/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */
import {InstrumentWrapper as Base, paramProp} from '../core.js'
import '../../lib/tone.js'

/**
 * FMSynth wrapper
 */
export default class FMSynth extends Base {

    /**
     * @param {AudioContext} context
     * @param {object} opts
     */
    constructor(context, opts = undefined) {
        super(context)
        Tone.setContext(context)
        opts = Base.mergeOpts(this.meta.params, opts)
        this.instrument = new Tone.FMSynth()
        Object.defineProperties(this, {
            portamento: paramProp(
                () => this.instrument.portamento,
                value => this.instrument.portamento = value
            ),
            modulationIndex: paramProp(
                () => this.instrument.modulationIndex,
                value => this.instrument.modulationIndex = value
            )
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

export {FMSynth}


const tdefs = Tone.FMSynth.getDefaults()
 
FMSynth.Meta = {
    name: 'FMSynth',
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
        modulationIndex: {
            type: 'float',
            default: tdefs.modulationIndex,
            min: 1,
            max: 100.0,
            step: 1,
            help: 'The modulation index which essentially the depth or amount of the modulation. It is the ratio of the frequency of the modulating signal (mf) to the amplitude of the modulating signal (ma) -- as in ma/mf.',
        },
    }
}