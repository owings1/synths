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