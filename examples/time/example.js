import $ from '../../lib/jquery.js'
import {mixerWidget, nodeWidget, LocalPresets} from '../../src/widgets.js'
import Tone from '../../lib/tone.js'
import Sampler from '../../src/sampler.js'
import {MembraneSynth} from '../../src/synths.js'
import * as Music from '../../src/music.js'

const context = new AudioContext()
    
const volume = new GainNode(context)
// const sampler = new Sampler(context)

volume.connect(context.destination)

const drum = new MembraneSynth(context)
// sampler.connect(drum)
drum.connect(volume)
// drum.connect(volume)
// sampler.connect(volume)

const mixer = [{name: 'volume', param: volume.gain}]
volume.gain.value = 0.2

$(() => {
    // const presets = new LocalPresets('time-example', {sample: sampler}, mixer)

    // const score = new VexSampleScore

    const sample = Music.scaleSample(0, {octave: 4})
    $('#inputs').append(
        $('<button/>').text('P').on('click', () => {
            Tone.Transport.scheduleOnce(time => {
                sample.forEach(note => {
                    drum.triggerAttackRelease(note.shortLabel + note.octave, '4n', time)
                    time += Tone.Time('4n').toSeconds()
                })
            }, Tone.now())
        })
    )
    Tone.Transport.start()
    // $('#inputs').append(
    //     mixerWidget('mixer', null, mixer).addClass('fx1'),
    //     nodeWidget('sample', sampler).addClass('fx2'),
    // ).on('change', () => presets.save('default'))

    // if (presets.has('default')) {
    //     presets.load('default')
    // }


})

