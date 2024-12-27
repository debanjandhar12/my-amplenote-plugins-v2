export class CurrentNoteAttachmentAdapter {
    accept = "text/amplenote-note,text/amplenote-selection,text/amplenote-task";

    async add(state) {
        return {
            id: state.file.name,
            type: "file",
            name: state.file.name,
            contentType: state.file.type,
            file: state.file,
            status: { type: "requires-action", reason: "composer-send" }
        };
    }

    async send(attachment) {
        let contentText = await getFileText(attachment.file);
        return {
            ...attachment,
            status: { type: "complete" },
            content: [
                {
                    type: "text",
                    text: contentText
                },
            ],
        };
    }

    async remove() {
        // noop
    }
}

const getFileText = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);

        reader.readAsText(file);
    });