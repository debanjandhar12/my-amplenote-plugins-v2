import {getCorsBypassUrl} from "../../../common-utils/cors-helpers.js";

export const useAmplenoteAttachments = () => {
    const threadRuntime = AssistantUI.useThreadRuntime();
    const composer = AssistantUI.useComposer();
    React.useEffect(() => {
        const processAttachments = async () => {
            const attachment = await window.appConnector.receiveMessageFromPlugin('attachments');
            if (!attachment) return;

            // Util function to check if attachment with same id already exists
            const attachmentExists = (attachmentId) => {
                const attachments = composer.attachments;
                return attachments.some(attachment => attachment.id === attachmentId);
            };

            // Util function to add attachment to composer
            const addAttachmentIfNotExists = async (file) => {
                if (!attachment) return;
                if (!attachmentExists(file.name)) {
                    await threadRuntime.composer.addAttachment(file);
                }
            };

            // Process different types of attachments
            if (attachment.type === 'image') {
                if (!attachment.src) return;
                let response;
                try {
                    response = await fetch(attachment.src);
                } catch (e) {
                    response = await fetch(getCorsBypassUrl(attachment.src));
                    if (!response.ok) {
                        throw new Error('Both initial and bypass fetch failed');
                    }
                }
                const blob = await response.blob();
                const fileName = attachment.src.split('/').pop();
                const file = new File([blob], fileName, {type: "image/jpeg"});
                await addAttachmentIfNotExists(file);
            }
            else if (attachment.type === 'note') {
                const noteUUID = attachment.noteUUID;
                const noteName = attachment.noteTitle || "Untitled Note";
                const noteContent = attachment.noteContent;
                const file = new File([
                `@notes\n` +
                `Attached note title: ${noteName}\n` +
                `Attached note UUID: ${noteUUID}\n` +
                `Attached note content: ${noteContent.length > 8000 ?
                    'Content too long. Use note detail tool to get full content if required.' : noteContent}`
                ], noteName, {type: "text/amplenote-note"});
                await addAttachmentIfNotExists(file);
            }
            else if (attachment.type === 'selection') {
                const noteUUID = attachment.noteUUID;
                const selectionContent = attachment.selectionContent;
                const file = new File([
                `@notes\n` +
                `Selection made in note with UUID: ${noteUUID}\n` +
                `Selected text: ${selectionContent}`
                ], selectionContent, {type: "text/amplenote-selection"});
                await addAttachmentIfNotExists(file);
            }
            else if (attachment.type === 'task') {
                const taskUUID = attachment.taskUUID;
                const file = new File([
                `@tasks\n` +
                `Attached task UUID: ${taskUUID}`+
                (attachment.taskContent ? `\nTask content: ${attachment.taskContent}` : '') +
                (attachment.taskStartAt ? `\nTask start at: ${attachment.taskStartAt}` : '') +
                (attachment.taskEndAt ? `\nTask end at: ${attachment.taskEndAt}` : '') +
                (attachment.completedAt ? `\nTask completed at: ${attachment.completedAt}` : '') +
                (attachment.dismissedAt ? `\nTask dismissed at: ${attachment.dismissedAt}` : '') +
                (attachment.hideUntil ? `\nTask hide until: ${attachment.hideUntil}` : '') +
                (attachment.taskScore ? `\nTask score: ${attachment.taskScore}` : '') +
                (attachment.important ? `\nTask important: ${attachment.important}` : '') +
                (attachment.urgent ? `\nTask urgent: ${attachment.urgent}` : '')
                ], taskUUID, {type: "text/amplenote-task"});
                await addAttachmentIfNotExists(file);
            }
        }
        processAttachments();
        const intervalId = setInterval(processAttachments, 300);
        return () => clearInterval(intervalId);
    }, [composer]);
}