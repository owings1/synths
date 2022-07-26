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

    compressor: 'fx3',
    wah: 'fx4',
    overdrive: 'fx5',
    tremolo: 'fx6',
    chorus: 'fx7',
    panner: 'fx3',
    phaser: 'fx4',
    reverb: 'fx5',
    delay: 'fx8',
    lowpass: 'fx6',
    highpass: 'fx7',
}

const context = new AudioContext()
Tone.setContext(context)

const sample = new ScaleSample(context)

const main = new GainNode(context)
main.connect(context.destination)

const dry = new GainNode(context)
const fxsend = new GainNode(context)


/*
const instrument = new Tone.AMSynth({
    // The glide time between notes (seconds)
    portamento: 0.02,
    // Harmonicity is the ratio between the two voices. A harmonicity of 1 is no change. Harmonicity = 2 means a change of an octave
    harmonicity: 1,
})
sample.connect(instrument)
instrument.connect(dry).connect(main)
instrument.connect(fxsend)
*/

sample.connect(dry).connect(main)
sample.connect(fxsend)

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

const fxout = new GainNode(context)

Effects.chain(fxsend, fxout, effects).connect(main)

const mixer = [
    {
        name: 'main',
        label: 'Main',
        param: main.gain,
    },
    {
        name: 'dry',
        label: 'Dry',
        param: dry.gain,
    },
    {
        name: 'fxsend',
        label: 'FX Send',
        param: fxsend.gain,
    },
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
    $.each(effects, (id, node) => {
        nodeWidget(id, node).appendTo('#effects')
    })
    $.each(styles, (id, cls) => $(`#${id}`).addClass(cls))
    $('button').button()
})
