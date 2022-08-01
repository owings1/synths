/**
 * Single oscillator and FX chain demo.
 * 
 * References:
 *  - https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Simple_synth
 *  - https://github.com/mdn/webaudio-examples/
 */
import $ from '../../lib/jquery.js'
import * as Music from '../../src/music.js'
import Delay from '../../src/effects/delay.js'
import Lowpass from '../../src/effects/lowpass.js'
import {mixerWidget, intervalButtons} from '../../src/widgets.js'

const styles = {
    mixer: 'fx1',
    oscillator: 'fx2',
}

const context = new AudioContext()
    
const main = new GainNode(context)
main.connect(context.destination)

const mixer = [
    {
        name: 'main',
        label: 'Main',
        param: main.gain,
    },
]
mixer.forEach(({param}) => param.value = 0.5)

const osc = new OscillatorNode(context, {frequency: 440})
const delay = new Delay(context, {gain: 1.25, delayTime: 0.03, feedback: 0.28})
const lowpass = new Lowpass(context, {cutoff: 375})

osc.connect(delay).connect(lowpass)

//const source = osc
const source = lowpass
 
let oscPlaying
let oscStarted

function oscPlay() {
    if (oscPlaying) {
        return
    }
    oscPlaying = true
    source.connect(main)
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
    source.disconnect()
}


$(() => {

    $('button').button()
    $('#mixer-wrapper').append(mixerWidget('mixer', 'Mixer', mixer))

    oscillatorWidget('oscillator', osc)

    $.each(styles, (id, cls) => $(`#${id}`).addClass(cls))

})
 
 /**
  * @param {String} id
  * @param {OscillatorNode} node
  */
function oscillatorWidget(id, node) {
    const {frequency} = node
    const $noteLabel = $(`#${id}-note-label`)
        .text(Music.freqNote(frequency.value).label)
    $(`#${id}-intervals`)
        .append(intervalButtons(`${id}-interval`))
        .on('click', `[name="${id}-interval"]`, e => {
            const $target = $(e.target)
            const freq = Music.stepFreq(frequency.value, $target.val())
            frequency.value = freq
            $meter.text(freq.toFixed(2))
            $noteLabel.text(Music.freqNote(freq).label)
        })
    $(`#${id}-type`)
        .controlgroup()
        .on('change', e => node.type = $(e.target).val())
    const $meter = $(`#${id}-frequency-meter`)
        .addClass('meter')
        .text(node.frequency.value.toFixed(2))
    const $play = $(`#${id}-play`).on('click', () => {
        if (oscPlaying) {
            return
        }
        oscPlay()
        $play.button({disabled: true})
        $stop.button({disabled: false})
    })
    const $stop = $(`#${id}-stop`).on('click', () => {
        if (!oscPlaying) {
            return
        }
        oscStop()
        $stop.button({disabled: true})
        $play.button({disabled: false})
    })
}