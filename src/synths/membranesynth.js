/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */
 import {InstrumentWrapper as Base, paramProp} from '../core.js'
 import Tone from '../../lib/tone.js'
  
 /**
  * MembraneSynth wrapper
  */
export default class MembraneSynth extends Base {

    /**
     * @param {AudioContext} context
     * @param {object} opts
     */
    constructor(context, opts = {}) {
        super(context)
        Tone.setContext(context)
        opts = Base.mergeOpts(this.meta.params, opts)
        this.instrument = new Tone.MembraneSynth()
        Object.defineProperties(this, {
            portamento: paramProp(
                () => this.instrument.portamento,
                value => this.instrument.portamento = value
            ),
        })
        this.instrument.connect(this.output)
        this.update(opts)
    }

}

const tdefs = Tone.MembraneSynth.getDefaults()

MembraneSynth.Meta = {
    name: 'MembraneSynth',
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
    }
}

export {MembraneSynth}
  