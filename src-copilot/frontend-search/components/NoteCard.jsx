export const NoteCard = ({title, noteContentPart, noteUUID, headingAnchor}) => {
    const {Card, Flex} = window.RadixUI;
    const handleClick = (e) => {
        e.preventDefault();
        window.appConnector.navigate(`https://www.amplenote.com/notes/${noteUUID}` + (headingAnchor ? `#${encodeURIComponent(headingAnchor)}` : ''));
    };

    return (
        <Card style={{padding: '12px', marginBottom: '4px', minHeight: '120px', maxHeight: '160px', maxWidth: '100%'}}
              asChild>
            <a href="#" onClick={handleClick}>
                <Flex direction="column" gap="2">
                    <h3 style={{margin: '0', fontSize: '18px'}}>
                        {title || 'Untitled Note'}
                    </h3>
                    <p style={{margin: 0, color: '#666', fontSize: '14px', whiteSpace: 'pre-wrap'}}>
                        {noteContentPart}
                    </p>
                </Flex>
            </a>
        </Card>
    );
};