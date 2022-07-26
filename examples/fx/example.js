/**
 * Single oscillator and FX chain demo.
 * 
 * References:
 *  - https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Simple_synth
 *  - https://github.com/mdn/webaudio-examples/
 */
import $ from '../../src/jquery.js'
import * as Effects from '../../src/effects.js'
import {mixerWidget, nodeWidget} from '../../src/widgets.js'

const styles = {
    mixer: 'fx1',
    scale: 'fx2',
    overdrive: 'fx7',
    tremolo: 'fx5',
    reverb: 'fx4',
    panner: 'fx1',
    phaser: 'fx3',
    compressor: 'fx2',
    delay: 'fx8',
    lowpass: 'fx6',
    highpass: 'fx3',
}

const context = new AudioContext()
const main = new GainNode(context)
main.connect(context.destination)

const source = new Effects.ScaleSample(context)
const dry = new GainNode(context)
const fxsend = new GainNode(context)
source.connect(dry).connect(main)
source.connect(fxsend)

const effects = {
    overdrive: new Effects.Overdrive(context),
    tremolo: new Effects.Tremolo(context),
    reverb: new Effects.Reverb(context),
    panner: new Effects.Panner(context),
    phaser: new Effects.Phaser(context),
    compressor: new Effects.Compressor(context),
    delay: new Effects.Delay(context),
    lowpass: new Effects.Lowpass(context),
    highpass: new Effects.Highpass(context),
}

const fxout = new GainNode(context)
fxout.connect(main)

Effects.chain(fxsend, fxout, Object.values(effects))

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
    nodeWidget('scale', source).appendTo('#effects')
    $.each(effects, (id, node) => {
        nodeWidget(id, node).appendTo('#effects')
    })
    $.each(styles, (id, cls) => $(`#${id}`).addClass(cls))
    $('button').button()
})
