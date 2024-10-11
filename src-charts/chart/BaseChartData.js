import {ChartDataFactory} from "./ChartDataFactory.js";
import {isFunction, omitBy} from "lodash-es";

export class BaseChartData {
    constructor({RANDOM_UUID, DATA_SOURCE, CHART_TITLE, CHART_ASPECT_RATIO_SIZE}) {
        this.RANDOM_UUID = RANDOM_UUID;
        this.DATA_SOURCE = DATA_SOURCE;
        this.CHART_TITLE = CHART_TITLE;
        this.CHART_ASPECT_RATIO_SIZE = CHART_ASPECT_RATIO_SIZE;
    }

    toJSON() {
        const {
            RANDOM_UUID, DATA_SOURCE, CHART_TITLE, CHART_ASPECT_RATIO_SIZE
        } = this;
        return {
            RANDOM_UUID, DATA_SOURCE, CHART_TITLE, CHART_ASPECT_RATIO_SIZE
        };
    }

    validate() {
        if (typeof this.RANDOM_UUID !== 'string') {
            throw new Error('RANDOM_UUID must be a string');
        }
        if (this.DATA_SOURCE === null) {
            throw new Error('DATA_SOURCE is invalid');
        }
        if (typeof this.CHART_TITLE !== 'string') {
            throw new Error('CHART_TITLE must be a string');
        }
        if (isNaN(this.CHART_ASPECT_RATIO_SIZE) || isNaN(parseFloat(this.CHART_ASPECT_RATIO_SIZE))) {
            throw new Error('Chart size must be a number');
        }
    }

    /** --Chart related functionality-- */
    async getChartJSParamObject() {
        const chartJSParamObj = {options: {}};
        chartJSParamObj.responsive = true;
        chartJSParamObj.maintainAspectRatio = true;
        chartJSParamObj.aspectRatio = this.CHART_ASPECT_RATIO_SIZE;

        if (this.CHART_TITLE && this.CHART_TITLE.trim() !== '') {
            chartJSParamObj.options.plugins = {
                title: {
                    display: true,
                    text: window.ChartData.CHART_TITLE
                }
            };
        }

        // Add plugin to set background color of canvas (fixes save as png image feature)
        const customCanvasBackgroundColorPlugin = {
            id: 'customCanvasBackgroundColor',
            beforeDraw: (chart, args, options) => {
                const {ctx} = chart;
                ctx.save();
                ctx.globalCompositeOperation = 'destination-over';
                ctx.fillStyle = '#192025';
                ctx.fillRect(0, 0, chart.width, chart.height);
                ctx.restore();
            }
        };
        chartJSParamObj.plugins = [customCanvasBackgroundColorPlugin];

        return chartJSParamObj;
    }

    /** -- Settings related functionality -- */
    _initialChartData = null;

    async mountSettings() {
        await this._initSettings(window.ChartData);
    }

    async _initSettings(initialChartData) {
        if (document.getElementById('chart-settings-overlay')) {    // we are reloading settings
            const settingsInnerContainer = document.getElementById('chart-settings-container');
            settingsInnerContainer.innerHTML = '';
            return;
        }

        // Setting is freshly mounted. Save the initial chart data for use in canceling settings, etc.
        this._initialChartData = ChartDataFactory.parseChartDataFromDataSource(initialChartData); // Clone copy

        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'chart-settings-overlay';
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.35)',
            zIndex: '1000',
            transition: 'background-color 1s ease',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
        });
        document.body.appendChild(overlay);

        const settingsOuterContainer = document.createElement('div');
        settingsOuterContainer.className = 'chart-settings-outer-container';
        Object.assign(settingsOuterContainer.style, {
            margin: '0 20px',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            minWidth: '100%',
            minHeight: '100%',
        });
        overlay.appendChild(settingsOuterContainer);

        // Add close button
        const closeButtonContainer = document.createElement('div');
        closeButtonContainer.className = 'chart-settings-close-div';
        const closeButton = document.createElement('button');
        Object.assign(closeButton.style, {
            backgroundColor: 'transparent',
            background: 'none',
            float: 'right',
            marginRight: '2%',
            marginTop: '2%',
            border: 'none',
            width: '40px',
            color: 'white',
            height: '40px',
            cursor: 'pointer',
            padding: '5px',
            borderRadius: '50%',
            transition: 'background-color 0.3s ease'
        });
        closeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>';
        closeButton.onclick = () => this._cancelSettings();
        closeButton.addEventListener('mouseover', () => {
            closeButton.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
        });
        closeButton.addEventListener('mouseout', () => {
            closeButton.style.backgroundColor = 'transparent';
        });
        closeButtonContainer.appendChild(closeButton);
        settingsOuterContainer.appendChild(closeButtonContainer);

        // Add settings container
        const settingsInnerContainer = document.createElement('div');
        settingsInnerContainer.id = 'chart-settings-container';
        Object.assign(settingsInnerContainer.style, {
            flex: '1 1 auto',
            boxSizing: 'border-box'
        });
        settingsOuterContainer.appendChild(settingsInnerContainer);

        // Add button container
        const buttonContainer = document.createElement('div');
        Object.assign(buttonContainer.style, {
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '20px'
        });
        settingsOuterContainer.appendChild(buttonContainer);

        // Add save button
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save Settings';
        saveButton.onclick = () => this._saveSettings(window.ChartData);
        Object.assign(saveButton.style, {
            backgroundColor: '#3e92cc',
            color: 'white',
            padding: '10px 20px',
            marginRight: '2%',
            marginBottom: '2%',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px',
            transition: 'background-color 0.3s ease'
        });
        saveButton.addEventListener('mouseover', () => {
            saveButton.style.backgroundColor = '#2e7bb0';
        });
        saveButton.addEventListener('mouseout', () => {
            saveButton.style.backgroundColor = '#3e92cc';
        });
        buttonContainer.appendChild(saveButton);

        // Blur toolbar
        const toolbar = document.getElementById('toolbar-container');
        toolbar.style.filter = 'blur(2px)';
    }

    async _cancelSettings() {
        document.body.removeChild(document.getElementById('chart-settings-overlay'));
        document.getElementById('toolbar-container').style.filter = 'none';
        window.ChartData = this._initialChartData;
        this._initialChartData = null;
        window.reloadChart();
    }

    async _saveSettings(newChartData) {
        document.body.removeChild(document.getElementById('chart-settings-overlay'));
        document.getElementById('toolbar-container').style.filter = 'none';
        await appConnector.updateChartData(this._initialChartData.toJSON(), newChartData.toJSON());
        window.ChartData = newChartData;
        this._initialChartData = null;
        window.reloadChart();
    }
}