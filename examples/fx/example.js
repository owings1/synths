/**
 * Single oscillator and FX chain demo.
 * 
 * References:
 *  - https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Simple_synth
 *  - https://github.com/mdn/webaudio-examples/
 */
import $ from '../../src/jquery.js'
import * as Effects from '../../src/effects.js'
import ScaleSample from '../../src/scale.js'
import {mixerWidget, nodeWidget} from '../../src/widgets.js'
import '../../src/tone.js'

const styles = {
    mixer: 'fx1',
    scale: 'fx2',
    synth: 'fx6',

    compressor: 'fx3',
    wah:        'fx4',
    overdrive:  'fx5',
    tremolo:    'fx6',
    chorus:     'fx7',
    panner:     'fx3',
    phaser:     'fx4',
    reverb:     'fx5',
    delay:      'fx8',
    lowpass:    'fx6',
    highpass:   'fx7',
}

const context = new AudioContext()
Tone.setContext(context)

const main = new GainNode(context)
const fxsend = new GainNode(context)
const fxout = new GainNode(context)

const sample = new ScaleSample(context)
const synth = new Tone.AMSynth()

const sampleDry = new GainNode(context)
const sampleFx = new GainNode(context)

const synthGain = new GainNode(context)
const synthDry = new GainNode(context)
const synthFx = new GainNode(context)

const effects = {
    compressor: new Effects.Compressor(context),
    wah: new Effects.Wah(context),
    overdrive: new Effects.Overdrive(context),
    tremolo: new Effects.Tremolo(context),
    chorus: new Effects.Chorus(context),
    panner: new Effects.Panner(context),
    phaser: new Effects.Phaser(context),
    reverb: new Effects.Reverb(context),
    delay: new Effects.Delay(context),
    lowpass: new Effects.Lowpass(context),
    highpass: new Effects.Highpass(context),
}

sample.connect(synth)
sample.connect(sampleDry).connect(main)
sample.connect(sampleFx).connect(fxsend)

synth.connect(synthGain)
synthGain.connect(synthDry).connect(main)
synthGain.connect(synthFx).connect(fxsend)

Effects.chain(fxsend, fxout, effects).connect(main)

main.connect(context.destination)

const mixer = [
    {
        name: 'main',
        label: 'Main',
        param: main.gain,
    },
    {
        name: 'sampleDry',
        label: 'Sample Dry',
        param: sampleDry.gain,
    },
    {
        name: 'synthDry',
        label: 'Synth Dry',
        param: synthDry.gain,
    },
    {
        name: 'sampleFx',
        label: 'Sample FX Send',
        param: sampleFx.gain,
    },
    {
        name: 'synthFx',
        label: 'Synth FX Send',
        param: synthFx.gain,
    },
    // {
    //     name: 'fxsend',
    //     label: 'FX Send',
    //     param: fxsend.gain,
    // },
    {
        name: 'fxout',
        label: 'FX Out',
        param: fxout.gain,
    },
]


mixer.forEach(({param}) => param.value = 0.5)

$(() => {
    mixerWidget('mixer', 'Mixer', mixer).appendTo('#mixer-wrapper')
    nodeWidget('scale', sample).appendTo('#effects')
    nodeWidget('synth', createSynthNode(synth)).appendTo('#effects')

    $.each(effects, (id, node) => {
        nodeWidget(id, node).appendTo('#effects')
    })
    $.each(styles, (id, cls) => $(`#${id}`).addClass(cls))
    $('button').button()
})

function createSynthNode(synth) {
    const meta = {
        name: synth.name,
        params: {
            portamento: {
                type: 'float',
                default: 0.0,
                min: 0.0,
                max: 0.1,
                step: 0.0001,
                unit: 's',
                help: 'glide time between notes (seconds)'
            },
            harmonicity: {
                type: 'float',
                default: 1.0,
                min: 1.0,
                max: 4.0,
                step: 0.01,
                help: "ratio between the two voices. 1 is no change, 2 is an octave, etc."
            }
        }
    }
    return {
        meta,
        harmonicity: synth.harmonicity,
        portamento: {
            get value() { return synth.portamento },
            set value(value) { synth.portamento = value },
        }
    }
}
