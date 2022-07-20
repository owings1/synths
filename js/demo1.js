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

const Ctx = new AudioContext()

// Main volume.
const Main = Ctx.createGain()

// Oscillator.
const Oscillator = Ctx.createOscillator()
Oscillator.frequency.value = Music.stepFreq(440)
// Oscillator dry signal.
Oscillator.dry = Ctx.createGain()
Oscillator.connect(Oscillator.dry)
Oscillator.dry.connect(Main)
// Oscillator FX send
Oscillator.fxsend = Ctx.createGain()
Oscillator.connect(Oscillator.fxsend)

// Distortion
const Distortion = Ctx.createWaveShaper()
Distortion.oversample = '4x'
Distortion.curve = Effects.makeDistortionCurve(400)
Distortion.gain = Ctx.createGain()
Distortion.gain.gain.value = 1.2
Distortion.connect(Distortion.gain)

const Overdrive = new Effects.Overdrive(Ctx)
// Delay
const Delay = Ctx.createDelay()
// Delay feedback
Delay.feedback = Ctx.createGain()
Delay.connect(Delay.feedback)
Delay.feedback.connect(Delay)

// Lowpass Filter
const Lowpass = Ctx.createBiquadFilter({type: 'lowpass'})

// Highpass Filter
const Highpass = Ctx.createBiquadFilter({type: 'highpass'})

// Compressor
const Compressor = Ctx.createDynamicsCompressor()

// Element IDs to parameter.
const ParamValueSetters = {
    'volume': Main.gain,
    'oscillator-dry': Oscillator.dry.gain,
    'oscillator-fxsend': Oscillator.fxsend.gain,
    'oscillator-frequency': Oscillator.frequency,
    'overdrive-gain': Overdrive.gain,
    'overdrive-drive': Overdrive.drive,
    'overdrive-color': Overdrive.color,
    'overdrive-preband': Overdrive.preBand,
    'overdrive-postcut': Overdrive.postCut,
    'delay-time': Delay.delayTime,
    'delay-feedback': Delay.feedback.gain,
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

const GenericGetSet = {
    // 'overdrive-preband': {
    //     get: () => Overdrive.preBand,
    //     set: value => Overdrive.preBand = value,
    // },
}
// Element IDs to node.
const NodeActiveCheckboxes = {
    'distortion-active': Distortion.gain,
    'overdrive-active': Overdrive,
    'delay-active': Delay,
    'lowpass-active': Lowpass,
    'highpass-active': Highpass,
    'compressor-active': Compressor,
}

// FX Chain

const FxIn = Oscillator.fxsend
const FxOut = Main

FxIn.receiver = FxIn
FxOut.receiver = FxOut

const FxChain = [
    Distortion.gain,
    Overdrive,
    Delay,
    Lowpass,
    Highpass,
    Compressor,
]

FxChain.forEach((node, i, arr) => {
 
    node.prev = arr[i - 1] || FxIn
    node.next = arr[i + 1] || FxOut
    node.bypass = node.receiver = Ctx.createGain()
    let active = false
 
    Object.defineProperty(node, 'active', {
        get: () => active,
        set: function(value) {
            value = Boolean(value)
            if (value === active) {
                return
            }
            active = value
            const {prev, next} = this
            // Disconnect
            if (prev) {
                prev.receiver.disconnect(this.receiver)
            }
            if (next) {
                this.receiver.disconnect(next.receiver)
            }
            // Change receiver
            this.receiver = active ? this : this.bypass
            // Reconnect
            if (prev) {
                prev.receiver.connect(this.receiver)
            }
            if (next) {
                this.receiver.connect(next.receiver)
            }
        },
    })
})

// Initialize FX connections.
FxChain.forEach(node => {
    if (node.prev) {
        node.prev.receiver.connect(node.receiver)
    }
    if (node.next) {
        node.receiver.connect(node.next.receiver)
    }
})

$(document).on('click', function(e) {
    const $target = $(e.target)
    const id = $target.attr('id')
    switch (id) {
        case 'start':
            $('#stop').prop('disabled', false)
            Main.connect(Ctx.destination)
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
    // let {set} = GenericGetSet[id]
    // if (set) {
    //     set(value)
    //     updateMeters()
    //     return
    // }
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
            $(`#${id}-meter`).text(value.toFixed(2))
        }
    })
    // Object.entries(GenericGetSet).forEach(([id, {get}]) => {
    //     const value = get()
    //     if (value !== undefined) {
    //         $(`#${id}-meter`).text(value.toFixed(2))
    //     }
    // })
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
    // Object.entries(GenericGetSet).forEach(([id, {set}]) => {
    //     const $el = $(`#${id}`)
    //     if ($el.length) {
    //         set($el.val())
    //     }
    // })
    Object.entries(NodeActiveCheckboxes).forEach(([id, node]) => {
        const $el = $(`#${id}`)
        if ($el.length) {
            node.active = $el.is(':checked')
        }
    })
}
