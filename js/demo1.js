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

const Distortion = new Effects.Distortion(Context)
const Overdrive = new Effects.Overdrive(Context)
const Delay = new Effects.Delay(Context)
const Lowpass = new Effects.Lowpass(Context)
const Highpass = new Effects.Highpass(Context)
const Compressor = new Effects.Compressor(Context)

// FX Chain
Effects.initChain(FxSend, Main, [
    Distortion,
    Overdrive,
    Delay,
    Lowpass,
    Highpass,
    Compressor,
])

// Element IDs to parameter.
const ParamValueSetters = {
    'volume': Main.gain,
    'oscillator-dry': Dry.gain,
    'oscillator-fxsend': FxSend.gain,
    'oscillator-frequency': Oscillator.frequency,
    'overdrive-gain': Overdrive.gain,
    'overdrive-drive': Overdrive.drive,
    'overdrive-color': Overdrive.color,
    'overdrive-preband': Overdrive.preBand,
    'overdrive-postcut': Overdrive.postCut,
    'delay-gain': Delay.gain,
    'delay-time': Delay.delayTime,
    'delay-feedback': Delay.feedback,
    'lowpass-frequency': Lowpass.frequency,
    'lowpass-quality': Lowpass.Q,
    'highpass-frequency': Highpass.frequency,
    'highpass-quality': Highpass.Q,
    'compressor-threshold': Compressor.threshold,
    'compressor-knee': Compressor.knee,
    'compressor-ratio': Compressor.ratio,
    'compressor-attack': Compressor.attack,
    'compressor-release': Compressor.release,
}

// Element IDs to node.
const NodeActiveCheckboxes = {
    'distortion-active': Distortion,
    'overdrive-active': Overdrive,
    'delay-active': Delay,
    'lowpass-active': Lowpass,
    'highpass-active': Highpass,
    'compressor-active': Compressor,
}

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
    let node = NodeActiveCheckboxes[id]
    if (node) {
        node.active = $target.is(':checked')
        return
    }
    let value = $target.val()
    let param = ParamValueSetters[id]
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
    Object.entries(ParamValueSetters).forEach(([id, param]) => {
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
    Object.entries(ParamValueSetters).forEach(([id, param]) => {
        const $el = $(`#${id}`)
        if ($el.length) {
            param.value = $el.val()
        }
    })
    Object.entries(NodeActiveCheckboxes).forEach(([id, node]) => {
        const $el = $(`#${id}`)
        if ($el.length) {
            node.active = $el.is(':checked')
        }
    })
}
