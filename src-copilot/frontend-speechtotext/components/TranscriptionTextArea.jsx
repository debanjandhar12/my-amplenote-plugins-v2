export const TranscriptionTextArea = ({ value, onChange = null, placeholder = null, label = null }) => {
    const { TextArea, Text, Card } = window.RadixUI;

    return (
        <Card style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            {label && (
                <Text size="2" color="gray" style={{ marginBottom: '8px' }}>
                    {label}
                </Text>
            )}
            <TextArea
                value={value}
                onChange={onChange}
                readOnly={!onChange}
                placeholder={placeholder}
                style={{ 
                    flex: 1, 
                    minHeight: '200px',
                    fontStyle: !value ? 'italic' : 'normal',
                    color: !value ? 'gray' : 'inherit'
                }}
            />
        </Card>
    );
};
