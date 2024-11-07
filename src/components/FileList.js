import React from 'react';

export const FileList = ({ files, onFileSelect, isLoading }) => {
    const groupedFiles = files.reduce((acc, file) => {
        const path = file.path_display.split('/');
        const folder = path.length > 2 ? path[1] : 'root';
        if (!acc[folder]) acc[folder] = [];
        acc[folder].push(file);
        return acc;
    }, {});

    return (
        <div style={{ flex: '1', minWidth: '300px' }}>
            <h2>Files</h2>
            {Object.entries(groupedFiles).map(([folder, folderFiles]) => (
                <div key={folder} style={{ marginBottom: '20px' }}>
                    <h3 style={{ 
                        backgroundColor: '#f5f5f5', 
                        padding: '10px', 
                        borderRadius: '4px' 
                    }}>
                        {folder}
                    </h3>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {folderFiles
                            .filter(file => file['.tag'] === 'file' && file.name.endsWith('.json'))
                            .map((file, index) => (
                                <li 
                                    key={file.id}
                                    style={{
                                        padding: '10px',
                                        backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white',
                                        borderRadius: '4px',
                                        marginBottom: '5px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <span style={{ 
                                        overflow: 'hidden', 
                                        textOverflow: 'ellipsis', 
                                        whiteSpace: 'nowrap',
                                        marginRight: '10px'
                                    }}>
                                        {file.name}
                                    </span>
                                    <button
                                        onClick={() => onFileSelect(file)}
                                        disabled={isLoading}
                                        style={{
                                            padding: '5px 10px',
                                            backgroundColor: '#0061fe',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: isLoading ? 'not-allowed' : 'pointer',
                                            opacity: isLoading ? 0.7 : 1,
                                            flexShrink: 0
                                        }}
                                    >
                                        {isLoading ? 'Loading...' : 'View Content'}
                                    </button>
                                </li>
                            ))}
                    </ul>
                </div>
            ))}
        </div>
    );
};