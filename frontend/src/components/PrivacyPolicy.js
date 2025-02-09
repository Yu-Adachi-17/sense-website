import React from 'react';

const PrivacyPolicy = () => {
  const containerStyle = {
    maxWidth: '800px',
    margin: '40px auto',
    padding: '30px',
    backgroundColor: '#000',
    color: '#fff',
    fontSize: '18px',
    lineHeight: 1.8,
    fontFamily: 'Arial, sans-serif',
    textAlign: 'left',
    border: '1px solid #444',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
  };

  const headingStyle = {
    fontWeight: 'bold',
  };

  const h1Style = {
    fontSize: '40px', // 元の32pxより大きく
    marginBottom: '20px',
    ...headingStyle,
  };

  const h2Style = {
    fontSize: '28px', // 元の24pxより大きく
    marginTop: '30px',
    marginBottom: '10px',
    ...headingStyle,
  };

  const paragraphStyle = {
    marginBottom: '10px',
  };

  return (
    <div style={containerStyle}>
      <h1 style={h1Style}>Privacy Policy</h1>
      
      <h2 style={h2Style}>1. Information We Collect</h2>
      <p style={paragraphStyle}>
        This service (hereinafter referred to as "the Service") may collect the following information when users use the Service:
      </p>
      <ul>
        <li style={paragraphStyle}>User email address (for account authentication)</li>
        <li style={paragraphStyle}>Meeting minutes and full-text transcripts (to synchronize across all devices using cloud storage)</li>
        <li style={paragraphStyle}>Data related to service usage (for service improvement)</li>
      </ul>
      
      <h2 style={h2Style}>2. Purpose of Information Use</h2>
      <p style={paragraphStyle}>
        The collected information will be used for the following purposes:
      </p>
      <ul>
        <li style={paragraphStyle}>Storing and synchronizing meeting minutes and full-text transcripts</li>
        <li style={paragraphStyle}>Managing user accounts</li>
        <li style={paragraphStyle}>Improving the service and addressing issues</li>
        <li style={paragraphStyle}>Compliance with legal requirements</li>
      </ul>
      
      <h2 style={h2Style}>3. Provision of Information to Third Parties</h2>
      <p style={paragraphStyle}>
        The Service does not sell, rent, or share user personal information with third parties. However, information may be disclosed under the following circumstances:
      </p>
      <ul>
        <li style={paragraphStyle}>Compliance with legal obligations</li>
        <li style={paragraphStyle}>Requests from public authorities (police, courts, etc.)</li>
      </ul>
      
      <h2 style={h2Style}>4. Data Storage and Management</h2>
      <ul>
        <li style={paragraphStyle}>User personal information is securely managed using cloud services.</li>
        <li style={paragraphStyle}>Meeting minutes and full-text transcripts are synchronized across all devices to enhance user convenience.</li>
      </ul>
      
      <h2 style={h2Style}>5. User Rights</h2>
      <p style={paragraphStyle}>Users have the following rights:</p>
      <ul>
        <li style={paragraphStyle}>Deleting their account and personal information</li>
        <li style={paragraphStyle}>Reviewing and modifying stored data</li>
        <li style={paragraphStyle}>Requesting the cessation of data usage</li>
      </ul>
      
      <h2 style={h2Style}>6. Cookies and Tracking Technologies</h2>
      <p style={paragraphStyle}>
        The Service may use cookies to enhance user convenience.
      </p>
      
      <h2 style={h2Style}>7. Contact Information</h2>
      <p style={paragraphStyle}>
        For inquiries regarding this privacy policy, please contact us at the following email address:
      </p>
      <p style={{ ...paragraphStyle, fontWeight: 'bold' }}>[Contact Information]</p>
    </div>
  );
};

export default PrivacyPolicy;
