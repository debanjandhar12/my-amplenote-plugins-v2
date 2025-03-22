import {truncate} from "lodash-es";

export const NoteCard = ({title, noteContentPart, noteUUID, headingAnchor}) => {
    const {Card, Flex, Text} = window.RadixUI;
    const {FileTextIcon} = window.RadixIcons;
    const handleClick = (e) => {
        e.preventDefault();
        window.appConnector.navigate(`https://www.amplenote.com/notes/${noteUUID}` + (headingAnchor ? `#${encodeURIComponent(headingAnchor)}` : ''));
    };

    return (
        <Card style={{padding: '12px', marginBottom: '4px', minHeight: '120px', maxHeight: '160px', maxWidth: '100%'}}
              asChild>
            <a href="#" onClick={handleClick} className={'note-card'}>
                <Flex direction="column" gap="2">
                    <Text size="4" weight="bold" trim="both" style={{ marginBottom: '4px' }} truncate>
                        <FileTextIcon style={{ marginRight: '4px' }} />
                        {title?.trim() || 'Untitled Note'}
                    </Text>
                    <p style={{margin: 0, color: '#666', fontSize: '14px', whiteSpace: 'pre-wrap'}}>
                        {noteContentPart}
                    </p>
                </Flex>
            </a>
        </Card>
    );
};