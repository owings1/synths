/**
 * Single oscillator and FX chain demo.
 * 
 * References:
 *  - https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Simple_synth
 *  - https://github.com/mdn/webaudio-examples/
 */
import $ from '../../lib/jquery.js'
import * as Widgets from '../../src/widgets.js'
import ScaleSample from '../../src/scale.js'

const context = new AudioContext()
    
const volume = new GainNode(context)
volume.gain.value = 0.5
volume.connect(context.destination)

const scale = new ScaleSample(context)
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
        actions: scale.meta.actions,
        title: 'Scale',
    }).appendTo('#effects')

    $('#mixer').addClass('fx1')
    $('#scale').addClass('fx2')


})
