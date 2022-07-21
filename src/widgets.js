/**
 * WebAudio effects HTML.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */
import $ from './jquery.js'
/**
 * Build HTML for effects node.
 * 
 * @param {string} id The effect ID.
 * @param {object} params The parameter definitions.
 * @param {string} title The title.
 * @return {string} HTML
 */
export function effectWidget(id, params, title) {
    const $div = $('<div/>').attr({id})
    // Heading
    $('<h2/>').text(title).appendTo($div)
    // Table
    const $table = $('<table/>').appendTo($div)
    // Active checkbox
    const aid = `${id}-active`
    const actLabelHtml = $('<label/>')
        .attr({for: aid}).text('Active')
        .get(0).outerHTML
    const actCheckHtml = $('<input/>')
        .attr({id: aid, type: 'checkbox'})
        .get(0).outerHTML
    $table.append(`
        <tr>
            <td>${actLabelHtml}</td>
            <td>${actCheckHtml}</td>
            <td></td>
        </tr>
    `)
    // Params
    Object.entries(params).forEach(([key, def]) => {
        const {min, max, default: value, step, label, unit} = def
        const pid = [id, key].join('-')
        const labelHtml = $('<label/>')
            .attr({for: pid}).text(label)
            .get(0).outerHTML
        const inputHtml = $('<input/>')
            .attr({id: pid, type: 'range', value, min, max, step})
            .get(0).outerHTML
        const meterHtml = $('<span/>')
            .attr({id: `${pid}-meter`}).data({type: def.type})
            .get(0).outerHTML
        let unitHtml = ''
        if (unit) {
            unitHtml = $('<span/>')
                .addClass('unit').data({unit}).text(unit)
                .get(0).outerHTML
        }
        $table.append(`
            <tr>
                <td>${labelHtml}</td>
                <td>${inputHtml}</td>
                <td>${meterHtml}${unitHtml}</td>
            </tr>
        `)
    })
    return $div.get(0).outerHTML
}

export function oscIntervals1(id) {
    const labels = [
        null,
        'min 2nd',
        'Maj 2nd',
        'min 3rd',
        'Maj 3rd',
        '4th',
        'Tritone',
        '5th',
        'min 6th',
        'Maj 6th',
        'min 7th',
        'Maj 7th',
        'Octave',
    ]
    const name = `${id}-interval`
    const $div = $('<div/>')
    const $divp = $('<div/>').text('+').appendTo($div)
    const $divm = $('<div/>').html('-&nbsp;').appendTo($div)
    for (let i = 1; i < 13; i++) {
        $('<button/>')
            .attr({name, value: String(i)})
            .text(labels[i]).appendTo($divp)
        $('<button/>')
            .attr({name, value: String(-i)})
            .text(labels[i]).appendTo($divm)

    }
    return $div.get(0).outerHTML
}