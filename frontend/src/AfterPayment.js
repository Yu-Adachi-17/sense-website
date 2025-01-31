import React from 'react';

export function Success() {
  return (
    <div
      style={{
        backgroundColor: '#000',
        color: '#fff',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'sans-serif',
      }}
    >
      <h1 style={{ fontWeight: 300, letterSpacing: '0.05em' }}>
        Payment Successful
      </h1>
    </div>
  );
}

export function Cancel() {
  return (
    <div
      style={{
        backgroundColor: '#000',
        color: '#fff',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'sans-serif',
      }}
    >
      <h1 style={{ fontWeight: 300, letterSpacing: '0.05em' }}>
        Payment Canceled
      </h1>
    </div>
  );
}
