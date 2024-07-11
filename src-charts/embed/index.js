import {a} from "./test1.js";
import c from './index.css';

document.write("Hello1"+c);

// Fetch https://images.amplenote.com/afaf067a-0139-11ee-b968-8e37e8b27b1d/bba3df70-8faa-4ddd-8d85-20286e423386.jpg and insert
const img = document.createElement('img');
img.src = 'https://images.amplenote.com/afaf067a-0139-11ee-b968-8e37e8b27b1d/bba3df70-8faa-4ddd-8d85-20286e423386.jpg';
document.body.appendChild(img);