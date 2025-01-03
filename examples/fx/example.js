/**
 * Single oscillator and FX chain demo.
 * 
 * References:
 *  - https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Simple_synth
 *  - https://github.com/mdn/webaudio-examples/
 */
import $ from '../../lib/jquery.js'
import * as Effects from '../../src/effects.js'
import {AMSynth, FMSynth} from '../../src/synths.js'
import Sampler from '../../src/sampler.js'
import {VexSampleScore} from '../../src/score.js'
import {mixerWidget, nodeWidget, LocalPresets} from '../../src/widgets.js'

const styles = {
    mixer: 'fx1',
    sample: 'fx2',
    amSynth: 'fx7',
    fmSynth: 'fx5',

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

const sampler = new Sampler(context)
const samplerDry = new GainNode(context)
const samplerFx = new GainNode(context)

const amSynth = new AMSynth(context)
const amSynthDry = new GainNode(context)
const amSynthFx = new GainNode(context)

const fmSynth = new FMSynth(context)
const fmSynthDry = new GainNode(context)
const fmSynthFx = new GainNode(context)

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

sampler.connect(amSynth)
sampler.connect(fmSynth)
sampler.connect(samplerDry).connect(main)
sampler.connect(samplerFx).connect(fxsend)

amSynth.connect(amSynthDry).connect(main)
amSynth.connect(amSynthFx).connect(fxsend)

fmSynth.connect(fmSynthDry).connect(main)
fmSynth.connect(fmSynthFx).connect(fxsend)

Effects.chain(fxsend, fxout, effects).connect(main)

main.connect(context.destination)

const mixer = [
    {
        name: 'main',
        label: 'Main',
        param: main.gain,
        default: 0.5,
    },
    {
        name: 'sampleDry',
        label: 'Sample Dry',
        param: samplerDry.gain,
        default: 0.5,
    },
    {
        name: 'amSynthDry',
        label: 'AMSynth Dry',
        param: amSynthDry.gain,
        default: 0.02,
    },
    {
        name: 'fmSynthDry',
        label: 'FMSynth Dry',
        param: fmSynthDry.gain,
        default: 0.02,
    },
    {
        name: 'sampleFx',
        label: 'Sample FX Send',
        param: samplerFx.gain,
        default: 0.5,
    },
    {
        name: 'amSynthFx',
        label: 'AMSynth FX Send',
        param: amSynthFx.gain,
        default: 0.02,
    },
    {
        name: 'fmSynthFx',
        label: 'FMSynth FX Send',
        param: fmSynthFx.gain,
        default: 0.02,
    },
    {
        name: 'fxout',
        label: 'FX Out',
        param: fxout.gain,
        default: 0.5,
    },
]

mixer.forEach(slot => slot.param.value = slot.default)

const mixerId = 'mixer'
const nodes = {sample: sampler, amSynth, fmSynth, ...effects}
const presets = new LocalPresets('fx-example', nodes, mixer, mixerId)

let autoSaveId
let drawId

function autoSave() {
    clearTimeout(autoSaveId)
    autoSaveId = setTimeout(() => presets.save('autoSave'), 500)
}
sampler.onschedule = (sample, time) => {
    clearTimeout(drawId)
    drawId = setTimeout(
        () => new VexSampleScore(sample).render($('#score').empty()),
        (time - context.currentTime) * 1000
    )
}

$(() => {
    $('#main').append(
        mixerWidget(mixerId, 'Mixer', mixer),
        nodeWidget('sample', sampler),
        $('<div/>').attr({id: 'score'}),
        nodeWidget('amSynth', amSynth),
        nodeWidget('fmSynth', fmSynth),
    )

    $.each(effects, (id, node) => nodeWidget(id, node).appendTo('#effects'))
    $.each(styles, (id, cls) => $(`#${id}`).addClass(cls))
    presets.widget().appendTo('#presets')
    if (presets.has('autoSave')) {
        presets.load('autoSave')
    }

    $('#main, #effects').on('change', autoSave)
    $('#presets').on('click', 'button.load', autoSave)
})
