import { useAIFixTranscript } from "../hooks/useAIFixTranscript.js";

export const TranscriptionTextArea = ({ value, onChange = null, placeholder = null, label = null, showFixButton = false }) => {
    const { TextArea, Text, Card, Button, Spinner } = window.RadixUI;
    const { MagicWandIcon } = window.RadixIcons;
    
    const { isFixing, fixTranscript } = useAIFixTranscript();

    const handleAIFix = () => fixTranscript(value, onChange);

    return (
        <Card style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {label && (
                <Text size="2" color="gray" style={{ marginBottom: '8px' }}>
                    {label}
                </Text>
            )}
            <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <TextArea
                    value={value}
                    onChange={onChange}
                    readOnly={!onChange}
                    placeholder={placeholder}
                    style={{ 
                        flex: 1, 
                        minHeight: '200px',
                        fontStyle: !value ? 'italic' : 'normal',
                        color: !value ? 'gray' : 'inherit',
                        paddingRight: showFixButton && onChange && value && value.trim() ? '60px' : undefined
                    }}
                />
                {showFixButton && onChange && value && value.trim() && (
                    <Button
                        size="1"
                        variant="ghost"
                        onClick={handleAIFix}
                        disabled={isFixing}
                        style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            backgroundColor: 'rgba(0, 0, 0, 0.1)',
                            backdropFilter: 'blur(4px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            zIndex: 1
                        }}
                        title="Fix transcript with AI"
                    >
                        {isFixing ?
                            <Spinner size={'1'} />
                            : <MagicWandIcon width="12" height="12" /> }
                        Fix
                    </Button>
                )}
            </div>
        </Card>
    );
};
