/**
 * Single oscillator and FX chain demo.
 * 
 * References:
 *  - https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Simple_synth
 *  - https://github.com/mdn/webaudio-examples/
 */
import $ from '../../lib/jquery.js'
import '../../lib/tone.js'
import Cookie from '../../lib/cookie.js'
import {BaseNode} from '../../src/core.js'
import * as Effects from '../../src/effects.js'
import ScaleSample from '../../src/scale.js'
import {mixerWidget, nodeWidget} from '../../src/widgets.js'

const cookieId = 'settings'
const mixerId = 'mixer'
const sampleId = 'sample'
const amSynthId = 'amSynth'

const styles = {
    mixer: 'fx1',
    sample: 'fx2',
    amSynth: 'fx6',

    compressor: 'fx3',
    wah:        'fx4',
    overdrive:  'fx5',
    tremolo:    'fx6',
    chorus:     'fx7',
    panner:     'fx3',
    phaser:     'fx4',
    reverb:     'fx5',
    delay:      'fx8',
    lowpass:    'fx6',
    highpass:   'fx7',
}

const context = new AudioContext()
Tone.setContext(context)

const main = new GainNode(context)
const fxsend = new GainNode(context)
const fxout = new GainNode(context)

const sample = new ScaleSample(context)
const amSynth = new Tone.AMSynth()
const amSynthNode = createAmSynthNode(amSynth)

const sampleDry = new GainNode(context)
const sampleFx = new GainNode(context)

const synthGain = new GainNode(context)
const synthDry = new GainNode(context)
const synthFx = new GainNode(context)

const effects = {
    compressor: new Effects.Compressor(context),
    wah: new Effects.Wah(context),
    overdrive: new Effects.Overdrive(context),
    tremolo: new Effects.Tremolo(context),
    chorus: new Effects.Chorus(context),
    panner: new Effects.Panner(context),
    phaser: new Effects.Phaser(context),
    reverb: new Effects.Reverb(context),
    delay: new Effects.Delay(context),
    lowpass: new Effects.Lowpass(context),
    highpass: new Effects.Highpass(context),
}

sample.connect(amSynth)
sample.connect(sampleDry).connect(main)
sample.connect(sampleFx).connect(fxsend)

amSynth.connect(synthGain)
synthGain.connect(synthDry).connect(main)
synthGain.connect(synthFx).connect(fxsend)

Effects.chain(fxsend, fxout, effects).connect(main)

main.connect(context.destination)

const mixer = [
    {
        name: 'main',
        label: 'Main',
        param: main.gain,
    },
    {
        name: 'sampleDry',
        label: 'Sample Dry',
        param: sampleDry.gain,
    },
    {
        name: 'synthDry',
        label: 'Synth Dry',
        param: synthDry.gain,
    },
    {
        name: 'sampleFx',
        label: 'Sample FX Send',
        param: sampleFx.gain,
    },
    {
        name: 'synthFx',
        label: 'Synth FX Send',
        param: synthFx.gain,
    },
    {
        name: 'fxout',
        label: 'FX Out',
        param: fxout.gain,
    },
]

mixer.forEach(({param}) => param.value = 0.5)

$(() => {
    mixerWidget(mixerId, 'Mixer', mixer).appendTo('#main')
    nodeWidget(sampleId, sample).appendTo('#main')
    nodeWidget(amSynthId, amSynthNode).appendTo('#main')
    $.each(effects, (id, node) => {
        nodeWidget(id, node).appendTo('#effects')
    })
    $.each(styles, (id, cls) => $(`#${id}`).addClass(cls))
    $('#save').on('click', saveSettings)
    $('#load').on('click', loadSettings)
    $('button').button()
})


function saveSettings() {
    const nodes = {...effects}
    nodes[sampleId] = sample
    nodes[amSynthId] = amSynthNode
    Cookie.set(cookieId, JSON.stringify({
        mixer: Object.fromEntries(
            mixer.map(({name, param}) => [name, param.value])
        ),
        nodes: Object.fromEntries(
            Object.entries(nodes).map(([id, node]) =>
                [id, {active: node.active, params: node.paramValues()}]
            )
        )
    }))
}

function loadSettings() {
    const json = Cookie.get(cookieId)
    if (!json) {
        return
    }
    const settings = JSON.parse(json)
    $.each(settings.mixer, (name, value) => {
        $(`#${mixerId}-${name}`).val(value).trigger('change')
    })
    $.each(settings.nodes, (id, {active, params}) => {
        if (active !== undefined) {
            $(`#${id}-active`).prop('checked', active).trigger('change')
        }
        $.each(params, (name, value) => {
            const $param = $(`#${id}-${name}`)
            if (typeof value === 'boolean') {
                $param.prop('checked', value)
            } else {
                $param.val(value)
            }
            $param.trigger('change')
        })
    })
}

function createAmSynthNode(synth) {
    const meta = {
        name: synth.name,
        params: {
            portamento: {
                type: 'float',
                default: 0.0,
                min: 0.0,
                max: 0.1,
                step: 0.0001,
                unit: 's',
                help: 'glide time between notes (seconds)'
            },
            harmonicity: {
                type: 'float',
                default: 1.0,
                min: 1.0,
                max: 4.0,
                step: 0.01,
                help: "ratio between the two voices. 1 is no change, 2 is an octave, etc."
            }
        }
    }
    return {
        meta,
        harmonicity: synth.harmonicity,
        update: BaseNode.prototype.update,
        paramValues: BaseNode.prototype.paramValues,
        portamento: {
            get value() { return synth.portamento },
            set value(value) { synth.portamento = value },
        }
    }
}
