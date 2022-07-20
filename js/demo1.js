/**
 * Single oscillator and FX chain demo.
 * 
 * References:
 *  - https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Simple_synth
 *  - https://github.com/mdn/webaudio-examples/
 */
import $ from './jquery.js'
import * as Music from './music.js'
import * as Effects from './effects.js'

const Context = new AudioContext()

// Oscillator.
const Oscillator = new OscillatorNode(Context, {frequency: Music.stepFreq(440)})

// Main volume.
const Main = new GainNode(Context)
// Oscillator dry signal.
const Dry = new GainNode(Context)
// Oscillator FX send
const FxSend = new GainNode(Context)

Oscillator.connect(Dry)
Oscillator.connect(FxSend)
Dry.connect(Main)


const effects = {
    distortion: new Effects.Distortion(Context),
    overdrive: new Effects.Overdrive(Context),
    delay: new Effects.Delay(Context),
    lowpass: new Effects.Lowpass(Context),
    highpass: new Effects.Highpass(Context),
    compressor: new Effects.Compressor(Context),
}

Effects.initChain(FxSend, Main, Object.values(effects))

// Element IDs to node.
const Activators = {}
// Element IDs to parameter.
const Params = {
    'volume': Main.gain,
    'oscillator-dry': Dry.gain,
    'oscillator-fxsend': FxSend.gain,
    'oscillator-frequency': Oscillator.frequency,
}
Object.entries(effects).forEach(([effect, node]) => {
    const id = [effect, 'active'].join('-')
    Activators[id] = node
    Object.keys(node.meta.params).forEach(key => {
        const id = [effect, key].join('-')
        const param = node[key]
        Params[id] = param
    })
})

$(document).on('click', function(e) {
    const $target = $(e.target)
    const id = $target.attr('id')
    switch (id) {
        case 'start':
            $('#stop').prop('disabled', false)
            Main.connect(Context.destination)
        case 'stop':
            Oscillator[id]()
            $target.prop('disabled', true)
            return
    }
    let name = $target.attr('name')
    let value = $target.val()
    if (!name) {
        return
    }
    switch (name) {
        case 'oscillator-interval':
            let param = Oscillator.frequency
            param.value = Music.stepFreq(param.value, value) || param.value
            updateMeters()
            break
    }
}).on('change', function(e) {
    const $target = $(e.target)
    const id = $target.attr('id')
    let node = Activators[id]
    if (node) {
        node.active = $target.is(':checked')
        return
    }
    let value = $target.val()
    let param = Params[id]
    if (param) {
        param.value = value
        updateMeters()
        return
    }
    let name = $target.attr('name')
    switch (name) {
        case 'oscillator-type':
            Oscillator.type = value
            return
    }
})

// Initial state.
$(() => {
    $('#oscillator-type').controlgroup()
    readParams()
    updateMeters()
})
 
/**
 * Update meter text values.
 */
function updateMeters() {
    Object.entries(Params).forEach(([id, param]) => {
        const {value} = param
        if (value !== undefined) {
            const $el = $(`#${id}-meter`)
            if ($el.length) {
                $el.text(value.toFixed(2))
            }
        }
    })
}

/**
 * Read param setters from elements.
 */
function readParams() {
    Object.entries(Params).forEach(([id, param]) => {
        const $el = $(`#${id}`)
        if ($el.length) {
            param.value = $el.val()
        }
    })
    Object.entries(Activators).forEach(([id, node]) => {
        const $el = $(`#${id}`)
        if ($el.length) {
            node.active = $el.is(':checked')
        }
    })
}
