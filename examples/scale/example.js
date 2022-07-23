/**
 * Single oscillator and FX chain demo.
 * 
 * References:
 *  - https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Simple_synth
 *  - https://github.com/mdn/webaudio-examples/
 */
import $ from '../../src/jquery.js'
import * as Widgets from '../../src/widgets.js'
import * as Effects from '../../src/effects.js'

const context = new AudioContext()
    
const volume = new GainNode(context)
volume.gain.value = 0.5
volume.connect(context.destination)

const scale = new Effects.ScaleSample(context)
scale.connect(volume)
$(() => {
    $('#mixer-wrapper')
        .append(Widgets.mixerWidget('mixer', null, [
            {
                name: 'volume',
                label: 'Volume',
                param: volume.gain,
            },
        ]))

    Widgets.nodeWidget('scale', scale, {
        params: scale.meta.params,
        title: 'Scale',
    }).appendTo('#effects')

    $('<button/>').attr({id: 'scale-stop'}).text('Stop').appendTo('#scale')
    $('<button/>').attr({id: 'scale-play'}).text('Play').appendTo('#scale')
    $('#scale-play').on({click: () => scale.play()})
    $('#scale-stop').on({click: () => scale.stop()})

    $('#mixer').addClass('fx1')
    $('#scale').addClass('fx2')

    $('button').button()

})
