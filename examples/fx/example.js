/**
 * Single oscillator and FX chain demo.
 * 
 * References:
 *  - https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Simple_synth
 *  - https://github.com/mdn/webaudio-examples/
 */
import $ from '../../lib/jquery.js'
// import Cookie from '../../lib/cookie.js'
import * as Effects from '../../src/effects.js'
import {AMSynth} from '../../src/synths.js'
import ScaleSample from '../../src/scale.js'
import {mixerWidget, nodeWidget, LocalPresets} from '../../src/widgets.js'

const styles = {
    mixer: 'fx1',
    sample: 'fx2',
    amSynth: 'fx6',

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

const context = new AudioContext

const main = new GainNode(context)
const fxsend = new GainNode(context)
const fxout = new GainNode(context)

const sample = new ScaleSample(context)
const amSynth = new AMSynth(context)

const sampleDry = new GainNode(context)
const sampleFx = new GainNode(context)

const amSynthGain = new GainNode(context)
const amSynthDry = new GainNode(context)
const amSynthFx = new GainNode(context)

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
const nodes = {sample, amSynth, ...effects}

sample.connect(amSynth)
sample.connect(sampleDry).connect(main)
sample.connect(sampleFx).connect(fxsend)

amSynth.connect(amSynthGain)
amSynthGain.connect(amSynthDry).connect(main)
amSynthGain.connect(amSynthFx).connect(fxsend)

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
        param: amSynthDry.gain,
    },
    {
        name: 'sampleFx',
        label: 'Sample FX Send',
        param: sampleFx.gain,
    },
    {
        name: 'synthFx',
        label: 'Synth FX Send',
        param: amSynthFx.gain,
    },
    {
        name: 'fxout',
        label: 'FX Out',
        param: fxout.gain,
    },
]

mixer.forEach(({param}) => param.value = 0.5)

$(() => {
    mixerWidget('mixer', 'Mixer', mixer).appendTo('#main')
    nodeWidget('sample', sample).appendTo('#main')
    nodeWidget('amSynth', amSynth).appendTo('#main')
    $.each(effects, (id, node) => {
        nodeWidget(id, node).appendTo('#effects')
    })
    $.each(styles, (id, cls) => $(`#${id}`).addClass(cls))
    const presets = new LocalPresets('fx-example', nodes, mixer, 'mixer')
    $('button.preset.save').on('click', function() {
        presets.save($(this).val())
    })
    $('button.preset.load').on('click', function() {
        presets.load($(this).val())
    })
    $('button.preset.clear').on('click', function() {
        presets.clear($(this).val())
    })
    $('button').button()
})
