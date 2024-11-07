import React, { useState, useCallback, useEffect } from 'react';
import { useDropboxService } from './services/dropboxService';
import { FileList } from './components/FileList';
import { ContentViewer } from './components/ContentViewer';

function App() {
    const [files, setFiles] = useState([]);
    const [selectedContent, setSelectedContent] = useState(null);
    const [selectedFileName, setSelectedFileName] = useState(null);
    const [error, setError] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState('Starting...');
    const [isLoading, setIsLoading] = useState(false);

    const dropboxService = useDropboxService();

    const handleFileSelect = useCallback(async (file) => {
        if (isLoading) return;
        
        try {
            setIsLoading(true);
            setStatus(`Loading ${file.name}...`);
            const content = await dropboxService.getFileContent(file.path_display);
            setSelectedContent(content);
            setSelectedFileName(file.name);
            setStatus('File loaded successfully');
            setError(null);
        } catch (err) {
            setError(`Error loading file: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [dropboxService, isLoading]);

    const loadFiles = useCallback(async () => {
        if (isLoading) return;
        
        try {
            setIsLoading(true);
            setStatus('Loading files...');
            const fileList = await dropboxService.listFiles();
            setFiles(fileList);
            setIsConnected(true);
            setStatus('Files loaded successfully');
            setError(null);
        } catch (err) {
            if (err.message.includes('too_many_requests')) {
                setError('Please wait a moment before refreshing again');
            } else if (err.message.includes('No valid access token')) {
                setIsConnected(false);
                setError(null);
                setStatus('Not connected');
            } else {
                setError(err.message);
                setIsConnected(false);
            }
        } finally {
            setIsLoading(false);
        }
    }, [dropboxService, isLoading]);

    const handleConnect = useCallback(() => {
        setError(null);
        dropboxService.initiateAuth();
    }, [dropboxService]);

    const handleRefresh = useCallback(() => {
        if (!isLoading) {
            loadFiles();
        }
    }, [isLoading, loadFiles]);

    // Single useEffect to handle initialization and auth
    useEffect(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      
      if (code) {
          window.history.replaceState({}, document.title, window.location.pathname);
          
          if (!isLoading) {
              setIsLoading(true);
              dropboxService.handleAuthCode(code, state)
                  .then(() => {
                      setIsConnected(true);
                      return loadFiles();
                  })
                  .catch(err => {
                      setError(err.message);
                      setIsLoading(false);
                  });
          }
      } else {
          const hasToken = localStorage.getItem('dropboxAccessToken');
          setIsConnected(!!hasToken);
          if (!hasToken) {
              setStatus('Not connected');
          }
      }
  }, [dropboxService, isLoading, loadFiles]);

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1>Pets File Server</h1>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    {!isConnected ? (
                        <button 
                            onClick={handleConnect}
                            style={{
                                padding: '10px 20px',
                                fontSize: '16px',
                                backgroundColor: '#0061fe',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                opacity: isLoading ? 0.7 : 1
                            }}
                            disabled={isLoading}
                        >
                            Connect to Dropbox
                        </button>
                    ) : (
                        <button
                            onClick={handleRefresh}
                            style={{
                                padding: '10px 20px',
                                fontSize: '16px',
                                backgroundColor: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                opacity: isLoading ? 0.7 : 1
                            }}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Refreshing...' : 'Refresh Files'}
                        </button>
                    )}
                </div>
                
                <div style={{ 
                    padding: '10px', 
                    backgroundColor: isConnected ? '#e3f2fd' : '#f5f5f5',
                    borderRadius: '4px',
                }}>
                    <strong>Status:</strong> {status}
                </div>
            </div>

            {error && (
                <div style={{ 
                    backgroundColor: '#ffebee', 
                    padding: '10px', 
                    borderRadius: '4px',
                    marginBottom: '20px'
                }}>
                    <h2>Error:</h2>
                    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{error}</pre>
                </div>
            )}

            <div style={{ display: 'flex', gap: '20px' }}>
                <FileList 
                    files={files} 
                    onFileSelect={handleFileSelect}
                    isLoading={isLoading}
                />
                <ContentViewer 
                    content={selectedContent} 
                    fileName={selectedFileName} 
                />
            </div>
        </div>
    );
}

export default App;