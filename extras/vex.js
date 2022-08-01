function dotNote(staveNote) {
    Flow.Dot.buildAndAttach([staveNote], {index: 0})
}

/**
 * Combine two consecutive identical rests into one stave note
 * @param {StaveNote[][]} measures
 * @param {number} noteDur
 * @return {StaveNote[][]} The merged measures
 */
function mergedRestMeasures(measures, noteDur) {
    const merged = []
    measures.forEach(staveNotes => {
        const measure = []
        const groups = []
        let prev
        staveNotes.forEach(staveNote => {
            const prevGroup = groups.at(-1)
            if (isRestStaveNote(staveNote) && staveNotesEqual(prev, staveNote) && prevGroup.length === 1) {
                // add to last group
                prevGroup.push(staveNote)
            } else {
                // new group
                groups.push([staveNote])
            }
            prev = staveNote
        })
        groups.forEach(group => {
            if (group.length === 1) {
                measure.push(group[0])
                return
            }
            let dur = group.length / noteDur
            let duration = 1 / dur
            if (duration % 1 === 0) {
                const staveNote = group[0]
                if (isRestStaveNote(staveNote)) {
                    duration += REST_NOTETYPE
                }
                const {keys, clef} = staveNote
                measure.push(new StaveNote({keys, clef, duration}))
            } else {
                measure.push(...group)
            }
        })
        merged.push(measure)
    })
    return merged
}

/**
 * @param {StaveNote|null|undefined} a
 * @param {StaveNote|null|undefined} b
 * @return {boolean}
 */
function staveNotesEqual(a, b) {
    if (!a || !b) {
        return false
    }
    return (
        a.scaleNote && a.scaleNote.equals(b.scaleNote) ||
        isRestStaveNote(a) && isRestStaveNote(b) && a.duration === b.duration
    )
}


/**
 * @param {StaveNote} staveNote
 * @return {boolean}
 */
function isRestStaveNote(staveNote) {
    return Boolean(staveNote && staveNote.noteType === REST_NOTETYPE)
}

