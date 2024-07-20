import {initMarkMap} from "../markmap/main.js";

// Mock data for dev environment
if(!window.noteUUID && process.env.NODE_ENV === 'development') {
    window.noteUUID = 'mock-uuid';
    window.callAmplenotePlugin = async function(command, ...args) {
        switch (command) {
            case 'getNoteContent':
                return `Hi
# Mock Header 1 [Amplenote Omnivore](https://www.amplenote.com/notes/506ac00a-3077-11ef-b2d3-2aa30a147f2e)
This is a mock note content.
## Mock Subheader 1.1
This is a mock note content.
### Mock Subheader 1.1.1
This is a mock note content.
### Mock Subheader 1.1.2
# Mock Header 2
Some content`;
            case 'navigate':
                window.open(args[0], '_blank');
                return;
        }
    }
}


(async () => {
    const markdown = await window.callAmplenotePlugin('getNoteContent', noteUUID);
    console.log('Got markdown', markdown);
    await initMarkMap(markdown);
})();

// Resize iframe height to fit content
const body = document.body,
    html = document.documentElement;
window.addEventListener('resize', function() {
    const iframeHeight = Math.min(html.clientHeight, html.scrollHeight);
    body.style.height = (iframeHeight-24) + 'px';
});
window.dispatchEvent(new Event('resize'));