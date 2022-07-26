/**
 * Single oscillator and FX chain demo.
 * 
 * References:
 *  - https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Simple_synth
 *  - https://github.com/mdn/webaudio-examples/
 */
import $ from '../../src/jquery.js'
import * as Music from '../../src/music.js'
import * as Effects from '../../src/effects.js'
import * as Widgets from '../../src/widgets.js'

const styles = {
    mixer: 'fx1',
    oscillator: 'fx2',
    scale: 'fx5',
    tremolo: 'fx7',
    reverb: 'fx4',
    freeverb: 'fx1',
    distortion: 'fx3',
    overdrive: 'fx7',
    panner: 'fx1',
    delay: 'fx8',
    lowpass: 'fx6',
    highpass: 'fx6',
    compressor: 'fx2',
}

const context = new AudioContext()
    
const main = new GainNode(context)
const dry = new GainNode(context)
const fxsend = new GainNode(context)
const fxout = new GainNode(context)

const dry1 = new GainNode(context)
const dry2 = new GainNode(context)
const fxsend1 = new GainNode(context)
const fxsend2 = new GainNode(context)

const mixer = [
    {
        name: 'main',
        label: 'Main',
        param: main.gain,
    },
    {
        name: 'dry1',
        label: 'Dry 1',
        param: dry1.gain,
    },
    {
        name: 'fxsend1',
        label: 'FX Send 1',
        param: fxsend1.gain,
    },
    {
        name: 'dry2',
        label: 'Dry 2',
        param: dry2.gain,
    },
    {
        name: 'fxsend2',
        label: 'FX Send 2',
        param: fxsend2.gain,
    },
    {
        name: 'fxout',
        label: 'FX Out',
        param: fxout.gain,
    },
]
mixer.forEach(({param}) => param.value = 0.5)

const osc = new OscillatorNode(context, {frequency: 440})
const scale = new Effects.ScaleSample(context)

scale
    .connect(dry2)
    .connect(dry)
    .connect(main)
    .connect(context.destination)
scale
    .connect(fxsend2)
    .connect(fxsend)

dry1.connect(dry)
fxsend1.connect(fxsend)
fxout.connect(main)

let oscPlaying
let oscStarted

function oscPlay() {
    if (oscPlaying) {
        return
    }
    oscPlaying = true
    osc.connect(dry1)
    osc.connect(fxsend1)
    if (!oscStarted) {
        osc.start()
        oscStarted = true
    }
}

function oscStop() {
    if (!oscPlaying) {
        return
    }
    oscPlaying = false
    osc.disconnect()
}

const effects = {
    tremolo: new Effects.Tremolo(context),
    distortion: new Effects.Distortion(context),
    overdrive: new Effects.Overdrive(context),
    reverb: new Effects.Reverb(context),
    // freeverb: new Effects.Freeverb(context),
    panner: new Effects.Panner(context),
    delay: new Effects.Delay(context),
    lowpass: new Effects.Lowpass(context),
    highpass: new Effects.Highpass(context),
    compressor: new Effects.Compressor(context),
}

Effects.initChain(fxsend, fxout, Object.values(effects))

$(() => {

    $('#mixer-wrapper')
        .append(Widgets.mixerWidget('mixer', 'Mixer', mixer))

    oscillatorWidget('oscillator', osc)

    Widgets.nodeWidget('scale', scale).appendTo('#effects')
    $.each(effects, (id, node) => {
        Widgets.nodeWidget(id, node).appendTo('#effects')
    })
    $.each(styles, (id, cls) => $(`#${id}`).addClass(cls))
    $('button').button()
})

/**
 * @param {String} id
 * @param {OscillatorNode} node
 */
function oscillatorWidget(id, node) {
    $(`#${id}-intervals`)
        .append(Widgets.intervalButtons(`${id}-interval`))
        .on('click', `[name="${id}-interval"]`, e => {
            const $target = $(e.target)
            const param = node.frequency
            param.value = Music.stepFreq(param.value, $target.val())
            $(`#${id}-frequency-meter`).text(param.value.toFixed(2))
        })
    $(`#${id}-type`)
        .controlgroup()
        .on('change', e => node.type = $(e.target).val())
    $(`#${id}-frequency-meter`)
        .addClass('meter')
        .text(node.frequency.value.toFixed(2))
    $(`#${id}-play`).on('click', function () {
        if (oscPlaying) {
            return
        }
        oscPlay()
        $(this).button({disabled: true})
        $(`#${id}-stop`).button({disabled: false})
    })
    $(`#${id}-stop`).on('click', function () {
        if (!oscPlaying) {
            return
        }
        oscStop()
        $(this).button({disabled: true})
        $(`#${id}-play`).button({disabled: false})
    })
}