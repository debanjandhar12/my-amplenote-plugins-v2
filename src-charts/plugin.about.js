export default {
    name: 'Ample Charts',
    description: 'Plugin to create interactive Charts / Graphs',
    settings: [],
    version: '1.1.0',
    icon: 'bar_chart',
    instructions: `
Plugin to create interactive Charts / Graphs. This supports creating Bar, Line, Pie, and Doughnut chart types.
![](https://images.amplenote.com/8c47032a-61ca-11ef-82bf-b6c19b417745/c43d9084-0df3-4817-91b3-faa414151f1d.gif)

**Steps to use plugin:**
 - Start by typing \`{Charts}\` in a note.
 - Choose the options from the dialog. 
 - Voila! Your chart is inserted into the note.
 
**Note:**
- The data for the chart should be in a table format. It can have row or column-wise headers.
- The first / last row and column are considered as labels for the chart.
- If the first / last column is numeric, it is considered as data for the chart and not as a label.
`.trim().replaceAll('\n', '<br />'),
    template: `
### Code
<<Code>>

### Changelog
24/07/2024 - First version
`.trim()
};