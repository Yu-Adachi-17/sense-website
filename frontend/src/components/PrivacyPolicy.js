import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div style={{ maxWidth: '800px', margin: 'auto', padding: '20px', lineHeight: '1.8', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ fontSize: '32px', textAlign: 'center', marginBottom: '20px' }}>Privacy Policy</h1>
      
      <h2 style={{ fontSize: '24px', marginTop: '30px' }}>1. Information We Collect</h2>
      <p>This service (hereinafter referred to as "the Service") may collect the following information when users use the Service:</p>
      <ul>
        <li>User email address (for account authentication)</li>
        <li>Meeting minutes and full-text transcripts (to synchronize across all devices using cloud storage)</li>
        <li>Data related to service usage (for service improvement)</li>
      </ul>
      
      <h2 style={{ fontSize: '24px', marginTop: '30px' }}>2. Purpose of Information Use</h2>
      <p>The collected information will be used for the following purposes:</p>
      <ul>
        <li>Storing and synchronizing meeting minutes and full-text transcripts</li>
        <li>Managing user accounts</li>
        <li>Improving the service and addressing issues</li>
        <li>Compliance with legal requirements</li>
      </ul>
      
      <h2 style={{ fontSize: '24px', marginTop: '30px' }}>3. Provision of Information to Third Parties</h2>
      <p>The Service does not sell, rent, or share user personal information with third parties. However, information may be disclosed under the following circumstances:</p>
      <ul>
        <li>Compliance with legal obligations</li>
        <li>Requests from public authorities (police, courts, etc.)</li>
      </ul>
      
      <h2 style={{ fontSize: '24px', marginTop: '30px' }}>4. Data Storage and Management</h2>
      <ul>
        <li>User personal information is securely managed using cloud services.</li>
        <li>Meeting minutes and full-text transcripts are synchronized across all devices to enhance user convenience.</li>
      </ul>
      
      <h2 style={{ fontSize: '24px', marginTop: '30px' }}>5. User Rights</h2>
      <p>Users have the following rights:</p>
      <ul>
        <li>Deleting their account and personal information</li>
        <li>Reviewing and modifying stored data</li>
        <li>Requesting the cessation of data usage</li>
      </ul>
      
      <h2 style={{ fontSize: '24px', marginTop: '30px' }}>6. Cookies and Tracking Technologies</h2>
      <p>The Service may use cookies to enhance user convenience.</p>
      
      <h2 style={{ fontSize: '24px', marginTop: '30px' }}>7. Contact Information</h2>
      <p>For inquiries regarding this privacy policy, please contact us at the following email address:</p>
      <p><strong>[Contact Information]</strong></p>
    </div>
  );
};

export default PrivacyPolicy;
