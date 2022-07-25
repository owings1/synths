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
        name: 'dry2',
        label: 'Dry 2',
        param: dry2.gain,
    },
    {
        name: 'fxsend1',
        label: 'FX Send 1',
        param: fxsend1.gain,
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

const osc = new OscillatorNode(context, {frequency: 440})
const scale = new Effects.ScaleSample(context)

osc.connect(dry1)
osc.connect(fxsend1)

scale.connect(dry2)
scale.connect(fxsend2)

dry1.connect(dry)
dry2.connect(dry)
fxsend1.connect(fxsend)
fxsend2.connect(fxsend)

dry.connect(main)
fxout.connect(main)
main.connect(context.destination)

const effects = {
    distortion: new Effects.Distortion(context),
    overdrive: new Effects.Overdrive(context),
    delay: new Effects.Delay(context),
    lowpass: new Effects.Lowpass(context),
    highpass: new Effects.Highpass(context),
    compressor: new Effects.Compressor(context),
}

Effects.initChain(fxsend, fxout, Object.values(effects))

// Checkbox IDs to node.
const Activators = Object.fromEntries(
    Object.entries(effects).map(
        ([id, node]) => [[id, 'active'].join('-'), node]
    )
)

$(() => {
    $('#mixer-wrapper')
        .append(Widgets.mixerWidget('mixer', 'Mixer', mixer))
    $('#oscillator-intervals')
        .append(Widgets.intervalButtons('oscillator-interval'))
        .on('click', '[name="oscillator-interval"]', e => {
            const $target = $(e.target)
            const param = osc.frequency
            param.value = Music.stepFreq(param.value, $target.val()) || param.value
            $('#oscillator-frequency-meter').text(param.value.toFixed(2))
        })
    $('#oscillator-type')
        .controlgroup()
        .on('change', e => osc.type = $(e.target).val())
    $('#oscillator-frequency-meter')
        .addClass('meter')
        .text(osc.frequency.value.toFixed(2))

    Widgets.nodeWidget('scale', scale, {
        title: 'Scale Sample',
        params: scale.meta.params
    }).appendTo('#effects')

    $('<button/>').attr({id: 'scale-play'}).text('Play').appendTo('#scale')
    $('<button/>').attr({id: 'scale-stop'}).text('Stop').appendTo('#scale')
    $('#scale-play').on({click: () => scale.play()})
    $('#scale-stop').on({click: () => scale.stop()})

    Object.entries(effects).forEach(([id, node]) => {
        const {params, name} = node.meta
        $(Widgets.nodeWidget(id, node, {params, title: name}))
            .addClass('inactive')
            .appendTo('#effects')
    })

    $('#mixer').addClass('fx1')
    $('#oscillator').addClass('fx2')
    $('#scale').addClass('fx5')
    $('#distortion').addClass('fx3')
    $('#overdrive').addClass('fx4')
    $('#delay').addClass('fx5')
    $('#lowpass').addClass('fx6')
    $('#highpass').addClass('fx6')
    $('#compressor').addClass('fx2')
    $(document).on({click})
    $('button').button()
})

let oscPlaying
let oscStarted
/**
 * Click event handler.
 * 
 * @param {Event} e
 */
function click(e) {
    const $target = $(e.target)
    const id = $target.attr('id')
    switch (id) {
        case 'start':
            if (oscPlaying) {
                break
            }
            oscPlaying = true
            osc.connect(dry1)
            osc.connect(fxsend1)
            if (!oscStarted) {
                osc.start()
                oscStarted = true
            }
            $target.button({disabled: true})
            $('#stop').button({disabled: false})
            break
        case 'stop':
            if (!oscPlaying) {
                break
            }
            oscPlaying = false
            osc.disconnect()
            $target.button({disabled: true})
            $('#start').button({disabled: false})
            return
    }
}
