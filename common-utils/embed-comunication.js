// @ts-ignore
export function createOnEmbedCallHandler(extensions = {}) {
    return async function onEmbedCallHandler(app, commandName, ...args) {
        console.log('onEmbedCall', commandName, args);

        app.navigate = async (url) => {
            if (app.navigate(url)) return true;
            if (window.open(url, '_blank')) return true;
            return false;
        };

        switch (commandName) {
            case 'getApp':
                return app;
            case 'saveFile':
                try {
                    let {name, data} = args[0];
                    if (data.startsWith('data:')) {
                        const response = await fetch(data);
                        data = await response.blob();
                    }
                    return await app.saveFile(data, name);
                } catch (e) {
                    throw e.message;
                }
            default:
                if (commandName in extensions) {
                    return extensions[commandName](app, ...args);
                }
                throw new Error(`Unknown command: ${commandName}`);
        }
    };
}

export function getDummyApp() {
    return createDummyObject(deserializeWithFunctions(extractedSerializedApp));
}

export function getOnEmbedCallingAppProxy() {
    return createDummyObject(deserializeWithFunctions(extractedSerializedApp), '',
        // @ts-ignore
        (fullKey) => async () => {
            // @ts-ignore
            const app = await window.callAmplenotePlugin('getApp');
            return app[fullKey];
        },
        (fullKey) => async () => {
            // @ts-ignore
            const app = await window.callAmplenotePlugin('getApp');
            return app[fullKey];
        }
    );
}

// -- Utils --
function createDummyObject(originalObject, parentKey = '',
valueHandler = (fullKey) => {
    return () => {throw new Error(`Dummy value '${fullKey}' accessed`);}
},
funcHandler = (fullKey) => {
    return () => {throw new Error(`Dummy function '${fullKey}' accessed`);}
}) {
    const dummy = {};

    for (const [key, value] of Object.entries(originalObject)) {
        const fullKey = parentKey ? `${parentKey}.${key}` : key;

        if (typeof value === 'function') {
            dummy[key] = funcHandler(fullKey)
        } else if (typeof value === 'object' && value !== null) {
            dummy[key] = createDummyObject(value, fullKey);  // Recursively handle nested objects
        } else {
            dummy[key] = new Proxy({}, {
                get: valueHandler(fullKey)
            });
        }
    }

    return dummy;
}

// @ts-ignore
export function serializeWithFunctions(obj) {
    // @ts-ignore
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'function') {
            return `__FUNCTION:${value.toString()}`;
        }
        return value;
    });
}

export function deserializeWithFunctions(str) {
    // @ts-ignore
    return JSON.parse(str, (key, value) => {
        if (typeof value === 'string' && value.startsWith('__FUNCTION:')) {
            const functionBody = value.slice('__FUNCTION:'.length);
            return new Function(`return ${functionBody}`)();
        }
        return value;
    });
}

// Extracted from amplenote.com with JSON.stringify(serializeWithFunctions(app))
const extractedSerializedApp = "{\"context\":{\"link\":null,\"noteUUID\":\"70a5b82e-7321-11ef-80a6-f222b153c6e3\",\"pluginUUID\":\"b3b4583c-7321-11ef-a83b-eeba9115991d\",\"selectionContent\":\"This\",\"url\":\"https://www.amplenote.com/notes/70a5b82e-7321-11ef-80a6-f222b153c6e3\",\"replaceSelection\":\"__FUNCTION:function(){for(var e=arguments.length,n=new Array(e),r=0;r<e;r++)n[r]=arguments[r];return t(u,n)}\"},\"notes\":{\"create\":\"__FUNCTION:function(e){var n=arguments;return d(b().mark((function r(){var u,o;return b().wrap((function(r){for(;;)switch(r.prev=r.next){case 0:return u=n.length>1&&void 0!==n[1]?n[1]:null,r.next=3,t(\\\"createNote\\\",[e,u]);case 3:return o=r.sent,r.abrupt(\\\"return\\\",O(t,{name:e,tags:u,uuid:o}));case 5:case\\\"end\\\":return r.stop()}}),r)})))()}\",\"dailyJot\":\"__FUNCTION:function(e){return d(b().mark((function n(){var r,u,o;return b().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return r=Object(i.b)(new Date(1e3*e)),u=[\\\"daily-jots\\\"],n.next=4,t(\\\"findNote\\\",[{name:r,tags:u}]);case 4:return o=n.sent,n.abrupt(\\\"return\\\",O(t,o||{name:r,tags:u}));case 6:case\\\"end\\\":return n.stop()}}),n)})))()}\",\"filter\":\"__FUNCTION:function(){var e=arguments;return d(b().mark((function n(){var r,u;return b().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return r=e.length>0&&void 0!==e[0]?e[0]:{},n.next=3,t(\\\"filterNotes\\\",[r]);case 3:if(u=n.sent){n.next=6;break}return n.abrupt(\\\"return\\\",u);case 6:return n.abrupt(\\\"return\\\",u.map((function(e){return O(t,e)})));case 7:case\\\"end\\\":return n.stop()}}),n)})))()}\",\"find\":\"__FUNCTION:function(e){return d(b().mark((function n(){var r,u;return b().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return r=\\\"string\\\"===typeof e?{uuid:e}:e,n.next=3,t(\\\"findNote\\\",[r]);case 3:return u=n.sent,n.abrupt(\\\"return\\\",u?O(t,u):null);case 5:case\\\"end\\\":return n.stop()}}),n)})))()}\"},\"saveFile\":\"__FUNCTION:function(t,e){return d(b().mark((function n(){var r,i;return b().wrap((function(n){for(;;)switch(n.prev=n.next){case 0:return n.next=2,Object(o.b)(t);case 2:r=n.sent,(i=window.document.createElement(\\\"iframe\\\")).sandbox=\\\"allow-scripts allow-same-origin allow-downloads\\\",i.srcdoc='\\\\n        <!DOCTYPE html>\\\\n        <html lang=\\\"en\\\">\\\\n          <body>\\\\n            <script type=\\\"text/javascript\\\">\\\\n              function blobFromDataURL(dataURL) {\\\\n                let byteString;\\\\n                try {\\\\n                  byteString = atob(dataURL.split(\\\",\\\")[1]);\\\\n                } catch (error) {\\\\n                  // Likely InvalidCharacterError\\\\n                  return null;\\\\n                }\\\\n                const mimeString = dataURL.split(\\\",\\\")[0].split(\\\":\\\")[1].split(\\\";\\\")[0];\\\\n                const buffer = new ArrayBuffer(byteString.length);\\\\n                const array = new Uint8Array(buffer);\\\\n                for (let i = 0; i < byteString.length; i++) {\\\\n                  array[i] = byteString.charCodeAt(i);\\\\n                }\\\\n                return new Blob([ buffer ], { type: mimeString });\\\\n              }\\\\n              \\\\n              const blob = blobFromDataURL(\\\"'.concat(r,'\\\")\\\\n              const blobURL = URL.createObjectURL(blob);\\\\n    \\\\n              const link = document.createElement(\\\"a\\\");\\\\n              link.setAttribute(\\\"href\\\", blobURL);\\\\n              link.setAttribute(\\\"download\\\", \\\"').concat(u()(e),\\\"\\\\\\\");\\\\n              link.click();\\\\n              \\\\n              // We can't revoke immediately, as we might be in a webview that needs to coordinate access to the URL\\\\n              // with a hosting application, which can take a moment (milliseconds), but we do want to clean up \\\\n              // eventually.\\\\n              setTimeout(function() { URL.revokeObjectURL(blobURL); }, 10000);\\\\n            <\\\\/script>      \\\\n          </body>\\\\n        </html>\\\\n    \\\"),window.document.body.appendChild(i);case 7:case\\\"end\\\":return n.stop()}}),n)})))()}\",\"settings\":{},\"addNoteTag\":\"__FUNCTION:function(){for(var n=arguments.length,r=new Array(n),u=0;u<n;u++)r[u]=arguments[u];return t(e,r)}\",\"addTaskDomainNote\":\"__FUNCTION:function(){for(var n=arguments.length,r=new Array(n),u=0;u<n;u++)r[u]=arguments[u];return t(e,r)}\",\"alert\":\"__FUNCTION:function(){for(var n=arguments.length,r=new Array(n),u=0;u<n;u++)r[u]=arguments[u];return t(e,r)}\",\"attachNoteMedia\":\"__FUNCTION:function(){for(var n=arguments.length,r=new Array(n),u=0;u<n;u++)r[u]=arguments[u];return t(e,r)}\",\"createNote\":\"__FUNCTION:function(){for(var n=arguments.length,r=new Array(n),u=0;u<n;u++)r[u]=arguments[u];return t(e,r)}\",\"deleteNote\":\"__FUNCTION:function(){for(var n=arguments.length,r=new Array(n),u=0;u<n;u++)r[u]=arguments[u];return t(e,r)}\",\"filterNotes\":\"__FUNCTION:function(){for(var n=arguments.length,r=new Array(n),u=0;u<n;u++)r[u]=arguments[u];return t(e,r)}\",\"findNote\":\"__FUNCTION:function(){for(var n=arguments.length,r=new Array(n),u=0;u<n;u++)r[u]=arguments[u];return t(e,r)}\",\"getAttachmentURL\":\"__FUNCTION:function(){for(var n=arguments.length,r=new Array(n),u=0;u<n;u++)r[u]=arguments[u];return t(e,r)}\",\"getNoteAttachments\":\"__FUNCTION:function(){for(var n=arguments.length,r=new Array(n),u=0;u<n;u++)r[u]=arguments[u];return t(e,r)}\",\"getNoteBacklinks\":\"__FUNCTION:function(){for(var n=arguments.length,r=new Array(n),u=0;u<n;u++)r[u]=arguments[u];return t(e,r)}\",\"getNoteContent\":\"__FUNCTION:function(){for(var n=arguments.length,r=new Array(n),u=0;u<n;u++)r[u]=arguments[u];return t(e,r)}\",\"getNoteImages\":\"__FUNCTION:function(){for(var n=arguments.length,r=new Array(n),u=0;u<n;u++)r[u]=arguments[u];return t(e,r)}\",\"getNotePublicURL\":\"__FUNCTION:function(){for(var n=arguments.length,r=new Array(n),u=0;u<n;u++)r[u]=arguments[u];return t(e,r)}\",\"getNoteSections\":\"__FUNCTION:function(){for(var n=arguments.length,r=new Array(n),u=0;u<n;u++)r[u]=arguments[u];return t(e,r)}\",\"getNoteTasks\":\"__FUNCTION:function(){for(var n=arguments.length,r=new Array(n),u=0;u<n;u++)r[u]=arguments[u];return t(e,r)}\",\"getNoteURL\":\"__FUNCTION:function(){for(var n=arguments.length,r=new Array(n),u=0;u<n;u++)r[u]=arguments[u];return t(e,r)}\",\"getTask\":\"__FUNCTION:function(){for(var n=arguments.length,r=new Array(n),u=0;u<n;u++)r[u]=arguments[u];return t(e,r)}\",\"getTaskDomains\":\"__FUNCTION:function(){for(var n=arguments.length,r=new Array(n),u=0;u<n;u++)r[u]=arguments[u];return t(e,r)}\",\"getTaskDomainTasks\":\"__FUNCTION:function(){for(var n=arguments.length,r=new Array(n),u=0;u<n;u++)r[u]=arguments[u];return t(e,r)}\",\"insertNoteContent\":\"__FUNCTION:function(){for(var n=arguments.length,r=new Array(n),u=0;u<n;u++)r[u]=arguments[u];return t(e,r)}\",\"insertTask\":\"__FUNCTION:function(){for(var n=arguments.length,r=new Array(n),u=0;u<n;u++)r[u]=arguments[u];return t(e,r)}\",\"navigate\":\"__FUNCTION:function(){for(var n=arguments.length,r=new Array(n),u=0;u<n;u++)r[u]=arguments[u];return t(e,r)}\",\"openSidebarEmbed\":\"__FUNCTION:function(){for(var n=arguments.length,r=new Array(n),u=0;u<n;u++)r[u]=arguments[u];return t(e,r)}\",\"prompt\":\"__FUNCTION:function(){for(var n=arguments.length,r=new Array(n),u=0;u<n;u++)r[u]=arguments[u];return t(e,r)}\",\"removeNoteTag\":\"__FUNCTION:function(){for(var n=arguments.length,r=new Array(n),u=0;u<n;u++)r[u]=arguments[u];return t(e,r)}\",\"replaceNoteContent\":\"__FUNCTION:function(){for(var n=arguments.length,r=new Array(n),u=0;u<n;u++)r[u]=arguments[u];return t(e,r)}\",\"setNoteName\":\"__FUNCTION:function(){for(var n=arguments.length,r=new Array(n),u=0;u<n;u++)r[u]=arguments[u];return t(e,r)}\",\"setSetting\":\"__FUNCTION:function(){for(var n=arguments.length,r=new Array(n),u=0;u<n;u++)r[u]=arguments[u];return t(e,r)}\",\"updateNoteImage\":\"__FUNCTION:function(){for(var n=arguments.length,r=new Array(n),u=0;u<n;u++)r[u]=arguments[u];return t(e,r)}\",\"updateTask\":\"__FUNCTION:function(){for(var n=arguments.length,r=new Array(n),u=0;u<n;u++)r[u]=arguments[u];return t(e,r)}\",\"writeClipboardData\":\"__FUNCTION:function(){for(var n=arguments.length,r=new Array(n),u=0;u<n;u++)r[u]=arguments[u];return t(e,r)}\",\"insertContent\":\"__FUNCTION:function(){for(var e=arguments.length,r=new Array(e),u=0;u<e;u++)r[u]=arguments[u];return t(n,r)}\"}";
