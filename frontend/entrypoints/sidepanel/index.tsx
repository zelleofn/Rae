import React from 'react';
import ReactDOM from 'react-dom/client';

const SidePanel = () => (
  <div style={{ padding: '20px' }}>
    <h1>Edit Resume</h1>
    <p>Side panel content here</p>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SidePanel />
  </React.StrictMode>
);