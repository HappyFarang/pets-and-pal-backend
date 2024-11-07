import React from 'react';

export const ContentViewer = ({ content, fileName }) => {
    return (
        <div style={{ flex: '1', minWidth: '300px' }}>
            <h2>Content Viewer {fileName && `- ${fileName}`}</h2>
            {content && (
                <div style={{
                    backgroundColor: '#f8f9fa',
                    padding: '15px',
                    borderRadius: '4px',
                    overflowX: 'auto'
                }}>
                    <pre style={{ 
                        margin: 0, 
                        whiteSpace: 'pre-wrap',
                        fontSize: '14px',
                        fontFamily: 'monospace'
                    }}>
                        {JSON.stringify(content, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
};