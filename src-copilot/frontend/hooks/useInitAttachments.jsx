import {getCorsBypassUrl} from "../../../common-utils/cors-helpers.js";

export const useInitAttachments = () => {
    const threadRuntime = AssistantUI.useThreadRuntime();

    React.useEffect(() => {
        (async () => {
            if (window.userData.invokerImageSrc) {
                let response = null;
                try {
                    response = await fetch(window.userData.invokerImageSrc);
                } catch (e) {
                    response = await fetch(getCorsBypassUrl(window.userData.invokerImageSrc));
                }
                if (!response.ok) {
                    throw new Error('Failed to fetch image');
                }
                const blob = await response.blob();
                const file = new File([blob], "image.jpg", {type: "image/jpeg"});
                await threadRuntime.composer.addAttachment(file);
            }
            if (window.userData.invokerNoteUUID && !window.userData.invokerSelectionContent) {
                const noteUUID = window.userData.invokerNoteUUID;
                const noteName = await appConnector.getNoteTitleByUUID(noteUUID);
                const file = new File([`
                @notes
                Current note title: ${noteName}
                Current note UUID: ${noteUUID}
                `.trim()], noteName, {type: "text/amplenote-note"});
                await threadRuntime.composer.addAttachment(file);
                await threadRuntime.composer.setText('@notes ');
            }
            if (window.userData.invokerSelectionContent) {
                const noteUUID = window.userData.invokerNoteUUID;
                const noteName = await appConnector.getNoteTitleByUUID(noteUUID);
                const selectionContent = window.userData.invokerSelectionContent;
                const file = new File([`
                @notes
                Current note title: ${noteName}
                Current note UUID: ${noteUUID}
                Current selection content: ${selectionContent}
                `.trim()], noteName, {type: "text/amplenote-selection"});
                await threadRuntime.composer.addAttachment(file);
                await threadRuntime.composer.setText('@notes ');
            }
            if (window.userData.invokerTaskUUID) {
                const taskUUID = window.userData.invokerTaskUUID;
                const file = new File([`
                @tasks
                Current task UUID: ${taskUUID}
                `.trim()], taskUUID, {type: "text/amplenote-task"});
                await threadRuntime.composer.addAttachment(file);
                await threadRuntime.composer.setText('@tasks ');
            }
        })();
    }, []);
}