export default {
    name: 'Ample Charts',
    description: 'Plugin to create interactive Charts / Graphs',
    settings: [],
    version: '1.1.0',
    icon: 'bar_chart',
    instructions: `
Plugin to create interactive Charts / Graphs. This supports creating Bar, Line, Area, Pie, Doughnut and Polar Area chart types.

<mark style="color:undefined;">**Steps to create chart from table:**<!-- {"cycleColor":"57"} --></mark>
 - Start by typing \`{Ample Charts: Create from table\` in a note. 
 - Select Datasource note and table index. 
 - Select other options from the dialog as per your preference.  
 - Voila! Your chart is inserted into the note.  
 - Once added, you may modify options by clicking settings icon in chart embed.

*Note:*
- The data for the chart should be in a table format. It can have row or column-wise headers.
- The first / last row and column are considered as labels for the chart.
- If the first / last column is numeric, it is considered as data for the chart and not as a label.
- Charts can be downloaded / embed in notes.
![Chart from table](https://images.amplenote.com/8c47032a-61ca-11ef-82bf-b6c19b417745/c43d9084-0df3-4817-91b3-faa414151f1d.gif)


 <mark style="color:undefined;">**Steps to create chart from mathematical formula:**<!-- {"cycleColor":"57"} --></mark>
- Start by typing \`{Ample Charts: Create from formula\` in a note.
- Enter function formula.
- Select other options from the dialog as per your preference. 
- Voila! Your chart is inserted into the note.

*Note:*
- It is possible to use javascript mathematical functions and constants in formulas. For example, \`-1*(sin(2^x)/(e*x))*cos(x)\` is supported. 
![Chart from Formula](https://images.amplenote.com/8c47032a-61ca-11ef-82bf-b6c19b417745/6dc9fc7c-f57f-47ab-b9bc-dd89d6ad925c.gif)

`.trim().replaceAll('\n', '<br />'),
    template: `
### Code
<<Code>>

### Changelog
- 24/07/2024: First version
- 28/09/2024: Reduced bundle size and bug fixes.
`.trim()
};