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

const osc = new OscillatorNode(context, {frequency: 440})

osc.connect(dry)
osc.connect(fxsend)
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
    $('#oscillator-type')
        .controlgroup()
    $('#oscillator-frequency-meter')
        .addClass('meter')
        .text(osc.frequency.value.toFixed(2))
        .data({param: osc.frequency})

    Object.entries(effects).forEach(([id, node]) => {
        const {params, name} = node.meta
        $(Widgets.nodeWidget(id, node, {params, title: name}))
            .addClass('fxnode inactive')
            .appendTo('#effects')
    })

    $('#mixer').addClass('fx1')
    $('#oscillator').addClass('fx2')
    $('#distortion').addClass('fx3')
    $('#overdrive').addClass('fx4')
    $('#delay').addClass('fx5')
    $('#lowpass').addClass('fx6')
    $('#highpass').addClass('fx6')
    $('#compressor').addClass('fx2')
    $(document).on({click, change})
    $('button').button()
})

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
            $('#stop').button({disabled: false})
        case 'stop':
            osc[id]()
            $target.button({disabled: true})
            return
    }
    const name = $target.attr('name')
    if (!name) {
        return
    }
    const value = $target.val()
    switch (name) {
        case 'oscillator-interval':
            let param = osc.frequency
            param.value = Music.stepFreq(param.value, value) || param.value
            updateMeters()
            break
    }
}

/**
 * Change event handler.
 * 
 * @param {Event} e
 */
function change(e) {
    const $target = $(e.target)
    const node = Activators[$target.attr('id')]
    if (node) {
        const active = $target.is(':checked')
        node.active = active
        $target.closest('.fxnode')
            .toggleClass('active', active)
            .toggleClass('inactive', !active)
        return
    }
    const value = $target.val()
    const {param} = $target.data()
    if (param) {
        param.value = value
        updateMeters()
        return
    }
    const name = $target.attr('name')
    switch (name) {
        case 'oscillator-type':
            osc.type = value
            return
    }
}

/**
 * Update meter text values.
 */
function updateMeters() {
    $('.meter').each(function() {
        const $meter = $(this)
        const {def, param} = $meter.data()
        if (!param) {
            return
        }
        const {type} = def || {}
        const {value} = param
        let text
        switch (type) {  
            case 'integer':
                text = Number(value).toFixed(0)
                break
            case 'float':
            default:
                text = Number(value).toFixed(2)
                break
        }
        $meter.text(text)
    })
}
